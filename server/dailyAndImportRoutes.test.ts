import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./campaignDb", () => ({
  getCampaignAccess: vi.fn(),
  getDailySummary: vi.fn(),
  createVotersBatch: vi.fn(),
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

  it("importa somente CSV válido e consentido", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue({ campaign, member: membership } as never);
    vi.mocked(db.createVotersBatch).mockResolvedValue(1);
    const caller = appRouter.createCaller(context());
    const result = await caller.voters.importCsv({ campaignId: 1, csv: "nome;telefone;consentimento\nAna Silva;51999990000;Sim" });
    expect(result).toEqual({ imported: 1, errors: [] });
    expect(db.createVotersBatch).toHaveBeenCalledWith([expect.objectContaining({ campaignId: 1, name: "Ana Silva", contactConsent: true })]);
  });

  it("não persiste contatos quando o CSV contém dados inválidos", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue({ campaign, member: membership } as never);
    const caller = appRouter.createCaller(context());
    const result = await caller.voters.importCsv({ campaignId: 1, csv: "nome;email;consentimento\nAna;invalido;Não" });
    expect(result.imported).toBe(0);
    expect(result.errors).toHaveLength(2);
    expect(db.createVotersBatch).not.toHaveBeenCalled();
  });
});
