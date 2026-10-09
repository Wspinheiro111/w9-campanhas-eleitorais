import { beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import {
  campaignCommandIdempotency,
  campaignComplianceDecisions,
  campaignConsentLedger,
  campaignContactSuppressions,
  campaignContents,
  campaignFinancialEntries,
  campaigns,
  consentRecords,
  organizationMembers,
  organizations,
  users,
  voters,
} from "../drizzle/schema";
import { getDb } from "./db";
import {
  commitVoterImportAtomic,
  createContentWithComplianceAtomic,
  createFinancialWithComplianceAtomic,
  createPublicIntakeAtomic,
  grantConsentAtomic,
  revokeConsentAtomic,
} from "./criticalWriteCommands";

let userId = 0;
let organizationId = 0;
let campaignId = 0;

const decision = {
  decision: "needs_human_review" as const,
  reviewStatus: "pending" as const,
  reasons: ["teste"],
  ruleVersion: "2026.1",
};

beforeAll(async () => {
  const db = await getDb();
  if (!db) throw new Error("DB required");
  const suffix = Date.now().toString(36);
  const user = await db.insert(users).values({
    openId: `critical-${suffix}`,
    name: "Critical Test",
    email: `critical-${suffix}@example.com`,
    loginMethod: "local",
  });
  userId = Number(user[0].insertId);
  const org = await db.insert(organizations).values({ name: `Critical ${suffix}`, status: "active", createdById: userId });
  organizationId = Number(org[0].insertId);
  await db.insert(organizationMembers).values({ organizationId, userId, role: "admin", active: true });
  const campaign = await db.insert(campaigns).values({
    organizationId,
    name: `Campaign ${suffix}`,
    candidateName: "Pessoa",
    electionLabel: "Eleição teste",
    region: "RS",
    status: "active",
    ownerId: userId,
  });
  campaignId = Number(campaign[0].insertId);
});

describe("critical write commands", () => {
  it("faz rollback do intake público e reenvio idempotente não duplica voter/ledger", async () => {
    const db = (await getDb())!;
    const failedKey = crypto.randomUUID();
    await expect(createPublicIntakeAtomic({
      campaignId,
      commandKey: failedKey,
      voter: { ownerMemberId: null, name: "Rollback Intake", phone: "51999990001", email: null, address: null, neighborhood: null, region: null, contactProfile: null, primaryDemand: null, notes: null, contactConsent: true, doNotContact: false },
      consent: { purpose: "teste", source: "formulario_publico", evidence: "aceite", noticeVersion: "test-1", occurredAt: new Date() },
      _testFailAfterPrimary: true,
    })).rejects.toThrow("TEST_FAIL_AFTER_PRIMARY");
    expect(await db.select().from(voters).where(and(eq(voters.campaignId, campaignId), eq(voters.name, "Rollback Intake")))).toHaveLength(0);
    expect(await db.select().from(campaignCommandIdempotency).where(eq(campaignCommandIdempotency.commandKey, failedKey))).toHaveLength(0);

    const key = crypto.randomUUID();
    const request = () => createPublicIntakeAtomic({
      campaignId,
      commandKey: key,
      voter: { ownerMemberId: null, name: "Idempotent Intake", phone: "51999990002", email: null, address: null, neighborhood: null, region: null, contactProfile: null, primaryDemand: null, notes: null, contactConsent: true, doNotContact: false },
      consent: { purpose: "teste", source: "formulario_publico", evidence: "aceite", noticeVersion: "test-1", occurredAt: new Date() },
    });
    const first = await request();
    const second = await request();
    expect(second).toEqual(first);
    expect(await db.select().from(voters).where(and(eq(voters.campaignId, campaignId), eq(voters.name, "Idempotent Intake")))).toHaveLength(1);
    expect(await db.select().from(campaignConsentLedger).where(eq(campaignConsentLedger.voterId, first.id))).toHaveLength(1);
  });

  it("serializa duas requisições concorrentes com a mesma idempotency key", async () => {
    const db = (await getDb())!;
    const key = crypto.randomUUID();
    const request = () => createPublicIntakeAtomic({
      campaignId,
      commandKey: key,
      voter: { ownerMemberId: null, name: "Concurrent Intake", phone: "51999990005", email: null, address: null, neighborhood: null, region: null, contactProfile: null, primaryDemand: null, notes: null, contactConsent: true, doNotContact: false },
      consent: { purpose: "teste concorrência", source: "formulario_publico", evidence: "aceite", noticeVersion: "test-1", occurredAt: new Date() },
    });
    const [a, b] = await Promise.all([request(), request()]);
    expect(a).toEqual(b);
    expect(await db.select().from(voters).where(and(eq(voters.campaignId, campaignId), eq(voters.name, "Concurrent Intake")))).toHaveLength(1);
    expect(await db.select().from(campaignConsentLedger).where(eq(campaignConsentLedger.voterId, a.id))).toHaveLength(1);
    expect(await db.select().from(campaignCommandIdempotency).where(and(eq(campaignCommandIdempotency.campaignId, campaignId), eq(campaignCommandIdempotency.commandKey, key)))).toHaveLength(1);
  });

  it("faz rollback do grant de consentimento antes do ledger", async () => {
    const db = (await getDb())!;
    const voterInsert = await db.insert(voters).values({ organizationId, campaignId, name: "Grant Rollback", contactConsent: false, doNotContact: true });
    const voterId = Number(voterInsert[0].insertId);
    await expect(grantConsentAtomic({
      campaignId,
      commandKey: crypto.randomUUID(),
      voterId,
      purpose: "contato",
      source: "teste",
      evidence: "aceite",
      consentedAt: new Date(),
      createdByUserId: userId,
      channel: "all",
      _testFailAfterPrimary: true,
    })).rejects.toThrow("TEST_FAIL_AFTER_PRIMARY");
    expect(await db.select().from(consentRecords).where(eq(consentRecords.voterId, voterId))).toHaveLength(0);
    expect(await db.select().from(campaignConsentLedger).where(eq(campaignConsentLedger.voterId, voterId))).toHaveLength(0);
    const voter = (await db.select().from(voters).where(eq(voters.id, voterId)).limit(1))[0];
    expect(voter.contactConsent).toBe(false);
    expect(voter.doNotContact).toBe(true);
  });

  it("faz rollback de conteúdo + decisão e retry idempotente mantém uma decisão", async () => {
    const db = (await getDb())!;
    await expect(createContentWithComplianceAtomic({
      campaignId,
      commandKey: crypto.randomUUID(),
      content: { title: "Rollback Content", body: "Texto", version: 1, channel: "social", status: "review", isSynthetic: true, syntheticDisclosure: "IA", syntheticUsesCandidateOrPublicPerson: false, complianceReviewStatus: "pending", complianceReviewNote: "teste", createdById: userId },
      decision,
      requestedByUserId: userId,
      _testFailAfterPrimary: true,
    })).rejects.toThrow();
    expect(await db.select().from(campaignContents).where(and(eq(campaignContents.campaignId, campaignId), eq(campaignContents.title, "Rollback Content")))).toHaveLength(0);

    const key = crypto.randomUUID();
    const first = await createContentWithComplianceAtomic({ campaignId, commandKey: key, content: { title: "Atomic Content", body: "Texto", version: 1, channel: "social", status: "review", isSynthetic: true, syntheticDisclosure: "IA", syntheticUsesCandidateOrPublicPerson: false, complianceReviewStatus: "pending", complianceReviewNote: "teste", createdById: userId }, decision, requestedByUserId: userId });
    const second = await createContentWithComplianceAtomic({ campaignId, commandKey: key, content: { title: "Atomic Content", body: "Texto", version: 1, channel: "social", status: "review", isSynthetic: true, syntheticDisclosure: "IA", syntheticUsesCandidateOrPublicPerson: false, complianceReviewStatus: "pending", complianceReviewNote: "teste", createdById: userId }, decision, requestedByUserId: userId });
    expect(second).toEqual(first);
    expect(await db.select().from(campaignComplianceDecisions).where(eq(campaignComplianceDecisions.entityId, first.id))).toHaveLength(1);
  });

  it("faz rollback do financeiro + decisão", async () => {
    const db = (await getDb())!;
    await expect(createFinancialWithComplianceAtomic({
      campaignId,
      commandKey: crypto.randomUUID(),
      entry: { createdByUserId: userId, entryType: "expense", category: "Teste", counterpartyName: "Fornecedor", amountCents: 1000, paidAt: null, evidenceStatus: "attached", complianceReviewStatus: "pending", complianceReviewNote: "teste" },
      decision,
      requestedByUserId: userId,
      _testFailAfterPrimary: true,
    })).rejects.toThrow();
    expect(await db.select().from(campaignFinancialEntries).where(and(eq(campaignFinancialEntries.campaignId, campaignId), eq(campaignFinancialEntries.category, "Teste")))).toHaveLength(0);
  });

  it("faz rollback de revogação e sucesso grava uma supressão + um ledger", async () => {
    const db = (await getDb())!;
    const voter = await db.insert(voters).values({ organizationId, campaignId, name: "Consent Voter", contactConsent: true, doNotContact: false });
    const voterId = Number(voter[0].insertId);
    const consent = await db.insert(consentRecords).values({ organizationId, campaignId, voterId, status: "active", purpose: "contato", source: "teste", consentedAt: new Date(), createdByUserId: userId });
    const consentId = Number(consent[0].insertId);
    await expect(revokeConsentAtomic({ campaignId, commandKey: crypto.randomUUID(), consentId, actorUserId: userId, reason: "pedido titular", occurredAt: new Date(), _testFailAfterPrimary: true })).rejects.toThrow();
    expect((await db.select().from(consentRecords).where(eq(consentRecords.id, consentId)))[0]?.status).toBe("active");
    expect(await db.select().from(campaignContactSuppressions).where(eq(campaignContactSuppressions.voterId, voterId))).toHaveLength(0);

    const key = crypto.randomUUID();
    await revokeConsentAtomic({ campaignId, commandKey: key, consentId, actorUserId: userId, reason: "pedido titular", occurredAt: new Date() });
    await revokeConsentAtomic({ campaignId, commandKey: key, consentId, actorUserId: userId, reason: "pedido titular", occurredAt: new Date() });
    expect(await db.select().from(campaignContactSuppressions).where(eq(campaignContactSuppressions.voterId, voterId))).toHaveLength(1);
    expect(await db.select().from(campaignConsentLedger).where(and(eq(campaignConsentLedger.voterId, voterId), eq(campaignConsentLedger.status, "revoked")))).toHaveLength(1);
  });

  it("faz rollback da importação completa e retry não duplica decisão/ledger", async () => {
    const db = (await getDb())!;
    await expect(commitVoterImportAtomic({ campaignId, commandKey: crypto.randomUUID(), newContacts: [{ ownerMemberId: null, name: "Rollback Import", phone: "51999990003", email: null, contactConsent: false, doNotContact: false }], updates: [], purpose: "importação", source: "csv", actorUserId: userId, decision, _testFailAfterPrimary: true })).rejects.toThrow();
    expect(await db.select().from(voters).where(and(eq(voters.campaignId, campaignId), eq(voters.name, "Rollback Import")))).toHaveLength(0);

    const key = crypto.randomUUID();
    const first = await commitVoterImportAtomic({ campaignId, commandKey: key, newContacts: [{ ownerMemberId: null, name: "Atomic Import", phone: "51999990004", email: null, contactConsent: false, doNotContact: false }], updates: [], purpose: "importação", source: "csv", actorUserId: userId, decision });
    const second = await commitVoterImportAtomic({ campaignId, commandKey: key, newContacts: [{ ownerMemberId: null, name: "Atomic Import", phone: "51999990004", email: null, contactConsent: false, doNotContact: false }], updates: [], purpose: "importação", source: "csv", actorUserId: userId, decision });
    expect(second).toEqual(first);
    expect(await db.select().from(campaignConsentLedger).where(eq(campaignConsentLedger.voterId, first.createdIds[0]))).toHaveLength(1);
    expect(await db.select().from(campaignComplianceDecisions).where(and(eq(campaignComplianceDecisions.campaignId, campaignId), eq(campaignComplianceDecisions.action, "contact.import")))).toHaveLength(1);
  });
});
