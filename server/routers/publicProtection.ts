import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { volunteers } from "../../drizzle/schema";
import { publicProcedure, router } from "../_core/trpc";
import * as db from "../campaignDb";
import { campaignCapabilityProcedure } from "../campaignAuthorization";
import { createPublicIntakeAtomic } from "../criticalWriteCommands";
import { getDb } from "../db";
import {
  assertPublicFormTiming,
  getPublicAbuseStore,
  hashVolunteerToken,
  normalizePublicEmail,
  normalizePublicPhone,
  opaquePublicReference,
  publicCommandKey,
  PublicFormRejectedError,
  PublicRateLimitError,
  submitPublicVolunteer,
} from "../publicAbuseProtection";
import { publicIntakeRouter as basePublicIntakeRouter } from "./criticalWrites";
import { volunteersRouter as baseVolunteersRouter } from "./campaign";

function baseRecord<TRecord extends Record<string, any>>(value: { _def: { record: TRecord } }): TRecord {
  return value._def.record;
}

function remoteSignal(ctx: { req: { ip?: string; socket?: { remoteAddress?: string | null } } }) {
  return ctx.req.ip || ctx.req.socket?.remoteAddress || "unknown";
}

function unitTestWithoutDb() {
  return process.env.NODE_ENV === "test" && !process.env.DATABASE_URL;
}

async function rate(input: { campaignId: number; routeKey: string; signal: string; limit: number; windowMs: number }) {
  if (unitTestWithoutDb()) return;
  try {
    await getPublicAbuseStore().assertRateLimit(input);
  } catch (error) {
    if (error instanceof PublicRateLimitError) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Muitas tentativas. Aguarde alguns minutos e tente novamente." });
    throw error;
  }
}

function verifyHumanForm(input: { website?: string | null; formStartedAt: number }) {
  try {
    assertPublicFormTiming(input);
  } catch (error) {
    if (error instanceof PublicFormRejectedError) throw new TRPCError({ code: "BAD_REQUEST", message: "Não foi possível processar o formulário." });
    throw error;
  }
}

async function resolvePortalVolunteer(token: string) {
  if (unitTestWithoutDb()) return db.getVolunteerByAccessTokenHash(hashVolunteerToken(token));
  return getPublicAbuseStore().resolvePortalToken(token);
}

const guardedPublicIntake = publicProcedure.input(z.object({
  campaignId: z.number().int().positive(),
  name: z.string().min(2).max(180),
  phone: z.string().max(32).optional(),
  email: z.string().trim().email().optional(),
  neighborhood: z.string().max(120).optional(),
  region: z.string().max(120).optional(),
  contactProfile: z.string().max(120).optional(),
  consent: z.literal(true),
  requestId: z.string().uuid(),
  formStartedAt: z.number().int().positive(),
  website: z.string().max(200).optional(),
})).mutation(async ({ ctx, input }) => {
  verifyHumanForm(input);
  const campaign = await db.getPublicCampaign(input.campaignId);
  if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Este formulário não está disponível." });
  const email = input.email ? normalizePublicEmail(input.email) : null;
  const phone = normalizePublicPhone(input.phone);
  const identity = email || phone || input.requestId;
  await rate({ campaignId: input.campaignId, routeKey: "public_intake_campaign", signal: "campaign", limit: 120, windowMs: 15 * 60_000 });
  await rate({ campaignId: input.campaignId, routeKey: "public_intake_remote", signal: remoteSignal(ctx), limit: 30, windowMs: 15 * 60_000 });
  await rate({ campaignId: input.campaignId, routeKey: "public_intake_identity", signal: identity, limit: 8, windowMs: 15 * 60_000 });
  const commandKey = publicCommandKey({ campaignId: input.campaignId, routeKey: "public_intake", normalizedEmail: email, normalizedPhone: phone, requestId: input.requestId });
  await createPublicIntakeAtomic({
    campaignId: input.campaignId,
    commandKey,
    voter: {
      name: input.name.trim(), phone, email, neighborhood: input.neighborhood?.trim() || null, region: input.region?.trim() || null,
      contactProfile: input.contactProfile?.trim() || null, address: null, engagementLevel: "medium", pipelineStage: "identified",
      primaryDemand: null, notes: "Cadastro público consentido", contactConsent: true, doNotContact: false, ownerMemberId: null,
    },
    consent: { purpose: "cadastro público consentido", source: "formulário público", evidence: "Confirmação expressa registrada no formulário público.", noticeVersion: "formulário-público-2026.1", occurredAt: new Date() },
  });
  return { accepted: true as const, reference: opaquePublicReference({ campaignId: input.campaignId, routeKey: "public_intake", requestKey: commandKey }) };
});

export const publicIntakeRouter = router({ ...baseRecord(basePublicIntakeRouter), submit: guardedPublicIntake });

const publicSignup = publicProcedure.input(z.object({
  campaignId: z.number().int().positive(), name: z.string().min(2).max(180), email: z.string().trim().email().max(320), phone: z.string().max(32).optional(),
  neighborhood: z.string().max(120).optional(), region: z.string().max(120).optional(), availability: z.string().max(2000).optional(), skills: z.string().max(1000).optional(), consent: z.literal(true),
  requestId: z.string().uuid(), formStartedAt: z.number().int().positive(), website: z.string().max(200).optional(),
})).mutation(async ({ ctx, input }) => {
  verifyHumanForm(input);
  const campaign = await db.getPublicCampaign(input.campaignId);
  if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Esta campanha não está disponível para inscrição." });
  const email = normalizePublicEmail(input.email);
  const phone = normalizePublicPhone(input.phone);
  await rate({ campaignId: input.campaignId, routeKey: "volunteer_signup_campaign", signal: "campaign", limit: 100, windowMs: 15 * 60_000 });
  await rate({ campaignId: input.campaignId, routeKey: "volunteer_signup_remote", signal: remoteSignal(ctx), limit: 30, windowMs: 15 * 60_000 });
  await rate({ campaignId: input.campaignId, routeKey: "volunteer_signup_identity", signal: email, limit: 5, windowMs: 15 * 60_000 });
  return submitPublicVolunteer({ ...input, email, phone });
});

const portal = publicProcedure.input(z.object({ token: z.string().min(32).max(128) })).query(async ({ ctx, input }) => {
  await rate({ campaignId: 0, routeKey: "volunteer_portal_remote", signal: remoteSignal(ctx), limit: 120, windowMs: 10 * 60_000 });
  await rate({ campaignId: 0, routeKey: "volunteer_portal_token", signal: hashVolunteerToken(input.token), limit: 60, windowMs: 10 * 60_000 });
  const volunteer = await resolvePortalVolunteer(input.token);
  if (!volunteer) throw new TRPCError({ code: "NOT_FOUND", message: "Acesso de voluntário não encontrado." });
  const [assignments, trainingMaterials, certificate, certificateHistory, certificateSettings] = await Promise.all([
    db.listVolunteerAssignments(volunteer.campaignId, volunteer.id), db.listVolunteerTrainingMaterials(volunteer.campaignId, volunteer.id), db.getVolunteerTrainingCertificate(volunteer.campaignId, volunteer.id), db.listVolunteerTrainingCertificates(volunteer.campaignId, volunteer.id), db.getCampaignCertificateSettings(volunteer.campaignId),
  ]);
  return { volunteer: { name: volunteer.name, neighborhood: volunteer.neighborhood, region: volunteer.region, availability: volunteer.availability, skills: volunteer.skills, trainingStatus: volunteer.trainingStatus, status: volunteer.status }, assignments: assignments.map(item => ({ id: item.id, title: item.title, description: item.description, territory: item.territory, scheduledAt: item.scheduledAt, status: item.status })), trainingMaterials: trainingMaterials.map(item => ({ id: item.id, title: item.title, description: item.description, materialType: item.materialType, resourceUrl: item.resourceUrl, content: item.content, durationMinutes: item.durationMinutes, dueAt: item.dueAt, completedAt: item.completedAt })), certificate, certificateHistory, certificateSettings };
});

async function portalMutationGuard(ctx: any, token: string) {
  await rate({ campaignId: 0, routeKey: "volunteer_portal_mutation_remote", signal: remoteSignal(ctx), limit: 80, windowMs: 10 * 60_000 });
  await rate({ campaignId: 0, routeKey: "volunteer_portal_mutation_token", signal: hashVolunteerToken(token), limit: 20, windowMs: 10 * 60_000 });
  const volunteer = await resolvePortalVolunteer(token);
  if (!volunteer) throw new TRPCError({ code: "NOT_FOUND", message: "Acesso de voluntário não encontrado." });
  return volunteer;
}

const updatePortalProfile = publicProcedure.input(z.object({ token: z.string().min(32).max(128), availability: z.string().max(2000).optional(), skills: z.string().max(1000).optional() })).mutation(async ({ ctx, input }) => {
  const volunteer = await portalMutationGuard(ctx, input.token);
  await db.updateVolunteerPortalProfile(volunteer.id, { availability: input.availability ?? null, skills: input.skills ?? null });
  return { success: true };
});

const updateOwnAssignmentStatus = publicProcedure.input(z.object({ token: z.string().min(32).max(128), assignmentId: z.number().int().positive(), status: z.enum(["accepted", "completed"]) })).mutation(async ({ ctx, input }) => {
  const volunteer = await portalMutationGuard(ctx, input.token);
  const assignment = await db.getVolunteerAssignment(input.assignmentId);
  if (!assignment || assignment.volunteerId !== volunteer.id) throw new TRPCError({ code: "NOT_FOUND", message: "Tarefa não encontrada." });
  await db.updateVolunteerAssignmentStatus(input.assignmentId, input.status);
  return { success: true };
});

const completeTrainingMaterial = publicProcedure.input(z.object({ token: z.string().min(32).max(128), materialId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
  const volunteer = await portalMutationGuard(ctx, input.token);
  const material = await db.getVolunteerTrainingMaterial(input.materialId);
  if (!material || material.campaignId !== volunteer.campaignId || !material.active) throw new TRPCError({ code: "NOT_FOUND", message: "Material de treinamento não encontrado." });
  return db.completeVolunteerTrainingMaterial({ campaignId: volunteer.campaignId, materialId: material.id, volunteerId: volunteer.id });
});

const issuePortalAccess = campaignCapabilityProcedure("volunteers.manage").input(z.object({ campaignId: z.number().int().positive(), volunteerId: z.number().int().positive() })).mutation(async ({ input }) => {
  const drizzle = await getDb();
  if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  const volunteer = (await drizzle.select({ id: volunteers.id }).from(volunteers).where(eq(volunteers.id, input.volunteerId)).limit(1))[0];
  if (!volunteer) throw new TRPCError({ code: "NOT_FOUND" });
  const result = await getPublicAbuseStore().issuePortalToken(input);
  return { portalToken: result.token, expiresAt: result.expiresAt };
});

const revokePortalAccess = campaignCapabilityProcedure("volunteers.manage").input(z.object({ campaignId: z.number().int().positive(), volunteerId: z.number().int().positive() })).mutation(async ({ input }) => {
  await getPublicAbuseStore().revokePortalAccess(input);
  return { success: true as const };
});

export const volunteersRouter = router({
  ...baseRecord(baseVolunteersRouter), publicSignup, portal, updatePortalProfile, updateOwnAssignmentStatus, completeTrainingMaterial, issuePortalAccess, revokePortalAccess,
});
