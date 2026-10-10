import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import {
  campaignComplianceDecisions,
  campaignConsentLedger,
  campaignContactSuppressions,
  campaignContents,
  campaignFinancialEntries,
  campaigns,
  consentRecords,
  organizationAuditLogs,
  voters,
} from "../drizzle/schema";
import * as legacyDb from "./campaignDb";
import { getDb } from "./db";
import { getInitialFinancialEntryStatus } from "./financialStatus";
import { MANDATORY_COMPLIANCE_BASELINE } from "./mandatoryComplianceBaseline";

export type ComplianceDecisionInput = {
  decision: "approved" | "blocked" | "needs_human_review" | "not_applicable";
  reviewStatus: "not_required" | "pending" | "approved" | "blocked" | "cancelled";
  reasons: string[];
  ruleVersion: string;
  entityVersion?: number | null;
  entityHash?: string | null;
};

type CommandScope = {
  campaignId: number;
  commandKey: string;
  operation: string;
};

type TestHook = { _testFailAfterPrimary?: boolean };

type CommandReceipt<T> = {
  commandKey: string;
  result: T;
};

function requireDb<T>(db: T | null): T {
  if (!db) throw new Error("Banco de dados indisponível.");
  return db;
}

function useLegacyUnitTestAdapter() {
  return process.env.NODE_ENV === "test" && !process.env.DATABASE_URL;
}

function receiptAction(scope: CommandScope) {
  const digest = createHash("sha256")
    .update(`${scope.campaignId}:${scope.operation}:${scope.commandKey}`)
    .digest("hex")
    .slice(0, 32);
  return `command.idempotency.${digest}`;
}

async function withCommand<T extends Record<string, unknown>>(
  scope: CommandScope,
  work: (tx: any, organizationId: number) => Promise<T>,
): Promise<T> {
  const db = requireDb(await getDb());
  return db.transaction(async tx => {
    // The campaign row is the shared serialization point. This makes retries and
    // concurrent identical commands deterministic across application instances.
    const campaignRows = await tx
      .select({ organizationId: campaigns.organizationId })
      .from(campaigns)
      .where(eq(campaigns.id, scope.campaignId))
      .for("update");
    const organizationId = campaignRows[0]?.organizationId;
    if (!organizationId) throw new Error("CAMPAIGN_NOT_FOUND");

    const action = receiptAction(scope);
    const priorRows = await tx
      .select({ metadata: organizationAuditLogs.metadata })
      .from(organizationAuditLogs)
      .where(and(
        eq(organizationAuditLogs.organizationId, organizationId),
        eq(organizationAuditLogs.action, action),
        eq(organizationAuditLogs.entityType, scope.operation),
        eq(organizationAuditLogs.entityId, scope.campaignId),
      ))
      .orderBy(desc(organizationAuditLogs.id))
      .limit(1);

    const receipt = priorRows[0]?.metadata as CommandReceipt<T> | null | undefined;
    if (receipt?.commandKey === scope.commandKey && receipt.result) return receipt.result;

    const result = await work(tx, organizationId);
    await tx.insert(organizationAuditLogs).values({
      organizationId,
      actorUserId: null,
      action,
      entityType: scope.operation,
      entityId: scope.campaignId,
      metadata: { commandKey: scope.commandKey, result },
    });
    return result;
  });
}

async function auditTx(tx: any, input: {
  organizationId: number;
  actorUserId?: number | null;
  action: string;
  entityType: string;
  entityId?: number | null;
  metadata?: Record<string, unknown>;
}) {
  await tx.insert(organizationAuditLogs).values({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    metadata: input.metadata ?? null,
  });
}

async function appendLedgerTx(tx: any, organizationId: number, input: {
  campaignId: number;
  voterId: number;
  channel: "email" | "whatsapp" | "phone" | "all" | "none";
  purpose: string;
  legalBasis?: string;
  source: string;
  evidence?: string | null;
  noticeVersion?: string | null;
  status: "granted" | "revoked" | "expired" | "imported_without_authorization";
  occurredAt: Date;
  expiresAt?: Date | null;
  recordedByUserId?: number | null;
}) {
  const previous = await tx
    .select({ recordHash: campaignConsentLedger.recordHash })
    .from(campaignConsentLedger)
    .where(and(eq(campaignConsentLedger.voterId, input.voterId), eq(campaignConsentLedger.channel, input.channel)))
    .orderBy(desc(campaignConsentLedger.createdAt))
    .limit(1);
  const previousRecordHash = previous[0]?.recordHash ?? null;
  const recordHash = createHash("sha256").update(JSON.stringify({
    previousRecordHash,
    ...input,
    occurredAt: input.occurredAt.toISOString(),
    expiresAt: input.expiresAt?.toISOString() ?? null,
    nonce: randomBytes(16).toString("hex"),
  })).digest("hex");

  const result = await tx.insert(campaignConsentLedger).values({
    ...input,
    organizationId,
    legalBasis: input.legalBasis ?? "consent",
    evidence: input.evidence ?? null,
    noticeVersion: input.noticeVersion ?? null,
    expiresAt: input.expiresAt ?? null,
    previousRecordHash,
    recordHash,
    recordedByUserId: input.recordedByUserId ?? null,
  });
  await auditTx(tx, {
    organizationId,
    actorUserId: input.recordedByUserId ?? null,
    action: `compliance.consent.${input.status}`,
    entityType: "voter",
    entityId: input.voterId,
    metadata: { channel: input.channel, purpose: input.purpose, source: input.source, recordHash },
  });
  return Number(result[0].insertId);
}

async function decisionTx(tx: any, organizationId: number, input: {
  campaignId: number;
  action: string;
  entityType: string;
  entityId?: number | null;
  requestedByUserId?: number | null;
  decision: ComplianceDecisionInput;
}) {
  const result = await tx.insert(campaignComplianceDecisions).values({
    organizationId,
    campaignId: input.campaignId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    decision: input.decision.decision,
    reviewStatus: input.decision.reviewStatus,
    reasons: input.decision.reasons,
    ruleVersion: input.decision.ruleVersion,
    entityVersion: input.decision.entityVersion ?? null,
    entityHash: input.decision.entityHash ?? null,
    baselineVersion: MANDATORY_COMPLIANCE_BASELINE.version,
    localPolicyVersion: input.decision.ruleVersion,
    requestedByUserId: input.requestedByUserId ?? null,
  });
  await auditTx(tx, {
    organizationId,
    actorUserId: input.requestedByUserId ?? null,
    action: `compliance.decision.${input.decision.decision}`,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    metadata: {
      action: input.action,
      reviewStatus: input.decision.reviewStatus,
      reasons: input.decision.reasons,
      ruleVersion: input.decision.ruleVersion,
      baselineVersion: MANDATORY_COMPLIANCE_BASELINE.version,
      entityVersion: input.decision.entityVersion ?? null,
      entityHash: input.decision.entityHash ?? null,
    },
  });
  return Number(result[0].insertId);
}

export async function createPublicIntakeAtomic(input: {
  campaignId: number;
  commandKey: string;
  voter: Omit<typeof voters.$inferInsert, "id" | "organizationId" | "campaignId" | "createdAt" | "updatedAt">;
  consent: { purpose: string; source: string; evidence: string; noticeVersion: string; occurredAt: Date };
} & TestHook) {
  if (useLegacyUnitTestAdapter()) {
    const id = await legacyDb.createVoter({ campaignId: input.campaignId, ...input.voter });
    await legacyDb.appendCampaignConsentLedger({
      campaignId: input.campaignId,
      voterId: id,
      channel: "all",
      purpose: input.consent.purpose,
      source: input.consent.source,
      evidence: input.consent.evidence,
      noticeVersion: input.consent.noticeVersion,
      status: "granted",
      occurredAt: input.consent.occurredAt,
    });
    return { id };
  }
  return withCommand({ campaignId: input.campaignId, commandKey: input.commandKey, operation: "public_intake" }, async (tx, organizationId) => {
    const inserted = await tx.insert(voters).values({ ...input.voter, organizationId, campaignId: input.campaignId });
    const voterId = Number(inserted[0].insertId);
    if (input._testFailAfterPrimary) throw new Error("TEST_FAIL_AFTER_PRIMARY");
    await appendLedgerTx(tx, organizationId, {
      campaignId: input.campaignId,
      voterId,
      channel: "all",
      purpose: input.consent.purpose,
      source: input.consent.source,
      evidence: input.consent.evidence,
      noticeVersion: input.consent.noticeVersion,
      status: "granted",
      occurredAt: input.consent.occurredAt,
    });
    return { id: voterId };
  });
}

export async function createContentWithComplianceAtomic(input: {
  campaignId: number;
  commandKey: string;
  content: Omit<typeof campaignContents.$inferInsert, "id" | "organizationId" | "campaignId" | "createdAt" | "updatedAt">;
  decision?: ComplianceDecisionInput;
  requestedByUserId: number;
} & TestHook) {
  if (useLegacyUnitTestAdapter()) {
    const id = await legacyDb.createCampaignContent({ campaignId: input.campaignId, ...input.content });
    if (input.decision) await legacyDb.recordCampaignComplianceDecision({
      campaignId: input.campaignId,
      action: "content.publish",
      entityType: "campaign_content",
      entityId: id,
      decision: input.decision.decision,
      reviewStatus: input.decision.reviewStatus,
      reasons: input.decision.reasons,
      ruleVersion: input.decision.ruleVersion,
      entityVersion: input.decision.entityVersion ?? null,
      entityHash: input.decision.entityHash ?? null,
      requestedByUserId: input.requestedByUserId,
    });
    return { id, decisionId: null };
  }
  return withCommand({ campaignId: input.campaignId, commandKey: input.commandKey, operation: "content_create" }, async (tx, organizationId) => {
    const inserted = await tx.insert(campaignContents).values({ ...input.content, organizationId, campaignId: input.campaignId });
    const id = Number(inserted[0].insertId);
    if (input._testFailAfterPrimary) throw new Error("TEST_FAIL_AFTER_PRIMARY");
    const decisionId = input.decision ? await decisionTx(tx, organizationId, {
      campaignId: input.campaignId,
      action: "content.publish",
      entityType: "campaign_content",
      entityId: id,
      requestedByUserId: input.requestedByUserId,
      decision: input.decision,
    }) : null;
    return { id, decisionId };
  });
}

export async function createFinancialWithComplianceAtomic(input: {
  campaignId: number;
  commandKey: string;
  entry: Omit<typeof campaignFinancialEntries.$inferInsert, "id" | "organizationId" | "campaignId" | "createdAt" | "updatedAt" | "status" | "version"> & { paidAt?: Date | null };
  decision: ComplianceDecisionInput;
  requestedByUserId: number;
} & TestHook) {
  if (useLegacyUnitTestAdapter()) {
    const id = await legacyDb.createFinancialEntry({ campaignId: input.campaignId, ...input.entry });
    await legacyDb.recordCampaignComplianceDecision({
      campaignId: input.campaignId,
      action: "financial.register",
      entityType: "financial_entry",
      entityId: id,
      decision: input.decision.decision,
      reviewStatus: input.decision.reviewStatus,
      reasons: input.decision.reasons,
      ruleVersion: input.decision.ruleVersion,
      requestedByUserId: input.requestedByUserId,
    });
    return { id, decisionId: null };
  }
  return withCommand({ campaignId: input.campaignId, commandKey: input.commandKey, operation: "financial_create" }, async (tx, organizationId) => {
    const inserted = await tx.insert(campaignFinancialEntries).values({
      ...input.entry,
      organizationId,
      campaignId: input.campaignId,
      status: getInitialFinancialEntryStatus(input.entry.paidAt ?? null),
      version: 1,
    });
    const id = Number(inserted[0].insertId);
    if (input._testFailAfterPrimary) throw new Error("TEST_FAIL_AFTER_PRIMARY");
    const decisionId = await decisionTx(tx, organizationId, {
      campaignId: input.campaignId,
      action: "financial.register",
      entityType: "financial_entry",
      entityId: id,
      requestedByUserId: input.requestedByUserId,
      decision: input.decision,
    });
    return { id, decisionId };
  });
}

export async function grantConsentAtomic(input: {
  campaignId: number;
  commandKey: string;
  voterId: number;
  purpose: string;
  source: string;
  evidence?: string | null;
  consentedAt: Date;
  expiresAt?: Date | null;
  createdByUserId: number;
  channel: "email" | "whatsapp" | "phone" | "all" | "none";
  legalBasis?: string;
  noticeVersion?: string | null;
} & TestHook) {
  if (useLegacyUnitTestAdapter()) {
    const id = await legacyDb.createConsentRecord({
      campaignId: input.campaignId,
      voterId: input.voterId,
      purpose: input.purpose,
      source: input.source,
      evidence: input.evidence ?? null,
      consentedAt: input.consentedAt,
      expiresAt: input.expiresAt ?? null,
      createdByUserId: input.createdByUserId,
    });
    await legacyDb.appendCampaignConsentLedger({
      campaignId: input.campaignId,
      voterId: input.voterId,
      channel: input.channel,
      purpose: input.purpose,
      legalBasis: input.legalBasis,
      source: input.source,
      evidence: input.evidence ?? null,
      noticeVersion: input.noticeVersion ?? null,
      status: "granted",
      occurredAt: input.consentedAt,
      expiresAt: input.expiresAt ?? null,
      recordedByUserId: input.createdByUserId,
    });
    return { id };
  }
  return withCommand({ campaignId: input.campaignId, commandKey: input.commandKey, operation: "consent_grant" }, async (tx, organizationId) => {
    const result = await tx.insert(consentRecords).values({
      organizationId,
      campaignId: input.campaignId,
      voterId: input.voterId,
      status: "active",
      purpose: input.purpose,
      source: input.source,
      evidence: input.evidence ?? null,
      consentedAt: input.consentedAt,
      expiresAt: input.expiresAt ?? null,
      createdByUserId: input.createdByUserId,
    });
    const id = Number(result[0].insertId);
    await tx.update(voters).set({ contactConsent: true, doNotContact: false }).where(and(eq(voters.id, input.voterId), eq(voters.campaignId, input.campaignId)));
    if (input._testFailAfterPrimary) throw new Error("TEST_FAIL_AFTER_PRIMARY");
    await appendLedgerTx(tx, organizationId, {
      campaignId: input.campaignId,
      voterId: input.voterId,
      channel: input.channel,
      purpose: input.purpose,
      legalBasis: input.legalBasis,
      source: input.source,
      evidence: input.evidence ?? null,
      noticeVersion: input.noticeVersion ?? null,
      status: "granted",
      occurredAt: input.consentedAt,
      expiresAt: input.expiresAt ?? null,
      recordedByUserId: input.createdByUserId,
    });
    return { id };
  });
}

export async function revokeConsentAtomic(input: {
  campaignId: number;
  commandKey: string;
  consentId: number;
  actorUserId: number;
  reason: string;
  occurredAt: Date;
} & TestHook) {
  if (useLegacyUnitTestAdapter()) {
    const record = await legacyDb.getConsentRecord(input.consentId);
    if (!record) throw new Error("CONSENT_NOT_FOUND");
    const voter = await legacyDb.getVoter(record.voterId);
    if (!voter) throw new Error("VOTER_NOT_FOUND");
    await legacyDb.revokeConsentRecord({ consentId: input.consentId, revokedAt: input.occurredAt });
    await legacyDb.appendCampaignConsentLedger({
      campaignId: input.campaignId,
      voterId: voter.id,
      channel: "all",
      purpose: record.purpose,
      source: "central_de_consentimento",
      evidence: input.reason,
      status: "revoked",
      occurredAt: input.occurredAt,
      recordedByUserId: input.actorUserId,
    });
    await legacyDb.suppressCampaignContact({
      campaignId: input.campaignId,
      voterId: voter.id,
      channel: "all",
      reason: input.reason,
      createdByUserId: input.actorUserId,
    });
    return { success: true, alreadyRevoked: false };
  }
  return withCommand({ campaignId: input.campaignId, commandKey: input.commandKey, operation: "consent_revoke" }, async (tx, organizationId) => {
    const rows = await tx.select().from(consentRecords).where(and(eq(consentRecords.id, input.consentId), eq(consentRecords.campaignId, input.campaignId))).limit(1);
    const record = rows[0];
    if (!record) throw new Error("CONSENT_NOT_FOUND");
    if (record.status === "revoked") return { success: true, alreadyRevoked: true };

    await tx.update(consentRecords).set({ status: "revoked", revokedAt: input.occurredAt }).where(eq(consentRecords.id, input.consentId));
    if (input._testFailAfterPrimary) throw new Error("TEST_FAIL_AFTER_PRIMARY");
    const active = await tx.select({ id: consentRecords.id }).from(consentRecords).where(and(eq(consentRecords.voterId, record.voterId), eq(consentRecords.status, "active"))).limit(1);
    await tx.insert(campaignContactSuppressions).values({
      organizationId,
      campaignId: input.campaignId,
      voterId: record.voterId,
      channel: "all",
      reason: input.reason,
      active: true,
      createdByUserId: input.actorUserId,
    }).onDuplicateKeyUpdate({ set: {
      reason: input.reason,
      active: true,
      resolvedAt: null,
      createdByUserId: input.actorUserId,
      requestedAt: input.occurredAt,
    } });
    await tx.update(voters).set({ doNotContact: true, contactConsent: Boolean(active[0]) }).where(and(eq(voters.id, record.voterId), eq(voters.campaignId, input.campaignId)));
    await appendLedgerTx(tx, organizationId, {
      campaignId: input.campaignId,
      voterId: record.voterId,
      channel: "all",
      purpose: record.purpose,
      source: "central_de_consentimento",
      evidence: input.reason,
      status: "revoked",
      occurredAt: input.occurredAt,
      recordedByUserId: input.actorUserId,
    });
    return { success: true, alreadyRevoked: false };
  });
}

export async function commitVoterImportAtomic(input: {
  campaignId: number;
  commandKey: string;
  newContacts: Array<Omit<typeof voters.$inferInsert, "id" | "organizationId" | "campaignId" | "createdAt" | "updatedAt">>;
  updates: Array<{ voterId: number; values: Partial<Omit<typeof voters.$inferInsert, "id" | "organizationId" | "campaignId" | "createdAt" | "updatedAt">> }>;
  purpose: string;
  source: string;
  evidence?: string | null;
  actorUserId: number;
  decision: ComplianceDecisionInput;
} & TestHook) {
  if (useLegacyUnitTestAdapter()) {
    const records = input.newContacts.map(contact => ({ ...contact, campaignId: input.campaignId }));
    const imported = await legacyDb.createVotersBatch(records);
    await Promise.all(input.updates.map(update => legacyDb.updateVoterFromImport(update.voterId, update.values)));
    const importedRows = await legacyDb.listImportContacts(input.campaignId);
    await Promise.all(importedRows.filter(contact => records.some(record => record.name === contact.name && record.phone === contact.phone && record.email === contact.email)).map(contact => legacyDb.appendCampaignConsentLedger({
      campaignId: input.campaignId,
      voterId: contact.id,
      channel: "none",
      purpose: input.purpose,
      source: input.source,
      evidence: input.evidence ?? null,
      status: "imported_without_authorization",
      occurredAt: new Date(),
      recordedByUserId: input.actorUserId,
    })));
    await legacyDb.recordCampaignComplianceDecision({
      campaignId: input.campaignId,
      action: "contact.import",
      entityType: "voter_import",
      decision: input.decision.decision,
      reviewStatus: input.decision.reviewStatus,
      reasons: input.decision.reasons,
      ruleVersion: input.decision.ruleVersion,
      requestedByUserId: input.actorUserId,
    });
    return { imported, updated: input.updates.length, createdIds: [] as number[], decisionId: null };
  }
  return withCommand({ campaignId: input.campaignId, commandKey: input.commandKey, operation: "voter_import" }, async (tx, organizationId) => {
    const createdIds: number[] = [];
    for (const contact of input.newContacts) {
      const result = await tx.insert(voters).values({ ...contact, organizationId, campaignId: input.campaignId });
      createdIds.push(Number(result[0].insertId));
    }
    for (const update of input.updates) {
      await tx.update(voters).set(update.values).where(and(eq(voters.id, update.voterId), eq(voters.campaignId, input.campaignId)));
    }
    if (input._testFailAfterPrimary) throw new Error("TEST_FAIL_AFTER_PRIMARY");
    const occurredAt = new Date();
    for (const voterId of createdIds) {
      await appendLedgerTx(tx, organizationId, {
        campaignId: input.campaignId,
        voterId,
        channel: "none",
        purpose: input.purpose,
        source: input.source,
        evidence: input.evidence ?? null,
        status: "imported_without_authorization",
        occurredAt,
        recordedByUserId: input.actorUserId,
      });
    }
    const decisionId = await decisionTx(tx, organizationId, {
      campaignId: input.campaignId,
      action: "contact.import",
      entityType: "voter_import",
      requestedByUserId: input.actorUserId,
      decision: input.decision,
    });
    return { imported: createdIds.length, updated: input.updates.length, createdIds, decisionId };
  });
}
