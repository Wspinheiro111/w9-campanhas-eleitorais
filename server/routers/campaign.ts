import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import * as db from "../campaignDb";
import { canAccessOwnedRecord, canManageCampaign, canManageTeam, CampaignRole } from "../campaignPolicy";
import { parseContactsCsv } from "../csvContacts";
import { deduplicateWithFlask } from "../flaskDeduplication";
import { storagePut } from "../storage";

const campaignIdInput = z.object({ campaignId: z.number().int().positive() });
const memberRoles = ["admin", "coordinator", "partner"] as const;

type Access = NonNullable<Awaited<ReturnType<typeof db.getCampaignAccess>>>;

async function requireAccess(userId: number, campaignId: number): Promise<Access> {
  const access = await db.getCampaignAccess(campaignId, userId);
  if (!access) throw new TRPCError({ code: "FORBIDDEN", message: "Você não possui acesso a esta campanha." });
  return access;
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
  create: protectedProcedure.input(campaignIdInput.extend({ name: z.string().min(2).max(160), email: z.string().email(), role: z.enum(memberRoles), responsibility: z.string().max(220).optional(), workRegion: z.string().max(160).optional() })).mutation(async ({ ctx, input }) => {
    const access = await requireAccess(ctx.user.id, input.campaignId);
    requireCapability(access, "team");
    const { campaignId, ...member } = input;
    return { id: await db.createMember({ campaignId, ...member }) };
  }),
  performance: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return db.getTeamPerformance(input.campaignId); }),
});

export const planningRouter = router({
  list: protectedProcedure.input(campaignIdInput.extend({ startsAt: z.date().optional(), endsAt: z.date().optional() })).query(async ({ ctx, input }) => { await requireAccess(ctx.user.id, input.campaignId); return db.listEvents(input.campaignId, input.startsAt, input.endsAt); }),
  create: protectedProcedure.input(campaignIdInput.extend({ title: z.string().min(3).max(200), type: z.enum(["meeting", "rally", "visit", "debate", "internal", "other"]), startsAt: z.date(), endsAt: z.date().optional(), location: z.string().max(240).optional(), neighborhood: z.string().max(120).optional(), region: z.string().max(120).optional(), responsibleId: z.number().int().positive().optional(), notes: z.string().max(3000).optional() })).mutation(async ({ ctx, input }) => {
    const access = await requireAccess(ctx.user.id, input.campaignId);
    requireCapability(access, "manage");
    return { id: await db.createEvent({ ...input, endsAt: input.endsAt ?? null, location: input.location ?? null, neighborhood: input.neighborhood ?? null, region: input.region ?? null, responsibleId: input.responsibleId ?? null, notes: input.notes ?? null }) };
  }),
  update: protectedProcedure.input(z.object({ eventId: z.number().int().positive(), title: z.string().min(3).max(200), type: z.enum(["meeting", "rally", "visit", "debate", "internal", "other"]), startsAt: z.date(), endsAt: z.date().optional(), location: z.string().max(240).optional(), neighborhood: z.string().max(120).optional(), region: z.string().max(120).optional(), responsibleId: z.number().int().positive().optional(), notes: z.string().max(3000).optional(), status: z.enum(["scheduled", "completed", "cancelled"]) })).mutation(async ({ ctx, input }) => {
    const event = await db.getEvent(input.eventId); if (!event) throw new TRPCError({ code: "NOT_FOUND" });
    const access = await requireAccess(ctx.user.id, event.campaignId); requireCapability(access, "manage");
    const { eventId, ...changes } = input; await db.updateEvent(eventId, { ...changes, endsAt: changes.endsAt ?? null, location: changes.location ?? null, neighborhood: changes.neighborhood ?? null, region: changes.region ?? null, responsibleId: changes.responsibleId ?? null, notes: changes.notes ?? null }); return { success: true };
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
  create: protectedProcedure.input(campaignIdInput.extend({ title: z.string().min(3).max(200), body: z.string().min(2).max(10000), assetUrl: z.string().url().max(1200).optional(), version: z.number().int().min(1).max(999).default(1), channel: z.enum(["social", "whatsapp", "print", "speech", "video", "other"]), status: z.enum(["draft", "review", "approved", "archived"]) })).mutation(async ({ ctx, input }) => {
    const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage");
    return { id: await db.createCampaignContent({ ...input, assetUrl: input.assetUrl ?? null, createdById: ctx.user.id }) };
  }),
  update: protectedProcedure.input(z.object({ id: z.number().int().positive(), title: z.string().min(3).max(200), body: z.string().min(2).max(10000), assetUrl: z.string().url().max(1200).optional(), version: z.number().int().min(1).max(999), channel: z.enum(["social", "whatsapp", "print", "speech", "video", "other"]), status: z.enum(["draft", "review", "approved", "archived"]) })).mutation(async ({ ctx, input }) => {
    const content = await db.getContentById(input.id); if (!content) throw new TRPCError({ code: "NOT_FOUND" });
    const access = await requireAccess(ctx.user.id, content.campaignId); requireCapability(access, "manage");
    await db.updateCampaignContent(input.id, { ...input, assetUrl: input.assetUrl ?? null }); return { success: true };
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

export const reportsRouter = router({
  summary: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return db.getReportData(input.campaignId); }),
  comparison: protectedProcedure.input(campaignIdInput.extend({ startsAt: z.date(), endsAt: z.date() })).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); if (input.endsAt < input.startsAt) throw new TRPCError({ code: "BAD_REQUEST", message: "O período final deve ser posterior ao inicial." }); return db.getComparativeReport(input.campaignId, input.startsAt, input.endsAt); }),
});
