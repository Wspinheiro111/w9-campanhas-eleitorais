import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./campaignDb", () => ({
  getCampaignAccess: vi.fn(),
  createStreetAction: vi.fn(),
  saveStreetActionCheckin: vi.fn(),
  listStreetActions: vi.fn(),
  listStreetActionCheckins: vi.fn(),
  createCommunityDemand: vi.fn(),
  updateCommunityDemand: vi.fn(),
  listCommunityDemands: vi.fn(),
  listCommunityDemandUpdates: vi.fn(),
  createCampaignMaterial: vi.fn(),
  recordCampaignMaterialMovement: vi.fn(),
  listCampaignMaterials: vi.fn(),
  listCampaignMaterialMovements: vi.fn(),
}));

import * as db from "./campaignDb";
import { appRouter } from "./routers";

const campaign = { id: 1, ownerId: 99, organizationId: 5, name: "Campanha", candidateName: "Candidata", electionLabel: "Vereança", region: "Cidade", status: "active", createdAt: new Date(), updatedAt: new Date() };
const context = (): TrpcContext => ({ user: { id: 99, openId: "operations-test", name: "Usuário", email: "user@example.com", loginMethod: "local", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {}, get: () => "example.test" } as TrpcContext["req"], res: {} as TrpcContext["res"] });
const access = (role: "admin" | "coordinator" | "partner", memberId = 10) => ({ campaign, member: { id: memberId, campaignId: 1, organizationId: 5, userId: 99, role }, organizationMember: { id: 1, organizationId: 5, userId: 99, role: "admin", active: true } });

afterEach(() => vi.clearAllMocks());

describe("módulos de rua, demandas e materiais", () => {
  it("permite que a coordenação crie uma ação de rua em sua própria campanha", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("admin") as never);
    vi.mocked(db.createStreetAction).mockResolvedValue(71);
    const caller = appRouter.createCaller(context());
    await expect(caller.operations.street.create({ campaignId: 1, title: "Escuta territorial", startsAt: new Date(), territory: "Norte" })).resolves.toEqual({ id: 71 });
    expect(db.createStreetAction).toHaveBeenCalledWith(expect.objectContaining({ campaignId: 1, title: "Escuta territorial", createdByUserId: 99 }));
  });

  it("impede que parceiro faça check-in por outro integrante", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("partner", 10) as never);
    const caller = appRouter.createCaller(context());
    await expect(caller.operations.street.checkIn({ campaignId: 1, streetActionId: 22, memberId: 11, attendanceStatus: "present" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.saveStreetActionCheckin).not.toHaveBeenCalled();
  });

  it("permite protocolar demanda com histórico de autoria", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("coordinator", 10) as never);
    vi.mocked(db.createCommunityDemand).mockResolvedValue({ id: 32, protocol: "W9-1-ABCDE12345" });
    const caller = appRouter.createCaller(context());
    await expect(caller.operations.demands.create({ campaignId: 1, title: "Mobilidade", description: "Solicitação de melhoria da mobilidade local.", category: "Infraestrutura" })).resolves.toEqual({ id: 32, protocol: "W9-1-ABCDE12345" });
    expect(db.createCommunityDemand).toHaveBeenCalledWith(expect.objectContaining({ campaignId: 1, authorMemberId: 10, createdByUserId: 99 }));
  });

  it("reserva a movimentação de estoque à coordenação", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("partner", 10) as never);
    const caller = appRouter.createCaller(context());
    await expect(caller.operations.materials.move({ campaignId: 1, materialId: 8, movementType: "distribution", quantity: 10 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.recordCampaignMaterialMovement).not.toHaveBeenCalled();
  });

  it("encaminha distribuição de material ao repositório com escopo da campanha", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("admin") as never);
    vi.mocked(db.recordCampaignMaterialMovement).mockResolvedValue(88);
    const caller = appRouter.createCaller(context());
    await expect(caller.operations.materials.move({ campaignId: 1, materialId: 8, movementType: "distribution", quantity: 10, territory: "Centro" })).resolves.toEqual({ id: 88 });
    expect(db.recordCampaignMaterialMovement).toHaveBeenCalledWith(expect.objectContaining({ campaignId: 1, materialId: 8, territory: "Centro", createdByUserId: 99 }));
  });
});
