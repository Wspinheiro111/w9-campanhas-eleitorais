import { TRPCError } from "@trpc/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import * as db from "../campaignDb";
import { canAccessOwnedRecord, canManageCampaign, canManageTeam, type CampaignRole } from "../campaignPolicy";
import { parseContactsCsv } from "../csvContacts";
import { deduplicateWithFlask } from "../flaskDeduplication";
import { evaluateCompliance } from "../complianceEngine";
import { evaluateCampaignContentCompliance, type ContentComplianceMaterial } from "../contentCompliancePolicy";
import {
  commitVoterImportAtomic,
  createContentWithComplianceAtomic,
  createFinancialWithComplianceAtomic,
  createPublicIntakeAtomic,
  grantConsentAtomic,
  revokeConsentAtomic,
} from "../criticalWriteCommands";
import {
  consentRouter as baseConsentRouter,
  contentsRouter as baseContentsRouter,
  financeLegalRouter as baseFinanceLegalRouter,
  publicIntakeRouter as basePublicIntakeRouter,
  votersRouter as baseVotersRouter,
} from "./campaign";

const campaignIdInput = z.object({ campaignId: z.number().int().positive() });

type Access = NonNullable<Awaited<ReturnType<typeof db.getCampaignAccess>>>;

async function requireAccess(userId: number, campaignId: number): Promise<Access> {
  const access = await db.getCampaignAccess(campaignId, userId);
  if (!access) throw new TRPCError({ code: "FORBIDDEN", message: "Você não possui acesso a esta campanha." });
  return access;
}

function requireCapability(access: Access, action: "manage" | "team" | "own_data") {
  const role = (access.member?.role ?? "admin") as CampaignRole;
  if (action === "team" && !canManageTeam(role)) throw new TRPCError({ code: "FORBIDDEN", message: "Somente administradores podem gerenciar a equipe." });
  if (action === "manage" && !canManageCampaign(role)) throw new TRPCError({ code: "FORBIDDEN", message: "Seu perfil possui acesso restrito aos próprios registros." });
  return role;
}

function commandKey(input: { commandKey?: string }) {
  return input.commandKey ?? randomBytes(16).toString("hex");
}

function baseRecord<TRecord extends Record<string, any>>(value: { _def: { record: TRecord } }): TRecord {
  return value._def.record;
}

const publicSubmit = publicProcedure.input(z.object({
  campaignId: z.number().int().positive(),
  name: z.string().min(2).max(180),
  phone: z.string().max(32).optional(),
  email: z.string().email().optional(),
  neighborhood: z.string().max(120).optional(),
  region: z.string().max(120).optional(),
  contactProfile: z.string().max(120).optional(),
  consent: z.literal(true),
  commandKey: z.string().uuid().optional(),
})).mutation(async ({ input }) => {
  const campaign = await db.getPublicCampaign(input.campaignId);
  if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Este formulário não está disponível." });
  const atomic = await createPublicIntakeAtomic({
    campaignId: input.campaignId,
    commandKey: commandKey(input),
    voter: {
      name: input.name,
      phone: input.phone ?? null,
      email: input.email ?? null,
      neighborhood: input.neighborhood ?? null,
      region: input.region ?? null,
      contactProfile: input.contactProfile ?? null,
      address: null,
      engagementLevel: "medium",
      pipelineStage: "identified",
      primaryDemand: null,
      notes: "Cadastro público consentido",
      contactConsent: true,
      doNotContact: false,
      ownerMemberId: null,
    },
    consent: {
      purpose: "cadastro público consentido",
      source: "formulário público",
      evidence: "Confirmação expressa registrada no formulário público.",
      noticeVersion: "formulário-público-2026.1",
      occurredAt: new Date(),
    },
  });
  return { id: atomic.id };
});

export const publicIntakeRouter = router({
  ...baseRecord(basePublicIntakeRouter),
  submit: publicSubmit,
});

const consentCreate = protectedProcedure.input(z.object({
  voterId: z.number().int().positive(),
  purpose: z.string().min(3).max(240),
  source: z.string().min(2).max(120),
  evidence: z.string().max(3000).optional(),
  channel: z.enum(["email", "whatsapp", "all"]).default("all"),
  legalBasis: z.string().min(2).max(80).default("consent"),
  noticeVersion: z.string().max(80).optional(),
  consentedAt: z.date(),
  expiresAt: z.date().optional(),
  commandKey: z.string().uuid().optional(),
})).mutation(async ({ ctx, input }) => {
  const voter = await db.getVoter(input.voterId);
  if (!voter) throw new TRPCError({ code: "NOT_FOUND" });
  const access = await requireAccess(ctx.user.id, voter.campaignId);
  if (access.member?.role === "partner" && !canAccessOwnedRecord("partner", voter.ownerMemberId, access.member.id)) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return grantConsentAtomic({
    campaignId: voter.campaignId,
    commandKey: commandKey(input),
    voterId: input.voterId,
    purpose: input.purpose,
    source: input.source,
    evidence: input.evidence ?? null,
    consentedAt: input.consentedAt,
    expiresAt: input.expiresAt ?? null,
    createdByUserId: ctx.user.id,
    channel: input.channel,
    legalBasis: input.legalBasis,
    noticeVersion: input.noticeVersion ?? null,
  });
});

const consentRevoke = protectedProcedure.input(z.object({
  consentId: z.number().int().positive(),
  commandKey: z.string().uuid().optional(),
})).mutation(async ({ ctx, input }) => {
  const record = await db.getConsentRecord(input.consentId);
  if (!record) throw new TRPCError({ code: "NOT_FOUND" });
  const voter = await db.getVoter(record.voterId);
  if (!voter) throw new TRPCError({ code: "NOT_FOUND" });
  const access = await requireAccess(ctx.user.id, voter.campaignId);
  requireCapability(access, "manage");
  await revokeConsentAtomic({
    campaignId: voter.campaignId,
    commandKey: commandKey(input),
    consentId: input.consentId,
    actorUserId: ctx.user.id,
    reason: "Revogação de consentimento",
    occurredAt: new Date(),
  });
  return { success: true } as const;
});

export const consentRouter = router({
  ...baseRecord(baseConsentRouter),
  create: consentCreate,
  revoke: consentRevoke,
});

const commitCsv = protectedProcedure.input(campaignIdInput.extend({
  csv: z.string().min(12).max(2_000_000),
  approvedUpdateRows: z.array(z.number().int().min(2)).max(1000),
  approvedCandidateRows: z.array(z.number().int().min(2)).max(1000),
  importPurpose: z.string().min(3).max(240).default("organização operacional de contatos"),
  importSource: z.string().min(2).max(120).default("importação CSV"),
  importEvidence: z.string().max(3000).optional(),
  commandKey: z.string().uuid().optional(),
})).mutation(async ({ ctx, input }) => {
  const access = await requireAccess(ctx.user.id, input.campaignId);
  const parsed = parseContactsCsv(input.csv);
  if (parsed.errors.length) return { imported: 0, updated: 0, skippedCandidates: 0, errors: parsed.errors, importedContacts: [], updatedContacts: [] };

  const existing = await db.listImportContacts(input.campaignId);
  const review = await deduplicateWithFlask({ existing, incoming: parsed.rows.map((row, index) => ({ ...row, row: index + 2 })) });
  const byRow = new Map(review.newContacts.map(row => [row.row, row]));
  const sourceRows = new Map(parsed.rows.map((row, index) => [index + 2, { ...row, row: index + 2 }]));
  const ownerMemberId = access.member?.role === "partner" ? access.member.id : access.member?.id ?? null;
  const candidateRows = review.candidates
    .filter(item => input.approvedCandidateRows.includes(item.row))
    .map(item => sourceRows.get(item.row))
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
  const rowsToCreate = [...Array.from(byRow.values()), ...candidateRows];
  const recordsToCreate = rowsToCreate.map(({ row: _row, ...row }) => ({ ...row, ownerMemberId, contactConsent: false, doNotContact: false }));
  const updates = review.updates
    .filter(item => input.approvedUpdateRows.includes(item.row) && item.existing)
    .map(item => ({ item, row: sourceRows.get(item.row) }))
    .filter((value): value is { item: typeof review.updates[number]; row: NonNullable<typeof value.row> } => Boolean(value.row));

  const rules = await db.getCampaignComplianceRules(input.campaignId);
  const decision = evaluateCompliance({ action: "contact.import", rules });
  const atomic = await commitVoterImportAtomic({
    campaignId: input.campaignId,
    commandKey: commandKey(input),
    newContacts: recordsToCreate,
    updates: updates.map(({ item, row }) => ({
      voterId: item.existing!.id,
      values: {
        name: row.name,
        phone: row.phone,
        email: row.email,
        address: row.address,
        neighborhood: row.neighborhood,
        region: row.region,
        contactProfile: row.contactProfile,
        engagementLevel: row.engagementLevel,
        primaryDemand: row.primaryDemand,
        notes: row.notes,
        contactConsent: item.existing!.contactConsent,
        doNotContact: item.existing!.doNotContact,
      },
    })),
    purpose: input.importPurpose,
    source: input.importSource,
    evidence: input.importEvidence ?? null,
    actorUserId: ctx.user.id,
    decision: {
      decision: decision.decision,
      reviewStatus: decision.reviewStatus,
      reasons: decision.reasons,
      ruleVersion: rules.ruleVersion,
    },
  });

  return {
    imported: atomic.imported,
    updated: atomic.updated,
    skippedCandidates: review.candidates.length - candidateRows.length,
    errors: [],
    importedContacts: recordsToCreate.map((contact, index) => ({ row: rowsToCreate[index].row, name: contact.name, email: contact.email, phone: contact.phone })),
    updatedContacts: updates.map(({ item, row }) => ({ row: row.row, name: row.name, existingId: item.existing!.id })),
  };
});

export const votersRouter = router({
  ...baseRecord(baseVotersRouter),
  commitCsv,
});

const contentCreate = protectedProcedure.input(campaignIdInput.extend({
  title: z.string().min(3).max(200),
  body: z.string().min(2).max(10000),
  assetUrl: z.string().url().max(1200).optional(),
  version: z.number().int().min(1).max(999).default(1),
  channel: z.enum(["social", "whatsapp", "print", "speech", "video", "other"]),
  objective: z.string().max(220).optional(),
  scheduledAt: z.date().optional(),
  ownerMemberId: z.number().int().positive().optional(),
  isSynthetic: z.boolean().default(false),
  syntheticDisclosure: z.string().max(1500).optional(),
  syntheticUsesCandidateOrPublicPerson: z.boolean().optional(),
  status: z.enum(["draft", "review", "approved", "archived"]),
  commandKey: z.string().uuid().optional(),
})).mutation(async ({ ctx, input }) => {
  const access = await requireAccess(ctx.user.id, input.campaignId);
  requireCapability(access, "manage");
  if (input.ownerMemberId && !await db.getCampaignMember(input.campaignId, input.ownerMemberId)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "O responsável editorial precisa pertencer a esta campanha." });
  }
  const rules = await db.getCampaignComplianceRules(input.campaignId);
  const material: ContentComplianceMaterial = {
    title: input.title,
    body: input.body,
    assetUrl: input.assetUrl ?? null,
    assetKey: null,
    channel: input.channel,
    objective: input.objective ?? null,
    scheduledAt: input.scheduledAt ?? null,
    isSynthetic: input.isSynthetic,
    syntheticDisclosure: input.syntheticDisclosure ?? null,
    syntheticUsesCandidateOrPublicPerson: input.syntheticUsesCandidateOrPublicPerson ?? null,
  };
  const policy = evaluateCampaignContentCompliance({
    rules,
    campaign: access.campaign,
    material,
    reviewStatus: input.isSynthetic ? "pending" : "not_required",
  });
  if (input.status === "approved" && input.isSynthetic && policy.evaluation.decision === "blocked") {
    throw new TRPCError({ code: "BAD_REQUEST", message: policy.evaluation.reasons.join(" ") });
  }
  const status = input.isSynthetic && input.status === "approved" ? "review" : input.status;
  const { campaignId: _campaignId, commandKey: _commandKey, ...contentInput } = input;
  const atomic = await createContentWithComplianceAtomic({
    campaignId: input.campaignId,
    commandKey: commandKey(input),
    content: {
      ...contentInput,
      syntheticUsesCandidateOrPublicPerson: input.syntheticUsesCandidateOrPublicPerson ?? null,
      assetUrl: input.assetUrl ?? null,
      objective: input.objective ?? null,
      scheduledAt: input.scheduledAt ?? null,
      ownerMemberId: input.ownerMemberId ?? null,
      status,
      complianceReviewStatus: input.isSynthetic ? policy.evaluation.reviewStatus : "not_required",
      complianceReviewNote: input.isSynthetic ? policy.evaluation.reasons.join(" ") : null,
      complianceReviewedContentVersion: null,
      complianceReviewedContentHash: null,
      complianceReviewedRuleVersion: null,
      createdById: ctx.user.id,
    },
    decision: input.isSynthetic ? {
      decision: policy.evaluation.decision,
      reviewStatus: policy.evaluation.reviewStatus,
      reasons: policy.evaluation.reasons,
      ruleVersion: rules.ruleVersion,
      entityVersion: input.version,
      entityHash: policy.contentHash,
    } : undefined,
    requestedByUserId: ctx.user.id,
  });
  return { id: atomic.id, compliance: policy.evaluation };
});

export const contentsRouter = router({
  ...baseRecord(baseContentsRouter),
  create: contentCreate,
});

const financialCreate = protectedProcedure.input(campaignIdInput.extend({
  entryType: z.enum(["income", "expense"]),
  category: z.string().min(2).max(120),
  counterpartyName: z.string().min(2).max(220),
  counterpartyDocument: z.string().max(24).optional(),
  supplierName: z.string().max(220).optional(),
  costCenter: z.string().max(120).optional(),
  eventId: z.number().int().positive().optional(),
  amountCents: z.number().int().positive().max(2_000_000_000),
  paymentMethod: z.string().max(80).optional(),
  receiptNumber: z.string().max(100).optional(),
  documentNumber: z.string().max(100).optional(),
  sourceType: z.string().max(80).optional(),
  dueDate: z.date().optional(),
  paidAt: z.date().optional(),
  notes: z.string().max(3000).optional(),
  commandKey: z.string().uuid().optional(),
})).mutation(async ({ ctx, input }) => {
  const access = await requireAccess(ctx.user.id, input.campaignId);
  requireCapability(access, "manage");
  const rules = await db.getCampaignComplianceRules(input.campaignId);
  const documentDigits = input.counterpartyDocument?.replace(/\D/g, "") ?? "";
  const decision = evaluateCompliance({
    action: "financial.register",
    rules,
    financial: {
      entryType: input.entryType,
      counterpartyDocumentDigits: documentDigits.length,
      evidenceProvided: Boolean(input.documentNumber || input.receiptNumber),
    },
  });
  if (decision.decision === "blocked") throw new TRPCError({ code: "BAD_REQUEST", message: decision.reasons.join(" ") });
  if (input.eventId) {
    const event = await db.getEvent(input.eventId);
    if (!event || event.campaignId !== input.campaignId) throw new TRPCError({ code: "BAD_REQUEST", message: "Evento inválido." });
  }
  const { campaignId: _campaignId, commandKey: _commandKey, ...entryInput } = input;
  const atomic = await createFinancialWithComplianceAtomic({
    campaignId: input.campaignId,
    commandKey: commandKey(input),
    entry: {
      ...entryInput,
      createdByUserId: ctx.user.id,
      counterpartyDocument: input.counterpartyDocument ?? null,
      supplierName: input.supplierName ?? null,
      costCenter: input.costCenter ?? null,
      eventId: input.eventId ?? null,
      paymentMethod: input.paymentMethod ?? null,
      receiptNumber: input.receiptNumber ?? null,
      documentNumber: input.documentNumber ?? null,
      sourceType: input.sourceType ?? null,
      evidenceStatus: input.documentNumber || input.receiptNumber ? "attached" : "pending",
      complianceReviewStatus: decision.reviewStatus,
      complianceReviewNote: decision.reasons.join(" "),
      dueDate: input.dueDate ?? null,
      paidAt: input.paidAt ?? null,
      notes: input.notes ?? null,
    },
    decision: {
      decision: decision.decision,
      reviewStatus: decision.reviewStatus,
      reasons: decision.reasons,
      ruleVersion: rules.ruleVersion,
    },
    requestedByUserId: ctx.user.id,
  });
  return { id: atomic.id, compliance: decision };
});

const financeRecord = baseRecord(baseFinanceLegalRouter);
const entriesRecord = financeRecord.entries;

export const financeLegalRouter = router({
  ...financeRecord,
  entries: router({
    ...entriesRecord,
    create: financialCreate,
  }),
});
