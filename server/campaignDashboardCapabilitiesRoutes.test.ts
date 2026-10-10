import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./campaignDb", () => ({
  listCampaignsForUser: vi.fn(),
  getOrCreateInitialOrganization: vi.fn(),
  getOrganizationMembership: vi.fn(),
  createCampaignWithOwner: vi.fn(),
  getCampaignAccess: vi.fn(),
  updateCampaignDetails: vi.fn(),
  getPublicCampaign: vi.fn(),
  getDashboardData: vi.fn(),
  getDailySummary: vi.fn(),
  getDailyCoordinationReport: vi.fn(),
}));

import * as db from "./campaignDb";
import { appRouter } from "./routers";

const campaign = {
  id: 1,
  organizationId: 3,
  ownerId: 99,
  name: "Campanha",
  candidateName: "Pessoa candidata",
  electionLabel: "Eleição",
  electionEndsAt: null,
  electionTimeZone: null,
  region: "Cidade",
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date(),
};

function access(campaignRole: "admin" | "coordinator" | "partner", memberId = 10, organizationRole: "admin" | "manager" | "operator" | "viewer" = "operator") {
  return {
    campaign,
    member: { id: memberId, campaignId: 1, userId: 99, role: campaignRole },
    organizationMember: { id: 30, organizationId: 3, userId: 99, role: organizationRole, active: true },
  } as never;
}

function membership(role: "admin" | "manager" | "operator" | "viewer") {
  return { id: 30, organizationId: 3, userId: 99, role, active: true } as never;
}

function context(): TrpcContext {
  return {
    user: { id: 99, openId: "campaign-dashboard", name: "Usuário", email: "user@example.com", loginMethod: "local", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

afterEach(() => vi.clearAllMocks());

describe("campaign and dashboard capability boundaries", () => {
  it("lista campanhas de organização somente com vínculo de leitura", async () => {
    vi.mocked(db.getOrganizationMembership).mockResolvedValue(membership("viewer"));
    vi.mocked(db.listCampaignsForUser).mockResolvedValue([campaign] as never);
    const caller = appRouter.createCaller(context());

    await expect(caller.campaign.list({ organizationId: 3 })).resolves.toHaveLength(1);
    expect(db.listCampaignsForUser).toHaveBeenCalledWith(99, 3);

    vi.mocked(db.getOrganizationMembership).mockResolvedValue(null);
    await expect(caller.campaign.list({ organizationId: 3 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("permite criar campanha para manager da organização e bloqueia operator", async () => {
    vi.mocked(db.getOrganizationMembership).mockResolvedValueOnce(membership("manager")).mockResolvedValueOnce(membership("operator"));
    vi.mocked(db.createCampaignWithOwner).mockResolvedValue(17);
    const caller = appRouter.createCaller(context());
    const input = { organizationId: 3, name: "Nova campanha", candidateName: "Pessoa candidata", electionLabel: "Eleição", region: "Cidade" };

    await expect(caller.campaign.create(input)).resolves.toEqual({ id: 17 });
    await expect(caller.campaign.create(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.createCampaignWithOwner).toHaveBeenCalledTimes(1);
  });

  it("permite detalhes para partner mas mantém edição exclusiva de admin da campanha", async () => {
    const caller = appRouter.createCaller(context());
    vi.mocked(db.getCampaignAccess).mockResolvedValueOnce(access("partner", 10, "admin"));
    await expect(caller.campaign.details({ campaignId: 1 })).resolves.toMatchObject({ campaign: { id: 1 }, member: { role: "partner" } });

    vi.mocked(db.getCampaignAccess).mockResolvedValueOnce(access("coordinator", 11, "admin"));
    await expect(caller.campaign.updateDetails({ campaignId: 1, name: "Campanha", candidateName: "Pessoa candidata", electionLabel: "Eleição", region: "Cidade", status: "active" })).rejects.toMatchObject({ code: "FORBIDDEN" });

    vi.mocked(db.getCampaignAccess).mockResolvedValueOnce(access("admin", 12, "viewer"));
    vi.mocked(db.updateCampaignDetails).mockResolvedValue(undefined);
    await expect(caller.campaign.updateDetails({ campaignId: 1, name: "Campanha atualizada", candidateName: "Pessoa candidata", electionLabel: "Eleição", region: "Cidade", status: "active" })).resolves.toEqual({ success: true });
    expect(db.updateCampaignDetails).toHaveBeenCalledWith(1, expect.objectContaining({ name: "Campanha atualizada", actorUserId: 99 }));
  });

  it("filtra dashboard de partner pelo próprio memberId e libera coordenação somente a gestores", async () => {
    const caller = appRouter.createCaller(context());
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("partner", 10, "admin"));
    vi.mocked(db.getDashboardData).mockResolvedValue({ total: 1 } as never);
    vi.mocked(db.getDailySummary).mockResolvedValue({ dueToday: [] } as never);

    await expect(caller.dashboard.summary({ campaignId: 1 })).resolves.toEqual({ total: 1 });
    await expect(caller.dashboard.dailySummary({ campaignId: 1 })).resolves.toEqual({ dueToday: [] });
    expect(db.getDashboardData).toHaveBeenCalledWith(1, 10);
    expect(db.getDailySummary).toHaveBeenCalledWith(1, 10);
    await expect(caller.dashboard.dailyCoordination({ campaignId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });

    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("coordinator", 11, "viewer"));
    vi.mocked(db.getDailyCoordinationReport).mockResolvedValue({ alerts: [] } as never);
    await expect(caller.dashboard.dailyCoordination({ campaignId: 1 })).resolves.toEqual({ alerts: [] });
  });
});
