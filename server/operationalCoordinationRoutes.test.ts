import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./campaignDb", () => ({
  getCampaignAccess: vi.fn(),
  listGoals: vi.fn(),
  createGoal: vi.fn(),
  updateGoalProgress: vi.fn(),
  getDailyCoordinationReport: vi.fn(),
}));

import * as db from "./campaignDb";
import { appRouter } from "./routers";

const campaign = { id: 1, ownerId: 99, organizationId: 5, name: "Campanha", candidateName: "Candidata", electionLabel: "Vereança", region: "Cidade", status: "active", createdAt: new Date(), updatedAt: new Date() };
const context = (): TrpcContext => ({ user: { id: 99, openId: "goals-test", name: "Usuário", email: "user@example.com", loginMethod: "local", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {}, get: () => "example.test" } as TrpcContext["req"], res: {} as TrpcContext["res"] });
const access = (role: "admin" | "coordinator" | "partner") => ({ campaign, member: { id: 10, campaignId: 1, organizationId: 5, userId: 99, role }, organizationMember: { id: 1, organizationId: 5, userId: 99, role: "admin", active: true } });

afterEach(() => vi.clearAllMocks());

describe("monitor de metas e relatório diário", () => {
  it("atualiza o progresso de uma meta somente para coordenação da campanha", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("coordinator") as never);
    vi.mocked(db.updateGoalProgress).mockResolvedValue({ status: "completed", targetValue: 20 });
    const caller = appRouter.createCaller(context());
    await expect(caller.goals.updateProgress({ campaignId: 1, goalId: 17, currentValue: 20 })).resolves.toEqual({ status: "completed", targetValue: 20 });
    expect(db.updateGoalProgress).toHaveBeenCalledWith({ campaignId: 1, goalId: 17, currentValue: 20, actorUserId: 99 });
  });

  it("impede que parceiro altere o progresso de uma meta", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("partner") as never);
    const caller = appRouter.createCaller(context());
    await expect(caller.goals.updateProgress({ campaignId: 1, goalId: 17, currentValue: 20 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.updateGoalProgress).not.toHaveBeenCalled();
  });

  it("entrega o relatório diário consolidado à coordenação", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("admin") as never);
    vi.mocked(db.getDailyCoordinationReport).mockResolvedValue({ generatedAt: new Date(), daily: { overdue: [], dueToday: [], upcoming: [], todayEvents: [] }, metrics: { activeVolunteers: 1, trainingCompleted: 1, availabilityWindows: 1, openAssignments: 0, attentionGoals: 0, openDemands: 0, overdueDemands: 0, todayStreetActions: 0 }, goals: [], attentionGoals: [], openAssignments: [], openDemands: [], overdueDemands: [], todayStreetActions: [], territoryCoverage: [] } as never);
    const caller = appRouter.createCaller(context());
    await expect(caller.dashboard.dailyCoordination({ campaignId: 1 })).resolves.toMatchObject({ metrics: { activeVolunteers: 1 } });
    expect(db.getDailyCoordinationReport).toHaveBeenCalledWith(1);
  });

  it("não expõe o relatório diário integral a parceiro", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("partner") as never);
    const caller = appRouter.createCaller(context());
    await expect(caller.dashboard.dailyCoordination({ campaignId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.getDailyCoordinationReport).not.toHaveBeenCalled();
  });
});
