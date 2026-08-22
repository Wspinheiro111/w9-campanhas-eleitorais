import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { sdk } from "./_core/sdk";
import { ONE_YEAR_MS } from "../shared/const";
import { createMfaEnrollment, verifyMfaCode } from "./authSecurity";
import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse, type AuthenticationResponseJSON, type RegistrationResponseJSON } from "@simplewebauthn/server";
import { aiRouter, campaignRouter, communicationRouter, consentRouter, contentsRouter, crisisRouter, dashboardRouter, fieldRouter, financeLegalRouter, followupsRouter, goalsRouter, insightsRouter, monitoringRouter, organizationRouter, planningRouter, platformAdminRouter, publicEventsRouter, publicIntakeRouter, reportsRouter, tasksRouter, teamRouter, territoryRouter, volunteersRouter, votersRouter } from "./routers/index";

async function establishSession(ctx: { res: any; req: any }, user: { openId: string; name: string | null }) {
  const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name ?? "", expiresInMs: ONE_YEAR_MS });
  ctx.res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(ctx.req), maxAge: ONE_YEAR_MS });
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => db.toPublicUser(opts.ctx.user)),
    updateThemePreference: protectedProcedure.input(z.object({ themePreference: z.enum(["red", "green_yellow", "blue", "emerald", "orange", "violet", "navy_red", "neutral", "custom"]), themePalette: z.object({ primary: z.string().regex(/^#[0-9a-fA-F]{6}$/), secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/), accent: z.string().regex(/^#[0-9a-fA-F]{6}$/), background: z.string().regex(/^#[0-9a-fA-F]{6}$/), surface: z.string().regex(/^#[0-9a-fA-F]{6}$/), text: z.string().regex(/^#[0-9a-fA-F]{6}$/), border: z.string().regex(/^#[0-9a-fA-F]{6}$/) }).nullable().default(null) })).mutation(async ({ ctx, input }) => {
      if (input.themePreference === "custom" && !input.themePalette) throw new Error("Uma paleta personalizada é obrigatória para este tema.");
      await db.updateUserThemePreference(ctx.user.id, input.themePreference, input.themePalette);
      return { success: true, themePreference: input.themePreference };
    }),
    register: publicProcedure.input(z.object({ name: z.string().min(2).max(160), email: z.string().email(), password: z.string().min(10).max(128) })).mutation(async ({ ctx, input }) => {
      const user = await db.registerLocalUser(input);
      await establishSession(ctx, user);
      return { user: db.toPublicUser(user), needsOnboarding: true };
    }),
    login: publicProcedure.input(z.object({ email: z.string().email(), password: z.string().min(1).max(128), mfaCode: z.string().regex(/^\d{6}$/).optional() })).mutation(async ({ ctx, input }) => {
      const security = await db.getLoginSecurityState(input.email);
      if (security?.lockedUntil && security.lockedUntil > new Date()) {
        await db.recordLoginAudit({ email: input.email, action: "login_blocked", success: false, ip: ctx.req.ip, metadata: { lockedUntil: security.lockedUntil.toISOString() } });
        throw new Error("LOGIN_TEMPORARILY_LOCKED");
      }
      const user = await db.authenticateLocalUser(input.email, input.password);
      if (!user) { await db.recordLoginFailure(input.email, ctx.req.ip); throw new Error("E-mail ou senha inválidos."); }
      const factor = await db.getMfaFactor(user.id);
      if (factor && !input.mfaCode) return { requiresMfa: true };
      if (factor && !verifyMfaCode(factor.secretCiphertext, input.mfaCode!)) { await db.recordLoginFailure(input.email, ctx.req.ip); await db.recordLoginAudit({ email: input.email, userId: user.id, action: "mfa_failed", success: false, ip: ctx.req.ip }); throw new Error("MFA_CODE_INVALID"); }
      if (factor) await db.markMfaUsed(user.id);
      await db.clearLoginFailures(input.email, user.id, ctx.req.ip);
      await establishSession(ctx, user);
      return { user: db.toPublicUser(user) };
    }),
    securityStatus: protectedProcedure.query(async ({ ctx }) => {
      const [factor, passkeys] = await Promise.all([db.getMfaFactor(ctx.user.id), db.listPasskeys(ctx.user.id)]); return { mfaEnabled: Boolean(factor), passkeysEnabled: passkeys.length > 0 };
    }),
    beginMfaEnrollment: protectedProcedure.mutation(async ({ ctx }) => {
      const enrollment = createMfaEnrollment(ctx.user.email ?? ctx.user.name ?? `user-${ctx.user.id}`);
      return { otpauthUrl: enrollment.otpauthUrl, enrollmentSecret: enrollment.secretCiphertext };
    }),
    confirmMfaEnrollment: protectedProcedure.input(z.object({ enrollmentSecret: z.string().min(20), code: z.string().regex(/^\d{6}$/) })).mutation(async ({ ctx, input }) => {
      if (!verifyMfaCode(input.enrollmentSecret, input.code)) throw new Error("MFA_CODE_INVALID");
      await db.saveMfaFactor(ctx.user.id, input.enrollmentSecret); await db.recordLoginAudit({ email: ctx.user.email ?? String(ctx.user.id), userId: ctx.user.id, action: "mfa_enabled", success: true, ip: ctx.req.ip }); return { success: true };
    }),
    beginPasskeyEnrollment: protectedProcedure.input(z.object({ origin: z.string().url(), label: z.string().min(1).max(120).default("Passkey") })).mutation(async ({ ctx, input }) => {
      const rpID = new URL(input.origin).hostname; const passkeys = await db.listPasskeys(ctx.user.id);
      const options = await generateRegistrationOptions({ rpName: "W9 Campanhas", rpID, userName: ctx.user.email ?? ctx.user.openId, userID: new TextEncoder().encode(String(ctx.user.id)), attestationType: "none", excludeCredentials: passkeys.map(item => ({ id: item.credentialId, transports: (item.transports ?? []) as AuthenticatorTransport[] })), authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" } });
      await db.saveAuthChallenge(ctx.user.id, "passkey_registration", options.challenge); return { options, label: input.label };
    }),
    finishPasskeyEnrollment: protectedProcedure.input(z.object({ origin: z.string().url(), label: z.string().min(1).max(120), response: z.unknown() })).mutation(async ({ ctx, input }) => {
      const challenge = await db.takeAuthChallenge(ctx.user.id, "passkey_registration"); if (!challenge) throw new Error("PASSKEY_CHALLENGE_EXPIRED");
      const verification = await verifyRegistrationResponse({ response: input.response as RegistrationResponseJSON, expectedChallenge: challenge.challenge, expectedOrigin: input.origin, expectedRPID: new URL(input.origin).hostname, requireUserVerification: true });
      if (!verification.verified || !verification.registrationInfo) throw new Error("PASSKEY_VERIFICATION_FAILED");
      const credential = verification.registrationInfo.credential; await db.savePasskey({ userId: ctx.user.id, credentialId: credential.id, publicKey: Buffer.from(credential.publicKey).toString("base64url"), counter: credential.counter, transports: credential.transports ?? null, label: input.label });
      await db.recordLoginAudit({ email: ctx.user.email ?? String(ctx.user.id), userId: ctx.user.id, action: "passkey_registered", success: true, ip: ctx.req.ip }); return { success: true };
    }),
    beginPasskeyLogin: publicProcedure.input(z.object({ email: z.string().email(), origin: z.string().url() })).mutation(async ({ input }) => {
      const user = await db.getUserByEmail(input.email); if (!user) throw new Error("PASSKEY_NOT_AVAILABLE"); const passkeys = await db.listPasskeys(user.id); if (!passkeys.length) throw new Error("PASSKEY_NOT_AVAILABLE");
      const options = await generateAuthenticationOptions({ rpID: new URL(input.origin).hostname, allowCredentials: passkeys.map(item => ({ id: item.credentialId, transports: (item.transports ?? []) as AuthenticatorTransport[] })), userVerification: "preferred" }); await db.saveAuthChallenge(user.id, "passkey_login", options.challenge); return { options };
    }),
    finishPasskeyLogin: publicProcedure.input(z.object({ email: z.string().email(), origin: z.string().url(), response: z.object({ id: z.string().min(1) }).passthrough() })).mutation(async ({ ctx, input }) => {
      const user = await db.getUserByEmail(input.email); if (!user) throw new Error("PASSKEY_VERIFICATION_FAILED"); const challenge = await db.takeAuthChallenge(user.id, "passkey_login"); const passkey = await db.getPasskey(input.response.id); if (!challenge || !passkey || passkey.userId !== user.id) throw new Error("PASSKEY_VERIFICATION_FAILED");
      const verification = await verifyAuthenticationResponse({ response: input.response as unknown as AuthenticationResponseJSON, expectedChallenge: challenge.challenge, expectedOrigin: input.origin, expectedRPID: new URL(input.origin).hostname, credential: { id: passkey.credentialId, publicKey: Buffer.from(passkey.publicKey, "base64url"), counter: passkey.counter, transports: (passkey.transports ?? []) as AuthenticatorTransport[] }, requireUserVerification: true });
      if (!verification.verified) throw new Error("PASSKEY_VERIFICATION_FAILED"); await db.markPasskeyUsed(passkey.id, verification.authenticationInfo.newCounter); await db.recordLoginAudit({ email: input.email, userId: user.id, action: "passkey_login", success: true, ip: ctx.req.ip }); await establishSession(ctx, user); return { user: db.toPublicUser(user) };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  campaign: campaignRouter,
  organization: organizationRouter,
  platformAdmin: platformAdminRouter,
  dashboard: dashboardRouter,
  team: teamRouter,
  planning: planningRouter,
  goals: goalsRouter,
  tasks: tasksRouter,
  voters: votersRouter,
  monitoring: monitoringRouter,
  territory: territoryRouter,
  contents: contentsRouter,
  followups: followupsRouter,
  field: fieldRouter,
  communication: communicationRouter,
  consent: consentRouter,
  crisis: crisisRouter,
  insights: insightsRouter,
  publicIntake: publicIntakeRouter,
  publicEvents: publicEventsRouter,
  volunteers: volunteersRouter,
  reports: reportsRouter,
  financeLegal: financeLegalRouter,
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
