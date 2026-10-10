import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./campaignDb", () => ({
  getCampaignAccess: vi.fn(),
  listMembers: vi.fn(),
  createMember: vi.fn(),
  getCampaignMember: vi.fn(),
  updateMemberPhone: vi.fn(),
  getTeamPerformance: vi.fn(),
  getTeamBenchmark: vi.fn(),
}));

import * as db from "./campaignDb";
import { appRouter } from "./routers";

const campaign = {
  id: 1,
  organizationId: 3,
  ownerId: 99,
  name: "Campanha",
  candidateName: "Candidata",
  electionLabel: "Eleição",
  region: "Cidade",
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const organizationMember = {
  id: 30,
  organizationId: 3,
  userId: 99,
  role: "admin" as const,
  active: true,
};

function access(role: "admin" | "coordinator" | "partner", memberId = 10) {
  return {
    campaign,
    member: { id: memberId, campaignId: 1, userId: 99, role },
    organizationMember,
  } as never;
}

function context(): TrpcContext {
  return {
    user: { id: 99, openId: "team-capabilities", name: "Usuário", email: "user@example.com", loginMethod: "local", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

afterEach(() => vi.clearAllMocks());

describe("team capability boundaries", () => {
  it("permite leitura da equipe para partner sem elevar por ser admin da organização", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("partner"));
    vi.mocked(db.listMembers).mockResolvedValue([{ id: 10, campaignId: 1, role: "partner" }] as never);
    const caller = appRouter.createCaller(context());

    await expect(caller.team.list({ campaignId: 1 })).resolves.toHaveLength(1);
    await expect(caller.team.create({ campaignId: 1, name: "Novo membro", phone: "(51) 99999-9999", role: "partner" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.createMember).not.toHaveBeenCalled();
  });

  it("permite desempenho para coordinator mas mantém inclusão de equipe exclusiva do admin", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("coordinator"));
    vi.mocked(db.getTeamPerformance).mockResolvedValue({ total: 4 } as never);
    vi.mocked(db.getTeamBenchmark).mockResolvedValue({ average: 2 } as never);
    const caller = appRouter.createCaller(context());

    await expect(caller.team.performance({ campaignId: 1 })).resolves.toEqual({ total: 4 });
    await expect(caller.team.benchmark({ campaignId: 1 })).resolves.toEqual({ average: 2 });
    await expect(caller.team.create({ campaignId: 1, name: "Novo membro", phone: "(51) 99999-9999", role: "partner" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("permite admin criar e atualizar telefone somente de membro da própria campanha", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("admin"));
    vi.mocked(db.createMember).mockResolvedValue(41);
    vi.mocked(db.getCampaignMember).mockResolvedValueOnce({ id: 41, campaignId: 1 } as never).mockResolvedValueOnce(null);
    vi.mocked(db.updateMemberPhone).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(context());

    await expect(caller.team.create({ campaignId: 1, name: "Novo membro", phone: "(51) 99999-9999", role: "partner" })).resolves.toEqual({ id: 41 });
    await expect(caller.team.updatePhone({ campaignId: 1, memberId: 41, phone: "(51) 98888-7777" })).resolves.toEqual({ success: true });
    await expect(caller.team.updatePhone({ campaignId: 1, memberId: 99, phone: "(51) 97777-6666" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.updateMemberPhone).toHaveBeenCalledTimes(1);
  });

  it("nega qualquer ação quando não existe vínculo server-side com a campanha", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(null);
    const caller = appRouter.createCaller(context());

    await expect(caller.team.list({ campaignId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.listMembers).not.toHaveBeenCalled();
  });
});
