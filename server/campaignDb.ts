import { and, desc, eq, gte, lt, lte, ne, or, sql } from "drizzle-orm";
import {
  aiMessages,
  audioCrmLogs,
  campaignIndicators,
  campaignContents,
  campaignMembers,
  campaigns,
  events,
  fieldIncidents,
  goals,
  organizationInvitations,
  organizationMembers,
  organizations,
  pipelineFollowups,
  tasks,
  voterInteractions,
  voters,
} from "../drizzle/schema";
import { getDb } from "./db";

export type CampaignAccess = {
  campaign: typeof campaigns.$inferSelect;
  member: typeof campaignMembers.$inferSelect | null;
  organizationMember: typeof organizationMembers.$inferSelect;
};

function requireDb<T>(db: T | null): T {
  if (!db) throw new Error("Banco de dados indisponível.");
  return db;
}

async function organizationIdForCampaign(campaignId: number) {
  const db = requireDb(await getDb());
  const rows = await db.select({ organizationId: campaigns.organizationId }).from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
  if (!rows[0]?.organizationId) throw new Error("Campanha sem organização válida.");
  return rows[0].organizationId;
}

export async function getOrCreateInitialOrganization(userId: number, userName?: string | null) {
  const db = requireDb(await getDb());
  const membership = await db.select({ organizationId: organizationMembers.organizationId }).from(organizationMembers).where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.active, true))).limit(1);
  if (membership[0]) return membership[0].organizationId;
  const created = await db.insert(organizations).values({ name: userName ? `Organização de ${userName}` : "Minha organização", status: "active", createdById: userId });
  const organizationId = Number(created[0].insertId);
  await db.insert(organizationMembers).values({ organizationId, userId, role: "admin", active: true });
  return organizationId;
}

export async function listOrganizationsForUser(userId: number) {
  const db = requireDb(await getDb());
  return db.select({ organization: organizations, membership: organizationMembers })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
    .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.active, true), eq(organizations.status, "active")))
    .orderBy(desc(organizations.updatedAt));
}

export async function createOrganizationForUser(input: { userId: number; name: string; legalName?: string; fiscalId?: string }) {
  const db = requireDb(await getDb());
  const created = await db.insert(organizations).values({ name: input.name, legalName: input.legalName || null, fiscalId: input.fiscalId || null, status: "active", createdById: input.userId });
  const organizationId = Number(created[0].insertId);
  await db.insert(organizationMembers).values({ organizationId, userId: input.userId, role: "admin", active: true });
  return organizationId;
}

export async function getOrganizationMembership(userId: number, organizationId: number) {
  const db = requireDb(await getDb());
  const rows = await db.select().from(organizationMembers).where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.active, true))).limit(1);
  return rows[0] ?? null;
}

export async function createOrganizationInvitation(input: { organizationId: number; email: string; role: "admin" | "manager" | "operator" | "viewer"; tokenHash: string; invitedById: number; expiresAt: Date }) {
  const db = requireDb(await getDb());
  const result = await db.insert(organizationInvitations).values({ ...input, email: input.email.trim().toLowerCase(), status: "pending" });
  return Number(result[0].insertId);
}

export async function listOrganizationInvitations(organizationId: number) {
  const db = requireDb(await getDb());
  return db.select().from(organizationInvitations).where(eq(organizationInvitations.organizationId, organizationId)).orderBy(desc(organizationInvitations.createdAt));
}

export async function acceptOrganizationInvitation(input: { userId: number; email: string; tokenHash: string }) {
  const db = requireDb(await getDb());
  const rows = await db.select().from(organizationInvitations).where(and(eq(organizationInvitations.tokenHash, input.tokenHash), eq(organizationInvitations.status, "pending"))).limit(1);
  const invitation = rows[0];
  if (!invitation || invitation.expiresAt < new Date() || invitation.email !== input.email.trim().toLowerCase()) throw new Error("INVITATION_INVALID_OR_EXPIRED");
  const existing = await getOrganizationMembership(input.userId, invitation.organizationId);
  if (!existing) await db.insert(organizationMembers).values({ organizationId: invitation.organizationId, userId: input.userId, role: invitation.role, active: true });
  await db.update(organizationInvitations).set({ status: "accepted", acceptedById: input.userId }).where(eq(organizationInvitations.id, invitation.id));
  return invitation.organizationId;
}

export async function listOrganizationMembers(organizationId: number) {
  const db = requireDb(await getDb());
  const { users } = await import("../drizzle/schema");
  return db.select({ member: organizationMembers, user: users })
    .from(organizationMembers)
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .where(eq(organizationMembers.organizationId, organizationId))
    .orderBy(desc(organizationMembers.createdAt));
}

export async function updateOrganizationMemberRole(input: { organizationId: number; memberId: number; role: "admin" | "manager" | "operator" | "viewer" }) {
  const db = requireDb(await getDb());
  await db.update(organizationMembers).set({ role: input.role }).where(and(eq(organizationMembers.id, input.memberId), eq(organizationMembers.organizationId, input.organizationId)));
}

export async function listCampaignsForUser(userId: number) {
  const db = requireDb(await getDb());
  const rows = await db
    .select({ campaign: campaigns, member: campaignMembers })
    .from(campaigns)
    .innerJoin(organizationMembers, and(eq(organizationMembers.organizationId, campaigns.organizationId), eq(organizationMembers.userId, userId), eq(organizationMembers.active, true)))
    .leftJoin(campaignMembers, and(eq(campaignMembers.campaignId, campaigns.id), eq(campaignMembers.userId, userId)))
    .orderBy(desc(campaigns.updatedAt));

  return rows.map(({ campaign, member }) => ({ ...campaign, memberRole: member?.role ?? (campaign.ownerId === userId ? "admin" : null) }));
}

export async function getCampaignAccess(campaignId: number, userId: number): Promise<CampaignAccess | null> {
  const db = requireDb(await getDb());
  const rows = await db
    .select({ campaign: campaigns, member: campaignMembers, organizationMember: organizationMembers })
    .from(campaigns)
    .innerJoin(organizationMembers, and(eq(organizationMembers.organizationId, campaigns.organizationId), eq(organizationMembers.userId, userId), eq(organizationMembers.active, true)))
    .leftJoin(campaignMembers, and(eq(campaignMembers.campaignId, campaigns.id), eq(campaignMembers.userId, userId)))
    .where(eq(campaigns.id, campaignId))
    .limit(1);

  return rows[0] ?? null;
}

export async function createCampaignWithOwner(input: {
  organizationId: number;
  ownerId: number;
  ownerName: string;
  ownerEmail: string;
  name: string;
  candidateName: string;
  electionLabel: string;
  region: string;
}) {
  const db = requireDb(await getDb());
  const campaignResult = await db.insert(campaigns).values({
    organizationId: input.organizationId,
    name: input.name,
    candidateName: input.candidateName,
    electionLabel: input.electionLabel,
    region: input.region,
    ownerId: input.ownerId,
    status: "planning",
  });
  const campaignId = Number(campaignResult[0].insertId);

  await db.insert(campaignMembers).values({
    organizationId: input.organizationId,
    campaignId,
    userId: input.ownerId,
    name: input.ownerName,
    email: input.ownerEmail,
    role: "admin",
    responsibility: "Gestão geral da campanha",
    active: true,
  });

  return campaignId;
}

export async function updateCampaignDetails(campaignId: number, input: { name: string; candidateName: string; electionLabel: string; region: string; status: "planning" | "active" | "paused" | "closed" }) {
  const db = requireDb(await getDb());
  await db.update(campaigns).set(input).where(eq(campaigns.id, campaignId));
}

export async function getDashboardData(campaignId: number, memberId?: number | null) {
  const db = requireDb(await getDb());
  const taskScope = memberId ? and(eq(tasks.campaignId, campaignId), eq(tasks.assignedToId, memberId)) : eq(tasks.campaignId, campaignId);
  const voterScope = memberId ? and(eq(voters.campaignId, campaignId), eq(voters.ownerMemberId, memberId)) : eq(voters.campaignId, campaignId);
  const incidentScope = memberId ? and(eq(fieldIncidents.campaignId, campaignId), eq(fieldIncidents.reportedById, memberId)) : eq(fieldIncidents.campaignId, campaignId);
  const today = new Date();

  const [taskRows, voterRows, goalRows, incidentRows, upcomingEvents, recentIncidents, indicatorRows] = await Promise.all([
    db.select({ total: sql<number>`count(*)` }).from(tasks).where(taskScope),
    db.select({ total: sql<number>`count(*)` }).from(voters).where(voterScope),
    db.select({ total: sql<number>`count(*)` }).from(goals).where(eq(goals.campaignId, campaignId)),
    db.select({ total: sql<number>`count(*)` }).from(fieldIncidents).where(incidentScope),
    db.select().from(events).where(and(eq(events.campaignId, campaignId), gte(events.startsAt, today))).orderBy(events.startsAt).limit(5),
    db.select().from(fieldIncidents).where(incidentScope).orderBy(desc(fieldIncidents.occurredAt)).limit(5),
    db.select().from(campaignIndicators).where(eq(campaignIndicators.campaignId, campaignId)).orderBy(desc(campaignIndicators.updatedAt)).limit(6),
  ]);

  return {
    metrics: {
      tasks: Number(taskRows[0]?.total ?? 0),
      voters: Number(voterRows[0]?.total ?? 0),
      goals: Number(goalRows[0]?.total ?? 0),
      incidents: Number(incidentRows[0]?.total ?? 0),
    },
    upcomingEvents,
    recentIncidents,
    indicators: indicatorRows,
  };
}

export async function getDailySummary(campaignId: number, memberId?: number | null) {
  const db = requireDb(await getDb());
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const tomorrow = new Date(start); tomorrow.setDate(tomorrow.getDate() + 1);
  const horizon = new Date(start); horizon.setDate(horizon.getDate() + 4);
  const scope = memberId ? and(eq(tasks.campaignId, campaignId), eq(tasks.assignedToId, memberId)) : eq(tasks.campaignId, campaignId);
  const dueScope = and(scope, ne(tasks.status, "done"), lte(tasks.dueAt, horizon));
  const [dueTasks, todayEvents] = await Promise.all([
    db.select({ task: tasks, assignee: campaignMembers }).from(tasks).leftJoin(campaignMembers, eq(tasks.assignedToId, campaignMembers.id)).where(dueScope).orderBy(tasks.dueAt),
    db.select().from(events).where(and(eq(events.campaignId, campaignId), gte(events.startsAt, start), lt(events.startsAt, tomorrow))).orderBy(events.startsAt),
  ]);
  return {
    date: start,
    overdue: dueTasks.filter(item => item.task.dueAt && item.task.dueAt < start),
    dueToday: dueTasks.filter(item => item.task.dueAt && item.task.dueAt >= start && item.task.dueAt < tomorrow),
    upcoming: dueTasks.filter(item => item.task.dueAt && item.task.dueAt >= tomorrow),
    todayEvents,
  };
}

export async function listMembers(campaignId: number) {
  const db = requireDb(await getDb());
  return db.select().from(campaignMembers).where(eq(campaignMembers.campaignId, campaignId)).orderBy(desc(campaignMembers.createdAt));
}

export async function createMember(input: {
  campaignId: number;
  name: string;
  email: string;
  role: "admin" | "coordinator" | "partner";
  responsibility?: string;
  workRegion?: string;
}) {
  const db = requireDb(await getDb());
  const organizationId = await organizationIdForCampaign(input.campaignId);
  const result = await db.insert(campaignMembers).values({ ...input, organizationId, active: true });
  return Number(result[0].insertId);
}

export async function listEvents(campaignId: number, startsAt?: Date, endsAt?: Date) {
  const db = requireDb(await getDb());
  const conditions = [eq(events.campaignId, campaignId)];
  if (startsAt) conditions.push(gte(events.startsAt, startsAt));
  if (endsAt) conditions.push(lte(events.startsAt, endsAt));
  return db.select().from(events).where(and(...conditions)).orderBy(events.startsAt);
}

export async function createEvent(input: Omit<typeof events.$inferInsert, "organizationId">) {
  const db = requireDb(await getDb());
  const result = await db.insert(events).values({ ...input, organizationId: await organizationIdForCampaign(input.campaignId) });
  return Number(result[0].insertId);
}

export async function updateEvent(eventId: number, input: Partial<typeof events.$inferInsert>) {
  const db = requireDb(await getDb());
  await db.update(events).set(input).where(eq(events.id, eventId));
}

export async function getEvent(eventId: number) {
  const db = requireDb(await getDb());
  const rows = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  return rows[0] ?? null;
}

export async function listGoals(campaignId: number) {
  const db = requireDb(await getDb());
  return db.select().from(goals).where(eq(goals.campaignId, campaignId)).orderBy(goals.deadline);
}

export async function createGoal(input: Omit<typeof goals.$inferInsert, "organizationId">) {
  const db = requireDb(await getDb());
  const result = await db.insert(goals).values({ ...input, organizationId: await organizationIdForCampaign(input.campaignId) });
  return Number(result[0].insertId);
}

export async function listTasks(campaignId: number, memberId?: number | null) {
  const db = requireDb(await getDb());
  const condition = memberId ? and(eq(tasks.campaignId, campaignId), eq(tasks.assignedToId, memberId)) : eq(tasks.campaignId, campaignId);
  return db.select({ task: tasks, assignee: campaignMembers }).from(tasks).leftJoin(campaignMembers, eq(tasks.assignedToId, campaignMembers.id)).where(condition).orderBy(tasks.dueAt);
}

export async function createTask(input: Omit<typeof tasks.$inferInsert, "organizationId">) {
  const db = requireDb(await getDb());
  const result = await db.insert(tasks).values({ ...input, organizationId: await organizationIdForCampaign(input.campaignId) });
  return Number(result[0].insertId);
}

export async function updateTaskStatus(taskId: number, status: "backlog" | "todo" | "in_progress" | "review" | "done") {
  const db = requireDb(await getDb());
  await db.update(tasks).set({ status, completedAt: status === "done" ? new Date() : null }).where(eq(tasks.id, taskId));
}

export async function getTask(taskId: number) {
  const db = requireDb(await getDb());
  const rows = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  return rows[0] ?? null;
}

export async function listVoters(input: { campaignId: number; memberId?: number | null; neighborhood?: string; region?: string; contactProfile?: string }) {
  const db = requireDb(await getDb());
  const conditions = [eq(voters.campaignId, input.campaignId)];
  if (input.memberId) conditions.push(eq(voters.ownerMemberId, input.memberId));
  if (input.neighborhood) conditions.push(eq(voters.neighborhood, input.neighborhood));
  if (input.region) conditions.push(eq(voters.region, input.region));
  if (input.contactProfile) conditions.push(eq(voters.contactProfile, input.contactProfile));
  return db.select().from(voters).where(and(...conditions)).orderBy(desc(voters.updatedAt)).limit(100);
}

export async function createVoter(input: Omit<typeof voters.$inferInsert, "organizationId">) {
  const db = requireDb(await getDb());
  const result = await db.insert(voters).values({ ...input, organizationId: await organizationIdForCampaign(input.campaignId) });
  return Number(result[0].insertId);
}

export async function createVotersBatch(input: Omit<typeof voters.$inferInsert, "organizationId">[]) {
  if (!input.length) return 0;
  const db = requireDb(await getDb());
  const organizationId = await organizationIdForCampaign(input[0].campaignId);
  await db.insert(voters).values(input.map(item => ({ ...item, organizationId })));
  return input.length;
}

export async function listContactIdentifiers(campaignId: number) {
  const db = requireDb(await getDb());
  return db.select({ email: voters.email, phone: voters.phone }).from(voters).where(eq(voters.campaignId, campaignId));
}

export async function listImportContacts(campaignId: number) {
  const db = requireDb(await getDb());
  return db.select({ id: voters.id, name: voters.name, email: voters.email, phone: voters.phone, neighborhood: voters.neighborhood }).from(voters).where(eq(voters.campaignId, campaignId));
}

export async function updateVoterFromImport(voterId: number, input: Omit<typeof voters.$inferInsert, "id" | "campaignId" | "organizationId" | "ownerMemberId">) {
  const db = requireDb(await getDb());
  await db.update(voters).set(input).where(eq(voters.id, voterId));
}

export async function updateVoterPipeline(voterId: number, pipelineStage: "identified" | "approached" | "engaged" | "mobilized") {
  const db = requireDb(await getDb());
  await db.update(voters).set({ pipelineStage }).where(eq(voters.id, voterId));
}

export async function getTerritoryData(campaignId: number, filters?: { startsAt?: Date; endsAt?: Date; memberId?: number | null }) {
  const db = requireDb(await getDb());
  const voterConditions = [eq(voters.campaignId, campaignId)];
  const eventConditions = [eq(events.campaignId, campaignId)];
  const incidentConditions = [eq(fieldIncidents.campaignId, campaignId)];
  if (filters?.startsAt) { voterConditions.push(gte(voters.createdAt, filters.startsAt)); eventConditions.push(gte(events.startsAt, filters.startsAt)); incidentConditions.push(gte(fieldIncidents.occurredAt, filters.startsAt)); }
  if (filters?.endsAt) { voterConditions.push(lte(voters.createdAt, filters.endsAt)); eventConditions.push(lte(events.startsAt, filters.endsAt)); incidentConditions.push(lte(fieldIncidents.occurredAt, filters.endsAt)); }
  if (filters?.memberId) { voterConditions.push(eq(voters.ownerMemberId, filters.memberId)); eventConditions.push(eq(events.responsibleId, filters.memberId)); incidentConditions.push(eq(fieldIncidents.reportedById, filters.memberId)); }
  const [contactRows, eventRows, incidentRows] = await Promise.all([
    db.select({ region: voters.region, neighborhood: voters.neighborhood, contacts: sql<number>`count(*)` }).from(voters).where(and(...voterConditions)).groupBy(voters.region, voters.neighborhood),
    db.select({ region: events.region, neighborhood: events.neighborhood, total: sql<number>`count(*)` }).from(events).where(and(...eventConditions)).groupBy(events.region, events.neighborhood),
    db.select({ region: fieldIncidents.region, neighborhood: fieldIncidents.neighborhood, total: sql<number>`count(*)` }).from(fieldIncidents).where(and(...incidentConditions)).groupBy(fieldIncidents.region, fieldIncidents.neighborhood),
  ]);
  return { territories: contactRows.map(row => ({ ...row, contacts: Number(row.contacts ?? 0) })), events: eventRows.map(row => ({ ...row, total: Number(row.total ?? 0) })), incidents: incidentRows.map(row => ({ ...row, total: Number(row.total ?? 0) })) };
}

export async function getTeamPerformance(campaignId: number) {
  const db = requireDb(await getDb());
  const [members, taskRows, eventRows] = await Promise.all([
    db.select().from(campaignMembers).where(and(eq(campaignMembers.campaignId, campaignId), eq(campaignMembers.active, true))),
    db.select().from(tasks).where(eq(tasks.campaignId, campaignId)),
    db.select().from(events).where(eq(events.campaignId, campaignId)),
  ]);
  return members.map(member => {
    const memberTasks = taskRows.filter(task => task.assignedToId === member.id);
    return { member, tasks: memberTasks.length, completed: memberTasks.filter(task => task.status === "done").length, inProgress: memberTasks.filter(task => task.status === "in_progress").length, goals: new Set(memberTasks.map(task => task.goalId).filter(Boolean)).size, events: eventRows.filter(event => event.responsibleId === member.id).length };
  });
}

export async function listCampaignContents(campaignId: number) {
  const db = requireDb(await getDb());
  return db.select().from(campaignContents).where(eq(campaignContents.campaignId, campaignId)).orderBy(desc(campaignContents.updatedAt));
}

export async function createCampaignContent(input: Omit<typeof campaignContents.$inferInsert, "organizationId">) {
  const db = requireDb(await getDb());
  const result = await db.insert(campaignContents).values({ ...input, organizationId: await organizationIdForCampaign(input.campaignId) });
  return Number(result[0].insertId);
}

export async function updateCampaignContent(id: number, input: Pick<typeof campaignContents.$inferInsert, "title" | "body" | "assetUrl" | "assetKey" | "assetName" | "assetMime" | "assetSize" | "version" | "channel" | "status">) {
  const db = requireDb(await getDb());
  await db.update(campaignContents).set(input).where(eq(campaignContents.id, id));
}

export async function saveCampaignContentAsset(id: number, asset: Pick<typeof campaignContents.$inferInsert, "assetUrl" | "assetKey" | "assetName" | "assetMime" | "assetSize">) {
  const db = requireDb(await getDb());
  await db.update(campaignContents).set(asset).where(eq(campaignContents.id, id));
}

export async function getContentById(id: number) {
  const db = requireDb(await getDb());
  const rows = await db.select().from(campaignContents).where(eq(campaignContents.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getPublicCampaign(campaignId: number) {
  const db = requireDb(await getDb());
  const rows = await db.select({ id: campaigns.id, name: campaigns.name, candidateName: campaigns.candidateName, electionLabel: campaigns.electionLabel, region: campaigns.region, status: campaigns.status }).from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
  return rows[0] && ["planning", "active"].includes(rows[0].status) ? rows[0] : null;
}

export async function getComparativeReport(campaignId: number, startsAt: Date, endsAt: Date) {
  const db = requireDb(await getDb());
  const previousStart = new Date(startsAt.getTime() - Math.max(1, endsAt.getTime() - startsAt.getTime()));
  const previousEnd = new Date(startsAt.getTime() - 1);
  const [contactsNow, contactsBefore, tasksNow, tasksBefore, eventsNow, eventsBefore, incidentsNow, incidentsBefore, goalsNow, goalsBefore] = await Promise.all([
    db.select({ total: sql<number>`count(*)` }).from(voters).where(and(eq(voters.campaignId, campaignId), gte(voters.createdAt, startsAt), lte(voters.createdAt, endsAt))),
    db.select({ total: sql<number>`count(*)` }).from(voters).where(and(eq(voters.campaignId, campaignId), gte(voters.createdAt, previousStart), lte(voters.createdAt, previousEnd))),
    db.select({ total: sql<number>`count(*)` }).from(tasks).where(and(eq(tasks.campaignId, campaignId), gte(tasks.createdAt, startsAt), lte(tasks.createdAt, endsAt))),
    db.select({ total: sql<number>`count(*)` }).from(tasks).where(and(eq(tasks.campaignId, campaignId), gte(tasks.createdAt, previousStart), lte(tasks.createdAt, previousEnd))),
    db.select({ total: sql<number>`count(*)` }).from(events).where(and(eq(events.campaignId, campaignId), gte(events.startsAt, startsAt), lte(events.startsAt, endsAt))),
    db.select({ total: sql<number>`count(*)` }).from(events).where(and(eq(events.campaignId, campaignId), gte(events.startsAt, previousStart), lte(events.startsAt, previousEnd))),
    db.select({ total: sql<number>`count(*)` }).from(fieldIncidents).where(and(eq(fieldIncidents.campaignId, campaignId), gte(fieldIncidents.occurredAt, startsAt), lte(fieldIncidents.occurredAt, endsAt))),
    db.select({ total: sql<number>`count(*)` }).from(fieldIncidents).where(and(eq(fieldIncidents.campaignId, campaignId), gte(fieldIncidents.occurredAt, previousStart), lte(fieldIncidents.occurredAt, previousEnd))),
    db.select({ total: sql<number>`count(*)` }).from(goals).where(and(eq(goals.campaignId, campaignId), gte(goals.createdAt, startsAt), lte(goals.createdAt, endsAt))),
    db.select({ total: sql<number>`count(*)` }).from(goals).where(and(eq(goals.campaignId, campaignId), gte(goals.createdAt, previousStart), lte(goals.createdAt, previousEnd))),
  ]);
  const normalize = (current: { total: number }[], previous: { total: number }[]) => ({ current: Number(current[0]?.total ?? 0), previous: Number(previous[0]?.total ?? 0) });
  return { startsAt, endsAt, previousStart, previousEnd, contacts: normalize(contactsNow, contactsBefore), tasks: normalize(tasksNow, tasksBefore), events: normalize(eventsNow, eventsBefore), incidents: normalize(incidentsNow, incidentsBefore), goals: normalize(goalsNow, goalsBefore) };
}

export async function getVoter(voterId: number) {
  const db = requireDb(await getDb());
  const rows = await db.select().from(voters).where(eq(voters.id, voterId)).limit(1);
  return rows[0] ?? null;
}

const followupRules = {
  identified: { days: 1, title: "Realizar primeiro contato" },
  approached: { days: 2, title: "Retornar após a abordagem" },
  engaged: { days: 3, title: "Aprofundar o relacionamento" },
  mobilized: { days: 7, title: "Manter o relacionamento ativo" },
} as const;

export async function createFollowupForPipeline(input: { campaignId: number; voterId: number; assignedToId?: number | null; stage: keyof typeof followupRules }) {
  const db = requireDb(await getDb());
  const pending = await db.select({ id: pipelineFollowups.id }).from(pipelineFollowups).where(and(eq(pipelineFollowups.voterId, input.voterId), eq(pipelineFollowups.stage, input.stage), eq(pipelineFollowups.status, "pending"))).limit(1);
  if (pending[0]) return { id: pending[0].id, created: false };
  const rule = followupRules[input.stage];
  const dueAt = new Date(); dueAt.setDate(dueAt.getDate() + rule.days); dueAt.setHours(9, 0, 0, 0);
  const result = await db.insert(pipelineFollowups).values({ organizationId: await organizationIdForCampaign(input.campaignId), campaignId: input.campaignId, voterId: input.voterId, assignedToId: input.assignedToId ?? null, stage: input.stage, title: rule.title, dueAt, status: "pending" });
  return { id: Number(result[0].insertId), created: true };
}

export async function listPipelineFollowups(campaignId: number, memberId?: number | null) {
  const db = requireDb(await getDb());
  const conditions = [eq(pipelineFollowups.campaignId, campaignId)];
  if (memberId) conditions.push(eq(pipelineFollowups.assignedToId, memberId));
  return db.select({ followup: pipelineFollowups, voter: voters, assignee: campaignMembers }).from(pipelineFollowups).innerJoin(voters, eq(pipelineFollowups.voterId, voters.id)).leftJoin(campaignMembers, eq(pipelineFollowups.assignedToId, campaignMembers.id)).where(and(...conditions)).orderBy(pipelineFollowups.status, pipelineFollowups.dueAt).limit(100);
}

export async function getPipelineFollowup(id: number) {
  const db = requireDb(await getDb());
  const rows = await db.select().from(pipelineFollowups).where(eq(pipelineFollowups.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function updatePipelineFollowupStatus(id: number, status: "pending" | "completed" | "cancelled") {
  const db = requireDb(await getDb());
  await db.update(pipelineFollowups).set({ status, completedAt: status === "completed" ? new Date() : null }).where(eq(pipelineFollowups.id, id));
}

export async function createVoterInteraction(input: Omit<typeof voterInteractions.$inferInsert, "organizationId">) {
  const db = requireDb(await getDb());
  const result = await db.insert(voterInteractions).values({ ...input, organizationId: await organizationIdForCampaign(input.campaignId) });
  return Number(result[0].insertId);
}

export async function listVoterInteractions(voterId: number) {
  const db = requireDb(await getDb());
  return db.select().from(voterInteractions).where(eq(voterInteractions.voterId, voterId)).orderBy(desc(voterInteractions.happenedAt));
}

export async function saveAudioCrmLog(input: Omit<typeof audioCrmLogs.$inferInsert, "organizationId">) {
  const db = requireDb(await getDb());
  const result = await db.insert(audioCrmLogs).values({ ...input, organizationId: await organizationIdForCampaign(input.campaignId) });
  return Number(result[0].insertId);
}

export async function listIncidents(campaignId: number, memberId?: number | null) {
  const db = requireDb(await getDb());
  const condition = memberId ? and(eq(fieldIncidents.campaignId, campaignId), eq(fieldIncidents.reportedById, memberId)) : eq(fieldIncidents.campaignId, campaignId);
  return db.select().from(fieldIncidents).where(condition).orderBy(desc(fieldIncidents.occurredAt)).limit(100);
}

export async function createIncident(input: Omit<typeof fieldIncidents.$inferInsert, "organizationId">) {
  const db = requireDb(await getDb());
  const result = await db.insert(fieldIncidents).values({ ...input, organizationId: await organizationIdForCampaign(input.campaignId) });
  return Number(result[0].insertId);
}

export async function listIndicators(campaignId: number) {
  const db = requireDb(await getDb());
  return db.select().from(campaignIndicators).where(eq(campaignIndicators.campaignId, campaignId)).orderBy(desc(campaignIndicators.updatedAt));
}

export async function saveIndicator(input: Omit<typeof campaignIndicators.$inferInsert, "organizationId">) {
  const db = requireDb(await getDb());
  if (input.id) {
    await db.update(campaignIndicators).set({ label: input.label, currentValue: input.currentValue, targetValue: input.targetValue, unit: input.unit }).where(eq(campaignIndicators.id, input.id));
    return input.id;
  }
  const result = await db.insert(campaignIndicators).values({ ...input, organizationId: await organizationIdForCampaign(input.campaignId) });
  return Number(result[0].insertId);
}

export async function getReportData(campaignId: number) {
  const db = requireDb(await getDb());
  const [goalRows, taskRows, voterRows, eventRows, incidentRows] = await Promise.all([
    db.select().from(goals).where(eq(goals.campaignId, campaignId)),
    db.select().from(tasks).where(eq(tasks.campaignId, campaignId)),
    db.select({ total: sql<number>`count(*)` }).from(voters).where(eq(voters.campaignId, campaignId)),
    db.select({ total: sql<number>`count(*)` }).from(events).where(eq(events.campaignId, campaignId)),
    db.select({ total: sql<number>`count(*)` }).from(fieldIncidents).where(eq(fieldIncidents.campaignId, campaignId)),
  ]);
  return { goals: goalRows, tasks: taskRows, voters: Number(voterRows[0]?.total ?? 0), events: Number(eventRows[0]?.total ?? 0), incidents: Number(incidentRows[0]?.total ?? 0) };
}

export async function listAiMessages(campaignId: number, userId: number, kind: "chat" | "content") {
  const db = requireDb(await getDb());
  return db.select().from(aiMessages).where(and(eq(aiMessages.campaignId, campaignId), eq(aiMessages.userId, userId), eq(aiMessages.kind, kind))).orderBy(desc(aiMessages.createdAt)).limit(12);
}

export async function saveAiMessage(input: Omit<typeof aiMessages.$inferInsert, "organizationId">) {
  const db = requireDb(await getDb());
  await db.insert(aiMessages).values({ ...input, organizationId: await organizationIdForCampaign(input.campaignId) });
}
