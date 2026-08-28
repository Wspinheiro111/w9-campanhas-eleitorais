import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./campaignDb", () => ({
  getCampaignAccess: vi.fn(),
  getDailySummary: vi.fn(),
  listImportContacts: vi.fn(),
  createVotersBatch: vi.fn(),
  updateVoterFromImport: vi.fn(),
  appendCampaignConsentLedger: vi.fn(),
  getCampaignComplianceRules: vi.fn().mockResolvedValue({ ruleVersion: "2026.1", blockBusinessDonation: false, requireExpenseDocument: false, reviewDeadlineHours: 72, blockElectoralPhoneContact: true, requireConsentEvidence: true, requireHumanReviewForSyntheticContent: true, blockSyntheticPublicationWindow: true, requireResearchRegistrationForPublication: true, requireFinancialEvidence: true }),
  recordCampaignComplianceDecision: vi.fn(),
}));

import * as db from "./campaignDb";
import { appRouter } from "./routers";

const campaign = { id: 1, ownerId: 99, name: "Campanha", candidateName: "Candidata", electionLabel: "Vereança", region: "Cidade", status: "active", createdAt: new Date(), updatedAt: new Date() };
const membership = { id: 10, campaignId: 1, userId: 99, role: "admin" as const };

function context(): TrpcContext {
  return { user: { id: 99, openId: "daily-import", name: "Admin", email: "admin@example.com", loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

afterEach(() => vi.clearAllMocks());

describe("resumo diário e importação CSV", () => {
  it("retorna o resumo diário para um usuário vinculado", async () => {
    const summary = { date: new Date(), overdue: [], dueToday: [], upcoming: [], todayEvents: [] };
    vi.mocked(db.getCampaignAccess).mockResolvedValue({ campaign, member: membership } as never);
    vi.mocked(db.getDailySummary).mockResolvedValue(summary as never);
    const caller = appRouter.createCaller(context());
    await expect(caller.dashboard.dailySummary({ campaignId: 1 })).resolves.toEqual(summary);
    expect(db.getDailySummary).toHaveBeenCalledWith(1, null);
  });

  it("gera uma prévia de contatos novos sem persistir dados", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue({ campaign, member: membership } as never);
    vi.mocked(db.listImportContacts).mockResolvedValue([]);
    const caller = appRouter.createCaller(context());
    const result = await caller.voters.previewCsv({ campaignId: 1, csv: "nome;telefone;consentimento\nAna Silva;51999990000;Sim" });
    expect(result.newContacts).toEqual([expect.objectContaining({ row: 2, name: "Ana Silva" })]);
    expect(db.createVotersBatch).not.toHaveBeenCalled();
  });

  it("atualiza apenas o contato existente aprovado pelo usuário", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue({ campaign, member: membership } as never);
    vi.mocked(db.listImportContacts).mockResolvedValue([{ id: 8, name: "Ana Antiga", email: "ana@example.com", phone: null, neighborhood: "Centro", contactConsent: true, doNotContact: false }]);
    vi.mocked(db.createVotersBatch).mockResolvedValue(0);
    vi.mocked(db.updateVoterFromImport).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(context());
    const result = await caller.voters.commitCsv({ campaignId: 1, csv: "nome;email;bairro;consentimento\nAna Nova;ana@example.com;Centro;Sim", approvedUpdateRows: [2], approvedCandidateRows: [] });
    expect(result.updated).toBe(1);
    expect(db.updateVoterFromImport).toHaveBeenCalledWith(8, expect.objectContaining({ name: "Ana Nova", email: "ana@example.com" }));
  });

  it("só cria possível duplicidade por nome e bairro quando ela é aprovada", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue({ campaign, member: membership } as never);
    vi.mocked(db.listImportContacts).mockResolvedValue([{ id: 15, name: "Carla", email: null, phone: null, neighborhood: "Norte", contactConsent: true, doNotContact: false }]);
    vi.mocked(db.createVotersBatch).mockResolvedValue(0);
    const caller = appRouter.createCaller(context());
    const csv = "nome;bairro;consentimento\nCarla;Norte;Sim";
    const withoutApproval = await caller.voters.commitCsv({ campaignId: 1, csv, approvedUpdateRows: [], approvedCandidateRows: [] });
    expect(withoutApproval).toMatchObject({ imported: 0, skippedCandidates: 1 });
    expect(db.createVotersBatch).toHaveBeenCalledWith([]);
    vi.mocked(db.createVotersBatch).mockResolvedValue(1);
    const withApproval = await caller.voters.commitCsv({ campaignId: 1, csv, approvedUpdateRows: [], approvedCandidateRows: [2] });
    expect(withApproval.imported).toBe(1);
    expect(db.createVotersBatch).toHaveBeenLastCalledWith([expect.objectContaining({ name: "Carla", campaignId: 1 })]);
  });

  it("não permite aplicar dados inválidos", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue({ campaign, member: membership } as never);
    const caller = appRouter.createCaller(context());
    const result = await caller.voters.previewCsv({ campaignId: 1, csv: "nome;email;consentimento\nAna;invalido;Não" });
    expect(result.errors).toHaveLength(2);
    expect(db.createVotersBatch).not.toHaveBeenCalled();
  });
});
