import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./campaignDb", () => ({
  getCampaignAccess: vi.fn(),
  getCampaignComplianceRules: vi.fn(),
  getCampaignMember: vi.fn(),
  createCampaignContent: vi.fn(),
  recordCampaignComplianceDecision: vi.fn(),
  getContentById: vi.fn(),
  reviewCampaignContentCompliance: vi.fn(),
  updateCampaignContent: vi.fn(),
}));

import * as db from "./campaignDb";
import { appRouter } from "./routers";

const rules = {
  ruleVersion: "2026.1",
  blockBusinessDonation: true,
  requireExpenseDocument: true,
  reviewDeadlineHours: 72,
  blockElectoralPhoneContact: true,
  requireConsentEvidence: true,
  requireHumanReviewForSyntheticContent: true,
  blockSyntheticPublicationWindow: true,
  requireResearchRegistrationForPublication: true,
  requireFinancialEvidence: true,
};

function context(): TrpcContext {
  return {
    user: { id: 99, openId: "synthetic-test", name: "Admin", email: "admin@example.com", loginMethod: "local", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function campaignAccess(electionEndsAt: Date | null) {
  return {
    campaign: { id: 1, organizationId: 3, ownerId: 99, name: "Campanha", candidateName: "Candidata", electionLabel: "Eleições 2026", electionEndsAt, region: "Cidade", status: "active", createdAt: new Date(), updatedAt: new Date() },
    member: { id: 10, campaignId: 1, userId: 99, role: "admin" },
    organizationMember: { id: 7, organizationId: 3, userId: 99, role: "manager" },
  };
}

const baseCreate = {
  campaignId: 1,
  title: "Peça sintética",
  body: "Conteúdo de teste",
  version: 1,
  channel: "social" as const,
  isSynthetic: true,
  syntheticDisclosure: "Conteúdo gerado com inteligência artificial.",
  syntheticUsesCandidateOrPublicPerson: true,
  status: "approved" as const,
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-03T12:00:00.000Z"));
  vi.mocked(db.getCampaignComplianceRules).mockResolvedValue(rules as never);
  vi.mocked(db.recordCampaignComplianceDecision).mockResolvedValue(51);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("gates de conteúdo sintético", () => {
  it("bloqueia criação aprovada quando a peça aplicável está dentro da janela restrita", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(campaignAccess(new Date("2026-10-04T17:00:00.000Z")) as never);

    await expect(appRouter.createCaller(context()).contents.create(baseCreate)).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("janela temporal"),
    });
    expect(db.createCampaignContent).not.toHaveBeenCalled();
  });

  it("não aprova revisão quando a peça é aplicável e o término do pleito não está configurado", async () => {
    vi.mocked(db.getContentById).mockResolvedValue({ id: 7, campaignId: 1, isSynthetic: true, syntheticDisclosure: "IA identificada", syntheticUsesCandidateOrPublicPerson: true } as never);
    vi.mocked(db.getCampaignAccess).mockResolvedValue(campaignAccess(null) as never);

    await expect(appRouter.createCaller(context()).compliance.content.review({ contentId: 7, status: "approved" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("término do pleito"),
    });
    expect(db.reviewCampaignContentCompliance).not.toHaveBeenCalled();
  });

  it("permite revisão aprovada quando a peça aplicável está fora da janela", async () => {
    vi.setSystemTime(new Date("2026-09-20T12:00:00.000Z"));
    vi.mocked(db.getContentById).mockResolvedValue({ id: 7, campaignId: 1, isSynthetic: true, syntheticDisclosure: "IA identificada", syntheticUsesCandidateOrPublicPerson: true } as never);
    vi.mocked(db.getCampaignAccess).mockResolvedValue(campaignAccess(new Date("2026-10-04T17:00:00.000Z")) as never);

    await expect(appRouter.createCaller(context()).compliance.content.review({ contentId: 7, status: "approved" })).resolves.toEqual({ success: true });
    expect(db.reviewCampaignContentCompliance).toHaveBeenCalledWith(expect.objectContaining({ id: 7, status: "approved", reviewedByUserId: 99 }));
  });

  it("não deixa contents.update aprovar diretamente uma peça sintética", async () => {
    vi.mocked(db.getContentById).mockResolvedValue({ id: 7, campaignId: 1, isSynthetic: true, syntheticDisclosure: "IA identificada", syntheticUsesCandidateOrPublicPerson: false, complianceReviewStatus: "approved" } as never);
    vi.mocked(db.getCampaignAccess).mockResolvedValue(campaignAccess(new Date("2026-10-04T17:00:00.000Z")) as never);

    await appRouter.createCaller(context()).contents.update({
      id: 7,
      title: "Peça editada",
      body: "Conteúdo materialmente alterado",
      version: 2,
      channel: "social",
      status: "approved",
    });

    expect(db.updateCampaignContent).toHaveBeenCalledWith(7, expect.objectContaining({
      status: "review",
      complianceReviewStatus: "pending",
    }));
  });
});
