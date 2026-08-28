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
  reviewCampaignContentCompliance: vi.fn(),
  getSurveySummaryForAnyCampaign: vi.fn(),
  reviewCampaignSurveyCompliance: vi.fn(),
  updateCampaignComplianceRules: vi.fn(),
}));

import * as db from "./campaignDb";
import { appRouter } from "./routers";

const rules = { ruleVersion: "2026.1", blockBusinessDonation: true, requireExpenseDocument: true, reviewDeadlineHours: 72, blockElectoralPhoneContact: true, requireConsentEvidence: true, requireHumanReviewForSyntheticContent: true, blockSyntheticPublicationWindow: true, requireResearchRegistrationForPublication: true, requireFinancialEvidence: true };
const campaign = { id: 1, organizationId: 3, ownerId: 99, name: "Campanha", candidateName: "Candidata", electionLabel: "Vereança", region: "Cidade", status: "active", createdAt: new Date(), updatedAt: new Date() };
const context = (): TrpcContext => ({ user: { id: 99, openId: "compliance-test", name: "Admin", email: "admin@example.com", loginMethod: "local", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] });
const access = (role: "admin" | "coordinator" | "partner") => ({ campaign, member: { id: 10, campaignId: 1, userId: 99, role }, organizationMember: { id: 7, organizationId: 3, userId: 99, role: "manager" } });

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

  it("impede revisão que tente aprovar conteúdo sintético sem identificação", async () => {
    vi.mocked(db.getContentById).mockResolvedValue({ id: 7, campaignId: 1, isSynthetic: true, syntheticDisclosure: null } as never);
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("admin") as never);
    vi.mocked(db.getCampaignComplianceRules).mockResolvedValue(rules as never);
    await expect(appRouter.createCaller(context()).compliance.content.review({ contentId: 7, status: "approved" })).rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringContaining("identificação") });
    expect(db.reviewCampaignContentCompliance).not.toHaveBeenCalled();
  });
});
