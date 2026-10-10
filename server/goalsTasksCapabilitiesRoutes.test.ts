import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./campaignDb", () => ({
  getCampaignAccess: vi.fn(),
  listGoals: vi.fn(),
  createGoal: vi.fn(),
  updateGoalProgress: vi.fn(),
  listTasks: vi.fn(),
  createTask: vi.fn(),
  getTask: vi.fn(),
  updateTaskStatus: vi.fn(),
}));

import * as db from "./campaignDb";
import { appRouter } from "./routers";

const campaign = { id: 1, organizationId: 3, ownerId: 99, name: "Campanha" };
const organizationMember = { id: 30, organizationId: 3, userId: 99, role: "admin" as const, active: true };

function access(role: "admin" | "coordinator" | "partner", memberId = 10) {
  return {
    campaign,
    member: { id: memberId, campaignId: 1, userId: 99, role },
    organizationMember,
  } as never;
}

function context(): TrpcContext {
  return {
    user: { id: 99, openId: "goals-tasks", name: "Usuário", email: "user@example.com", loginMethod: "local", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

afterEach(() => vi.clearAllMocks());

describe("goals and tasks capability boundaries", () => {
  it("partner pode ler metas mas não criar ou alterar progresso", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("partner", 10));
    vi.mocked(db.listGoals).mockResolvedValue([{ id: 1, campaignId: 1, title: "Meta" }] as never);
    const caller = appRouter.createCaller(context());

    await expect(caller.goals.list({ campaignId: 1 })).resolves.toHaveLength(1);
    await expect(caller.goals.create({ campaignId: 1, title: "Nova meta", targetValue: 10, unit: "ações" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.goals.updateProgress({ campaignId: 1, goalId: 1, currentValue: 2 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.createGoal).not.toHaveBeenCalled();
    expect(db.updateGoalProgress).not.toHaveBeenCalled();
  });

  it("coordinator mantém gestão de metas e criação de tarefas", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("coordinator", 11));
    vi.mocked(db.createGoal).mockResolvedValue(31);
    vi.mocked(db.updateGoalProgress).mockResolvedValue({ status: "active", targetValue: 10 } as never);
    vi.mocked(db.createTask).mockResolvedValue(41);
    const caller = appRouter.createCaller(context());

    await expect(caller.goals.create({ campaignId: 1, title: "Nova meta", targetValue: 10, unit: "ações" })).resolves.toEqual({ id: 31 });
    await expect(caller.goals.updateProgress({ campaignId: 1, goalId: 31, currentValue: 4 })).resolves.toEqual({ status: "active", targetValue: 10 });
    await expect(caller.tasks.create({ campaignId: 1, title: "Tarefa", priority: "high", assignedToId: 11 })).resolves.toEqual({ id: 41 });
  });

  it("partner lista somente tarefas próprias", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("partner", 10));
    vi.mocked(db.listTasks).mockResolvedValue([{ id: 5, campaignId: 1, assignedToId: 10 }] as never);
    const caller = appRouter.createCaller(context());

    await expect(caller.tasks.list({ campaignId: 1 })).resolves.toHaveLength(1);
    expect(db.listTasks).toHaveBeenCalledWith(1, 10);
    await expect(caller.tasks.create({ campaignId: 1, title: "Tarefa", priority: "medium", assignedToId: 10 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("partner atualiza somente tarefa atribuída ao próprio memberId", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("partner", 10));
    vi.mocked(db.getTask).mockResolvedValueOnce({ id: 5, campaignId: 1, assignedToId: 10 } as never).mockResolvedValueOnce({ id: 6, campaignId: 1, assignedToId: 77 } as never);
    vi.mocked(db.updateTaskStatus).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(context());

    await expect(caller.tasks.updateStatus({ taskId: 5, status: "done" })).resolves.toEqual({ success: true });
    await expect(caller.tasks.updateStatus({ taskId: 6, status: "done" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.updateTaskStatus).toHaveBeenCalledTimes(1);
  });

  it("nega leitura quando não há vínculo server-side", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(null);
    const caller = appRouter.createCaller(context());

    await expect(caller.goals.list({ campaignId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.tasks.list({ campaignId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
