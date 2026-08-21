import { TRPCError } from "@trpc/server";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import * as db from "../campaignDb";
import { canAccessOwnedRecord, canManageCampaign, canManageTeam, CampaignRole } from "../campaignPolicy";
import { parseContactsCsv } from "../csvContacts";
import { deduplicateWithFlask } from "../flaskDeduplication";
import { storagePut } from "../storage";
import { isFinancialStatusTransitionAllowed } from "../financialStatus";
import { assertUploadRateLimit } from "../uploadRateLimit";

const campaignIdInput = z.object({ campaignId: z.number().int().positive() });
const memberRoles = ["admin", "coordinator", "partner"] as const;

type Access = NonNullable<Awaited<ReturnType<typeof db.getCampaignAccess>>>;

async function requireAccess(userId: number, campaignId: number): Promise<Access> {
  const access = await db.getCampaignAccess(campaignId, userId);
  if (!access) throw new TRPCError({ code: "FORBIDDEN", message: "Você não possui acesso a esta campanha." });
  return access;
}

function hashVolunteerToken(token: string) { return createHash("sha256").update(token).digest("hex"); }

function parseCertificateAsset(dataUrl: string) {
  if (dataUrl.startsWith("data:image/svg")) throw new TRPCError({ code: "BAD_REQUEST", message: "SVG não é permitido em ativos de certificado." });
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new TRPCError({ code: "BAD_REQUEST", message: "Envie uma imagem PNG, JPEG ou WebP válida." });
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > 2 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "A imagem deve ter no máximo 2 MB." });
  const isPng = bytes.length >= 4 && bytes.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const isJpeg = bytes.length >= 3 && bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  const isWebp = bytes.length >= 12 && bytes.subarray(0, 4).equals(Buffer.from("RIFF")) && bytes.subarray(8, 12).equals(Buffer.from("WEBP"));
  const isExpectedFormat = (match[1] === "image/png" && isPng) || (match[1] === "image/jpeg" && isJpeg) || (match[1] === "image/webp" && isWebp);
  if (!isExpectedFormat) throw new TRPCError({ code: "BAD_REQUEST", message: "O conteúdo do arquivo não corresponde ao formato de imagem informado." });
  const extension = match[1] === "image/jpeg" ? "jpg" : match[1].split("/")[1];
  return { bytes, mimeType: match[1], extension };
}

function requireCapability(access: Access, action: "manage" | "team" | "own_data") {
  const role = access.member?.role ?? (access.campaign.ownerId ? "admin" : null) as CampaignRole | null;
  if (!role) throw new TRPCError({ code: "FORBIDDEN", message: "Vínculo da campanha não encontrado." });
  if (action === "team" && !canManageTeam(role)) throw new TRPCError({ code: "FORBIDDEN", message: "Somente administradores podem gerenciar a equipe." });
  if (action === "manage" && !canManageCampaign(role)) throw new TRPCError({ code: "FORBIDDEN", message: "Seu perfil possui acesso restrito aos próprios registros." });
  return role;
}

export const campaignRouter = router({
  list: protectedProcedure.input(z.object({ organizationId: z.number().int().positive().optional() }).optional()).query(async ({ ctx, input }) => {
    if (input?.organizationId && !await db.getOrganizationMembership(ctx.user.id, input.organizationId)) throw new TRPCError({ code: "FORBIDDEN", message: "Organização não disponível para este usuário." });
    return db.listCampaignsForUser(ctx.user.id, input?.organizationId);
  }),
  create: protectedProcedure.input(z.object({ organizationId: z.number().int().positive().optional(), name: z.string().min(3).max(160), candidateName: z.string().min(3).max(160), electionLabel: z.string().min(3).max(120), region: z.string().min(2).max(160) })).mutation(async ({ ctx, input }) => {
    const organizationId = input.organizationId ?? await db.getOrCreateInitialOrganization(ctx.user.id, ctx.user.name);
    const membership = await db.getOrganizationMembership(ctx.user.id, organizationId);
    if (!membership || !["admin", "manager"].includes(membership.role)) throw new TRPCError({ code: "FORBIDDEN", message: "Você não possui permissão para criar campanhas nesta organização." });
    const id = await db.createCampaignWithOwner({ organizationId, ownerId: ctx.user.id, ownerName: ctx.user.name ?? "Administrador", ownerEmail: ctx.user.email ?? "sem-email@w9.local", ...input });
    return { id };
  }),
  details: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => requireAccess(ctx.user.id, input.campaignId)),
  updateDetails: protectedProcedure.input(campaignIdInput.extend({ name: z.string().min(3).max(160), candidateName: z.string().min(3).max(160), electionLabel: z.string().min(3).max(120), region: z.string().min(2).max(160), status: z.enum(["planning", "active", "paused", "closed"]) })).mutation(async ({ ctx, input }) => {
    const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "team");
    const { campaignId, ...details } = input; await db.updateCampaignDetails(campaignId, { ...details, actorUserId: ctx.user.id }); return { success: true };
  }),
  publicInfo: publicProcedure.input(campaignIdInput).query(({ input }) => db.getPublicCampaign(input.campaignId)),
});

export const dashboardRouter = router({
  summary: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => {
    const access = await requireAccess(ctx.user.id, input.campaignId);
    return db.getDashboardData(input.campaignId, access.member?.role === "partner" ? access.member.id : null);
  }),
  dailySummary: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => {
    const access = await requireAccess(ctx.user.id, input.campaignId);
    return db.getDailySummary(input.campaignId, access.member?.role === "partner" ? access.member.id : null);
  }),
});

export const teamRouter = router({
  list: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { await requireAccess(ctx.user.id, input.campaignId); return db.listMembers(input.campaignId); }),
  create: protectedProcedure.input(campaignIdInput.extend({ name: z.string().min(2).max(160), phone: z.string().trim().min(8).max(32).regex(/^\+?[0-9()\s.-]+$/, "Informe um telefone válido."), role: z.enum(memberRoles), responsibility: z.string().max(220).optional(), workRegion: z.string().max(160).optional() })).mutation(async ({ ctx, input }) => {
    const access = await requireAccess(ctx.user.id, input.campaignId);
    requireCapability(access, "team");
    const { campaignId, ...member } = input;
    return { id: await db.createMember({ campaignId, ...member }) };
  }),
  updatePhone: protectedProcedure.input(campaignIdInput.extend({ memberId: z.number().int().positive(), phone: z.string().trim().min(8).max(32).regex(/^\+?[0-9()\s.-]+$/, "Informe um telefone válido.") })).mutation(async ({ ctx, input }) => {
    const access = await requireAccess(ctx.user.id, input.campaignId);
    requireCapability(access, "team");
    const member = await db.getCampaignMember(input.campaignId, input.memberId);
    if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "Membro não encontrado nesta campanha." });
    await db.updateMemberPhone(input.campaignId, input.memberId, input.phone);
    return { success: true };
  }),
  performance: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return db.getTeamPerformance(input.campaignId); }),
  benchmark: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return db.getTeamBenchmark(input.campaignId); }),
});

export const planningRouter = router({
  list: protectedProcedure.input(campaignIdInput.extend({ startsAt: z.date().optional(), endsAt: z.date().optional() })).query(async ({ ctx, input }) => { await requireAccess(ctx.user.id, input.campaignId); return db.listEvents(input.campaignId, input.startsAt, input.endsAt); }),
  indicators: protectedProcedure.input(campaignIdInput.extend({ startsAt: z.date().optional(), endsAt: z.date().optional(), neighborhood: z.string().max(120).optional(), region: z.string().max(120).optional() })).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return db.getEventIndicators(input); }),
  targetAlerts: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return db.getUpcomingEventTargetAlerts(input.campaignId); }),
  compareIndicators: protectedProcedure.input(campaignIdInput.extend({ startsAt: z.date(), endsAt: z.date(), neighborhood: z.string().max(120).optional(), region: z.string().max(120).optional() })).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); if (input.endsAt <= input.startsAt) throw new TRPCError({ code: "BAD_REQUEST", message: "O fim do período deve ser posterior ao início." }); return db.compareEventIndicators(input); }),
  exportHistory: router({
    list: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return db.listCampaignExportVersions(input.campaignId); }),
    create: protectedProcedure.input(campaignIdInput.extend({ exportType: z.enum(["indicators", "weekly_presentation"]), title: z.string().min(3).max(255), periodStart: z.date().optional(), periodEnd: z.date().optional(), sections: z.array(z.string().min(1).max(80)).min(1).max(12), strategicNotes: z.string().max(4000).optional(), snapshot: z.unknown() })).mutation(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return { id: await db.createCampaignExportVersion({ ...input, createdByUserId: ctx.user.id, periodStart: input.periodStart ?? null, periodEnd: input.periodEnd ?? null, strategicNotes: input.strategicNotes ?? null }) }; }),
  }),
  create: protectedProcedure.input(campaignIdInput.extend({ title: z.string().min(3).max(200), type: z.enum(["meeting", "rally", "visit", "debate", "internal", "other"]), startsAt: z.date(), endsAt: z.date().optional(), location: z.string().max(240).optional(), neighborhood: z.string().max(120).optional(), region: z.string().max(120).optional(), responsibleId: z.number().int().positive().optional(), notes: z.string().max(3000).optional(), publicRegistrationEnabled: z.boolean().default(false), registrationClosesAt: z.date().optional(), capacity: z.number().int().min(1).max(100000).optional(), attendanceTarget: z.number().int().min(1).max(100000).optional(), mobilizationAlertHours: z.number().int().min(1).max(720).default(48), postEventSurveyPrompt: z.string().max(1200).optional() })).mutation(async ({ ctx, input }) => {
    const access = await requireAccess(ctx.user.id, input.campaignId);
    requireCapability(access, "manage");
    return { id: await db.createEvent({ ...input, endsAt: input.endsAt ?? null, location: input.location ?? null, neighborhood: input.neighborhood ?? null, region: input.region ?? null, responsibleId: input.responsibleId ?? null, notes: input.notes ?? null, registrationClosesAt: input.registrationClosesAt ?? null, capacity: input.capacity ?? null, attendanceTarget: input.attendanceTarget ?? null, postEventSurveyPrompt: input.postEventSurveyPrompt ?? null }) };
  }),
  update: protectedProcedure.input(z.object({ eventId: z.number().int().positive(), title: z.string().min(3).max(200), type: z.enum(["meeting", "rally", "visit", "debate", "internal", "other"]), startsAt: z.date(), endsAt: z.date().optional(), location: z.string().max(240).optional(), neighborhood: z.string().max(120).optional(), region: z.string().max(120).optional(), responsibleId: z.number().int().positive().optional(), notes: z.string().max(3000).optional(), status: z.enum(["scheduled", "completed", "cancelled"]), publicRegistrationEnabled: z.boolean().default(false), registrationClosesAt: z.date().optional(), capacity: z.number().int().min(1).max(100000).optional(), attendanceTarget: z.number().int().min(1).max(100000).optional(), mobilizationAlertHours: z.number().int().min(1).max(720).default(48), postEventSurveyPrompt: z.string().max(1200).optional() })).mutation(async ({ ctx, input }) => {
    const event = await db.getEvent(input.eventId); if (!event) throw new TRPCError({ code: "NOT_FOUND" });
    const access = await requireAccess(ctx.user.id, event.campaignId); requireCapability(access, "manage");
    const { eventId, ...changes } = input; await db.updateEvent(eventId, { ...changes, endsAt: changes.endsAt ?? null, location: changes.location ?? null, neighborhood: changes.neighborhood ?? null, region: changes.region ?? null, responsibleId: changes.responsibleId ?? null, notes: changes.notes ?? null, registrationClosesAt: changes.registrationClosesAt ?? null, capacity: changes.capacity ?? null, attendanceTarget: changes.attendanceTarget ?? null, postEventSurveyPrompt: changes.postEventSurveyPrompt ?? null }); return { success: true };
  }),
  remove: protectedProcedure.input(z.object({ eventId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const event = await db.getEvent(input.eventId); if (!event) throw new TRPCError({ code: "NOT_FOUND" }); const access = await requireAccess(ctx.user.id, event.campaignId); requireCapability(access, "manage");
    try { await db.deleteEventIfEmpty(input.eventId); return { success: true }; }
    catch (error) { if (error instanceof Error && error.message === "EVENT_HAS_REGISTRATIONS") throw new TRPCError({ code: "CONFLICT", message: "Este evento possui inscrições. Cancele-o para preservar o histórico de participação." }); throw error; }
  }),
  participation: protectedProcedure.input(z.object({ eventId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const event = await db.getEvent(input.eventId); if (!event) throw new TRPCError({ code: "NOT_FOUND" });
    const access = await requireAccess(ctx.user.id, event.campaignId); requireCapability(access, "manage");
    const [summary, registrations] = await Promise.all([db.getEventParticipationSummary(event.campaignId, event.id), db.listEventRegistrations(event.campaignId, event.id)]);
    return { event, summary, registrations };
  }),
  updateRegistrationStatus: protectedProcedure.input(z.object({ eventId: z.number().int().positive(), registrationId: z.number().int().positive(), status: z.enum(["registered", "checked_in", "cancelled", "no_show"]) })).mutation(async ({ ctx, input }) => {
    const event = await db.getEvent(input.eventId); if (!event) throw new TRPCError({ code: "NOT_FOUND" });
    const access = await requireAccess(ctx.user.id, event.campaignId); requireCapability(access, "manage");
    await db.updateEventRegistrationStatus({ campaignId: event.campaignId, eventId: event.id, registrationId: input.registrationId, status: input.status, actorUserId: ctx.user.id });
    return { success: true };
  }),
});

export const publicEventsRouter = router({
  details: publicProcedure.input(z.object({ eventId: z.number().int().positive() })).query(async ({ input }) => {
    const event = await db.getPublicEvent(input.eventId);
    if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Este evento não está disponível para inscrição." });
    return event;
  }),
  register: publicProcedure.input(z.object({ eventId: z.number().int().positive(), name: z.string().min(2).max(180), email: z.string().email().max(320), phone: z.string().max(32).optional() })).mutation(async ({ input }) => {
    try { return await db.registerForPublicEvent({ ...input, phone: input.phone ?? null }); }
    catch (error) {
      const message = error instanceof Error ? error.message : "EVENT_REGISTRATION_FAILED";
      const messages: Record<string, string> = { EVENT_UNAVAILABLE: "Este evento não está disponível para inscrição.", REGISTRATION_CLOSED: "As inscrições para este evento foram encerradas.", EVENT_FULL: "As vagas deste evento foram preenchidas." };
      throw new TRPCError({ code: "BAD_REQUEST", message: messages[message] ?? "Não foi possível concluir a inscrição." });
    }
  }),
  feedback: publicProcedure.input(z.object({ token: z.string().min(20).max(128) })).query(async ({ input }) => {
    const registration = await db.getEventRegistrationByAccessToken(input.token);
    if (!registration) throw new TRPCError({ code: "NOT_FOUND", message: "Acesso de participação não encontrado." });
    return { registration: { name: registration.registration.name, status: registration.registration.status, feedbackRating: registration.registration.feedbackRating, feedbackComment: registration.registration.feedbackComment }, event: registration.event, campaign: registration.campaign };
  }),
  submitFeedback: publicProcedure.input(z.object({ token: z.string().min(20).max(128), rating: z.number().int().min(1).max(5), comment: z.string().max(1500).optional() })).mutation(async ({ input }) => {
    try { await db.submitEventFeedback({ token: input.token, rating: input.rating, comment: input.comment ?? null }); return { success: true }; }
    catch { throw new TRPCError({ code: "NOT_FOUND", message: "Acesso de participação não encontrado." }); }
  }),
});

export const goalsRouter = router({
  list: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { await requireAccess(ctx.user.id, input.campaignId); return db.listGoals(input.campaignId); }),
  create: protectedProcedure.input(campaignIdInput.extend({ title: z.string().min(3).max(200), description: z.string().max(3000).optional(), targetValue: z.number().int().positive(), unit: z.string().min(1).max(40), deadline: z.date().optional() })).mutation(async ({ ctx, input }) => {
    const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage");
    return { id: await db.createGoal({ ...input, description: input.description ?? null, deadline: input.deadline ?? null }) };
  }),
});

export const tasksRouter = router({
  list: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => {
    const access = await requireAccess(ctx.user.id, input.campaignId);
    return db.listTasks(input.campaignId, access.member?.role === "partner" ? access.member.id : null);
  }),
  create: protectedProcedure.input(campaignIdInput.extend({ goalId: z.number().int().positive().optional(), title: z.string().min(3).max(220), description: z.string().max(3000).optional(), priority: z.enum(["low", "medium", "high", "urgent"]), assignedToId: z.number().int().positive().optional(), dueAt: z.date().optional() })).mutation(async ({ ctx, input }) => {
    const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage");
    return { id: await db.createTask({ campaignId: input.campaignId, goalId: input.goalId ?? null, title: input.title, description: input.description ?? null, priority: input.priority, assignedToId: input.assignedToId ?? null, dueAt: input.dueAt ?? null, createdById: ctx.user.id }) };
  }),
  updateStatus: protectedProcedure.input(z.object({ taskId: z.number().int().positive(), status: z.enum(["backlog", "todo", "in_progress", "review", "done"]) })).mutation(async ({ ctx, input }) => {
    const task = await db.getTask(input.taskId); if (!task) throw new TRPCError({ code: "NOT_FOUND" });
    const access = await requireAccess(ctx.user.id, task.campaignId);
    if (access.member?.role === "partner" && !canAccessOwnedRecord("partner", task.assignedToId, access.member.id)) throw new TRPCError({ code: "FORBIDDEN", message: "Você só pode atualizar tarefas atribuídas a você." });
    await db.updateTaskStatus(input.taskId, input.status); return { success: true };
  }),
});

export const votersRouter = router({
  list: protectedProcedure.input(campaignIdInput.extend({ neighborhood: z.string().max(120).optional(), region: z.string().max(120).optional(), contactProfile: z.string().max(120).optional() })).query(async ({ ctx, input }) => {
    const access = await requireAccess(ctx.user.id, input.campaignId);
    return db.listVoters({ ...input, memberId: access.member?.role === "partner" ? access.member.id : null });
  }),
  create: protectedProcedure.input(campaignIdInput.extend({ name: z.string().min(2).max(180), phone: z.string().max(32).optional(), email: z.string().email().optional(), address: z.string().max(1000).optional(), neighborhood: z.string().max(120).optional(), region: z.string().max(120).optional(), contactProfile: z.string().max(120).optional(), engagementLevel: z.enum(["low", "medium", "high"]).default("medium"), primaryDemand: z.string().max(3000).optional(), notes: z.string().max(3000).optional(), contactConsent: z.boolean() })).mutation(async ({ ctx, input }) => {
    const access = await requireAccess(ctx.user.id, input.campaignId);
    const ownerMemberId = access.member?.role === "partner" ? access.member.id : access.member?.id ?? null;
    return { id: await db.createVoter({ ...input, phone: input.phone ?? null, email: input.email ?? null, address: input.address ?? null, neighborhood: input.neighborhood ?? null, region: input.region ?? null, contactProfile: input.contactProfile ?? null, primaryDemand: input.primaryDemand ?? null, notes: input.notes ?? null, ownerMemberId }) };
  }),
  movePipeline: protectedProcedure.input(z.object({ voterId: z.number().int().positive(), pipelineStage: z.enum(["identified", "approached", "engaged", "mobilized"]) })).mutation(async ({ ctx, input }) => {
    const voter = await db.getVoter(input.voterId); if (!voter) throw new TRPCError({ code: "NOT_FOUND" });
    const access = await requireAccess(ctx.user.id, voter.campaignId);
    if (access.member?.role === "partner" && !canAccessOwnedRecord("partner", voter.ownerMemberId, access.member.id)) throw new TRPCError({ code: "FORBIDDEN", message: "Você só pode atualizar contatos sob sua responsabilidade." });
    await db.updateVoterPipeline(input.voterId, input.pipelineStage);
    const followup = await db.createFollowupForPipeline({ campaignId: voter.campaignId, voterId: voter.id, assignedToId: voter.ownerMemberId, stage: input.pipelineStage });
    return { success: true, followup };
  }),
  previewCsv: protectedProcedure.input(campaignIdInput.extend({ csv: z.string().min(12).max(2_000_000) })).mutation(async ({ ctx, input }) => {
    const access = await requireAccess(ctx.user.id, input.campaignId);
    const parsed = parseContactsCsv(input.csv);
    if (parsed.errors.length) return { errors: parsed.errors, newContacts: [], updates: [], candidates: [] };
    const existing = await db.listImportContacts(input.campaignId);
    const deduplicated = await deduplicateWithFlask({ existing, incoming: parsed.rows.map((row, index) => ({ ...row, row: index + 2 })) });
    return { errors: [], ...deduplicated };
  }),
  commitCsv: protectedProcedure.input(campaignIdInput.extend({ csv: z.string().min(12).max(2_000_000), approvedUpdateRows: z.array(z.number().int().min(2)).max(1000), approvedCandidateRows: z.array(z.number().int().min(2)).max(1000) })).mutation(async ({ ctx, input }) => {
    const access = await requireAccess(ctx.user.id, input.campaignId);
    const parsed = parseContactsCsv(input.csv);
    if (parsed.errors.length) return { imported: 0, updated: 0, skippedCandidates: 0, errors: parsed.errors, importedContacts: [], updatedContacts: [] };
    const existing = await db.listImportContacts(input.campaignId);
    const review = await deduplicateWithFlask({ existing, incoming: parsed.rows.map((row, index) => ({ ...row, row: index + 2 })) });
    const byRow = new Map(review.newContacts.map(row => [row.row, row]));
    const sourceRows = new Map(parsed.rows.map((row, index) => [index + 2, { ...row, row: index + 2 }]));
    const ownerMemberId = access.member?.role === "partner" ? access.member.id : access.member?.id ?? null;
    const candidateRows = review.candidates.filter(item => input.approvedCandidateRows.includes(item.row)).map(item => sourceRows.get(item.row)).filter((row): row is NonNullable<typeof row> => Boolean(row));
    const rowsToCreate = [...Array.from(byRow.values()), ...candidateRows];
    const recordsToCreate = rowsToCreate.map(({ row: _row, ...row }) => ({ ...row, campaignId: input.campaignId, ownerMemberId }));
    const imported = await db.createVotersBatch(recordsToCreate);
    const updates = review.updates.filter(item => input.approvedUpdateRows.includes(item.row) && item.existing).map(item => ({ item, row: sourceRows.get(item.row) })).filter((value): value is { item: typeof review.updates[number]; row: NonNullable<typeof value.row> } => Boolean(value.row));
    await Promise.all(updates.map(({ item, row }) => db.updateVoterFromImport(item.existing!.id, { name: row.name, phone: row.phone, email: row.email, address: row.address, neighborhood: row.neighborhood, region: row.region, contactProfile: row.contactProfile, engagementLevel: row.engagementLevel, primaryDemand: row.primaryDemand, notes: row.notes, contactConsent: true, doNotContact: false })));
    return { imported, updated: updates.length, skippedCandidates: review.candidates.length - candidateRows.length, errors: [], importedContacts: recordsToCreate.map((contact, index) => ({ row: rowsToCreate[index].row, name: contact.name, email: contact.email, phone: contact.phone })), updatedContacts: updates.map(({ item, row }) => ({ row: row.row, name: row.name, existingId: item.existing!.id })) };
  }),
  addInteraction: protectedProcedure.input(z.object({ voterId: z.number().int().positive(), type: z.enum(["visit", "phone", "whatsapp", "event", "audio", "other"]), notes: z.string().min(2).max(3000), happenedAt: z.date().optional() })).mutation(async ({ ctx, input }) => {
    const voter = await db.getVoter(input.voterId); if (!voter) throw new TRPCError({ code: "NOT_FOUND" });
    const access = await requireAccess(ctx.user.id, voter.campaignId);
    if (access.member?.role === "partner" && !canAccessOwnedRecord("partner", voter.ownerMemberId, access.member.id)) throw new TRPCError({ code: "FORBIDDEN", message: "Você só pode registrar interações dos seus contatos." });
    return { id: await db.createVoterInteraction({ voterId: input.voterId, campaignId: voter.campaignId, memberId: access.member?.id ?? null, type: input.type, notes: input.notes, happenedAt: input.happenedAt ?? new Date() }) };
  }),
  interactions: protectedProcedure.input(z.object({ voterId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const voter = await db.getVoter(input.voterId); if (!voter) throw new TRPCError({ code: "NOT_FOUND" });
    const access = await requireAccess(ctx.user.id, voter.campaignId);
    if (access.member?.role === "partner" && !canAccessOwnedRecord("partner", voter.ownerMemberId, access.member.id)) throw new TRPCError({ code: "FORBIDDEN" });
    return db.listVoterInteractions(input.voterId);
  }),
});

export const monitoringRouter = router({
  list: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); return db.listIncidents(input.campaignId, access.member?.role === "partner" ? access.member.id : null); }),
  create: protectedProcedure.input(campaignIdInput.extend({ title: z.string().min(3).max(200), description: z.string().min(4).max(3000), category: z.string().min(2).max(100), priority: z.enum(["low", "medium", "high", "urgent"]), location: z.string().max(220).optional(), neighborhood: z.string().max(120).optional(), region: z.string().max(120).optional(), occurredAt: z.date().optional() })).mutation(async ({ ctx, input }) => {
    const access = await requireAccess(ctx.user.id, input.campaignId);
    return { id: await db.createIncident({ ...input, reportedById: access.member?.id ?? null, location: input.location ?? null, neighborhood: input.neighborhood ?? null, region: input.region ?? null, occurredAt: input.occurredAt ?? new Date() }) };
  }),
  indicators: router({
    list: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { await requireAccess(ctx.user.id, input.campaignId); return db.listIndicators(input.campaignId); }),
    save: protectedProcedure.input(campaignIdInput.extend({ id: z.number().int().positive().optional(), label: z.string().min(2).max(120), currentValue: z.number().int().min(0), targetValue: z.number().int().min(0), unit: z.string().min(1).max(40) })).mutation(async ({ ctx, input }) => {
      const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage");
      return { id: await db.saveIndicator(input) };
    }),
  }),
});

export const territoryRouter = router({
  overview: protectedProcedure.input(campaignIdInput.extend({ startsAt: z.date().optional(), endsAt: z.date().optional(), memberId: z.number().int().positive().optional() })).query(async ({ ctx, input }) => {
    await requireAccess(ctx.user.id, input.campaignId);
    if (input.endsAt && input.startsAt && input.endsAt < input.startsAt) throw new TRPCError({ code: "BAD_REQUEST", message: "O período final deve ser posterior ao inicial." });
    return db.getTerritoryData(input.campaignId, { startsAt: input.startsAt, endsAt: input.endsAt, memberId: input.memberId });
  }),
});

export const contentsRouter = router({
  list: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { await requireAccess(ctx.user.id, input.campaignId); return db.listCampaignContents(input.campaignId); }),
  create: protectedProcedure.input(campaignIdInput.extend({ title: z.string().min(3).max(200), body: z.string().min(2).max(10000), assetUrl: z.string().url().max(1200).optional(), version: z.number().int().min(1).max(999).default(1), channel: z.enum(["social", "whatsapp", "print", "speech", "video", "other"]), objective: z.string().max(220).optional(), scheduledAt: z.date().optional(), ownerMemberId: z.number().int().positive().optional(), status: z.enum(["draft", "review", "approved", "archived"]) })).mutation(async ({ ctx, input }) => {
    const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage");
    if (input.ownerMemberId && !await db.getCampaignMember(input.campaignId, input.ownerMemberId)) throw new TRPCError({ code: "BAD_REQUEST", message: "O responsável editorial precisa pertencer a esta campanha." });
    return { id: await db.createCampaignContent({ ...input, assetUrl: input.assetUrl ?? null, objective: input.objective ?? null, scheduledAt: input.scheduledAt ?? null, ownerMemberId: input.ownerMemberId ?? null, createdById: ctx.user.id }) };
  }),
  update: protectedProcedure.input(z.object({ id: z.number().int().positive(), title: z.string().min(3).max(200), body: z.string().min(2).max(10000), assetUrl: z.string().url().max(1200).optional(), version: z.number().int().min(1).max(999), channel: z.enum(["social", "whatsapp", "print", "speech", "video", "other"]), objective: z.string().max(220).optional(), scheduledAt: z.date().optional(), ownerMemberId: z.number().int().positive().optional(), status: z.enum(["draft", "review", "approved", "archived"]) })).mutation(async ({ ctx, input }) => {
    const content = await db.getContentById(input.id); if (!content) throw new TRPCError({ code: "NOT_FOUND" });
    const access = await requireAccess(ctx.user.id, content.campaignId); requireCapability(access, "manage");
    if (input.ownerMemberId && !await db.getCampaignMember(content.campaignId, input.ownerMemberId)) throw new TRPCError({ code: "BAD_REQUEST", message: "O responsável editorial precisa pertencer a esta campanha." });
    await db.updateCampaignContent(input.id, { ...input, assetUrl: input.assetUrl ?? null, objective: input.objective ?? null, scheduledAt: input.scheduledAt ?? null, ownerMemberId: input.ownerMemberId ?? null }); return { success: true };
  }),
  attach: protectedProcedure.input(z.object({ id: z.number().int().positive(), fileName: z.string().min(1).max(240), mimeType: z.enum(["application/pdf", "image/jpeg", "image/png", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.presentationml.presentation"]), base64: z.string().min(8).max(14_000_000) })).mutation(async ({ ctx, input }) => {
    const content = await db.getContentById(input.id); if (!content) throw new TRPCError({ code: "NOT_FOUND" });
    const access = await requireAccess(ctx.user.id, content.campaignId); requireCapability(access, "manage");
    const bytes = Buffer.from(input.base64, "base64");
    if (!bytes.length || bytes.length > 10 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "O arquivo deve ter até 10 MB." });
    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const stored = await storagePut(`campaigns/${content.campaignId}/materials/${content.id}/${safeName}`, bytes, input.mimeType);
    await db.saveCampaignContentAsset(input.id, { assetUrl: stored.url, assetKey: stored.key, assetName: input.fileName, assetMime: input.mimeType, assetSize: bytes.length });
    return { url: stored.url, name: input.fileName, size: bytes.length };
  }),
});

export const followupsRouter = router({
  list: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => {
    const access = await requireAccess(ctx.user.id, input.campaignId);
    return db.listPipelineFollowups(input.campaignId, access.member?.role === "partner" ? access.member.id : null);
  }),
  updateStatus: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["pending", "completed", "cancelled"]) })).mutation(async ({ ctx, input }) => {
    const followup = await db.getPipelineFollowup(input.id); if (!followup) throw new TRPCError({ code: "NOT_FOUND" });
    const access = await requireAccess(ctx.user.id, followup.campaignId);
    if (access.member?.role === "partner" && !canAccessOwnedRecord("partner", followup.assignedToId, access.member.id)) throw new TRPCError({ code: "FORBIDDEN", message: "Você só pode atualizar follow-ups atribuídos a você." });
    await db.updatePipelineFollowupStatus(input.id, input.status); return { success: true };
  }),
});

export const publicIntakeRouter = router({
  submit: publicProcedure.input(z.object({ campaignId: z.number().int().positive(), name: z.string().min(2).max(180), phone: z.string().max(32).optional(), email: z.string().email().optional(), neighborhood: z.string().max(120).optional(), region: z.string().max(120).optional(), contactProfile: z.string().max(120).optional(), consent: z.literal(true) })).mutation(async ({ input }) => {
    const campaign = await db.getPublicCampaign(input.campaignId);
    if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Este formulário não está disponível." });
    return { id: await db.createVoter({ campaignId: input.campaignId, name: input.name, phone: input.phone ?? null, email: input.email ?? null, neighborhood: input.neighborhood ?? null, region: input.region ?? null, contactProfile: input.contactProfile ?? null, address: null, engagementLevel: "medium", pipelineStage: "identified", primaryDemand: null, notes: "Cadastro público consentido", contactConsent: true, doNotContact: false, ownerMemberId: null }) };
  }),
});

export const volunteersRouter = router({
  publicSignup: publicProcedure.input(z.object({ campaignId: z.number().int().positive(), name: z.string().min(2).max(180), email: z.string().email().max(320), phone: z.string().max(32).optional(), neighborhood: z.string().max(120).optional(), region: z.string().max(120).optional(), availability: z.string().max(2000).optional(), skills: z.string().max(1000).optional(), consent: z.literal(true) })).mutation(async ({ input }) => {
    const campaign = await db.getPublicCampaign(input.campaignId); if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Esta campanha não está disponível para inscrição." });
    const existing = await db.getVolunteerByEmail(input.campaignId, input.email);
    if (existing) return { id: existing.id, alreadyRegistered: true };
    const token = randomBytes(32).toString("base64url");
    const id = await db.createVolunteer({ campaignId: input.campaignId, name: input.name, email: input.email, accessTokenHash: hashVolunteerToken(token), phone: input.phone ?? null, neighborhood: input.neighborhood ?? null, region: input.region ?? null, availability: input.availability ?? null, skills: input.skills ?? null, trainingStatus: "not_started", status: "pending", consent: true, consentedAt: new Date(), notes: null });
    return { id, alreadyRegistered: false, portalToken: token };
  }),
  portal: publicProcedure.input(z.object({ token: z.string().min(32).max(128) })).query(async ({ input }) => {
    const volunteer = await db.getVolunteerByAccessTokenHash(hashVolunteerToken(input.token)); if (!volunteer) throw new TRPCError({ code: "NOT_FOUND", message: "Acesso de voluntário não encontrado." });
    const [assignments, trainingMaterials, certificate, certificateHistory, certificateSettings] = await Promise.all([db.listVolunteerAssignments(volunteer.campaignId, volunteer.id), db.listVolunteerTrainingMaterials(volunteer.campaignId, volunteer.id), db.getVolunteerTrainingCertificate(volunteer.campaignId, volunteer.id), db.listVolunteerTrainingCertificates(volunteer.campaignId, volunteer.id), db.getCampaignCertificateSettings(volunteer.campaignId)]);
    return { volunteer: { name: volunteer.name, neighborhood: volunteer.neighborhood, region: volunteer.region, availability: volunteer.availability, skills: volunteer.skills, trainingStatus: volunteer.trainingStatus, status: volunteer.status }, assignments: assignments.map(item => ({ id: item.id, title: item.title, description: item.description, territory: item.territory, scheduledAt: item.scheduledAt, status: item.status })), trainingMaterials: trainingMaterials.map(item => ({ id: item.id, title: item.title, description: item.description, materialType: item.materialType, resourceUrl: item.resourceUrl, content: item.content, durationMinutes: item.durationMinutes, dueAt: item.dueAt, completedAt: item.completedAt })), certificate, certificateHistory, certificateSettings };
  }),
  updatePortalProfile: publicProcedure.input(z.object({ token: z.string().min(32).max(128), availability: z.string().max(2000).optional(), skills: z.string().max(1000).optional() })).mutation(async ({ input }) => {
    const volunteer = await db.getVolunteerByAccessTokenHash(hashVolunteerToken(input.token)); if (!volunteer) throw new TRPCError({ code: "NOT_FOUND", message: "Acesso de voluntário não encontrado." });
    await db.updateVolunteerPortalProfile(volunteer.id, { availability: input.availability ?? null, skills: input.skills ?? null }); return { success: true };
  }),
  updateOwnAssignmentStatus: publicProcedure.input(z.object({ token: z.string().min(32).max(128), assignmentId: z.number().int().positive(), status: z.enum(["accepted", "completed"]) })).mutation(async ({ input }) => {
    const volunteer = await db.getVolunteerByAccessTokenHash(hashVolunteerToken(input.token)); if (!volunteer) throw new TRPCError({ code: "NOT_FOUND", message: "Acesso de voluntário não encontrado." }); const assignment = await db.getVolunteerAssignment(input.assignmentId); if (!assignment || assignment.volunteerId !== volunteer.id) throw new TRPCError({ code: "NOT_FOUND", message: "Tarefa não encontrada." });
    await db.updateVolunteerAssignmentStatus(input.assignmentId, input.status); return { success: true };
  }),
  completeTrainingMaterial: publicProcedure.input(z.object({ token: z.string().min(32).max(128), materialId: z.number().int().positive() })).mutation(async ({ input }) => {
    const volunteer = await db.getVolunteerByAccessTokenHash(hashVolunteerToken(input.token)); if (!volunteer) throw new TRPCError({ code: "NOT_FOUND", message: "Acesso de voluntário não encontrado." }); const material = await db.getVolunteerTrainingMaterial(input.materialId); if (!material || material.campaignId !== volunteer.campaignId || !material.active) throw new TRPCError({ code: "NOT_FOUND", message: "Material de treinamento não encontrado." });
    return db.completeVolunteerTrainingMaterial({ campaignId: volunteer.campaignId, materialId: material.id, volunteerId: volunteer.id });
  }),
  list: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return db.listVolunteers(input.campaignId); }),
  update: protectedProcedure.input(z.object({ volunteerId: z.number().int().positive(), coordinatorMemberId: z.number().int().positive().optional(), phone: z.string().max(32).optional(), neighborhood: z.string().max(120).optional(), region: z.string().max(120).optional(), availability: z.string().max(2000).optional(), skills: z.string().max(1000).optional(), notes: z.string().max(3000).optional(), trainingStatus: z.enum(["not_started", "in_progress", "completed"]), status: z.enum(["pending", "active", "inactive"]) })).mutation(async ({ ctx, input }) => {
    const volunteer = await db.getVolunteer(input.volunteerId); if (!volunteer) throw new TRPCError({ code: "NOT_FOUND" }); const access = await requireAccess(ctx.user.id, volunteer.campaignId); requireCapability(access, "manage");
    if (input.coordinatorMemberId) { const coordinator = await db.getCampaignMember(volunteer.campaignId, input.coordinatorMemberId); if (!coordinator) throw new TRPCError({ code: "BAD_REQUEST", message: "O responsável precisa pertencer à campanha." }); }
    await db.updateVolunteer(input.volunteerId, { coordinatorMemberId: input.coordinatorMemberId ?? null, phone: input.phone ?? null, neighborhood: input.neighborhood ?? null, region: input.region ?? null, availability: input.availability ?? null, skills: input.skills ?? null, notes: input.notes ?? null, trainingStatus: input.trainingStatus, status: input.status }); return { success: true };
  }),
  assignments: router({
    list: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return db.listVolunteerAssignments(input.campaignId); }),
    create: protectedProcedure.input(campaignIdInput.extend({ volunteerId: z.number().int().positive(), title: z.string().min(3).max(220), description: z.string().max(3000).optional(), territory: z.string().max(180).optional(), scheduledAt: z.date().optional() })).mutation(async ({ ctx, input }) => {
      const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); const volunteer = await db.getVolunteer(input.volunteerId); if (!volunteer || volunteer.campaignId !== input.campaignId) throw new TRPCError({ code: "BAD_REQUEST", message: "O voluntário precisa pertencer à campanha selecionada." });
      return { id: await db.createVolunteerAssignment({ campaignId: input.campaignId, volunteerId: input.volunteerId, title: input.title, description: input.description ?? null, territory: input.territory ?? null, scheduledAt: input.scheduledAt ?? null, status: "assigned", completedAt: null, createdByUserId: ctx.user.id }) };
    }),
    updateStatus: protectedProcedure.input(z.object({ assignmentId: z.number().int().positive(), status: z.enum(["assigned", "accepted", "completed", "cancelled"]) })).mutation(async ({ ctx, input }) => {
      const assignment = await db.getVolunteerAssignment(input.assignmentId); if (!assignment) throw new TRPCError({ code: "NOT_FOUND" }); const access = await requireAccess(ctx.user.id, assignment.campaignId); requireCapability(access, "manage"); await db.updateVolunteerAssignmentStatus(input.assignmentId, input.status); return { success: true };
    }),
  }),
  training: router({
    list: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return db.listVolunteerTrainingMaterials(input.campaignId, undefined, true); }),
    dashboard: protectedProcedure.input(campaignIdInput.extend({ coordinatorMemberId: z.number().int().positive().optional(), region: z.string().max(120).optional() })).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return db.getVolunteerTrainingDashboard(input.campaignId, { coordinatorMemberId: input.coordinatorMemberId, region: input.region }); }),
    monthlyRanking: protectedProcedure.input(campaignIdInput.extend({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) })).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return db.getVolunteerTrainingTeamRanking(input.campaignId, input.month); }),
    setMonthlyGoal: protectedProcedure.input(campaignIdInput.extend({ coordinatorMemberId: z.number().int().positive(), month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), targetCompletions: z.number().int().min(0).max(100_000) })).mutation(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); const member = await db.getCampaignMember(input.campaignId, input.coordinatorMemberId); if (!member) throw new TRPCError({ code: "BAD_REQUEST", message: "A equipe selecionada não pertence à campanha." }); return { id: await db.setVolunteerTrainingTeamGoal(input) }; }),
    recognition: router({
      rules: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return db.getCampaignTrainingRecognitionRules(input.campaignId); }),
      updateRules: protectedProcedure.input(campaignIdInput.extend({ achievedThreshold: z.number().int().min(1).max(500), standoutThreshold: z.number().int().min(1).max(1000) }).refine(input => input.standoutThreshold >= input.achievedThreshold, { message: "O destaque deve ser igual ou superior à meta atingida." })).mutation(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return { id: await db.updateCampaignTrainingRecognitionRules({ ...input, updatedByUserId: ctx.user.id }) }; }),
      history: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return db.listVolunteerTrainingRecognitionHistory(input.campaignId); }),
      recordHistory: protectedProcedure.input(campaignIdInput.extend({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) })).mutation(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return db.recordVolunteerTrainingRecognitionHistory(input.campaignId, input.month); }),
    }),
    updateDeadline: protectedProcedure.input(z.object({ materialId: z.number().int().positive(), dueAt: z.date().nullable() })).mutation(async ({ ctx, input }) => { const material = await db.getVolunteerTrainingMaterial(input.materialId); if (!material) throw new TRPCError({ code: "NOT_FOUND" }); const access = await requireAccess(ctx.user.id, material.campaignId); requireCapability(access, "manage"); await db.updateVolunteerTrainingMaterialDeadline(material.id, input.dueAt); return { success: true }; }),
    update: protectedProcedure.input(z.object({ materialId: z.number().int().positive(), title: z.string().min(3).max(220).optional(), description: z.string().max(3000).nullable().optional(), materialType: z.enum(["guide", "video", "checklist", "link"]).optional(), resourceUrl: z.string().url().max(2000).nullable().optional(), content: z.string().max(12000).nullable().optional(), durationMinutes: z.number().int().min(1).max(240).optional(), dueAt: z.date().nullable().optional(), active: z.boolean().optional() }).refine(input => Object.keys(input).some(key => key !== "materialId"), { message: "Informe ao menos uma alteração." })).mutation(async ({ ctx, input }) => { const material = await db.getVolunteerTrainingMaterial(input.materialId); if (!material) throw new TRPCError({ code: "NOT_FOUND" }); const access = await requireAccess(ctx.user.id, material.campaignId); requireCapability(access, "manage"); const { materialId, ...changes } = input; await db.updateVolunteerTrainingMaterial(materialId, changes); return { success: true }; }),
    reorder: protectedProcedure.input(campaignIdInput.extend({ materialIds: z.array(z.number().int().positive()).min(1).max(500) })).mutation(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); const materials = await db.listVolunteerTrainingMaterials(input.campaignId, undefined, true); if (materials.length !== input.materialIds.length || new Set(input.materialIds).size !== input.materialIds.length || materials.some(material => !input.materialIds.includes(material.id))) throw new TRPCError({ code: "BAD_REQUEST", message: "A nova ordem deve conter todos os materiais da campanha." }); await db.reorderVolunteerTrainingMaterials(input.campaignId, input.materialIds); return { success: true }; }),
    create: protectedProcedure.input(campaignIdInput.extend({ title: z.string().min(3).max(220), description: z.string().max(3000).optional(), materialType: z.enum(["guide", "video", "checklist", "link"]).default("guide"), resourceUrl: z.string().url().max(2000).optional(), content: z.string().max(12000).optional(), durationMinutes: z.number().int().min(1).max(240).default(10), dueAt: z.date().optional(), position: z.number().int().min(0).max(999).default(0) })).mutation(async ({ ctx, input }) => {
      const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return { id: await db.createVolunteerTrainingMaterial({ campaignId: input.campaignId, title: input.title, description: input.description ?? null, materialType: input.materialType, resourceUrl: input.resourceUrl ?? null, content: input.content ?? null, durationMinutes: input.durationMinutes, dueAt: input.dueAt ?? null, position: input.position, active: true, createdByUserId: ctx.user.id }) };
    }),
  }),
  certificates: router({
    validate: protectedProcedure.input(z.object({ certificateCode: z.string().min(10).max(50) })).query(async ({ ctx, input }) => {
      const certificate = await db.getVolunteerTrainingCertificateByCode(input.certificateCode.trim().toUpperCase());
      if (!certificate) throw new TRPCError({ code: "NOT_FOUND", message: "Certificado não encontrado." });
      const access = await requireAccess(ctx.user.id, certificate.campaignId); requireCapability(access, "manage");
      return { certificateCode: certificate.certificateCode, issuedAt: certificate.issuedAt, completedMaterials: certificate.completedMaterials, volunteerName: certificate.volunteerName, campaignName: certificate.campaignName, candidateName: certificate.candidateName };
    }),
    settings: router({
      get: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return db.getCampaignCertificateSettings(input.campaignId); }),
      uploadAsset: protectedProcedure.input(campaignIdInput.extend({ assetType: z.enum(["logo", "signature"]), dataUrl: z.string().max(2_900_000) })).mutation(async ({ ctx, input }) => {
        const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); assertUploadRateLimit({ userId: ctx.user.id, campaignId: input.campaignId }); const asset = parseCertificateAsset(input.dataUrl);
        const { url } = await storagePut(`campaign-certificates/${access.campaign.organizationId}/${input.campaignId}/${input.assetType}-${randomBytes(16).toString("hex")}.${asset.extension}`, asset.bytes, asset.mimeType);
        return { url };
      }),
      update: protectedProcedure.input(campaignIdInput.extend({ primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/), accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/), logoUrl: z.string().url().max(2000).optional(), signatureImageUrl: z.string().url().max(2000).optional(), signatureName: z.string().max(180).optional(), signatureRole: z.string().max(180).optional() })).mutation(async ({ ctx, input }) => {
        const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return db.updateCampaignCertificateSettings({ campaignId: input.campaignId, primaryColor: input.primaryColor, accentColor: input.accentColor, logoUrl: input.logoUrl ?? null, signatureImageUrl: input.signatureImageUrl ?? null, signatureName: input.signatureName ?? null, signatureRole: input.signatureRole ?? null, updatedByUserId: ctx.user.id });
      }),
    }),
  }),
});

export const reportsRouter = router({
  summary: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return db.getReportData(input.campaignId); }),
  comparison: protectedProcedure.input(campaignIdInput.extend({ startsAt: z.date(), endsAt: z.date() })).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); if (input.endsAt < input.startsAt) throw new TRPCError({ code: "BAD_REQUEST", message: "O período final deve ser posterior ao inicial." }); return db.getComparativeReport(input.campaignId, input.startsAt, input.endsAt); }),
});

export const financeLegalRouter = router({
  summary: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return db.getFinancialSummary(input.campaignId); }),
  exportReport: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return db.getFinancialComplianceReport(input.campaignId); }),
  internalAlerts: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return db.getFinancialInternalAlerts(input.campaignId); }),
  rules: router({
    get: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return db.getCampaignComplianceRules(input.campaignId); }),
    update: protectedProcedure.input(campaignIdInput.extend({ blockBusinessDonation: z.boolean(), requireExpenseDocument: z.boolean(), reviewDeadlineHours: z.number().int().min(1).max(720) })).mutation(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "team"); return db.updateCampaignComplianceRules(input); }),
  }),
  legalProcesses: router({
    list: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return db.listLegalProcesses(input.campaignId); }),
    members: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return db.listMembers(input.campaignId); }),
    create: protectedProcedure.input(campaignIdInput.extend({ title: z.string().min(3).max(255), documentId: z.number().int().positive().optional(), ownerMemberId: z.number().int().positive().optional(), status: z.enum(["open", "in_progress", "waiting", "closed"]).default("open"), deadlineAt: z.date().optional(), notes: z.string().max(3000).optional() })).mutation(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); const document = input.documentId ? await db.getLegalDocument(input.documentId) : null; if (input.documentId && (!document || document.campaignId !== input.campaignId)) throw new TRPCError({ code: "BAD_REQUEST", message: "Documento jurídico inválido." }); const member = input.ownerMemberId ? await db.getCampaignMember(input.campaignId, input.ownerMemberId) : null; if (input.ownerMemberId && !member) throw new TRPCError({ code: "BAD_REQUEST", message: "Responsável inválido." }); return { id: await db.createLegalProcess({ campaignId: input.campaignId, documentId: input.documentId ?? null, ownerUserId: member?.userId ?? null, title: input.title, status: input.status, deadlineAt: input.deadlineAt ?? null, notes: input.notes ?? null }) }; }),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["open", "in_progress", "waiting", "closed"]), deadlineAt: z.date().nullable(), notes: z.string().max(3000).nullable() })).mutation(async ({ ctx, input }) => { const process = await db.getLegalProcess(input.id); if (!process) throw new TRPCError({ code: "NOT_FOUND" }); const access = await requireAccess(ctx.user.id, process.campaignId); requireCapability(access, "manage"); await db.updateLegalProcess(input); return { success: true }; }),
  }),
  entries: router({
    list: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return db.listFinancialEntries(input.campaignId); }),
    create: protectedProcedure.input(campaignIdInput.extend({ entryType: z.enum(["income", "expense"]), category: z.string().min(2).max(120), counterpartyName: z.string().min(2).max(220), counterpartyDocument: z.string().max(24).optional(), supplierName: z.string().max(220).optional(), costCenter: z.string().max(120).optional(), eventId: z.number().int().positive().optional(), amountCents: z.number().int().positive().max(2_000_000_000), paymentMethod: z.string().max(80).optional(), receiptNumber: z.string().max(100).optional(), documentNumber: z.string().max(100).optional(), dueDate: z.date().optional(), paidAt: z.date().optional(), notes: z.string().max(3000).optional() })).mutation(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); const rules = await db.getCampaignComplianceRules(input.campaignId); const documentDigits = input.counterpartyDocument?.replace(/\D/g, "") ?? ""; if (rules?.blockBusinessDonation && input.entryType === "income" && documentDigits.length === 14) throw new TRPCError({ code: "BAD_REQUEST", message: "A regra interna desta campanha não permite receita identificada por CNPJ." }); if (rules?.requireExpenseDocument && input.entryType === "expense" && !input.documentNumber && !input.receiptNumber) throw new TRPCError({ code: "BAD_REQUEST", message: "A regra interna exige número de documento ou recibo para despesas." }); if (input.eventId) { const event = await db.getEvent(input.eventId); if (!event || event.campaignId !== input.campaignId) throw new TRPCError({ code: "BAD_REQUEST", message: "Evento inválido." }); } return { id: await db.createFinancialEntry({ ...input, createdByUserId: ctx.user.id, counterpartyDocument: input.counterpartyDocument ?? null, supplierName: input.supplierName ?? null, costCenter: input.costCenter ?? null, eventId: input.eventId ?? null, paymentMethod: input.paymentMethod ?? null, receiptNumber: input.receiptNumber ?? null, documentNumber: input.documentNumber ?? null, dueDate: input.dueDate ?? null, paidAt: input.paidAt ?? null, notes: input.notes ?? null }) }; }),
    review: protectedProcedure.input(z.object({ entryId: z.number().int().positive(), status: z.enum(["pending", "under_review", "approved", "rejected", "paid", "reconciled", "closed", "cancelled"]), reviewNotes: z.string().max(3000).optional(), expectedVersion: z.number().int().positive().optional() })).mutation(async ({ ctx, input }) => { const entry = await db.getFinancialEntry(input.entryId); if (!entry) throw new TRPCError({ code: "NOT_FOUND" }); const access = await requireAccess(ctx.user.id, entry.campaignId); requireCapability(access, "manage"); if (!isFinancialStatusTransitionAllowed(entry.status, input.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "A transição de status solicitada não é permitida para este lançamento." }); const expectedVersion = input.expectedVersion ?? entry.version; const updated = await db.updateFinancialEntryReview({ ...input, id: input.entryId, expectedVersion, reviewedByUserId: ctx.user.id, reviewNotes: input.reviewNotes ?? null }); if (!updated) { await db.createOrganizationAuditLog({ organizationId: access.campaign.organizationId, actorUserId: ctx.user.id, action: "finance.entry.review_conflict", entityType: "financial_entry", entityId: entry.id, metadata: { expectedVersion, observedVersion: entry.version, requestedStatus: input.status } }); throw new TRPCError({ code: "CONFLICT", message: "O lançamento foi atualizado por outra pessoa. Atualize a página antes de tentar novamente." }); } return { success: true }; }),
  }),
  documents: router({
    list: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return db.listLegalDocuments(input.campaignId); }),
    create: protectedProcedure.input(campaignIdInput.extend({ documentType: z.string().min(2).max(80), title: z.string().min(3).max(255), counterpartyName: z.string().max(220).optional(), counterpartyDocument: z.string().max(24).optional(), financialEntryId: z.number().int().positive().optional(), expiresAt: z.date().optional() })).mutation(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); if (input.financialEntryId) { const entry = await db.getFinancialEntry(input.financialEntryId); if (!entry || entry.campaignId !== input.campaignId) throw new TRPCError({ code: "BAD_REQUEST", message: "Lançamento financeiro inválido." }); } return { id: await db.createLegalDocument({ ...input, createdByUserId: ctx.user.id, counterpartyName: input.counterpartyName ?? null, counterpartyDocument: input.counterpartyDocument ?? null, financialEntryId: input.financialEntryId ?? null, expiresAt: input.expiresAt ?? null }) }; }),
    upload: protectedProcedure.input(z.object({ documentId: z.number().int().positive(), fileName: z.string().min(1).max(255), base64: z.string().min(8).max(7_000_000) })).mutation(async ({ ctx, input }) => { const document = await db.getLegalDocument(input.documentId); if (!document) throw new TRPCError({ code: "NOT_FOUND" }); const access = await requireAccess(ctx.user.id, document.campaignId); requireCapability(access, "manage"); assertUploadRateLimit({ userId: ctx.user.id, campaignId: document.campaignId }); const bytes = Buffer.from(input.base64.includes(",") ? input.base64.split(",").pop()! : input.base64, "base64"); if (!bytes.length || bytes.length > 5 * 1024 * 1024 || bytes.subarray(0, 4).toString() !== "%PDF") throw new TRPCError({ code: "BAD_REQUEST", message: "Envie um PDF válido de até 5 MB." }); const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_"); const stored = await storagePut(`campaigns/${document.campaignId}/legal/${document.id}/${Date.now()}-${safeName}`, bytes, "application/pdf"); await db.updateLegalDocumentAttachment({ id: document.id, fileName: input.fileName, storageKey: stored.key, url: stored.url }); return { url: stored.url }; }),
    review: protectedProcedure.input(z.object({ documentId: z.number().int().positive(), status: z.enum(["under_review", "approved", "rejected", "archived"]), reviewNotes: z.string().max(3000).optional() })).mutation(async ({ ctx, input }) => { const document = await db.getLegalDocument(input.documentId); if (!document) throw new TRPCError({ code: "NOT_FOUND" }); const access = await requireAccess(ctx.user.id, document.campaignId); requireCapability(access, "manage"); await db.updateLegalDocumentReview({ id: input.documentId, status: input.status, reviewedByUserId: ctx.user.id, reviewNotes: input.reviewNotes ?? null }); return { success: true }; }),
  }),
});

export const fieldRouter = router({
  list: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => {
    const access = await requireAccess(ctx.user.id, input.campaignId);
    return db.listFieldVisits(input.campaignId, access.member?.role === "partner" ? access.member.id : null);
  }),
  playbooks: router({
    list: protectedProcedure.input(campaignIdInput.extend({ includeInactive: z.boolean().optional() })).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); return db.listFieldPlaybooks(input.campaignId, Boolean(input.includeInactive && access.member?.role !== "partner")); }),
    create: protectedProcedure.input(campaignIdInput.extend({ title: z.string().min(3).max(220), objective: z.string().max(400).optional(), territory: z.string().max(160).optional(), openingScript: z.string().max(5000).optional(), videoUrl: z.string().url().max(1000).optional(), talkingPoints: z.array(z.string().min(1).max(600)).min(1).max(20), checklist: z.array(z.string().min(1).max(600)).max(20), status: z.enum(["draft", "active", "archived"]).default("draft") })).mutation(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return { id: await db.createFieldPlaybook({ ...input, objective: input.objective ?? null, territory: input.territory ?? null, openingScript: input.openingScript ?? null, videoUrl: input.videoUrl ?? null, createdByUserId: ctx.user.id }) }; }),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), title: z.string().min(3).max(220), objective: z.string().max(400).optional(), territory: z.string().max(160).optional(), openingScript: z.string().max(5000).optional(), videoUrl: z.string().url().max(1000).optional(), talkingPoints: z.array(z.string().min(1).max(600)).min(1).max(20), checklist: z.array(z.string().min(1).max(600)).max(20), status: z.enum(["draft", "active", "archived"]) })).mutation(async ({ ctx, input }) => { const playbook = await db.getFieldPlaybook(input.id); if (!playbook) throw new TRPCError({ code: "NOT_FOUND" }); const access = await requireAccess(ctx.user.id, playbook.campaignId); requireCapability(access, "manage"); await db.updateFieldPlaybook({ ...input, objective: input.objective ?? null, territory: input.territory ?? null, openingScript: input.openingScript ?? null, videoUrl: input.videoUrl ?? null }); return { success: true }; }),
    materials: router({
      list: protectedProcedure.input(z.object({ playbookId: z.number().int().positive() })).query(async ({ ctx, input }) => { const playbook = await db.getFieldPlaybook(input.playbookId); if (!playbook) throw new TRPCError({ code: "NOT_FOUND" }); await requireAccess(ctx.user.id, playbook.campaignId); return db.listFieldPlaybookMaterials(input.playbookId); }),
      upload: protectedProcedure.input(z.object({ playbookId: z.number().int().positive(), fileName: z.string().min(1).max(255), materialType: z.string().min(2).max(80).default("Guia"), topic: z.string().max(160).optional(), base64: z.string().min(8).max(7_000_000) })).mutation(async ({ ctx, input }) => {
        const playbook = await db.getFieldPlaybook(input.playbookId); if (!playbook) throw new TRPCError({ code: "NOT_FOUND" }); const access = await requireAccess(ctx.user.id, playbook.campaignId); requireCapability(access, "manage"); assertUploadRateLimit({ userId: ctx.user.id, campaignId: playbook.campaignId });
        const bytes = Buffer.from(input.base64.includes(",") ? input.base64.split(",").pop()! : input.base64, "base64");
        if (!bytes.length || bytes.length > 5 * 1024 * 1024 || bytes.subarray(0, 4).toString() !== "%PDF") throw new TRPCError({ code: "BAD_REQUEST", message: "Envie um PDF válido de até 5 MB." });
        const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.pdf$/i, "") + ".pdf";
        const stored = await storagePut(`campaigns/${playbook.campaignId}/playbooks/${playbook.id}/materials/${Date.now()}-${randomBytes(8).toString("hex")}-${safeName}`, bytes, "application/pdf");
        const id = await db.createFieldPlaybookMaterial({ campaignId: playbook.campaignId, playbookId: playbook.id, playbookVersion: playbook.version, fileName: input.fileName, materialType: input.materialType, topic: input.topic ?? null, storageKey: stored.key, url: stored.url, sizeBytes: bytes.length, createdByUserId: ctx.user.id });
        return { id, url: stored.url, fileName: input.fileName, sizeBytes: bytes.length };
      }),
    }),
  }),
  sync: protectedProcedure.input(campaignIdInput.extend({ visits: z.array(z.object({ voterId: z.number().int().positive().optional(), playbookId: z.number().int().positive().optional(), clientReference: z.string().uuid(), outcome: z.enum(["contacted", "absent", "refused", "follow_up", "other"]), notes: z.string().max(3000).optional(), occurredAt: z.date() })).min(1).max(100) })).mutation(async ({ ctx, input }) => {
    const access = await requireAccess(ctx.user.id, input.campaignId);
    const memberId = access.member?.id ?? null;
    if (access.member?.role === "partner" && !memberId) throw new TRPCError({ code: "FORBIDDEN", message: "Membro de campo não encontrado." });
    return db.syncFieldVisits(input.visits.map(visit => ({ ...visit, campaignId: input.campaignId, memberId, playbookId: visit.playbookId ?? null, notes: visit.notes ?? null })));
  }),
});

export const consentRouter = router({
  list: protectedProcedure.input(z.object({ voterId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const voter = await db.getVoter(input.voterId); if (!voter) throw new TRPCError({ code: "NOT_FOUND" });
    const access = await requireAccess(ctx.user.id, voter.campaignId);
    if (access.member?.role === "partner" && !canAccessOwnedRecord("partner", voter.ownerMemberId, access.member.id)) throw new TRPCError({ code: "FORBIDDEN" });
    return db.listConsentRecords(input.voterId);
  }),
  create: protectedProcedure.input(z.object({ voterId: z.number().int().positive(), purpose: z.string().min(3).max(240), source: z.string().min(2).max(120), evidence: z.string().max(3000).optional(), consentedAt: z.date(), expiresAt: z.date().optional() })).mutation(async ({ ctx, input }) => {
    const voter = await db.getVoter(input.voterId); if (!voter) throw new TRPCError({ code: "NOT_FOUND" });
    const access = await requireAccess(ctx.user.id, voter.campaignId);
    if (access.member?.role === "partner" && !canAccessOwnedRecord("partner", voter.ownerMemberId, access.member.id)) throw new TRPCError({ code: "FORBIDDEN" });
    return { id: await db.createConsentRecord({ campaignId: voter.campaignId, voterId: input.voterId, purpose: input.purpose, source: input.source, evidence: input.evidence ?? null, consentedAt: input.consentedAt, expiresAt: input.expiresAt ?? null, createdByUserId: ctx.user.id }) };
  }),
  revoke: protectedProcedure.input(z.object({ consentId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const record = await db.getConsentRecord(input.consentId); if (!record) throw new TRPCError({ code: "NOT_FOUND" });
    const voter = await db.getVoter(record.voterId); if (!voter) throw new TRPCError({ code: "NOT_FOUND" });
    const access = await requireAccess(ctx.user.id, voter.campaignId); requireCapability(access, "manage");
    await db.revokeConsentRecord({ consentId: input.consentId, revokedAt: new Date() }); return { success: true };
  }),
});

export const communicationRouter = router({
  candidates: protectedProcedure.input(campaignIdInput.extend({ channel: z.enum(["email", "whatsapp", "phone"]).optional(), neighborhood: z.string().max(120).optional(), region: z.string().max(120).optional() })).query(async ({ ctx, input }) => {
    const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage");
    return db.listCommunicationCandidates(input);
  }),
  savePreference: protectedProcedure.input(campaignIdInput.extend({ voterId: z.number().int().positive(), emailAllowed: z.boolean(), whatsappAllowed: z.boolean(), phoneAllowed: z.boolean() })).mutation(async ({ ctx, input }) => {
    const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage");
    await db.upsertVoterCommunicationPreference({ ...input, updatedByUserId: ctx.user.id }); return { success: true };
  }),
  templates: router({
    list: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return db.listCommunicationTemplates(input.campaignId); }),
    create: protectedProcedure.input(campaignIdInput.extend({ title: z.string().min(3).max(180), channel: z.enum(["email", "whatsapp", "phone"]), subject: z.string().max(220).optional(), body: z.string().min(3).max(5000) })).mutation(async ({ ctx, input }) => {
      const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage");
      return { id: await db.createCommunicationTemplate({ ...input, subject: input.subject ?? null, createdByUserId: ctx.user.id }) };
    }),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), title: z.string().min(3).max(180), channel: z.enum(["email", "whatsapp", "phone"]), subject: z.string().max(220).optional(), body: z.string().min(3).max(5000), active: z.boolean() })).mutation(async ({ ctx, input }) => {
      const template = await db.getCommunicationTemplate(input.id); if (!template) throw new TRPCError({ code: "NOT_FOUND" }); const access = await requireAccess(ctx.user.id, template.campaignId); requireCapability(access, "manage");
      await db.updateCommunicationTemplate({ ...input, subject: input.subject ?? null }); return { success: true };
    }),
  }),
  logManual: protectedProcedure.input(campaignIdInput.extend({ voterId: z.number().int().positive(), templateId: z.number().int().positive().optional(), channel: z.enum(["email", "whatsapp", "phone"]), notes: z.string().max(1500).optional() })).mutation(async ({ ctx, input }) => {
    const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage");
    if (input.templateId) { const template = await db.getCommunicationTemplate(input.templateId); if (!template || template.campaignId !== input.campaignId || template.channel !== input.channel) throw new TRPCError({ code: "BAD_REQUEST", message: "Modelo de mensagem inválido para este canal." }); }
    try { return { id: await db.logManualCommunication({ ...input, templateId: input.templateId ?? null, notes: input.notes ?? null, createdByUserId: ctx.user.id }) }; }
    catch (error) { const code = error instanceof Error ? error.message : ""; throw new TRPCError({ code: "BAD_REQUEST", message: code === "CHANNEL_NOT_ALLOWED" ? "Este canal não possui preferência consentida para o contato." : "Este contato não está elegível para comunicação." }); }
  }),
  logs: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return db.listCommunicationLogs(input.campaignId); }),
});

export const crisisRouter = router({
  list: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return db.listCrisisCases(input.campaignId); }),
  create: protectedProcedure.input(campaignIdInput.extend({ title: z.string().min(3).max(220), description: z.string().max(5000).optional(), severity: z.enum(["low", "medium", "high", "critical"]), assignedToId: z.number().int().positive().optional(), dueAt: z.date().optional() })).mutation(async ({ ctx, input }) => {
    const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage");
    return { id: await db.createCrisisCase({ campaignId: input.campaignId, title: input.title, description: input.description ?? null, severity: input.severity, assignedToId: input.assignedToId ?? null, dueAt: input.dueAt ?? null, createdByUserId: ctx.user.id }) };
  }),
  update: protectedProcedure.input(z.object({ crisisId: z.number().int().positive(), status: z.enum(["open", "assessing", "responding", "resolved", "closed"]), assignedToId: z.number().int().positive().optional(), dueAt: z.date().optional() })).mutation(async ({ ctx, input }) => {
    const crisis = await db.getCrisisCase(input.crisisId); if (!crisis) throw new TRPCError({ code: "NOT_FOUND" });
    const access = await requireAccess(ctx.user.id, crisis.campaignId); requireCapability(access, "manage");
    await db.updateCrisisCase(input.crisisId, { status: input.status, assignedToId: input.assignedToId ?? null, dueAt: input.dueAt ?? null }); return { success: true };
  }),
  decisions: protectedProcedure.input(z.object({ crisisId: z.number().int().positive() })).query(async ({ ctx, input }) => { const crisis = await db.getCrisisCase(input.crisisId); if (!crisis) throw new TRPCError({ code: "NOT_FOUND" }); const access = await requireAccess(ctx.user.id, crisis.campaignId); requireCapability(access, "manage"); return db.listCrisisDecisions(input.crisisId); }),
  addDecision: protectedProcedure.input(z.object({ crisisId: z.number().int().positive(), decision: z.string().min(3).max(5000) })).mutation(async ({ ctx, input }) => { const crisis = await db.getCrisisCase(input.crisisId); if (!crisis) throw new TRPCError({ code: "NOT_FOUND" }); const access = await requireAccess(ctx.user.id, crisis.campaignId); requireCapability(access, "manage"); return { id: await db.addCrisisDecision({ crisisCaseId: input.crisisId, decision: input.decision, createdByUserId: ctx.user.id }) }; }),
});

export const insightsRouter = router({
  heatmap: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return db.getTerritoryHeatmap(input.campaignId); }),
  mobilization: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return db.getMobilizationScores(input.campaignId); }),
  surveys: router({
    list: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { await requireAccess(ctx.user.id, input.campaignId); return db.listCampaignSurveys(input.campaignId); }),
    create: protectedProcedure.input(campaignIdInput.extend({ title: z.string().min(3).max(220), question: z.string().min(3).max(3000), responseType: z.enum(["single_choice", "scale", "text"]), options: z.array(z.string().min(1).max(160)).max(12).optional(), status: z.enum(["draft", "active", "closed"]) })).mutation(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return { id: await db.createCampaignSurvey({ ...input, options: input.options ?? null, createdByUserId: ctx.user.id }) }; }),
    respond: protectedProcedure.input(z.object({ surveyId: z.number().int().positive(), campaignId: z.number().int().positive(), voterId: z.number().int().positive().optional(), response: z.string().min(1).max(3000), neighborhood: z.string().max(120).optional(), region: z.string().max(120).optional() })).mutation(async ({ ctx, input }) => { await requireAccess(ctx.user.id, input.campaignId); if (!await db.getSurveySummary(input.campaignId, input.surveyId)) throw new TRPCError({ code: "NOT_FOUND", message: "Pesquisa não encontrada nesta campanha." }); return { id: await db.submitSurveyResponse({ ...input, voterId: input.voterId ?? null, neighborhood: input.neighborhood ?? null, region: input.region ?? null, submittedByUserId: ctx.user.id }) }; }),
    summary: protectedProcedure.input(z.object({ surveyId: z.number().int().positive(), campaignId: z.number().int().positive() })).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return db.getSurveySummary(input.campaignId, input.surveyId); }),
  }),
});
