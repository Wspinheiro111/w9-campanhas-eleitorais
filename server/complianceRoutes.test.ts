import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./campaignDb", () => ({
  getCampaignAccess: vi.fn(),
  getCampaignComplianceOverview: vi.fn(),
  getCampaignComplianceRules: vi.fn(),
  recordCampaignComplianceDecision: vi.fn(),
  getCampaignComplianceDecision: vi.fn(),
  reviewCampaignComplianceDecision: vi.fn(),
  listCampaignComplianceDecisions: vi.fn(),
  listCampaignComplianceSources: vi.fn(),
  createCampaignComplianceSource: vi.fn(),
  listCampaignDataSubjectRequests: vi.fn(),
  createCampaignDataSubjectRequest: vi.fn(),
  getVoter: vi.fn(),
  getContentById: vi.fn(),
  updateCampaignContent: vi.fn(),
  reviewCampaignContentCompliance: vi.fn(),
  getSurveySummaryForAnyCampaign: vi.fn(),
  reviewCampaignSurveyCompliance: vi.fn(),
  updateCampaignComplianceRules: vi.fn(),
}));

import * as db from "./campaignDb";
import { appRouter } from "./routers";

const rules = { ruleVersion: "2026.1", blockBusinessDonation: true, requireExpenseDocument: true, reviewDeadlineHours: 72, blockElectoralPhoneContact: true, requireConsentEvidence: true, requireHumanReviewForSyntheticContent: true, blockSyntheticPublicationWindow: true, requireResearchRegistrationForPublication: true, requireFinancialEvidence: true };
const campaign = { id: 1, organizationId: 3, ownerId: 99, name: "Campanha", candidateName: "Candidata", electionLabel: "Vereança", electionEndsAt: new Date("2026-10-04T20:00:00.000Z"), electionTimeZone: "America/Sao_Paulo", region: "Cidade", status: "active", createdAt: new Date(), updatedAt: new Date() };
const context = (): TrpcContext => ({ user: { id: 99, openId: "compliance-test", name: "Admin", email: "admin@example.com", loginMethod: "local", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] });
const access = (role: "admin" | "coordinator" | "partner") => ({ campaign, member: { id: 10, campaignId: 1, userId: 99, role }, organizationMember: { id: 7, organizationId: 3, userId: 99, role: "manager" } });
const syntheticContent = (overrides: Record<string, unknown> = {}) => ({
  id: 7,
  organizationId: 3,
  campaignId: 1,
  title: "Peça sintética",
  body: "Texto informativo",
  assetUrl: null,
  assetKey: null,
  assetName: null,
  assetMime: null,
  assetSize: null,
  version: 1,
  channel: "social",
  objective: null,
  scheduledAt: null,
  ownerMemberId: null,
  status: "review",
  isSynthetic: true,
  syntheticDisclosure: "Conteúdo sintético identificado.",
  syntheticUsesCandidateOrPublicPerson: false,
  complianceReviewStatus: "pending",
  complianceReviewedByUserId: null,
  complianceReviewedAt: null,
  complianceReviewNote: null,
  complianceReviewedContentVersion: null,
  complianceReviewedContentHash: null,
  complianceReviewedRuleVersion: null,
  createdById: 99,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

afterEach(() => vi.clearAllMocks());

describe("W9 Compliance Eleitoral", () => {
  it("reserva a visão consolidada de compliance à gestão da campanha", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("partner") as never);
    await expect(appRouter.createCaller(context()).compliance.overview({ campaignId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("admin") as never);
    vi.mocked(db.getCampaignComplianceOverview).mockResolvedValue({ pendingReviews: [], suppressions: [] } as never);
    await expect(appRouter.createCaller(context()).compliance.overview({ campaignId: 1 })).resolves.toMatchObject({ pendingReviews: [] });
  });

  it("não libera exportação de contatos sem revisão humana e registra a decisão", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("admin") as never);
    vi.mocked(db.getCampaignComplianceRules).mockResolvedValue(rules as never);
    vi.mocked(db.recordCampaignComplianceDecision).mockResolvedValue(41);
    const result = await appRouter.createCaller(context()).compliance.exportContacts({ campaignId: 1, purpose: "Preparar relatório interno", reviewStatus: "pending" });
    expect(result).toMatchObject({ decisionId: 41, compliance: { decision: "needs_human_review", reviewStatus: "pending" } });
    expect(db.recordCampaignComplianceDecision).toHaveBeenCalledWith(expect.objectContaining({ campaignId: 1, action: "communication.export_contacts", requestedByUserId: 99 }));
  });

  it("não permite desativar baseline obrigatório pela API de regras", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("admin") as never);
    const caller = appRouter.createCaller(context());
    await expect(caller.compliance.rules.update({ campaignId: 1, blockBusinessDonation: false, requireExpenseDocument: true, reviewDeadlineHours: 72, blockElectoralPhoneContact: true, requireConsentEvidence: true, requireHumanReviewForSyntheticContent: true, blockSyntheticPublicationWindow: true, requireResearchRegistrationForPublication: true, requireFinancialEvidence: true, ruleVersion: "2026.1" })).rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringContaining("baseline obrigatório") });
    expect(db.updateCampaignComplianceRules).not.toHaveBeenCalled();
  });

  it("impede revisão que tente aprovar conteúdo sintético sem identificação", async () => {
    vi.mocked(db.getContentById).mockResolvedValue(syntheticContent({ syntheticDisclosure: null, syntheticUsesCandidateOrPublicPerson: true }) as never);
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("admin") as never);
    vi.mocked(db.getCampaignComplianceRules).mockResolvedValue(rules as never);
    await expect(appRouter.createCaller(context()).compliance.content.review({ contentId: 7, status: "approved" })).rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringContaining("identificação") });
    expect(db.reviewCampaignContentCompliance).not.toHaveBeenCalled();
  });

  it("impede contents.update de aprovar conteúdo sintético por caminho lateral", async () => {
    vi.mocked(db.getContentById).mockResolvedValue(syntheticContent({ complianceReviewStatus: "approved", status: "approved" }) as never);
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("admin") as never);
    const caller = appRouter.createCaller(context());
    await expect(caller.contents.update({ id: 7, title: "Peça sintética", body: "Texto informativo", version: 1, channel: "social", status: "approved" })).rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringContaining("fluxo dedicado") });
    expect(db.updateCampaignContent).not.toHaveBeenCalled();
  });

  it("edição material de peça sintética aprovada incrementa versão e reabre revisão", async () => {
    vi.mocked(db.getContentById).mockResolvedValue(syntheticContent({ complianceReviewStatus: "approved", status: "approved", complianceReviewedByUserId: 99, complianceReviewedAt: new Date(), complianceReviewedContentVersion: 1, complianceReviewedContentHash: "a".repeat(64), complianceReviewedRuleVersion: "2026.1" }) as never);
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("admin") as never);
    vi.mocked(db.getCampaignComplianceRules).mockResolvedValue(rules as never);
    vi.mocked(db.updateCampaignContent).mockResolvedValue(undefined);
    vi.mocked(db.recordCampaignComplianceDecision).mockResolvedValue(42);
    const result = await appRouter.createCaller(context()).contents.update({ id: 7, title: "Peça sintética revisada", body: "Texto informativo", version: 1, channel: "social", status: "review" });
    expect(result).toMatchObject({ success: true, version: 2, reviewReopened: true });
    expect(db.updateCampaignContent).toHaveBeenCalledWith(7, expect.objectContaining({ version: 2, status: "review", complianceReviewStatus: "pending", complianceReviewedByUserId: null, complianceReviewedContentHash: null, complianceReviewedRuleVersion: null }));
    expect(db.recordCampaignComplianceDecision).toHaveBeenCalledWith(expect.objectContaining({ entityVersion: 2, reviewStatus: "pending", requestedByUserId: 99 }));
  });
});
