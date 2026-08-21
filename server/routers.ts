import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { sdk } from "./_core/sdk";
import { ONE_YEAR_MS } from "../shared/const";
import { aiRouter, campaignRouter, communicationRouter, consentRouter, contentsRouter, crisisRouter, dashboardRouter, fieldRouter, financeLegalRouter, followupsRouter, goalsRouter, insightsRouter, monitoringRouter, organizationRouter, planningRouter, publicEventsRouter, publicIntakeRouter, reportsRouter, tasksRouter, teamRouter, territoryRouter, volunteersRouter, votersRouter } from "./routers/index";

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
    login: publicProcedure.input(z.object({ email: z.string().email(), password: z.string().min(1).max(128) })).mutation(async ({ ctx, input }) => {
      const user = await db.authenticateLocalUser(input.email, input.password);
      if (!user) throw new Error("E-mail ou senha inválidos.");
      await establishSession(ctx, user);
      return { user: db.toPublicUser(user) };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  campaign: campaignRouter,
  organization: organizationRouter,
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
