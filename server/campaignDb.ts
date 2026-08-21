import { randomUUID } from "node:crypto";
import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, gte, lt, lte, ne, or, sql } from "drizzle-orm";
import {
  aiMessages,
  audioCrmLogs,
  campaignIndicators,
  campaignExportVersions,
  campaignFinancialEntries,
  campaignLegalDocuments,
  campaignLegalProcesses,
  campaignCertificateSettings,
  campaignComplianceRules,
  campaignCommunicationLogs,
  campaignCommunicationTemplates,
  campaignTrainingRecognitionRules,
  campaignContents,
  campaignMembers,
  campaigns,
  consentRecords,
  crisisCases,
  crisisDecisionLogs,
  events,
  eventRegistrations,
  fieldIncidents,
  fieldPlaybookMaterials,
  fieldPlaybooks,
  fieldVisits,
  goals,
  organizationAuditLogs,
  organizationInvitations,
  organizationMembers,
  organizations,
  pipelineFollowups,
  routePerformanceEvents,
  campaignSurveys,
  surveyResponses,
  tasks,
  volunteerAssignments,
  volunteerTrainingCertificates,
  volunteerTrainingCertificateVersions,
  volunteerTrainingCompletions,
  volunteerTrainingMaterials,
  volunteerTrainingTeamGoals,
  volunteerTrainingTeamRecognitionHistory,
  volunteers,
  voterCommunicationPreferences,
  voterInteractions,
  voters,
} from "../drizzle/schema";
import { getDb } from "./db";
import { summarizePerformanceEvents } from "./routeMetrics";
import { getInitialFinancialEntryStatus, isFinancialEntryIncludedInActiveBalance } from "./financialStatus";

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
  await createOrganizationAuditLog({ organizationId, actorUserId: input.userId, action: "organization.created", entityType: "organization", entityId: organizationId, metadata: { name: input.name } });
  return organizationId;
}

export async function createOrganizationAuditLog(input: { organizationId: number; actorUserId?: number | null; action: string; entityType: string; entityId?: number | null; metadata?: Record<string, unknown> }) {
  const db = requireDb(await getDb());
  await db.insert(organizationAuditLogs).values({ organizationId: input.organizationId, actorUserId: input.actorUserId ?? null, action: input.action, entityType: input.entityType, entityId: input.entityId ?? null, metadata: input.metadata ?? null });
}

export async function listOrganizationAuditLogs(organizationId: number, limit = 100) {
  const db = requireDb(await getDb());
  const { users } = await import("../drizzle/schema");
  return db.select({ log: organizationAuditLogs, actor: { id: users.id, name: users.name, email: users.email } })
    .from(organizationAuditLogs)
    .leftJoin(users, eq(users.id, organizationAuditLogs.actorUserId))
    .where(eq(organizationAuditLogs.organizationId, organizationId))
    .orderBy(desc(organizationAuditLogs.createdAt))
    .limit(limit);
}

export async function recordRoutePerformanceEvent(input: { organizationId?: number | null; route: string; method: string; statusCode: number; durationMs: number }) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(routePerformanceEvents).values({
      organizationId: input.organizationId ?? null,
      route: input.route,
      method: input.method,
      statusCode: input.statusCode,
      durationMs: Math.max(0, Math.min(Math.round(input.durationMs), 300_000)),
      hasError: input.statusCode >= 400,
    });
  } catch (error) {
    console.warn("[Telemetry] Unable to record route performance", error instanceof Error ? error.message : error);
  }
}

export async function getRoutePerformanceMetrics(input: { organizationId: number; days: number }) {
  const db = requireDb(await getDb());
  const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);
  const scope = and(eq(routePerformanceEvents.organizationId, input.organizationId), gte(routePerformanceEvents.createdAt, since));
  const events = await db.select({ organizationId: routePerformanceEvents.organizationId, route: routePerformanceEvents.route, method: routePerformanceEvents.method, statusCode: routePerformanceEvents.statusCode, durationMs: routePerformanceEvents.durationMs }).from(routePerformanceEvents).where(scope);
  const metrics = summarizePerformanceEvents(events, input.organizationId);
  return { periodDays: input.days, since, summary: metrics.summary, routes: metrics.routes.slice(0, 100) };
}

export async function getOrganizationMembership(userId: number, organizationId: number) {
  const db = requireDb(await getDb());
  const rows = await db.select().from(organizationMembers).where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.active, true))).limit(1);
  return rows[0] ?? null;
}

export async function createOrganizationInvitation(input: { organizationId: number; email: string; role: "admin" | "manager" | "operator" | "viewer"; tokenHash: string; invitedById: number; expiresAt: Date }) {
  const db = requireDb(await getDb());
  const result = await db.insert(organizationInvitations).values({ ...input, email: input.email.trim().toLowerCase(), status: "pending" });
  const invitationId = Number(result[0].insertId);
  await createOrganizationAuditLog({ organizationId: input.organizationId, actorUserId: input.invitedById, action: "member.invited", entityType: "invitation", entityId: invitationId, metadata: { email: input.email.trim().toLowerCase(), role: input.role } });
  return invitationId;
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
  await createOrganizationAuditLog({ organizationId: invitation.organizationId, actorUserId: input.userId, action: "invitation.accepted", entityType: "invitation", entityId: invitation.id, metadata: { role: invitation.role } });
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

export async function updateOrganizationMemberRole(input: { organizationId: number; memberId: number; role: "admin" | "manager" | "operator" | "viewer"; actorUserId: number }) {
  const db = requireDb(await getDb());
  await db.update(organizationMembers).set({ role: input.role }).where(and(eq(organizationMembers.id, input.memberId), eq(organizationMembers.organizationId, input.organizationId)));
  await createOrganizationAuditLog({ organizationId: input.organizationId, actorUserId: input.actorUserId, action: "member.role_updated", entityType: "organization_member", entityId: input.memberId, metadata: { role: input.role } });
}

export async function listCampaignsForUser(userId: number, organizationId?: number) {
  const db = requireDb(await getDb());
  const organizationConditions = [
    eq(organizationMembers.organizationId, campaigns.organizationId),
    eq(organizationMembers.userId, userId),
    eq(organizationMembers.active, true),
  ];
  if (organizationId) organizationConditions.push(eq(campaigns.organizationId, organizationId));
  const rows = await db
    .select({ campaign: campaigns, member: campaignMembers })
    .from(campaigns)
    .innerJoin(organizationMembers, and(...organizationConditions))
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

export async function updateCampaignDetails(campaignId: number, input: { name: string; candidateName: string; electionLabel: string; region: string; status: "planning" | "active" | "paused" | "closed"; actorUserId: number }) {
  const db = requireDb(await getDb());
  const { actorUserId, ...details } = input;
  await db.update(campaigns).set(details).where(eq(campaigns.id, campaignId));
  await createOrganizationAuditLog({ organizationId: await organizationIdForCampaign(campaignId), actorUserId, action: "campaign.updated", entityType: "campaign", entityId: campaignId, metadata: { name: details.name, status: details.status } });
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

export async function getCampaignMember(campaignId: number, memberId: number) {
  const db = requireDb(await getDb());
  const rows = await db.select().from(campaignMembers).where(and(eq(campaignMembers.campaignId, campaignId), eq(campaignMembers.id, memberId))).limit(1);
  return rows[0] ?? null;
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

export async function deleteEventIfEmpty(eventId: number) {
  const db = requireDb(await getDb());
  const countRows = await db.select({ total: sql<number>`count(*)` }).from(eventRegistrations).where(eq(eventRegistrations.eventId, eventId));
  if (Number(countRows[0]?.total ?? 0) > 0) throw new Error("EVENT_HAS_REGISTRATIONS");
  await db.delete(events).where(eq(events.id, eventId));
}

function hashPublicToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getPublicEvent(eventId: number) {
  const db = requireDb(await getDb());
  const rows = await db.select({ event: events, campaign: { id: campaigns.id, name: campaigns.name, candidateName: campaigns.candidateName, region: campaigns.region } })
    .from(events)
    .innerJoin(campaigns, eq(campaigns.id, events.campaignId))
    .where(and(eq(events.id, eventId), eq(events.publicRegistrationEnabled, true), ne(events.status, "cancelled")))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const countRows = await db.select({ total: sql<number>`count(*)` }).from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, eventId), ne(eventRegistrations.status, "cancelled")));
  return { ...row, registrationCount: Number(countRows[0]?.total ?? 0) };
}

export async function listEventRegistrations(campaignId: number, eventId: number) {
  const db = requireDb(await getDb());
  return db.select({ registration: eventRegistrations, voter: voters, volunteer: volunteers })
    .from(eventRegistrations)
    .leftJoin(voters, eq(voters.id, eventRegistrations.voterId))
    .leftJoin(volunteers, eq(volunteers.id, eventRegistrations.volunteerId))
    .where(and(eq(eventRegistrations.campaignId, campaignId), eq(eventRegistrations.eventId, eventId)))
    .orderBy(desc(eventRegistrations.registeredAt));
}

export async function getEventParticipationSummary(campaignId: number, eventId: number) {
  const db = requireDb(await getDb());
  const rows = await db.select({ status: eventRegistrations.status, total: sql<number>`count(*)` })
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.campaignId, campaignId), eq(eventRegistrations.eventId, eventId)))
    .groupBy(eventRegistrations.status);
  const totals = { registered: 0, checkedIn: 0, cancelled: 0, noShow: 0 };
  rows.forEach(row => {
    const total = Number(row.total ?? 0);
    if (row.status === "registered") totals.registered += total;
    if (row.status === "checked_in") totals.checkedIn += total;
    if (row.status === "cancelled") totals.cancelled += total;
    if (row.status === "no_show") totals.noShow += total;
  });
  return { ...totals, total: totals.registered + totals.checkedIn + totals.cancelled + totals.noShow };
}

export async function getEventIndicators(input: { campaignId: number; startsAt?: Date; endsAt?: Date; neighborhood?: string; region?: string }) {
  const db = requireDb(await getDb());
  const conditions = [eq(events.campaignId, input.campaignId)];
  if (input.startsAt) conditions.push(gte(events.startsAt, input.startsAt));
  if (input.endsAt) conditions.push(lte(events.startsAt, input.endsAt));
  if (input.neighborhood) conditions.push(eq(events.neighborhood, input.neighborhood));
  if (input.region) conditions.push(eq(events.region, input.region));
  const rows = await db.select({
    id: events.id,
    type: events.type,
    neighborhood: events.neighborhood,
    region: events.region,
    startsAt: events.startsAt,
    attendanceTarget: events.attendanceTarget,
    registrations: sql<number>`count(${eventRegistrations.id})`,
    checkedIn: sql<number>`coalesce(sum(case when ${eventRegistrations.status} = 'checked_in' then 1 else 0 end), 0)`,
    feedbackCount: sql<number>`coalesce(sum(case when ${eventRegistrations.feedbackRating} is not null then 1 else 0 end), 0)`,
    feedbackSum: sql<number>`coalesce(sum(${eventRegistrations.feedbackRating}), 0)`,
  }).from(events).leftJoin(eventRegistrations, eq(eventRegistrations.eventId, events.id)).where(and(...conditions)).groupBy(events.id, events.type, events.neighborhood, events.region, events.startsAt);
  const normalize = (value: unknown) => Number(value ?? 0);
  const totalEvents = rows.length;
  const registrations = rows.reduce((total, row) => total + normalize(row.registrations), 0);
  const checkedIn = rows.reduce((total, row) => total + normalize(row.checkedIn), 0);
  const attendanceTarget = rows.reduce((total, row) => total + normalize(row.attendanceTarget), 0);
  const feedbackCount = rows.reduce((total, row) => total + normalize(row.feedbackCount), 0);
  const feedbackSum = rows.reduce((total, row) => total + normalize(row.feedbackSum), 0);
  const group = (selector: (row: typeof rows[number]) => string | null) => Object.values(rows.reduce<Record<string, { label: string; events: number; registrations: number; checkedIn: number; feedbackSum: number; feedbackCount: number }>>((accumulator, row) => {
    const label = selector(row) || "Não informado";
    const current = accumulator[label] ?? { label, events: 0, registrations: 0, checkedIn: 0, feedbackSum: 0, feedbackCount: 0 };
    current.events += 1; current.registrations += normalize(row.registrations); current.checkedIn += normalize(row.checkedIn); current.feedbackSum += normalize(row.feedbackSum); current.feedbackCount += normalize(row.feedbackCount);
    accumulator[label] = current; return accumulator;
  }, {})).map(item => ({ ...item, attendanceRate: item.registrations ? Math.round((item.checkedIn / item.registrations) * 100) : 0, averageRating: item.feedbackCount ? Number((item.feedbackSum / item.feedbackCount).toFixed(1)) : null })).sort((a, b) => b.checkedIn - a.checkedIn || b.registrations - a.registrations);
  return {
    summary: { totalEvents, registrations, checkedIn, attendanceTarget, targetProgress: attendanceTarget ? Math.round((checkedIn / attendanceTarget) * 100) : null, attendanceRate: registrations ? Math.round((checkedIn / registrations) * 100) : 0, averageRating: feedbackCount ? Number((feedbackSum / feedbackCount).toFixed(1)) : null, feedbackCount },
    byNeighborhood: group(row => row.neighborhood),
    byRegion: group(row => row.region),
    byType: group(row => row.type),
  };
}

export async function getUpcomingEventTargetAlerts(campaignId: number) {
  const db = requireDb(await getDb());
  const now = new Date(); const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const rows = await db.select({ event: events, checkedIn: sql<number>`coalesce(sum(case when ${eventRegistrations.status} = 'checked_in' then 1 else 0 end), 0)` }).from(events).leftJoin(eventRegistrations, eq(eventRegistrations.eventId, events.id)).where(and(eq(events.campaignId, campaignId), eq(events.status, "scheduled"), gte(events.startsAt, now), lte(events.startsAt, horizon))).groupBy(events.id);
  return rows.filter(row => row.event.attendanceTarget && Number(row.checkedIn) < row.event.attendanceTarget && row.event.startsAt.getTime() - now.getTime() <= (row.event.mobilizationAlertHours ?? 48) * 60 * 60 * 1000).map(row => ({ event: row.event, checkedIn: Number(row.checkedIn), remaining: Math.max(0, row.event.attendanceTarget! - Number(row.checkedIn)) }));
}

export async function compareEventIndicators(input: { campaignId: number; startsAt: Date; endsAt: Date; neighborhood?: string; region?: string }) {
  const span = Math.max(24 * 60 * 60 * 1000, input.endsAt.getTime() - input.startsAt.getTime());
  const previousEndsAt = new Date(input.startsAt.getTime() - 1);
  const previousStartsAt = new Date(previousEndsAt.getTime() - span);
  const [current, previous] = await Promise.all([getEventIndicators(input), getEventIndicators({ ...input, startsAt: previousStartsAt, endsAt: previousEndsAt })]);
  return { current, previous, previousStartsAt, previousEndsAt };
}

export async function createCampaignExportVersion(input: { campaignId: number; createdByUserId: number; exportType: string; title: string; periodStart?: Date | null; periodEnd?: Date | null; sections: string[]; strategicNotes?: string | null; snapshot: unknown }) {
  const db = requireDb(await getDb());
  const organizationId = await organizationIdForCampaign(input.campaignId);
  const result = await db.insert(campaignExportVersions).values({ ...input, organizationId, periodStart: input.periodStart ?? null, periodEnd: input.periodEnd ?? null, strategicNotes: input.strategicNotes ?? null });
  return Number(result[0].insertId);
}

export async function listCampaignExportVersions(campaignId: number) {
  const db = requireDb(await getDb());
  return db.select().from(campaignExportVersions).where(eq(campaignExportVersions.campaignId, campaignId)).orderBy(desc(campaignExportVersions.createdAt));
}

export async function listFinancialEntries(campaignId: number) { const db = requireDb(await getDb()); return db.select().from(campaignFinancialEntries).where(eq(campaignFinancialEntries.campaignId, campaignId)).orderBy(desc(campaignFinancialEntries.createdAt)); }
export async function getFinancialSummary(campaignId: number) { const entries = await listFinancialEntries(campaignId); const active = entries.filter(entry => isFinancialEntryIncludedInActiveBalance(entry.status)); const incomeCents = active.filter(entry => entry.entryType === "income").reduce((sum, entry) => sum + entry.amountCents, 0); const expenseCents = active.filter(entry => entry.entryType === "expense").reduce((sum, entry) => sum + entry.amountCents, 0); return { incomeCents, expenseCents, balanceCents: incomeCents - expenseCents, paidIncomeCents: active.filter(entry => entry.entryType === "income" && entry.status === "paid").reduce((sum, entry) => sum + entry.amountCents, 0), paidExpenseCents: active.filter(entry => entry.entryType === "expense" && entry.status === "paid").reduce((sum, entry) => sum + entry.amountCents, 0), pendingCount: entries.filter(entry => ["pending", "under_review"].includes(entry.status)).length }; }
export async function createFinancialEntry(input: { campaignId: number; createdByUserId: number; entryType: "income" | "expense"; category: string; counterpartyName: string; counterpartyDocument?: string | null; supplierName?: string | null; costCenter?: string | null; eventId?: number | null; amountCents: number; paymentMethod?: string | null; receiptNumber?: string | null; documentNumber?: string | null; dueDate?: Date | null; paidAt?: Date | null; notes?: string | null }) { const db = requireDb(await getDb()); const organizationId = await organizationIdForCampaign(input.campaignId); const result = await db.insert(campaignFinancialEntries).values({ ...input, organizationId, counterpartyDocument: input.counterpartyDocument ?? null, supplierName: input.supplierName ?? null, costCenter: input.costCenter ?? null, eventId: input.eventId ?? null, paymentMethod: input.paymentMethod ?? null, receiptNumber: input.receiptNumber ?? null, documentNumber: input.documentNumber ?? null, dueDate: input.dueDate ?? null, paidAt: input.paidAt ?? null, notes: input.notes ?? null, status: getInitialFinancialEntryStatus(input.paidAt) }); return Number(result[0].insertId); }
export async function getFinancialEntry(id: number) { const db = requireDb(await getDb()); const rows = await db.select().from(campaignFinancialEntries).where(eq(campaignFinancialEntries.id, id)).limit(1); return rows[0] ?? null; }
export async function updateFinancialEntryReview(input: { id: number; status: "pending" | "under_review" | "approved" | "rejected" | "paid" | "reconciled" | "closed" | "cancelled"; reviewedByUserId: number; reviewNotes?: string | null }) { const db = requireDb(await getDb()); await db.update(campaignFinancialEntries).set({ status: input.status, reviewedByUserId: input.reviewedByUserId, reviewedAt: new Date(), reviewNotes: input.reviewNotes ?? null, paidAt: input.status === "paid" ? new Date() : undefined }).where(eq(campaignFinancialEntries.id, input.id)); }
export async function listLegalDocuments(campaignId: number) { const db = requireDb(await getDb()); return db.select().from(campaignLegalDocuments).where(eq(campaignLegalDocuments.campaignId, campaignId)).orderBy(desc(campaignLegalDocuments.createdAt)); }
export async function listLegalProcesses(campaignId: number) { const db = requireDb(await getDb()); const rows = await db.select({ process: campaignLegalProcesses, document: campaignLegalDocuments, owner: campaignMembers }).from(campaignLegalProcesses).leftJoin(campaignLegalDocuments, eq(campaignLegalProcesses.documentId, campaignLegalDocuments.id)).leftJoin(campaignMembers, and(eq(campaignMembers.userId, campaignLegalProcesses.ownerUserId), eq(campaignMembers.campaignId, campaignLegalProcesses.campaignId))).where(eq(campaignLegalProcesses.campaignId, campaignId)).orderBy(desc(campaignLegalProcesses.updatedAt)); return rows.map(row => ({ ...row.process, documentTitle: row.document?.title ?? null, ownerName: row.owner?.name ?? null })); }
export async function getLegalProcess(id: number) { const db = requireDb(await getDb()); const rows = await db.select().from(campaignLegalProcesses).where(eq(campaignLegalProcesses.id, id)).limit(1); return rows[0] ?? null; }
export async function createLegalProcess(input: { campaignId: number; documentId: number | null; ownerUserId: number | null; title: string; status: "open" | "in_progress" | "waiting" | "closed"; deadlineAt: Date | null; notes: string | null }) { const db = requireDb(await getDb()); const organizationId = await organizationIdForCampaign(input.campaignId); const result = await db.insert(campaignLegalProcesses).values({ ...input, organizationId }); return Number(result[0].insertId); }
export async function updateLegalProcess(input: { id: number; status: "open" | "in_progress" | "waiting" | "closed"; deadlineAt: Date | null; notes: string | null }) { const db = requireDb(await getDb()); await db.update(campaignLegalProcesses).set({ status: input.status, deadlineAt: input.deadlineAt, notes: input.notes }).where(eq(campaignLegalProcesses.id, input.id)); }
export async function getCampaignComplianceRules(campaignId: number) { const db = requireDb(await getDb()); const existing = await db.select().from(campaignComplianceRules).where(eq(campaignComplianceRules.campaignId, campaignId)).limit(1); if (existing[0]) return existing[0]; const organizationId = await organizationIdForCampaign(campaignId); await db.insert(campaignComplianceRules).values({ organizationId, campaignId, blockBusinessDonation: false, requireExpenseDocument: false, reviewDeadlineHours: 72 }); const created = await db.select().from(campaignComplianceRules).where(eq(campaignComplianceRules.campaignId, campaignId)).limit(1); return created[0]!; }
export async function updateCampaignComplianceRules(input: { campaignId: number; blockBusinessDonation: boolean; requireExpenseDocument: boolean; reviewDeadlineHours: number }) { const db = requireDb(await getDb()); const organizationId = await organizationIdForCampaign(input.campaignId); await db.insert(campaignComplianceRules).values({ ...input, organizationId }).onDuplicateKeyUpdate({ set: { blockBusinessDonation: input.blockBusinessDonation, requireExpenseDocument: input.requireExpenseDocument, reviewDeadlineHours: input.reviewDeadlineHours } }); return getCampaignComplianceRules(input.campaignId); }
export async function getFinancialInternalAlerts(campaignId: number) { const [rules, entries, documents] = await Promise.all([getCampaignComplianceRules(campaignId), listFinancialEntries(campaignId), listLegalDocuments(campaignId)]); const reviewCutoff = new Date(Date.now() - rules.reviewDeadlineHours * 60 * 60 * 1000); const alerts: Array<{ key: string; type: "review_overdue" | "document_required"; severity: "warning" | "critical"; entryId: number; title: string; description: string }> = []; for (const entry of entries) { if (["pending", "under_review"].includes(entry.status) && entry.createdAt <= reviewCutoff) alerts.push({ key: `review-${entry.id}`, type: "review_overdue", severity: "warning", entryId: entry.id, title: "Conferência financeira pendente", description: `O lançamento ${entry.category} ultrapassou o prazo interno de ${rules.reviewDeadlineHours} horas para revisão.` }); if (rules.requireExpenseDocument && entry.entryType === "expense" && !["rejected", "cancelled", "closed"].includes(entry.status) && !documents.some(document => document.financialEntryId === entry.id)) alerts.push({ key: `document-${entry.id}`, type: "document_required", severity: "critical", entryId: entry.id, title: "Documento mínimo pendente", description: `A despesa ${entry.category} precisa de documento jurídico ou comprobatório vinculado conforme a regra interna.` }); } return { rules, alerts }; }
export async function getFinancialComplianceReport(campaignId: number) { const [summary, entries, documents] = await Promise.all([getFinancialSummary(campaignId), listFinancialEntries(campaignId), listLegalDocuments(campaignId)]); return { summary, entries: entries.map(entry => ({ id: entry.id, entryType: entry.entryType, category: entry.category, counterpartyName: entry.counterpartyName, amountCents: entry.amountCents, paymentMethod: entry.paymentMethod, receiptNumber: entry.receiptNumber, documentNumber: entry.documentNumber, dueDate: entry.dueDate, paidAt: entry.paidAt, status: entry.status, createdAt: entry.createdAt })), documents: documents.map(document => ({ id: document.id, documentType: document.documentType, title: document.title, status: document.status, expiresAt: document.expiresAt, fileName: document.fileName, createdAt: document.createdAt })) }; }
export async function createLegalDocument(input: { campaignId: number; createdByUserId: number; documentType: string; title: string; counterpartyName?: string | null; counterpartyDocument?: string | null; financialEntryId?: number | null; expiresAt?: Date | null }) { const db = requireDb(await getDb()); const organizationId = await organizationIdForCampaign(input.campaignId); const result = await db.insert(campaignLegalDocuments).values({ ...input, organizationId, counterpartyName: input.counterpartyName ?? null, counterpartyDocument: input.counterpartyDocument ?? null, financialEntryId: input.financialEntryId ?? null, expiresAt: input.expiresAt ?? null }); return Number(result[0].insertId); }
export async function getLegalDocument(id: number) { const db = requireDb(await getDb()); const rows = await db.select().from(campaignLegalDocuments).where(eq(campaignLegalDocuments.id, id)).limit(1); return rows[0] ?? null; }
export async function updateLegalDocumentAttachment(input: { id: number; fileName: string; storageKey: string; url: string }) { const db = requireDb(await getDb()); await db.update(campaignLegalDocuments).set({ fileName: input.fileName, storageKey: input.storageKey, url: input.url }).where(eq(campaignLegalDocuments.id, input.id)); }
export async function updateLegalDocumentReview(input: { id: number; status: "under_review" | "approved" | "rejected" | "archived"; reviewedByUserId: number; reviewNotes?: string | null }) { const db = requireDb(await getDb()); await db.update(campaignLegalDocuments).set({ status: input.status, reviewedByUserId: input.reviewedByUserId, reviewedAt: new Date(), reviewNotes: input.reviewNotes ?? null }).where(eq(campaignLegalDocuments.id, input.id)); }

export async function registerForPublicEvent(input: { eventId: number; name: string; email: string; phone?: string | null }) {
  const db = requireDb(await getDb());
  const publicEvent = await getPublicEvent(input.eventId);
  if (!publicEvent) throw new Error("EVENT_UNAVAILABLE");
  const now = new Date();
  if (publicEvent.event.registrationClosesAt && publicEvent.event.registrationClosesAt < now) throw new Error("REGISTRATION_CLOSED");
  if (publicEvent.event.capacity && publicEvent.registrationCount >= publicEvent.event.capacity) throw new Error("EVENT_FULL");
  const email = input.email.trim().toLowerCase();
  const existing = await db.select({ id: eventRegistrations.id }).from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, input.eventId), eq(eventRegistrations.email, email))).limit(1);
  if (existing[0]) return { id: existing[0].id, accessToken: null, alreadyRegistered: true };
  const [voter] = await db.select({ id: voters.id }).from(voters).where(and(eq(voters.campaignId, publicEvent.event.campaignId), eq(voters.email, email))).limit(1);
  const [volunteer] = await db.select({ id: volunteers.id }).from(volunteers).where(and(eq(volunteers.campaignId, publicEvent.event.campaignId), eq(volunteers.email, email))).limit(1);
  const accessToken = randomBytes(24).toString("base64url");
  const result = await db.insert(eventRegistrations).values({
    organizationId: publicEvent.event.organizationId,
    campaignId: publicEvent.event.campaignId,
    eventId: input.eventId,
    voterId: voter?.id ?? null,
    volunteerId: volunteer?.id ?? null,
    name: input.name.trim(),
    email,
    phone: input.phone?.trim() || null,
    accessTokenHash: hashPublicToken(accessToken),
  });
  return { id: Number(result[0].insertId), accessToken, alreadyRegistered: false };
}

export async function updateEventRegistrationStatus(input: { campaignId: number; eventId: number; registrationId: number; status: "registered" | "checked_in" | "cancelled" | "no_show"; actorUserId: number }) {
  const db = requireDb(await getDb());
  const rows = await db.select().from(eventRegistrations).where(and(eq(eventRegistrations.id, input.registrationId), eq(eventRegistrations.eventId, input.eventId), eq(eventRegistrations.campaignId, input.campaignId))).limit(1);
  const registration = rows[0];
  if (!registration) throw new Error("EVENT_REGISTRATION_NOT_FOUND");
  const isNewCheckIn = input.status === "checked_in" && registration.status !== "checked_in";
  await db.update(eventRegistrations).set({ status: input.status, checkedInAt: input.status === "checked_in" ? new Date() : null }).where(eq(eventRegistrations.id, input.registrationId));
  if (isNewCheckIn && registration.voterId) {
    await db.insert(voterInteractions).values({ organizationId: registration.organizationId, campaignId: registration.campaignId, voterId: registration.voterId, type: "event", notes: `Presença confirmada no evento #${registration.eventId}.`, memberId: null });
  }
}

export async function getEventRegistrationByAccessToken(token: string) {
  const db = requireDb(await getDb());
  const rows = await db.select({ registration: eventRegistrations, event: events, campaign: campaigns })
    .from(eventRegistrations)
    .innerJoin(events, eq(events.id, eventRegistrations.eventId))
    .innerJoin(campaigns, eq(campaigns.id, eventRegistrations.campaignId))
    .where(eq(eventRegistrations.accessTokenHash, hashPublicToken(token)))
    .limit(1);
  return rows[0] ?? null;
}

export async function submitEventFeedback(input: { token: string; rating: number; comment?: string | null }) {
  const registration = await getEventRegistrationByAccessToken(input.token);
  if (!registration) throw new Error("EVENT_REGISTRATION_NOT_FOUND");
  const db = requireDb(await getDb());
  await db.update(eventRegistrations).set({ feedbackRating: input.rating, feedbackComment: input.comment?.trim() || null, feedbackSubmittedAt: new Date() }).where(eq(eventRegistrations.id, registration.registration.id));
  return registration;
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

export async function getTerritoryHeatmap(campaignId: number) {
  const db = requireDb(await getDb());
  const [contactRows, visitRows, interactionRows, responseRows] = await Promise.all([
    db.select({ region: voters.region, neighborhood: voters.neighborhood, total: sql<number>`count(*)` }).from(voters).where(eq(voters.campaignId, campaignId)).groupBy(voters.region, voters.neighborhood),
    db.select({ region: voters.region, neighborhood: voters.neighborhood, total: sql<number>`count(*)` }).from(fieldVisits).leftJoin(voters, eq(fieldVisits.voterId, voters.id)).where(eq(fieldVisits.campaignId, campaignId)).groupBy(voters.region, voters.neighborhood),
    db.select({ region: voters.region, neighborhood: voters.neighborhood, total: sql<number>`count(*)` }).from(voterInteractions).leftJoin(voters, eq(voterInteractions.voterId, voters.id)).where(eq(voterInteractions.campaignId, campaignId)).groupBy(voters.region, voters.neighborhood),
    db.select({ region: surveyResponses.region, neighborhood: surveyResponses.neighborhood, total: sql<number>`count(*)` }).from(surveyResponses).where(eq(surveyResponses.campaignId, campaignId)).groupBy(surveyResponses.region, surveyResponses.neighborhood),
  ]);
  const rows = new Map<string, { region: string | null; neighborhood: string | null; contacts: number; visits: number; interactions: number; responses: number }>();
  const merge = (items: Array<{ region: string | null; neighborhood: string | null; total: number }>, key: "contacts" | "visits" | "interactions" | "responses") => items.forEach(item => { const id = `${item.region ?? "Sem região"}::${item.neighborhood ?? "Sem bairro"}`; const current = rows.get(id) ?? { region: item.region, neighborhood: item.neighborhood, contacts: 0, visits: 0, interactions: 0, responses: 0 }; current[key] += Number(item.total ?? 0); rows.set(id, current); });
  merge(contactRows, "contacts"); merge(visitRows, "visits"); merge(interactionRows, "interactions"); merge(responseRows, "responses");
  return Array.from(rows.values()).map(item => ({ ...item, intensity: item.contacts + item.visits * 3 + item.interactions * 2 + item.responses * 2 })).sort((a, b) => b.intensity - a.intensity);
}

export async function getMobilizationScores(campaignId: number) {
  const db = requireDb(await getDb());
  const [contactRows, interactionRows, visitRows, consentRows] = await Promise.all([
    db.select().from(voters).where(eq(voters.campaignId, campaignId)).limit(500),
    db.select({ voterId: voterInteractions.voterId, total: sql<number>`count(*)` }).from(voterInteractions).where(eq(voterInteractions.campaignId, campaignId)).groupBy(voterInteractions.voterId),
    db.select({ voterId: fieldVisits.voterId, total: sql<number>`count(*)` }).from(fieldVisits).where(eq(fieldVisits.campaignId, campaignId)).groupBy(fieldVisits.voterId),
    db.select({ voterId: consentRecords.voterId, total: sql<number>`count(*)` }).from(consentRecords).where(and(eq(consentRecords.campaignId, campaignId), eq(consentRecords.status, "active"))).groupBy(consentRecords.voterId),
  ]);
  const interactions = new Map(interactionRows.map(row => [row.voterId, Number(row.total ?? 0)])); const visits = new Map(visitRows.map(row => [row.voterId, Number(row.total ?? 0)])); const consents = new Map(consentRows.map(row => [row.voterId, Number(row.total ?? 0)])); const stageScore = { identified: 10, approached: 30, engaged: 60, mobilized: 85 } as const;
  return contactRows.map(voter => { const interactionCount = interactions.get(voter.id) ?? 0; const visitCount = visits.get(voter.id) ?? 0; const consent = (consents.get(voter.id) ?? 0) > 0; const score = Math.min(100, stageScore[voter.pipelineStage] + Math.min(15, interactionCount * 5) + Math.min(15, visitCount * 5) + (consent ? 10 : 0)); return { voter, interactions: interactionCount, visits: visitCount, consent, score }; }).sort((a, b) => b.score - a.score);
}

export async function listCampaignSurveys(campaignId: number) {
  const db = requireDb(await getDb());
  return db.select().from(campaignSurveys).where(eq(campaignSurveys.campaignId, campaignId)).orderBy(desc(campaignSurveys.updatedAt));
}

export async function createCampaignSurvey(input: { campaignId: number; title: string; question: string; responseType: "single_choice" | "scale" | "text"; options?: string[] | null; status: "draft" | "active" | "closed"; createdByUserId: number }) {
  const db = requireDb(await getDb()); const result = await db.insert(campaignSurveys).values({ ...input, options: input.options ?? null, organizationId: await organizationIdForCampaign(input.campaignId) }); return Number(result[0].insertId);
}

export async function submitSurveyResponse(input: { surveyId: number; campaignId: number; voterId?: number | null; response: string; neighborhood?: string | null; region?: string | null; submittedByUserId: number }) {
  const db = requireDb(await getDb()); const result = await db.insert(surveyResponses).values({ ...input, voterId: input.voterId ?? null, neighborhood: input.neighborhood ?? null, region: input.region ?? null, organizationId: await organizationIdForCampaign(input.campaignId) }); return Number(result[0].insertId);
}

export async function getSurveySummary(campaignId: number, surveyId: number) {
  const db = requireDb(await getDb()); const [survey] = await db.select().from(campaignSurveys).where(and(eq(campaignSurveys.id, surveyId), eq(campaignSurveys.campaignId, campaignId))).limit(1); if (!survey) return null;
  const [totalRows, answers, territories] = await Promise.all([db.select({ total: sql<number>`count(*)` }).from(surveyResponses).where(and(eq(surveyResponses.surveyId, surveyId), eq(surveyResponses.campaignId, campaignId))), db.select({ response: surveyResponses.response, total: sql<number>`count(*)` }).from(surveyResponses).where(and(eq(surveyResponses.surveyId, surveyId), eq(surveyResponses.campaignId, campaignId))).groupBy(surveyResponses.response), db.select({ neighborhood: surveyResponses.neighborhood, region: surveyResponses.region, total: sql<number>`count(*)` }).from(surveyResponses).where(and(eq(surveyResponses.surveyId, surveyId), eq(surveyResponses.campaignId, campaignId))).groupBy(surveyResponses.neighborhood, surveyResponses.region)]);
  return { survey, total: Number(totalRows[0]?.total ?? 0), answers: answers.map(row => ({ ...row, total: Number(row.total ?? 0) })), territories: territories.map(row => ({ ...row, total: Number(row.total ?? 0) })).sort((a, b) => b.total - a.total) };
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

export async function getTeamBenchmark(campaignId: number) {
  const db = requireDb(await getDb());
  const [members, taskRows, eventRows, visitRows] = await Promise.all([
    db.select().from(campaignMembers).where(and(eq(campaignMembers.campaignId, campaignId), eq(campaignMembers.active, true))),
    db.select().from(tasks).where(eq(tasks.campaignId, campaignId)),
    db.select().from(events).where(eq(events.campaignId, campaignId)),
    db.select().from(fieldVisits).where(eq(fieldVisits.campaignId, campaignId)),
  ]);
  const groups = new Map<string, { region: string; memberIds: Set<number>; tasks: number; completed: number; events: number; visits: number }>();
  members.forEach(member => { const region = member.workRegion?.trim() || "Sem região definida"; const current = groups.get(region) ?? { region, memberIds: new Set<number>(), tasks: 0, completed: 0, events: 0, visits: 0 }; current.memberIds.add(member.id); groups.set(region, current); });
  const memberToRegion = new Map(members.map(member => [member.id, member.workRegion?.trim() || "Sem região definida"]));
  taskRows.forEach(task => { const region = task.assignedToId ? memberToRegion.get(task.assignedToId) : undefined; const current = region ? groups.get(region) : undefined; if (!current) return; current.tasks += 1; if (task.status === "done") current.completed += 1; });
  eventRows.forEach(event => { const region = event.responsibleId ? memberToRegion.get(event.responsibleId) : undefined; const current = region ? groups.get(region) : undefined; if (current) current.events += 1; });
  visitRows.forEach(visit => { const region = visit.memberId ? memberToRegion.get(visit.memberId) : undefined; const current = region ? groups.get(region) : undefined; if (current) current.visits += 1; });
  return Array.from(groups.values()).map(group => { const memberCount = group.memberIds.size; const suppressed = memberCount < 2; const productivityIndex = Math.round((group.completed * 5 + group.events * 3 + group.visits * 2) / Math.max(memberCount, 1)); return { region: group.region, memberCount, suppressed, tasks: suppressed ? null : group.tasks, completed: suppressed ? null : group.completed, events: suppressed ? null : group.events, visits: suppressed ? null : group.visits, productivityIndex: suppressed ? null : productivityIndex }; }).sort((a, b) => (b.productivityIndex ?? -1) - (a.productivityIndex ?? -1));
}

export async function listCampaignContents(campaignId: number) {
  const db = requireDb(await getDb());
  const rows = await db.select({ content: campaignContents, ownerName: campaignMembers.name }).from(campaignContents).leftJoin(campaignMembers, eq(campaignContents.ownerMemberId, campaignMembers.id)).where(eq(campaignContents.campaignId, campaignId)).orderBy(desc(campaignContents.updatedAt));
  return rows.map(({ content, ownerName }) => ({ ...content, ownerName }));
}

export async function createCampaignContent(input: Omit<typeof campaignContents.$inferInsert, "organizationId">) {
  const db = requireDb(await getDb());
  const result = await db.insert(campaignContents).values({ ...input, organizationId: await organizationIdForCampaign(input.campaignId) });
  return Number(result[0].insertId);
}

export async function updateCampaignContent(id: number, input: Pick<typeof campaignContents.$inferInsert, "title" | "body" | "assetUrl" | "assetKey" | "assetName" | "assetMime" | "assetSize" | "version" | "channel" | "objective" | "scheduledAt" | "ownerMemberId" | "status">) {
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

export async function listCommunicationCandidates(input: { campaignId: number; channel?: "email" | "whatsapp" | "phone"; neighborhood?: string; region?: string }) {
  const db = requireDb(await getDb());
  const conditions = [eq(voters.campaignId, input.campaignId), eq(voters.contactConsent, true), eq(voters.doNotContact, false)];
  if (input.neighborhood) conditions.push(eq(voters.neighborhood, input.neighborhood));
  if (input.region) conditions.push(eq(voters.region, input.region));
  const rows = await db.select({ voter: voters, preference: voterCommunicationPreferences }).from(voters)
    .leftJoin(voterCommunicationPreferences, eq(voterCommunicationPreferences.voterId, voters.id))
    .where(and(...conditions)).orderBy(desc(voters.updatedAt)).limit(500);
  const allows = (preference: typeof voterCommunicationPreferences.$inferSelect | null, channel: "email" | "whatsapp" | "phone") => channel === "email" ? preference?.emailAllowed : channel === "whatsapp" ? preference?.whatsappAllowed : preference?.phoneAllowed;
  return rows.filter(row => !input.channel || (allows(row.preference, input.channel) && (input.channel === "email" ? Boolean(row.voter.email) : Boolean(row.voter.phone))));
}

export async function upsertVoterCommunicationPreference(input: { campaignId: number; voterId: number; emailAllowed: boolean; whatsappAllowed: boolean; phoneAllowed: boolean; updatedByUserId: number }) {
  const db = requireDb(await getDb());
  const voter = await getVoter(input.voterId); if (!voter || voter.campaignId !== input.campaignId) throw new Error("VOTER_NOT_FOUND");
  const organizationId = await organizationIdForCampaign(input.campaignId);
  await db.insert(voterCommunicationPreferences).values({ ...input, organizationId }).onDuplicateKeyUpdate({ set: { emailAllowed: input.emailAllowed, whatsappAllowed: input.whatsappAllowed, phoneAllowed: input.phoneAllowed, updatedByUserId: input.updatedByUserId } });
}

export async function listCommunicationTemplates(campaignId: number) {
  const db = requireDb(await getDb());
  return db.select().from(campaignCommunicationTemplates).where(eq(campaignCommunicationTemplates.campaignId, campaignId)).orderBy(desc(campaignCommunicationTemplates.updatedAt));
}

export async function createCommunicationTemplate(input: { campaignId: number; title: string; channel: "email" | "whatsapp" | "phone"; subject?: string | null; body: string; createdByUserId: number }) {
  const db = requireDb(await getDb());
  const result = await db.insert(campaignCommunicationTemplates).values({ ...input, organizationId: await organizationIdForCampaign(input.campaignId), subject: input.subject ?? null, active: true });
  return Number(result[0].insertId);
}

export async function updateCommunicationTemplate(input: { id: number; title: string; channel: "email" | "whatsapp" | "phone"; subject?: string | null; body: string; active: boolean }) {
  const db = requireDb(await getDb());
  await db.update(campaignCommunicationTemplates).set({ title: input.title, channel: input.channel, subject: input.subject ?? null, body: input.body, active: input.active }).where(eq(campaignCommunicationTemplates.id, input.id));
}

export async function getCommunicationTemplate(id: number) {
  const db = requireDb(await getDb());
  const rows = await db.select().from(campaignCommunicationTemplates).where(eq(campaignCommunicationTemplates.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function logManualCommunication(input: { campaignId: number; voterId: number; templateId?: number | null; channel: "email" | "whatsapp" | "phone"; notes?: string | null; createdByUserId: number }) {
  const db = requireDb(await getDb());
  const voter = await getVoter(input.voterId); if (!voter || voter.campaignId !== input.campaignId || !voter.contactConsent || voter.doNotContact) throw new Error("CONTACT_NOT_ELIGIBLE");
  const preferences = await db.select().from(voterCommunicationPreferences).where(eq(voterCommunicationPreferences.voterId, input.voterId)).limit(1); const preference = preferences[0];
  const allowed = input.channel === "email" ? preference?.emailAllowed && voter.email : input.channel === "whatsapp" ? preference?.whatsappAllowed && voter.phone : preference?.phoneAllowed && voter.phone;
  if (!allowed) throw new Error("CHANNEL_NOT_ALLOWED");
  const result = await db.insert(campaignCommunicationLogs).values({ ...input, organizationId: await organizationIdForCampaign(input.campaignId), templateId: input.templateId ?? null, notes: input.notes ?? null });
  return Number(result[0].insertId);
}

export async function listCommunicationLogs(campaignId: number) {
  const db = requireDb(await getDb());
  return db.select({ log: campaignCommunicationLogs, voter: { id: voters.id, name: voters.name }, template: { id: campaignCommunicationTemplates.id, title: campaignCommunicationTemplates.title } })
    .from(campaignCommunicationLogs).innerJoin(voters, eq(voters.id, campaignCommunicationLogs.voterId)).leftJoin(campaignCommunicationTemplates, eq(campaignCommunicationTemplates.id, campaignCommunicationLogs.templateId))
    .where(eq(campaignCommunicationLogs.campaignId, campaignId)).orderBy(desc(campaignCommunicationLogs.createdAt)).limit(100);
}

export async function listVolunteers(campaignId: number) {
  const db = requireDb(await getDb());
  const [rows, materials, completions, certificates, members] = await Promise.all([
    db.select().from(volunteers).where(eq(volunteers.campaignId, campaignId)).orderBy(desc(volunteers.createdAt)),
    db.select({ id: volunteerTrainingMaterials.id }).from(volunteerTrainingMaterials).where(and(eq(volunteerTrainingMaterials.campaignId, campaignId), eq(volunteerTrainingMaterials.active, true))),
    db.select({ volunteerId: volunteerTrainingCompletions.volunteerId }).from(volunteerTrainingCompletions).where(eq(volunteerTrainingCompletions.campaignId, campaignId)),
    db.select().from(volunteerTrainingCertificates).where(eq(volunteerTrainingCertificates.campaignId, campaignId)),
    listMembers(campaignId),
  ]);
  const completedByVolunteer = new Map<number, number>(); completions.forEach(item => completedByVolunteer.set(item.volunteerId, (completedByVolunteer.get(item.volunteerId) ?? 0) + 1));
  const certificateByVolunteer = new Map(certificates.map(item => [item.volunteerId, item]));
  const coordinatorNameById = new Map(members.map(member => [member.id, member.name]));
  return rows.map(volunteer => ({ ...volunteer, coordinatorName: volunteer.coordinatorMemberId ? coordinatorNameById.get(volunteer.coordinatorMemberId) ?? null : null, trainingCompleted: completedByVolunteer.get(volunteer.id) ?? 0, trainingTotal: materials.length, certificate: certificateByVolunteer.get(volunteer.id) ?? null }));
}

export async function getVolunteer(volunteerId: number) {
  const db = requireDb(await getDb());
  const rows = await db.select().from(volunteers).where(eq(volunteers.id, volunteerId)).limit(1);
  return rows[0] ?? null;
}

export async function getVolunteerByAccessTokenHash(accessTokenHash: string) {
  const db = requireDb(await getDb());
  const rows = await db.select().from(volunteers).where(eq(volunteers.accessTokenHash, accessTokenHash)).limit(1);
  return rows[0] ?? null;
}

export async function getVolunteerByEmail(campaignId: number, email: string) {
  const db = requireDb(await getDb());
  const rows = await db.select().from(volunteers).where(and(eq(volunteers.campaignId, campaignId), eq(volunteers.email, email.trim().toLowerCase()))).limit(1);
  return rows[0] ?? null;
}

export async function createVolunteer(input: Omit<typeof volunteers.$inferInsert, "organizationId">) {
  const db = requireDb(await getDb());
  const result = await db.insert(volunteers).values({ ...input, email: input.email.trim().toLowerCase(), organizationId: await organizationIdForCampaign(input.campaignId) });
  return Number(result[0].insertId);
}

export async function updateVolunteer(volunteerId: number, input: Pick<typeof volunteers.$inferInsert, "availability" | "skills" | "trainingStatus" | "status" | "notes" | "neighborhood" | "region" | "phone" | "coordinatorMemberId">) {
  const db = requireDb(await getDb());
  await db.update(volunteers).set(input).where(eq(volunteers.id, volunteerId));
}

export async function updateVolunteerPortalProfile(volunteerId: number, input: { availability?: string | null; skills?: string | null }) {
  const db = requireDb(await getDb());
  await db.update(volunteers).set(input).where(eq(volunteers.id, volunteerId));
}

export async function listVolunteerTrainingMaterials(campaignId: number, volunteerId?: number, includeInactive = false) {
  const db = requireDb(await getDb());
  const conditions = [eq(volunteerTrainingMaterials.campaignId, campaignId)]; if (!includeInactive) conditions.push(eq(volunteerTrainingMaterials.active, true));
  const [materials, completions] = await Promise.all([
    db.select().from(volunteerTrainingMaterials).where(and(...conditions)).orderBy(volunteerTrainingMaterials.position, volunteerTrainingMaterials.createdAt),
    volunteerId ? db.select().from(volunteerTrainingCompletions).where(and(eq(volunteerTrainingCompletions.campaignId, campaignId), eq(volunteerTrainingCompletions.volunteerId, volunteerId))) : Promise.resolve([]),
  ]);
  const completedAtByMaterial = new Map(completions.map(item => [item.materialId, item.completedAt]));
  return materials.map(material => ({ ...material, completedAt: completedAtByMaterial.get(material.id) ?? null }));
}

export async function getVolunteerTrainingDashboard(campaignId: number, filters: { coordinatorMemberId?: number; region?: string } = {}) {
  const db = requireDb(await getDb()); const now = new Date();
  const [volunteerRows, materials, completions, members] = await Promise.all([
    db.select().from(volunteers).where(eq(volunteers.campaignId, campaignId)),
    db.select({ id: volunteerTrainingMaterials.id, dueAt: volunteerTrainingMaterials.dueAt }).from(volunteerTrainingMaterials).where(and(eq(volunteerTrainingMaterials.campaignId, campaignId), eq(volunteerTrainingMaterials.active, true))),
    db.select({ volunteerId: volunteerTrainingCompletions.volunteerId, materialId: volunteerTrainingCompletions.materialId }).from(volunteerTrainingCompletions).where(eq(volunteerTrainingCompletions.campaignId, campaignId)),
    listMembers(campaignId),
  ]);
  const selected = volunteerRows.filter(item => (!filters.coordinatorMemberId || item.coordinatorMemberId === filters.coordinatorMemberId) && (!filters.region || item.region === filters.region));
  const completedByVolunteer = new Map<number, Set<number>>(); completions.forEach(item => { const set = completedByVolunteer.get(item.volunteerId) ?? new Set<number>(); set.add(item.materialId); completedByVolunteer.set(item.volunteerId, set); });
  const coordinatorNameById = new Map(members.map(member => [member.id, member.name])); const totalMaterials = materials.length;
  const volunteerProgress = selected.map(item => { const completed = completedByVolunteer.get(item.id)?.size ?? 0; const overdue = materials.filter(material => material.dueAt && material.dueAt < now && !(completedByVolunteer.get(item.id)?.has(material.id))).length; return { id: item.id, name: item.name, region: item.region, coordinatorMemberId: item.coordinatorMemberId, coordinatorName: item.coordinatorMemberId ? coordinatorNameById.get(item.coordinatorMemberId) ?? null : null, completed, total: totalMaterials, progress: totalMaterials ? Math.round((completed / totalMaterials) * 100) : 0, overdue }; });
  const completedVolunteers = volunteerProgress.filter(item => totalMaterials > 0 && item.completed >= totalMaterials).length; const overdueVolunteers = volunteerProgress.filter(item => item.overdue > 0).length;
  const byRegion = Array.from(new Set(volunteerProgress.map(item => item.region || "Sem região"))).map(region => { const group = volunteerProgress.filter(item => (item.region || "Sem região") === region); return { region, volunteers: group.length, completionRate: group.length ? Math.round(group.reduce((sum, item) => sum + item.progress, 0) / group.length) : 0, overdue: group.filter(item => item.overdue > 0).length }; }).sort((a, b) => b.completionRate - a.completionRate);
  return { summary: { volunteers: volunteerProgress.length, totalMaterials, completedVolunteers, completionRate: volunteerProgress.length ? Math.round((completedVolunteers / volunteerProgress.length) * 100) : 0, overdueVolunteers }, byRegion, volunteers: volunteerProgress };
}

export async function setVolunteerTrainingTeamGoal(input: { campaignId: number; coordinatorMemberId: number; month: string; targetCompletions: number }) {
  const db = requireDb(await getDb()); const existing = await db.select({ id: volunteerTrainingTeamGoals.id }).from(volunteerTrainingTeamGoals).where(and(eq(volunteerTrainingTeamGoals.campaignId, input.campaignId), eq(volunteerTrainingTeamGoals.coordinatorMemberId, input.coordinatorMemberId), eq(volunteerTrainingTeamGoals.month, input.month))).limit(1);
  if (existing[0]) { await db.update(volunteerTrainingTeamGoals).set({ targetCompletions: input.targetCompletions }).where(eq(volunteerTrainingTeamGoals.id, existing[0].id)); return existing[0].id; }
  const result = await db.insert(volunteerTrainingTeamGoals).values({ ...input, organizationId: await organizationIdForCampaign(input.campaignId) }); return Number(result[0].insertId);
}

export async function getVolunteerTrainingTeamRanking(campaignId: number, month: string) {
  const db = requireDb(await getDb()); const [year, monthNumber] = month.split("-").map(Number); const startsAt = new Date(Date.UTC(year, monthNumber - 1, 1)); const endsAt = new Date(Date.UTC(year, monthNumber, 1));
  const [members, volunteerRows, certificateVersions, targets] = await Promise.all([
    db.select().from(campaignMembers).where(and(eq(campaignMembers.campaignId, campaignId), eq(campaignMembers.active, true))),
    db.select().from(volunteers).where(and(eq(volunteers.campaignId, campaignId), eq(volunteers.status, "active"))),
    db.select({ volunteerId: volunteerTrainingCertificateVersions.volunteerId }).from(volunteerTrainingCertificateVersions).where(and(eq(volunteerTrainingCertificateVersions.campaignId, campaignId), gte(volunteerTrainingCertificateVersions.issuedAt, startsAt), lt(volunteerTrainingCertificateVersions.issuedAt, endsAt))),
    db.select().from(volunteerTrainingTeamGoals).where(and(eq(volunteerTrainingTeamGoals.campaignId, campaignId), eq(volunteerTrainingTeamGoals.month, month))),
  ]);
  const targetByMember = new Map(targets.map(item => [item.coordinatorMemberId, item.targetCompletions])); const volunteerToMember = new Map(volunteerRows.filter(item => item.coordinatorMemberId).map(item => [item.id, item.coordinatorMemberId!])); const assignedCount = new Map<number, number>(); volunteerRows.forEach(item => { if (item.coordinatorMemberId) assignedCount.set(item.coordinatorMemberId, (assignedCount.get(item.coordinatorMemberId) ?? 0) + 1); }); const completedVolunteers = new Set(certificateVersions.map(item => item.volunteerId)); const completedCount = new Map<number, number>(); completedVolunteers.forEach(volunteerId => { const memberId = volunteerToMember.get(volunteerId); if (memberId) completedCount.set(memberId, (completedCount.get(memberId) ?? 0) + 1); });
  return members.map(member => { const assignedVolunteers = assignedCount.get(member.id) ?? 0; const completedTrainingsThisMonth = completedCount.get(member.id) ?? 0; const targetCompletions = targetByMember.get(member.id) ?? 0; const goalProgress = targetCompletions > 0 ? Math.round((completedTrainingsThisMonth / targetCompletions) * 100) : 0; return { coordinatorMemberId: member.id, name: member.name, region: member.workRegion ?? null, assignedVolunteers, completedTrainingsThisMonth, targetCompletions, goalProgress, hasGoal: targetCompletions > 0 }; }).filter(item => item.assignedVolunteers > 0 || item.hasGoal).sort((a, b) => b.goalProgress - a.goalProgress || b.completedTrainingsThisMonth - a.completedTrainingsThisMonth || a.name.localeCompare(b.name));
}

export async function getCampaignTrainingRecognitionRules(campaignId: number) {
  const db = requireDb(await getDb()); const rows = await db.select().from(campaignTrainingRecognitionRules).where(eq(campaignTrainingRecognitionRules.campaignId, campaignId)).limit(1);
  return rows[0] ?? { campaignId, achievedThreshold: 100, standoutThreshold: 125, updatedByUserId: null };
}

export async function updateCampaignTrainingRecognitionRules(input: { campaignId: number; achievedThreshold: number; standoutThreshold: number; updatedByUserId: number }) {
  const db = requireDb(await getDb()); const existing = await db.select({ id: campaignTrainingRecognitionRules.id }).from(campaignTrainingRecognitionRules).where(eq(campaignTrainingRecognitionRules.campaignId, input.campaignId)).limit(1);
  if (existing[0]) { await db.update(campaignTrainingRecognitionRules).set({ achievedThreshold: input.achievedThreshold, standoutThreshold: input.standoutThreshold, updatedByUserId: input.updatedByUserId }).where(eq(campaignTrainingRecognitionRules.id, existing[0].id)); return existing[0].id; }
  const result = await db.insert(campaignTrainingRecognitionRules).values({ ...input, organizationId: await organizationIdForCampaign(input.campaignId) }); return Number(result[0].insertId);
}

function recognitionMedal(item: { hasGoal: boolean; goalProgress: number }, rankPosition: number, rules: { achievedThreshold: number; standoutThreshold: number }) {
  if (!item.hasGoal || item.goalProgress < rules.achievedThreshold) return "none";
  if (item.goalProgress >= rules.standoutThreshold) return "standout";
  if (rankPosition === 1) return "leader";
  return "achieved";
}

export async function recordVolunteerTrainingRecognitionHistory(campaignId: number, month: string) {
  const db = requireDb(await getDb()); const [rules, ranking] = await Promise.all([getCampaignTrainingRecognitionRules(campaignId), getVolunteerTrainingTeamRanking(campaignId, month)]); const organizationId = await organizationIdForCampaign(campaignId);
  await Promise.all(ranking.map(async (item, index) => { const rankPosition = index + 1; const medal = recognitionMedal(item, rankPosition, rules); const existing = await db.select({ id: volunteerTrainingTeamRecognitionHistory.id }).from(volunteerTrainingTeamRecognitionHistory).where(and(eq(volunteerTrainingTeamRecognitionHistory.campaignId, campaignId), eq(volunteerTrainingTeamRecognitionHistory.coordinatorMemberId, item.coordinatorMemberId), eq(volunteerTrainingTeamRecognitionHistory.month, month))).limit(1); const snapshot = { rankPosition, completedTrainings: item.completedTrainingsThisMonth, targetCompletions: item.targetCompletions, goalProgress: item.goalProgress, medal }; if (existing[0]) await db.update(volunteerTrainingTeamRecognitionHistory).set(snapshot).where(eq(volunteerTrainingTeamRecognitionHistory.id, existing[0].id)); else await db.insert(volunteerTrainingTeamRecognitionHistory).values({ organizationId, campaignId, coordinatorMemberId: item.coordinatorMemberId, month, ...snapshot }); }));
  return { recorded: ranking.length };
}

export async function listVolunteerTrainingRecognitionHistory(campaignId: number) {
  const db = requireDb(await getDb());
  return db.select({ id: volunteerTrainingTeamRecognitionHistory.id, month: volunteerTrainingTeamRecognitionHistory.month, rankPosition: volunteerTrainingTeamRecognitionHistory.rankPosition, completedTrainings: volunteerTrainingTeamRecognitionHistory.completedTrainings, targetCompletions: volunteerTrainingTeamRecognitionHistory.targetCompletions, goalProgress: volunteerTrainingTeamRecognitionHistory.goalProgress, medal: volunteerTrainingTeamRecognitionHistory.medal, recordedAt: volunteerTrainingTeamRecognitionHistory.recordedAt, coordinatorMemberId: campaignMembers.id, name: campaignMembers.name, region: campaignMembers.workRegion }).from(volunteerTrainingTeamRecognitionHistory).innerJoin(campaignMembers, eq(volunteerTrainingTeamRecognitionHistory.coordinatorMemberId, campaignMembers.id)).where(eq(volunteerTrainingTeamRecognitionHistory.campaignId, campaignId)).orderBy(desc(volunteerTrainingTeamRecognitionHistory.month), volunteerTrainingTeamRecognitionHistory.rankPosition);
}

export async function getVolunteerTrainingMaterial(materialId: number) {
  const db = requireDb(await getDb());
  const rows = await db.select().from(volunteerTrainingMaterials).where(eq(volunteerTrainingMaterials.id, materialId)).limit(1);
  return rows[0] ?? null;
}

export async function updateVolunteerTrainingMaterialDeadline(materialId: number, dueAt: Date | null) {
  const db = requireDb(await getDb());
  await db.update(volunteerTrainingMaterials).set({ dueAt }).where(eq(volunteerTrainingMaterials.id, materialId));
}

export async function updateVolunteerTrainingMaterial(materialId: number, input: Partial<Pick<typeof volunteerTrainingMaterials.$inferInsert, "title" | "description" | "materialType" | "resourceUrl" | "content" | "durationMinutes" | "dueAt" | "active">>) {
  const db = requireDb(await getDb());
  await db.update(volunteerTrainingMaterials).set(input).where(eq(volunteerTrainingMaterials.id, materialId));
}

export async function reorderVolunteerTrainingMaterials(campaignId: number, materialIds: number[]) {
  const db = requireDb(await getDb());
  await Promise.all(materialIds.map((id, position) => db.update(volunteerTrainingMaterials).set({ position }).where(and(eq(volunteerTrainingMaterials.id, id), eq(volunteerTrainingMaterials.campaignId, campaignId)))));
}

export async function createVolunteerTrainingMaterial(input: Omit<typeof volunteerTrainingMaterials.$inferInsert, "organizationId">) {
  const db = requireDb(await getDb());
  const result = await db.insert(volunteerTrainingMaterials).values({ ...input, organizationId: await organizationIdForCampaign(input.campaignId) });
  await db.update(volunteers).set({ trainingStatus: "in_progress" }).where(and(eq(volunteers.campaignId, input.campaignId), eq(volunteers.trainingStatus, "completed")));
  return Number(result[0].insertId);
}

export async function completeVolunteerTrainingMaterial(input: { campaignId: number; materialId: number; volunteerId: number }) {
  const db = requireDb(await getDb()); const organizationId = await organizationIdForCampaign(input.campaignId);
  const existing = await db.select({ id: volunteerTrainingCompletions.id }).from(volunteerTrainingCompletions).where(and(eq(volunteerTrainingCompletions.materialId, input.materialId), eq(volunteerTrainingCompletions.volunteerId, input.volunteerId))).limit(1);
  if (!existing[0]) await db.insert(volunteerTrainingCompletions).values({ ...input, organizationId, completedAt: new Date() });
  const [materials, completions] = await Promise.all([
    db.select({ id: volunteerTrainingMaterials.id }).from(volunteerTrainingMaterials).where(and(eq(volunteerTrainingMaterials.campaignId, input.campaignId), eq(volunteerTrainingMaterials.active, true))),
    db.select({ id: volunteerTrainingCompletions.id }).from(volunteerTrainingCompletions).where(and(eq(volunteerTrainingCompletions.campaignId, input.campaignId), eq(volunteerTrainingCompletions.volunteerId, input.volunteerId))),
  ]);
  const trainingStatus = materials.length > 0 && completions.length >= materials.length ? "completed" : "in_progress";
  await db.update(volunteers).set({ trainingStatus }).where(eq(volunteers.id, input.volunteerId));
  let certificate: { certificateCode: string; issuedAt: Date; completedMaterials: number } | null = null;
  if (trainingStatus === "completed") {
    const currentRows = await db.select({ certificateCode: volunteerTrainingCertificates.certificateCode, issuedAt: volunteerTrainingCertificates.issuedAt, completedMaterials: volunteerTrainingCertificates.completedMaterials }).from(volunteerTrainingCertificates).where(and(eq(volunteerTrainingCertificates.campaignId, input.campaignId), eq(volunteerTrainingCertificates.volunteerId, input.volunteerId))).limit(1);
    const versions = await db.select({ versionNumber: volunteerTrainingCertificateVersions.versionNumber, certificateCode: volunteerTrainingCertificateVersions.certificateCode, issuedAt: volunteerTrainingCertificateVersions.issuedAt, completedMaterials: volunteerTrainingCertificateVersions.completedMaterials }).from(volunteerTrainingCertificateVersions).where(and(eq(volunteerTrainingCertificateVersions.campaignId, input.campaignId), eq(volunteerTrainingCertificateVersions.volunteerId, input.volunteerId))).orderBy(desc(volunteerTrainingCertificateVersions.versionNumber));
    const now = new Date(); let current = currentRows[0] ?? null;
    if (!current) {
      current = { certificateCode: `W9-${randomUUID().replace(/-/g, "").toUpperCase()}`, issuedAt: now, completedMaterials: materials.length };
      await db.insert(volunteerTrainingCertificates).values({ organizationId, campaignId: input.campaignId, volunteerId: input.volunteerId, ...current });
      await db.insert(volunteerTrainingCertificateVersions).values({ organizationId, campaignId: input.campaignId, volunteerId: input.volunteerId, versionNumber: 1, ...current });
    } else if (current.completedMaterials !== materials.length) {
      current = { certificateCode: `W9-${randomUUID().replace(/-/g, "").toUpperCase()}`, issuedAt: now, completedMaterials: materials.length };
      await db.update(volunteerTrainingCertificates).set(current).where(and(eq(volunteerTrainingCertificates.campaignId, input.campaignId), eq(volunteerTrainingCertificates.volunteerId, input.volunteerId)));
      await db.insert(volunteerTrainingCertificateVersions).values({ organizationId, campaignId: input.campaignId, volunteerId: input.volunteerId, versionNumber: (versions[0]?.versionNumber ?? 0) + 1, ...current });
    } else if (!versions[0]) {
      await db.insert(volunteerTrainingCertificateVersions).values({ organizationId, campaignId: input.campaignId, volunteerId: input.volunteerId, versionNumber: 1, ...current });
    }
    certificate = current;
  }
  return { completed: completions.length, total: materials.length, trainingStatus, certificate };
}

export async function getVolunteerTrainingCertificate(campaignId: number, volunteerId: number) {
  const db = requireDb(await getDb());
  const rows = await db.select({ certificateCode: volunteerTrainingCertificates.certificateCode, issuedAt: volunteerTrainingCertificates.issuedAt, completedMaterials: volunteerTrainingCertificates.completedMaterials }).from(volunteerTrainingCertificates).where(and(eq(volunteerTrainingCertificates.campaignId, campaignId), eq(volunteerTrainingCertificates.volunteerId, volunteerId))).limit(1);
  return rows[0] ?? null;
}

export async function listVolunteerTrainingCertificates(campaignId: number, volunteerId: number) {
  const db = requireDb(await getDb());
  const versions = await db.select({ certificateCode: volunteerTrainingCertificateVersions.certificateCode, issuedAt: volunteerTrainingCertificateVersions.issuedAt, completedMaterials: volunteerTrainingCertificateVersions.completedMaterials, versionNumber: volunteerTrainingCertificateVersions.versionNumber }).from(volunteerTrainingCertificateVersions).where(and(eq(volunteerTrainingCertificateVersions.campaignId, campaignId), eq(volunteerTrainingCertificateVersions.volunteerId, volunteerId))).orderBy(desc(volunteerTrainingCertificateVersions.versionNumber));
  if (versions.length) return versions;
  const current = await getVolunteerTrainingCertificate(campaignId, volunteerId);
  return current ? [{ ...current, versionNumber: 1 }] : [];
}

const defaultCertificateSettings = { primaryColor: "#103527", accentColor: "#c9a85b", logoUrl: null, signatureImageUrl: null, signatureName: null, signatureRole: null };

export async function getCampaignCertificateSettings(campaignId: number) {
  const db = requireDb(await getDb());
  const rows = await db.select({ primaryColor: campaignCertificateSettings.primaryColor, accentColor: campaignCertificateSettings.accentColor, logoUrl: campaignCertificateSettings.logoUrl, signatureImageUrl: campaignCertificateSettings.signatureImageUrl, signatureName: campaignCertificateSettings.signatureName, signatureRole: campaignCertificateSettings.signatureRole }).from(campaignCertificateSettings).where(eq(campaignCertificateSettings.campaignId, campaignId)).limit(1);
  return rows[0] ?? defaultCertificateSettings;
}

export async function updateCampaignCertificateSettings(input: { campaignId: number; primaryColor: string; accentColor: string; logoUrl: string | null; signatureImageUrl: string | null; signatureName: string | null; signatureRole: string | null; updatedByUserId: number }) {
  const db = requireDb(await getDb()); const organizationId = await organizationIdForCampaign(input.campaignId);
  await db.insert(campaignCertificateSettings).values({ ...input, organizationId }).onDuplicateKeyUpdate({ set: { primaryColor: input.primaryColor, accentColor: input.accentColor, logoUrl: input.logoUrl, signatureImageUrl: input.signatureImageUrl, signatureName: input.signatureName, signatureRole: input.signatureRole, updatedByUserId: input.updatedByUserId } });
  return getCampaignCertificateSettings(input.campaignId);
}

export async function getVolunteerTrainingCertificateByCode(certificateCode: string) {
  const db = requireDb(await getDb());
  const historical = await db.select({ certificateCode: volunteerTrainingCertificateVersions.certificateCode, issuedAt: volunteerTrainingCertificateVersions.issuedAt, completedMaterials: volunteerTrainingCertificateVersions.completedMaterials, campaignId: volunteerTrainingCertificateVersions.campaignId, organizationId: volunteerTrainingCertificateVersions.organizationId, volunteerName: volunteers.name, campaignName: campaigns.name, candidateName: campaigns.candidateName }).from(volunteerTrainingCertificateVersions).innerJoin(volunteers, eq(volunteerTrainingCertificateVersions.volunteerId, volunteers.id)).innerJoin(campaigns, eq(volunteerTrainingCertificateVersions.campaignId, campaigns.id)).where(eq(volunteerTrainingCertificateVersions.certificateCode, certificateCode)).limit(1);
  if (historical[0]) return historical[0];
  const current = await db.select({ certificateCode: volunteerTrainingCertificates.certificateCode, issuedAt: volunteerTrainingCertificates.issuedAt, completedMaterials: volunteerTrainingCertificates.completedMaterials, campaignId: volunteerTrainingCertificates.campaignId, organizationId: volunteerTrainingCertificates.organizationId, volunteerName: volunteers.name, campaignName: campaigns.name, candidateName: campaigns.candidateName }).from(volunteerTrainingCertificates).innerJoin(volunteers, eq(volunteerTrainingCertificates.volunteerId, volunteers.id)).innerJoin(campaigns, eq(volunteerTrainingCertificates.campaignId, campaigns.id)).where(eq(volunteerTrainingCertificates.certificateCode, certificateCode)).limit(1);
  return current[0] ?? null;
}

export async function listVolunteerAssignments(campaignId: number, volunteerId?: number) {
  const db = requireDb(await getDb());
  const conditions = [eq(volunteerAssignments.campaignId, campaignId)];
  if (volunteerId) conditions.push(eq(volunteerAssignments.volunteerId, volunteerId));
  const rows = await db.select({ assignment: volunteerAssignments, volunteerName: volunteers.name }).from(volunteerAssignments).innerJoin(volunteers, eq(volunteerAssignments.volunteerId, volunteers.id)).where(and(...conditions)).orderBy(desc(volunteerAssignments.scheduledAt), desc(volunteerAssignments.createdAt));
  return rows.map(({ assignment, volunteerName }) => ({ ...assignment, volunteerName }));
}

export async function getVolunteerAssignment(assignmentId: number) {
  const db = requireDb(await getDb());
  const rows = await db.select().from(volunteerAssignments).where(eq(volunteerAssignments.id, assignmentId)).limit(1);
  return rows[0] ?? null;
}

export async function createVolunteerAssignment(input: Omit<typeof volunteerAssignments.$inferInsert, "organizationId">) {
  const db = requireDb(await getDb());
  const result = await db.insert(volunteerAssignments).values({ ...input, organizationId: await organizationIdForCampaign(input.campaignId) });
  return Number(result[0].insertId);
}

export async function updateVolunteerAssignmentStatus(assignmentId: number, status: "assigned" | "accepted" | "completed" | "cancelled") {
  const db = requireDb(await getDb());
  await db.update(volunteerAssignments).set({ status, completedAt: status === "completed" ? new Date() : null }).where(eq(volunteerAssignments.id, assignmentId));
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

export async function listFieldVisits(campaignId: number, memberId?: number | null) {
  const db = requireDb(await getDb());
  const conditions = [eq(fieldVisits.campaignId, campaignId)];
  if (memberId) conditions.push(eq(fieldVisits.memberId, memberId));
  return db.select({ visit: fieldVisits, voter: voters, member: campaignMembers, playbook: fieldPlaybooks }).from(fieldVisits).leftJoin(voters, eq(fieldVisits.voterId, voters.id)).leftJoin(campaignMembers, eq(fieldVisits.memberId, campaignMembers.id)).leftJoin(fieldPlaybooks, eq(fieldVisits.playbookId, fieldPlaybooks.id)).where(and(...conditions)).orderBy(desc(fieldVisits.occurredAt)).limit(200);
}

export async function listFieldPlaybooks(campaignId: number, includeInactive = false) {
  const db = requireDb(await getDb());
  const conditions = [eq(fieldPlaybooks.campaignId, campaignId)]; if (!includeInactive) conditions.push(eq(fieldPlaybooks.status, "active"));
  return db.select().from(fieldPlaybooks).where(and(...conditions)).orderBy(desc(fieldPlaybooks.updatedAt));
}

export async function getFieldPlaybook(playbookId: number) {
  const db = requireDb(await getDb()); const rows = await db.select().from(fieldPlaybooks).where(eq(fieldPlaybooks.id, playbookId)).limit(1); return rows[0] ?? null;
}

export async function createFieldPlaybook(input: { campaignId: number; title: string; objective?: string | null; territory?: string | null; openingScript?: string | null; videoUrl?: string | null; talkingPoints: string[]; checklist: string[]; status: "draft" | "active" | "archived"; createdByUserId: number }) {
  const db = requireDb(await getDb()); const result = await db.insert(fieldPlaybooks).values({ ...input, organizationId: await organizationIdForCampaign(input.campaignId), version: 1, objective: input.objective ?? null, territory: input.territory ?? null, openingScript: input.openingScript ?? null, videoUrl: input.videoUrl ?? null }); return Number(result[0].insertId);
}

export async function updateFieldPlaybook(input: { id: number; title: string; objective?: string | null; territory?: string | null; openingScript?: string | null; videoUrl?: string | null; talkingPoints: string[]; checklist: string[]; status: "draft" | "active" | "archived" }) {
  const db = requireDb(await getDb()); const current = await getFieldPlaybook(input.id); if (!current) throw new Error("FIELD_PLAYBOOK_NOT_FOUND");
  await db.update(fieldPlaybooks).set({ ...input, objective: input.objective ?? null, territory: input.territory ?? null, openingScript: input.openingScript ?? null, videoUrl: input.videoUrl ?? null, version: current.version + 1 }).where(eq(fieldPlaybooks.id, input.id));
}

export async function listFieldPlaybookMaterials(playbookId: number) {
  const db = requireDb(await getDb());
  return db.select().from(fieldPlaybookMaterials).where(eq(fieldPlaybookMaterials.playbookId, playbookId)).orderBy(desc(fieldPlaybookMaterials.createdAt));
}

export async function createFieldPlaybookMaterial(input: { campaignId: number; playbookId: number; playbookVersion: number; fileName: string; materialType: string; topic?: string | null; storageKey: string; url: string; sizeBytes: number; createdByUserId: number }) {
  const db = requireDb(await getDb());
  const organizationId = await organizationIdForCampaign(input.campaignId);
  const result = await db.insert(fieldPlaybookMaterials).values({ ...input, organizationId, topic: input.topic ?? null });
  return Number(result[0].insertId);
}

export async function syncFieldVisits(input: Array<{ campaignId: number; voterId?: number | null; memberId?: number | null; playbookId?: number | null; clientReference: string; outcome: "contacted" | "absent" | "refused" | "follow_up" | "other"; notes?: string | null; occurredAt: Date }>) {
  if (!input.length) return { created: 0, duplicates: 0 };
  const db = requireDb(await getDb());
  const organizationId = await organizationIdForCampaign(input[0].campaignId);
  const playbookIds = Array.from(new Set(input.map(visit => visit.playbookId).filter((id): id is number => Boolean(id))));
  const playbookRows = playbookIds.length ? await db.select().from(fieldPlaybooks).where(eq(fieldPlaybooks.campaignId, input[0].campaignId)) : [];
  const playbooksById = new Map(playbookRows.map(playbook => [playbook.id, playbook]));
  let created = 0; let duplicates = 0;
  for (const visit of input) {
    const existing = await db.select({ id: fieldVisits.id }).from(fieldVisits).where(eq(fieldVisits.clientReference, visit.clientReference)).limit(1);
    if (existing[0]) { duplicates += 1; continue; }
    const playbook = visit.playbookId ? playbooksById.get(visit.playbookId) : null;
    if (visit.playbookId && (!playbook || playbook.status !== "active")) throw new Error("FIELD_PLAYBOOK_INVALID");
    await db.insert(fieldVisits).values({ ...visit, voterId: visit.voterId ?? null, memberId: visit.memberId ?? null, playbookId: visit.playbookId ?? null, playbookVersion: playbook?.version ?? null, notes: visit.notes ?? null, organizationId });
    created += 1;
  }
  return { created, duplicates };
}

export async function listConsentRecords(voterId: number) {
  const db = requireDb(await getDb());
  return db.select().from(consentRecords).where(eq(consentRecords.voterId, voterId)).orderBy(desc(consentRecords.consentedAt));
}

export async function getConsentRecord(id: number) {
  const db = requireDb(await getDb());
  const rows = await db.select().from(consentRecords).where(eq(consentRecords.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createConsentRecord(input: { campaignId: number; voterId: number; purpose: string; source: string; evidence?: string | null; consentedAt: Date; expiresAt?: Date | null; createdByUserId: number }) {
  const db = requireDb(await getDb());
  const organizationId = await organizationIdForCampaign(input.campaignId);
  const result = await db.insert(consentRecords).values({ ...input, evidence: input.evidence ?? null, expiresAt: input.expiresAt ?? null, organizationId, status: "active" });
  await db.update(voters).set({ contactConsent: true, doNotContact: false }).where(eq(voters.id, input.voterId));
  return Number(result[0].insertId);
}

export async function revokeConsentRecord(input: { consentId: number; revokedAt: Date }) {
  const db = requireDb(await getDb());
  const record = await db.select().from(consentRecords).where(eq(consentRecords.id, input.consentId)).limit(1);
  if (!record[0]) throw new Error("CONSENT_NOT_FOUND");
  await db.update(consentRecords).set({ status: "revoked", revokedAt: input.revokedAt }).where(eq(consentRecords.id, input.consentId));
  const active = await db.select({ id: consentRecords.id }).from(consentRecords).where(and(eq(consentRecords.voterId, record[0].voterId), eq(consentRecords.status, "active"))).limit(1);
  if (!active[0]) await db.update(voters).set({ contactConsent: false, doNotContact: true }).where(eq(voters.id, record[0].voterId));
  return record[0];
}

export async function listCrisisCases(campaignId: number) {
  const db = requireDb(await getDb());
  return db.select({ crisis: crisisCases, assignee: campaignMembers }).from(crisisCases).leftJoin(campaignMembers, eq(crisisCases.assignedToId, campaignMembers.id)).where(eq(crisisCases.campaignId, campaignId)).orderBy(desc(crisisCases.updatedAt)).limit(200);
}

export async function createCrisisCase(input: { campaignId: number; title: string; description?: string | null; severity: "low" | "medium" | "high" | "critical"; assignedToId?: number | null; dueAt?: Date | null; createdByUserId: number }) {
  const db = requireDb(await getDb());
  const result = await db.insert(crisisCases).values({ ...input, description: input.description ?? null, assignedToId: input.assignedToId ?? null, dueAt: input.dueAt ?? null, organizationId: await organizationIdForCampaign(input.campaignId), status: "open" });
  return Number(result[0].insertId);
}

export async function getCrisisCase(id: number) {
  const db = requireDb(await getDb());
  const rows = await db.select().from(crisisCases).where(eq(crisisCases.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function updateCrisisCase(id: number, input: { status: "open" | "assessing" | "responding" | "resolved" | "closed"; assignedToId?: number | null; dueAt?: Date | null }) {
  const db = requireDb(await getDb());
  await db.update(crisisCases).set({ ...input, assignedToId: input.assignedToId ?? null, dueAt: input.dueAt ?? null, resolvedAt: ["resolved", "closed"].includes(input.status) ? new Date() : null }).where(eq(crisisCases.id, id));
}

export async function listCrisisDecisions(crisisCaseId: number) {
  const db = requireDb(await getDb());
  return db.select().from(crisisDecisionLogs).where(eq(crisisDecisionLogs.crisisCaseId, crisisCaseId)).orderBy(desc(crisisDecisionLogs.createdAt));
}

export async function addCrisisDecision(input: { crisisCaseId: number; decision: string; createdByUserId: number }) {
  const db = requireDb(await getDb());
  const crisis = await getCrisisCase(input.crisisCaseId);
  if (!crisis) throw new Error("CRISIS_NOT_FOUND");
  const result = await db.insert(crisisDecisionLogs).values({ ...input, organizationId: crisis.organizationId });
  return Number(result[0].insertId);
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
