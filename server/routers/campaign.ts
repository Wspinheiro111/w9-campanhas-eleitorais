import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../campaignDb";
import { canAccessOwnedRecord, canManageCampaign, canManageTeam, CampaignRole } from "../campaignPolicy";
import { parseContactsCsv } from "../csvContacts";

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
  list: protectedProcedure.query(({ ctx }) => db.listCampaignsForUser(ctx.user.id)),
  create: protectedProcedure.input(z.object({ name: z.string().min(3).max(160), candidateName: z.string().min(3).max(160), electionLabel: z.string().min(3).max(120), region: z.string().min(2).max(160) })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "A criação de campanha exige um perfil administrador." });
    const id = await db.createCampaignWithOwner({ ownerId: ctx.user.id, ownerName: ctx.user.name ?? "Administrador", ownerEmail: ctx.user.email ?? "sem-email@w9.local", ...input });
    return { id };
  }),
  details: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => requireAccess(ctx.user.id, input.campaignId)),
  updateDetails: protectedProcedure.input(campaignIdInput.extend({ name: z.string().min(3).max(160), candidateName: z.string().min(3).max(160), electionLabel: z.string().min(3).max(120), region: z.string().min(2).max(160), status: z.enum(["planning", "active", "paused", "closed"]) })).mutation(async ({ ctx, input }) => {
    const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "team");
    const { campaignId, ...details } = input; await db.updateCampaignDetails(campaignId, details); return { success: true };
  }),
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
});

export const planningRouter = router({
  list: protectedProcedure.input(campaignIdInput.extend({ startsAt: z.date().optional(), endsAt: z.date().optional() })).query(async ({ ctx, input }) => { await requireAccess(ctx.user.id, input.campaignId); return db.listEvents(input.campaignId, input.startsAt, input.endsAt); }),
  create: protectedProcedure.input(campaignIdInput.extend({ title: z.string().min(3).max(200), type: z.enum(["meeting", "rally", "visit", "debate", "internal", "other"]), startsAt: z.date(), endsAt: z.date().optional(), location: z.string().max(240).optional(), responsibleId: z.number().int().positive().optional(), notes: z.string().max(3000).optional() })).mutation(async ({ ctx, input }) => {
    const access = await requireAccess(ctx.user.id, input.campaignId);
    requireCapability(access, "manage");
    return { id: await db.createEvent({ ...input, endsAt: input.endsAt ?? null, location: input.location ?? null, responsibleId: input.responsibleId ?? null, notes: input.notes ?? null }) };
  }),
  update: protectedProcedure.input(z.object({ eventId: z.number().int().positive(), title: z.string().min(3).max(200), type: z.enum(["meeting", "rally", "visit", "debate", "internal", "other"]), startsAt: z.date(), endsAt: z.date().optional(), location: z.string().max(240).optional(), responsibleId: z.number().int().positive().optional(), notes: z.string().max(3000).optional(), status: z.enum(["scheduled", "completed", "cancelled"]) })).mutation(async ({ ctx, input }) => {
    const event = await db.getEvent(input.eventId); if (!event) throw new TRPCError({ code: "NOT_FOUND" });
    const access = await requireAccess(ctx.user.id, event.campaignId); requireCapability(access, "manage");
    const { eventId, ...changes } = input; await db.updateEvent(eventId, { ...changes, endsAt: changes.endsAt ?? null, location: changes.location ?? null, responsibleId: changes.responsibleId ?? null, notes: changes.notes ?? null }); return { success: true };
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
  importCsv: protectedProcedure.input(campaignIdInput.extend({ csv: z.string().min(12).max(2_000_000) })).mutation(async ({ ctx, input }) => {
    const access = await requireAccess(ctx.user.id, input.campaignId);
    const parsed = parseContactsCsv(input.csv);
    if (parsed.errors.length) return { imported: 0, errors: parsed.errors };
    const ownerMemberId = access.member?.role === "partner" ? access.member.id : access.member?.id ?? null;
    const imported = await db.createVotersBatch(parsed.rows.map(row => ({ ...row, campaignId: input.campaignId, ownerMemberId })));
    return { imported, errors: [] };
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
  create: protectedProcedure.input(campaignIdInput.extend({ title: z.string().min(3).max(200), description: z.string().min(4).max(3000), category: z.string().min(2).max(100), priority: z.enum(["low", "medium", "high", "urgent"]), location: z.string().max(220).optional(), occurredAt: z.date().optional() })).mutation(async ({ ctx, input }) => {
    const access = await requireAccess(ctx.user.id, input.campaignId);
    return { id: await db.createIncident({ ...input, reportedById: access.member?.id ?? null, location: input.location ?? null, occurredAt: input.occurredAt ?? new Date() }) };
  }),
  indicators: router({
    list: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { await requireAccess(ctx.user.id, input.campaignId); return db.listIndicators(input.campaignId); }),
    save: protectedProcedure.input(campaignIdInput.extend({ id: z.number().int().positive().optional(), label: z.string().min(2).max(120), currentValue: z.number().int().min(0), targetValue: z.number().int().min(0), unit: z.string().min(1).max(40) })).mutation(async ({ ctx, input }) => {
      const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage");
      return { id: await db.saveIndicator(input) };
    }),
  }),
});

export const reportsRouter = router({
  summary: protectedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => { const access = await requireAccess(ctx.user.id, input.campaignId); requireCapability(access, "manage"); return db.getReportData(input.campaignId); }),
});
