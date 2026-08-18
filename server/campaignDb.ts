import { and, desc, eq, gte, lt, lte, ne, or, sql } from "drizzle-orm";
import {
  aiMessages,
  audioCrmLogs,
  campaignIndicators,
  campaignMembers,
  campaigns,
  events,
  fieldIncidents,
  goals,
  tasks,
  voterInteractions,
  voters,
} from "../drizzle/schema";
import { getDb } from "./db";

export type CampaignAccess = {
  campaign: typeof campaigns.$inferSelect;
  member: typeof campaignMembers.$inferSelect | null;
};

function requireDb<T>(db: T | null): T {
  if (!db) throw new Error("Banco de dados indisponível.");
  return db;
}

export async function listCampaignsForUser(userId: number) {
  const db = requireDb(await getDb());
  const rows = await db
    .select({ campaign: campaigns, member: campaignMembers })
    .from(campaigns)
    .leftJoin(campaignMembers, and(eq(campaignMembers.campaignId, campaigns.id), eq(campaignMembers.userId, userId)))
    .where(or(eq(campaigns.ownerId, userId), eq(campaignMembers.userId, userId)))
    .orderBy(desc(campaigns.updatedAt));

  return rows.map(({ campaign, member }) => ({ ...campaign, memberRole: member?.role ?? (campaign.ownerId === userId ? "admin" : null) }));
}

export async function getCampaignAccess(campaignId: number, userId: number): Promise<CampaignAccess | null> {
  const db = requireDb(await getDb());
  const rows = await db
    .select({ campaign: campaigns, member: campaignMembers })
    .from(campaigns)
    .leftJoin(campaignMembers, and(eq(campaignMembers.campaignId, campaigns.id), eq(campaignMembers.userId, userId)))
    .where(and(eq(campaigns.id, campaignId), or(eq(campaigns.ownerId, userId), eq(campaignMembers.userId, userId))))
    .limit(1);

  return rows[0] ?? null;
}

export async function createCampaignWithOwner(input: {
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
    name: input.name,
    candidateName: input.candidateName,
    electionLabel: input.electionLabel,
    region: input.region,
    ownerId: input.ownerId,
    status: "planning",
  });
  const campaignId = Number(campaignResult[0].insertId);

  await db.insert(campaignMembers).values({
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
  const result = await db.insert(campaignMembers).values({ ...input, active: true });
  return Number(result[0].insertId);
}

export async function listEvents(campaignId: number, startsAt?: Date, endsAt?: Date) {
  const db = requireDb(await getDb());
  const conditions = [eq(events.campaignId, campaignId)];
  if (startsAt) conditions.push(gte(events.startsAt, startsAt));
  if (endsAt) conditions.push(lte(events.startsAt, endsAt));
  return db.select().from(events).where(and(...conditions)).orderBy(events.startsAt);
}

export async function createEvent(input: typeof events.$inferInsert) {
  const db = requireDb(await getDb());
  const result = await db.insert(events).values(input);
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

export async function createGoal(input: typeof goals.$inferInsert) {
  const db = requireDb(await getDb());
  const result = await db.insert(goals).values(input);
  return Number(result[0].insertId);
}

export async function listTasks(campaignId: number, memberId?: number | null) {
  const db = requireDb(await getDb());
  const condition = memberId ? and(eq(tasks.campaignId, campaignId), eq(tasks.assignedToId, memberId)) : eq(tasks.campaignId, campaignId);
  return db.select({ task: tasks, assignee: campaignMembers }).from(tasks).leftJoin(campaignMembers, eq(tasks.assignedToId, campaignMembers.id)).where(condition).orderBy(tasks.dueAt);
}

export async function createTask(input: typeof tasks.$inferInsert) {
  const db = requireDb(await getDb());
  const result = await db.insert(tasks).values(input);
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

export async function createVoter(input: typeof voters.$inferInsert) {
  const db = requireDb(await getDb());
  const result = await db.insert(voters).values(input);
  return Number(result[0].insertId);
}

export async function createVotersBatch(input: (typeof voters.$inferInsert)[]) {
  if (!input.length) return 0;
  const db = requireDb(await getDb());
  await db.insert(voters).values(input);
  return input.length;
}

export async function getVoter(voterId: number) {
  const db = requireDb(await getDb());
  const rows = await db.select().from(voters).where(eq(voters.id, voterId)).limit(1);
  return rows[0] ?? null;
}

export async function createVoterInteraction(input: typeof voterInteractions.$inferInsert) {
  const db = requireDb(await getDb());
  const result = await db.insert(voterInteractions).values(input);
  return Number(result[0].insertId);
}

export async function listVoterInteractions(voterId: number) {
  const db = requireDb(await getDb());
  return db.select().from(voterInteractions).where(eq(voterInteractions.voterId, voterId)).orderBy(desc(voterInteractions.happenedAt));
}

export async function saveAudioCrmLog(input: typeof audioCrmLogs.$inferInsert) {
  const db = requireDb(await getDb());
  const result = await db.insert(audioCrmLogs).values(input);
  return Number(result[0].insertId);
}

export async function listIncidents(campaignId: number, memberId?: number | null) {
  const db = requireDb(await getDb());
  const condition = memberId ? and(eq(fieldIncidents.campaignId, campaignId), eq(fieldIncidents.reportedById, memberId)) : eq(fieldIncidents.campaignId, campaignId);
  return db.select().from(fieldIncidents).where(condition).orderBy(desc(fieldIncidents.occurredAt)).limit(100);
}

export async function createIncident(input: typeof fieldIncidents.$inferInsert) {
  const db = requireDb(await getDb());
  const result = await db.insert(fieldIncidents).values(input);
  return Number(result[0].insertId);
}

export async function listIndicators(campaignId: number) {
  const db = requireDb(await getDb());
  return db.select().from(campaignIndicators).where(eq(campaignIndicators.campaignId, campaignId)).orderBy(desc(campaignIndicators.updatedAt));
}

export async function saveIndicator(input: typeof campaignIndicators.$inferInsert) {
  const db = requireDb(await getDb());
  if (input.id) {
    await db.update(campaignIndicators).set({ label: input.label, currentValue: input.currentValue, targetValue: input.targetValue, unit: input.unit }).where(eq(campaignIndicators.id, input.id));
    return input.id;
  }
  const result = await db.insert(campaignIndicators).values(input);
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

export async function saveAiMessage(input: typeof aiMessages.$inferInsert) {
  const db = requireDb(await getDb());
  await db.insert(aiMessages).values(input);
}
