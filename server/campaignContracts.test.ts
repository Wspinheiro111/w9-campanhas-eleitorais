import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function anonymousContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function adminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-test",
      name: "Admin Test",
      email: "admin@example.com",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("contratos protegidos dos módulos de campanha", () => {
  it("bloqueia consultas de tarefas sem sessão autenticada", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.tasks.list({ campaignId: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("bloqueia o assistente de IA sem sessão autenticada", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.ai.chat({ campaignId: 1, message: "Organize a reunião." })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejeita a criação de campanha com campos obrigatórios inválidos", async () => {
    const caller = appRouter.createCaller(adminContext());
    await expect(caller.campaign.create({ name: "", candidateName: "", electionLabel: "", region: "" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
