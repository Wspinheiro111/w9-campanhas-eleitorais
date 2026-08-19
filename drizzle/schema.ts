import {
  boolean,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const campaignRoleEnum = mysqlEnum("campaign_role", ["admin", "coordinator", "partner"]);
export const taskStatusEnum = mysqlEnum("task_status", ["backlog", "todo", "in_progress", "review", "done"]);
export const priorityEnum = mysqlEnum("priority", ["low", "medium", "high", "urgent"]);
export const eventTypeEnum = mysqlEnum("event_type", ["meeting", "rally", "visit", "debate", "internal", "other"]);
export const interactionTypeEnum = mysqlEnum("interaction_type", ["visit", "phone", "whatsapp", "event", "audio", "other"]);
export const incidentStatusEnum = mysqlEnum("incident_status", ["open", "in_review", "resolved"]);
export const pipelineStageEnum = mysqlEnum("pipeline_stage", ["identified", "approached", "engaged", "mobilized"]);
export const contentChannelEnum = mysqlEnum("content_channel", ["social", "whatsapp", "print", "speech", "video", "other"]);
export const contentStatusEnum = mysqlEnum("content_status", ["draft", "review", "approved", "archived"]);
export const followupStatusEnum = mysqlEnum("followup_status", ["pending", "completed", "cancelled"]);
export const organizationRoleEnum = mysqlEnum("organization_role", ["admin", "manager", "operator", "viewer"]);
export const organizationStatusEnum = mysqlEnum("organization_status", ["active", "suspended", "archived"]);
export const invitationStatusEnum = mysqlEnum("invitation_status", ["pending", "accepted", "revoked", "expired"]);

/** Core identity record supplied by Manus OAuth. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  googleId: varchar("googleId", { length: 128 }).unique(),
  avatarUrl: varchar("avatarUrl", { length: 1200 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  legalName: varchar("legalName", { length: 220 }),
  fiscalId: varchar("fiscalId", { length: 32 }),
  status: organizationStatusEnum.default("active").notNull(),
  settings: json("settings"),
  createdById: int("createdById").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("organization_status_idx").on(table.status), index("organization_fiscal_idx").on(table.fiscalId)]);

export const organizationMembers = mysqlTable("organization_members", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  userId: int("userId").notNull().references(() => users.id),
  role: organizationRoleEnum.default("operator").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("org_member_user_idx").on(table.userId), index("org_member_org_idx").on(table.organizationId), uniqueIndex("org_member_unique_idx").on(table.organizationId, table.userId)]);

export const organizationInvitations = mysqlTable("organization_invitations", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  email: varchar("email", { length: 320 }).notNull(),
  role: organizationRoleEnum.default("operator").notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull(),
  status: invitationStatusEnum.default("pending").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  invitedById: int("invitedById").notNull().references(() => users.id),
  acceptedById: int("acceptedById").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("invite_org_idx").on(table.organizationId, table.status), index("invite_email_idx").on(table.email, table.status), index("invite_token_idx").on(table.tokenHash)]);

export const organizationAuditLogs = mysqlTable("organization_audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  actorUserId: int("actorUserId").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 80 }).notNull(),
  entityId: int("entityId"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("audit_organization_created_idx").on(table.organizationId, table.createdAt), index("audit_actor_idx").on(table.actorUserId, table.createdAt)]);

export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  name: varchar("name", { length: 160 }).notNull(),
  candidateName: varchar("candidateName", { length: 160 }).notNull(),
  electionLabel: varchar("electionLabel", { length: 120 }).notNull(),
  region: varchar("region", { length: 160 }).notNull(),
  status: mysqlEnum("campaign_status", ["planning", "active", "paused", "closed"]).default("planning").notNull(),
  ownerId: int("ownerId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("campaign_owner_idx").on(table.ownerId), index("campaign_organization_idx").on(table.organizationId)]);

export const campaignMembers = mysqlTable("campaign_members", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  campaignId: int("campaignId").notNull().references(() => campaigns.id),
  userId: int("userId").references(() => users.id),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  role: campaignRoleEnum.notNull().default("partner"),
  responsibility: varchar("responsibility", { length: 220 }),
  workRegion: varchar("workRegion", { length: 160 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("member_campaign_idx").on(table.campaignId), index("member_user_idx").on(table.userId), index("member_organization_idx").on(table.organizationId)]);

export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  campaignId: int("campaignId").notNull().references(() => campaigns.id),
  title: varchar("title", { length: 200 }).notNull(),
  type: eventTypeEnum.notNull().default("meeting"),
  startsAt: timestamp("startsAt").notNull(),
  endsAt: timestamp("endsAt"),
  location: varchar("location", { length: 240 }),
  neighborhood: varchar("neighborhood", { length: 120 }),
  region: varchar("region", { length: 120 }),
  responsibleId: int("responsibleId").references(() => campaignMembers.id),
  status: mysqlEnum("event_status", ["scheduled", "completed", "cancelled"]).default("scheduled").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("event_campaign_start_idx").on(table.campaignId, table.startsAt)]);

export const goals = mysqlTable("goals", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  campaignId: int("campaignId").notNull().references(() => campaigns.id),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  targetValue: int("targetValue").notNull(),
  currentValue: int("currentValue").default(0).notNull(),
  unit: varchar("unit", { length: 40 }).default("entregas").notNull(),
  deadline: timestamp("deadline"),
  status: mysqlEnum("goal_status", ["on_track", "attention", "completed"]).default("on_track").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("goal_campaign_idx").on(table.campaignId)]);

export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  campaignId: int("campaignId").notNull().references(() => campaigns.id),
  goalId: int("goalId").references(() => goals.id),
  title: varchar("title", { length: 220 }).notNull(),
  description: text("description"),
  status: taskStatusEnum.notNull().default("todo"),
  priority: priorityEnum.notNull().default("medium"),
  assignedToId: int("assignedToId").references(() => campaignMembers.id),
  dueAt: timestamp("dueAt"),
  completedAt: timestamp("completedAt"),
  createdById: int("createdById").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("task_campaign_status_idx").on(table.campaignId, table.status), index("task_assignee_idx").on(table.assignedToId)]);

export const voters = mysqlTable("voters", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  campaignId: int("campaignId").notNull().references(() => campaigns.id),
  ownerMemberId: int("ownerMemberId").references(() => campaignMembers.id),
  name: varchar("name", { length: 180 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  neighborhood: varchar("neighborhood", { length: 120 }),
  region: varchar("region", { length: 120 }),
  contactProfile: varchar("contactProfile", { length: 120 }),
  pipelineStage: pipelineStageEnum.notNull().default("identified"),
  engagementLevel: mysqlEnum("engagement_level", ["low", "medium", "high"]).default("medium").notNull(),
  conversionScore: int("conversionScore").default(0).notNull(),
  primaryDemand: text("primaryDemand"),
  notes: text("notes"),
  contactConsent: boolean("contactConsent").default(false).notNull(),
  doNotContact: boolean("doNotContact").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("voter_campaign_idx").on(table.campaignId),
  index("voter_owner_idx").on(table.ownerMemberId),
  index("voter_pipeline_idx").on(table.campaignId, table.pipelineStage),
  index("voter_segment_idx").on(table.campaignId, table.neighborhood, table.region, table.contactProfile),
]);

export const voterInteractions = mysqlTable("voter_interactions", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  voterId: int("voterId").notNull().references(() => voters.id),
  campaignId: int("campaignId").notNull().references(() => campaigns.id),
  memberId: int("memberId").references(() => campaignMembers.id),
  type: interactionTypeEnum.notNull().default("visit"),
  notes: text("notes").notNull(),
  happenedAt: timestamp("happenedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("interaction_voter_idx").on(table.voterId), index("interaction_campaign_idx").on(table.campaignId)]);

export const audioCrmLogs = mysqlTable("audio_crm_logs", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  campaignId: int("campaignId").notNull().references(() => campaigns.id),
  memberId: int("memberId").references(() => campaignMembers.id),
  audioUrl: text("audioUrl").notNull(),
  transcription: text("transcription"),
  extractedData: json("extractedData"),
  voterId: int("voterId").references(() => voters.id),
  processed: boolean("processed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("audio_campaign_idx").on(table.campaignId), index("audio_member_idx").on(table.memberId)]);

export const fieldIncidents = mysqlTable("field_incidents", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  campaignId: int("campaignId").notNull().references(() => campaigns.id),
  reportedById: int("reportedById").references(() => campaignMembers.id),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  priority: priorityEnum.notNull().default("medium"),
  status: incidentStatusEnum.notNull().default("open"),
  location: varchar("location", { length: 220 }),
  neighborhood: varchar("neighborhood", { length: 120 }),
  region: varchar("region", { length: 120 }),
  occurredAt: timestamp("occurredAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("incident_campaign_status_idx").on(table.campaignId, table.status)]);

export const campaignIndicators = mysqlTable("campaign_indicators", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  campaignId: int("campaignId").notNull().references(() => campaigns.id),
  label: varchar("label", { length: 120 }).notNull(),
  currentValue: int("currentValue").default(0).notNull(),
  targetValue: int("targetValue").default(0).notNull(),
  unit: varchar("unit", { length: 40 }).default("unidades").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("indicator_campaign_idx").on(table.campaignId)]);

export const campaignContents = mysqlTable("campaign_contents", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  campaignId: int("campaignId").notNull().references(() => campaigns.id),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body").notNull(),
  assetUrl: varchar("assetUrl", { length: 1200 }),
  assetKey: varchar("assetKey", { length: 500 }),
  assetName: varchar("assetName", { length: 260 }),
  assetMime: varchar("assetMime", { length: 120 }),
  assetSize: int("assetSize"),
  version: int("version").default(1).notNull(),
  channel: contentChannelEnum.notNull().default("social"),
  status: contentStatusEnum.notNull().default("draft"),
  createdById: int("createdById").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("content_campaign_status_idx").on(table.campaignId, table.status)]);

export const pipelineFollowups = mysqlTable("pipeline_followups", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  campaignId: int("campaignId").notNull().references(() => campaigns.id),
  voterId: int("voterId").notNull().references(() => voters.id),
  assignedToId: int("assignedToId").references(() => campaignMembers.id),
  stage: pipelineStageEnum.notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  dueAt: timestamp("dueAt").notNull(),
  status: followupStatusEnum.notNull().default("pending"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("followup_campaign_due_idx").on(table.campaignId, table.status, table.dueAt),
  index("followup_voter_idx").on(table.voterId),
  index("followup_assignee_idx").on(table.assignedToId),
]);

export const aiMessages = mysqlTable("ai_messages", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  campaignId: int("campaignId").notNull().references(() => campaigns.id),
  userId: int("userId").notNull().references(() => users.id),
  kind: mysqlEnum("ai_message_kind", ["chat", "content"]).notNull().default("chat"),
  role: mysqlEnum("ai_message_role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("ai_campaign_kind_idx").on(table.campaignId, table.kind)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Campaign = typeof campaigns.$inferSelect;
