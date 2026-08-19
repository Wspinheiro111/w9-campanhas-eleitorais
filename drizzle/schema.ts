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
export const fieldVisitOutcomeEnum = mysqlEnum("field_visit_outcome", ["contacted", "absent", "refused", "follow_up", "other"]);
export const consentStatusEnum = mysqlEnum("consent_status", ["active", "revoked", "expired"]);
export const crisisSeverityEnum = mysqlEnum("crisis_severity", ["low", "medium", "high", "critical"]);
export const crisisStatusEnum = mysqlEnum("crisis_status", ["open", "assessing", "responding", "resolved", "closed"]);
export const volunteerStatusEnum = mysqlEnum("volunteer_status", ["pending", "active", "inactive"]);
export const volunteerTrainingStatusEnum = mysqlEnum("volunteer_training_status", ["not_started", "in_progress", "completed"]);
export const volunteerAssignmentStatusEnum = mysqlEnum("volunteer_assignment_status", ["assigned", "accepted", "completed", "cancelled"]);

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

export const routePerformanceEvents = mysqlTable("route_performance_events", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").references(() => organizations.id),
  route: varchar("route", { length: 240 }).notNull(),
  method: varchar("method", { length: 12 }).notNull(),
  statusCode: int("statusCode").notNull(),
  durationMs: int("durationMs").notNull(),
  hasError: boolean("hasError").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("performance_route_created_idx").on(table.route, table.createdAt), index("performance_organization_created_idx").on(table.organizationId, table.createdAt), index("performance_error_created_idx").on(table.hasError, table.createdAt)]);

export const fieldVisits = mysqlTable("field_visits", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  campaignId: int("campaignId").notNull().references(() => campaigns.id),
  voterId: int("voterId").references(() => voters.id),
  memberId: int("memberId").references(() => campaignMembers.id),
  clientReference: varchar("clientReference", { length: 96 }).notNull().unique(),
  outcome: fieldVisitOutcomeEnum.notNull().default("contacted"),
  notes: text("notes"),
  occurredAt: timestamp("occurredAt").notNull(),
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("visit_campaign_occurred_idx").on(table.campaignId, table.occurredAt), index("visit_voter_idx").on(table.voterId), index("visit_organization_idx").on(table.organizationId)]);

export const consentRecords = mysqlTable("consent_records", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  campaignId: int("campaignId").notNull().references(() => campaigns.id),
  voterId: int("voterId").notNull().references(() => voters.id),
  status: consentStatusEnum.notNull().default("active"),
  purpose: varchar("purpose", { length: 240 }).notNull(),
  source: varchar("source", { length: 120 }).notNull(),
  evidence: text("evidence"),
  consentedAt: timestamp("consentedAt").notNull(),
  expiresAt: timestamp("expiresAt"),
  revokedAt: timestamp("revokedAt"),
  createdByUserId: int("createdByUserId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("consent_voter_status_idx").on(table.voterId, table.status), index("consent_campaign_status_idx").on(table.campaignId, table.status), index("consent_organization_idx").on(table.organizationId)]);

export const crisisCases = mysqlTable("crisis_cases", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  campaignId: int("campaignId").notNull().references(() => campaigns.id),
  title: varchar("title", { length: 220 }).notNull(),
  description: text("description"),
  severity: crisisSeverityEnum.notNull().default("medium"),
  status: crisisStatusEnum.notNull().default("open"),
  assignedToId: int("assignedToId").references(() => campaignMembers.id),
  dueAt: timestamp("dueAt"),
  createdByUserId: int("createdByUserId").references(() => users.id),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("crisis_campaign_status_idx").on(table.campaignId, table.status), index("crisis_severity_idx").on(table.severity, table.updatedAt), index("crisis_organization_idx").on(table.organizationId)]);

export const crisisDecisionLogs = mysqlTable("crisis_decision_logs", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  crisisCaseId: int("crisisCaseId").notNull().references(() => crisisCases.id),
  decision: text("decision").notNull(),
  createdByUserId: int("createdByUserId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("crisis_decision_case_idx").on(table.crisisCaseId, table.createdAt), index("crisis_decision_organization_idx").on(table.organizationId)]);

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

export const volunteers = mysqlTable("volunteers", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  campaignId: int("campaignId").notNull().references(() => campaigns.id),
  name: varchar("name", { length: 180 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  accessTokenHash: varchar("accessTokenHash", { length: 128 }).notNull().unique(),
  phone: varchar("phone", { length: 32 }),
  neighborhood: varchar("neighborhood", { length: 120 }),
  region: varchar("region", { length: 120 }),
  coordinatorMemberId: int("coordinatorMemberId").references(() => campaignMembers.id),
  availability: text("availability"),
  skills: text("skills"),
  trainingStatus: volunteerTrainingStatusEnum.notNull().default("not_started"),
  status: volunteerStatusEnum.notNull().default("pending"),
  consent: boolean("consent").notNull(),
  consentedAt: timestamp("consentedAt").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("volunteer_campaign_status_idx").on(table.campaignId, table.status), index("volunteer_campaign_coordinator_idx").on(table.campaignId, table.coordinatorMemberId), index("volunteer_organization_idx").on(table.organizationId), uniqueIndex("volunteer_campaign_email_idx").on(table.campaignId, table.email)]);

export const volunteerAssignments = mysqlTable("volunteer_assignments", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  campaignId: int("campaignId").notNull().references(() => campaigns.id),
  volunteerId: int("volunteerId").notNull().references(() => volunteers.id),
  title: varchar("title", { length: 220 }).notNull(),
  description: text("description"),
  territory: varchar("territory", { length: 180 }),
  scheduledAt: timestamp("scheduledAt"),
  status: volunteerAssignmentStatusEnum.notNull().default("assigned"),
  completedAt: timestamp("completedAt"),
  createdByUserId: int("createdByUserId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("volunteer_assignment_campaign_status_idx").on(table.campaignId, table.status), index("volunteer_assignment_volunteer_idx").on(table.volunteerId), index("volunteer_assignment_organization_idx").on(table.organizationId)]);

export const volunteerTrainingMaterials = mysqlTable("volunteer_training_materials", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  campaignId: int("campaignId").notNull().references(() => campaigns.id),
  title: varchar("title", { length: 220 }).notNull(),
  description: text("description"),
  materialType: mysqlEnum("materialType", ["guide", "video", "checklist", "link"]).notNull().default("guide"),
  resourceUrl: varchar("resourceUrl", { length: 2000 }),
  content: text("content"),
  durationMinutes: int("durationMinutes").notNull().default(10),
  dueAt: timestamp("dueAt"),
  position: int("position").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdByUserId: int("createdByUserId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("training_material_campaign_idx").on(table.campaignId, table.active, table.position), index("training_material_organization_idx").on(table.organizationId)]);

export const volunteerTrainingCompletions = mysqlTable("volunteer_training_completions", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  campaignId: int("campaignId").notNull().references(() => campaigns.id),
  materialId: int("materialId").notNull().references(() => volunteerTrainingMaterials.id),
  volunteerId: int("volunteerId").notNull().references(() => volunteers.id),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("training_completion_material_volunteer_idx").on(table.materialId, table.volunteerId), index("training_completion_volunteer_idx").on(table.volunteerId), index("training_completion_campaign_idx").on(table.campaignId)]);

export const volunteerTrainingCertificates = mysqlTable("volunteer_training_certificates", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  campaignId: int("campaignId").notNull().references(() => campaigns.id),
  volunteerId: int("volunteerId").notNull().references(() => volunteers.id),
  certificateCode: varchar("certificateCode", { length: 50 }).notNull().unique(),
  completedMaterials: int("completedMaterials").notNull(),
  issuedAt: timestamp("issuedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("training_certificate_volunteer_campaign_idx").on(table.volunteerId, table.campaignId), index("training_certificate_campaign_idx").on(table.campaignId), index("training_certificate_organization_idx").on(table.organizationId)]);

export const volunteerTrainingCertificateVersions = mysqlTable("volunteer_training_certificate_versions", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  campaignId: int("campaignId").notNull().references(() => campaigns.id),
  volunteerId: int("volunteerId").notNull().references(() => volunteers.id),
  versionNumber: int("versionNumber").notNull(),
  certificateCode: varchar("certificateCode", { length: 50 }).notNull().unique(),
  completedMaterials: int("completedMaterials").notNull(),
  issuedAt: timestamp("issuedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("training_certificate_version_idx").on(table.volunteerId, table.campaignId, table.versionNumber), index("training_certificate_version_volunteer_idx").on(table.volunteerId, table.issuedAt), index("training_certificate_version_campaign_idx").on(table.campaignId)]);

export const campaignCertificateSettings = mysqlTable("campaign_certificate_settings", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  campaignId: int("campaignId").notNull().references(() => campaigns.id),
  primaryColor: varchar("primaryColor", { length: 7 }).notNull().default("#103527"),
  accentColor: varchar("accentColor", { length: 7 }).notNull().default("#c9a85b"),
  logoUrl: varchar("logoUrl", { length: 2000 }),
  signatureImageUrl: varchar("signatureImageUrl", { length: 2000 }),
  signatureName: varchar("signatureName", { length: 180 }),
  signatureRole: varchar("signatureRole", { length: 180 }),
  updatedByUserId: int("updatedByUserId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("certificate_settings_campaign_idx").on(table.campaignId), index("certificate_settings_organization_idx").on(table.organizationId)]);

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
  objective: varchar("objective", { length: 220 }),
  scheduledAt: timestamp("scheduledAt"),
  ownerMemberId: int("ownerMemberId").references(() => campaignMembers.id),
  status: contentStatusEnum.notNull().default("draft"),
  createdById: int("createdById").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("content_campaign_status_idx").on(table.campaignId, table.status), index("content_calendar_idx").on(table.campaignId, table.scheduledAt)]);

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

export const campaignSurveys = mysqlTable("campaign_surveys", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  campaignId: int("campaignId").notNull().references(() => campaigns.id),
  title: varchar("title", { length: 220 }).notNull(),
  question: text("question").notNull(),
  responseType: mysqlEnum("survey_response_type", ["single_choice", "scale", "text"]).notNull().default("single_choice"),
  options: json("options"),
  status: mysqlEnum("survey_status", ["draft", "active", "closed"]).notNull().default("draft"),
  createdByUserId: int("createdByUserId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("survey_campaign_status_idx").on(table.campaignId, table.status)]);

export const surveyResponses = mysqlTable("survey_responses", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  campaignId: int("campaignId").notNull().references(() => campaigns.id),
  surveyId: int("surveyId").notNull().references(() => campaignSurveys.id),
  voterId: int("voterId").references(() => voters.id),
  response: text("response").notNull(),
  neighborhood: varchar("neighborhood", { length: 120 }),
  region: varchar("region", { length: 120 }),
  submittedByUserId: int("submittedByUserId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("survey_response_campaign_idx").on(table.campaignId, table.surveyId), index("survey_response_territory_idx").on(table.campaignId, table.neighborhood, table.region)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Campaign = typeof campaigns.$inferSelect;
