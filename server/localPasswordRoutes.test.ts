import { describe, expect, it, vi, afterEach } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, setLocalPassword: vi.fn(), hasLocalPassword: vi.fn(), getMfaFactor: vi.fn(), listPasskeys: vi.fn(), recordLoginAudit: vi.fn() };
});

import * as db from "./db";
import { appRouter } from "./routers";

const context: TrpcContext = { req: { ip: "127.0.0.1", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"], user: { id: 1, openId: "owner", name: "William", email: "gerentewilliam.pinheiro@gmail.com", loginMethod: "google", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } };

afterEach(() => vi.clearAllMocks());

describe("configuração de senha local", () => {
  it("permite à sessão autenticada configurar uma senha sem criar outra conta", async () => {
    vi.mocked(db.setLocalPassword).mockResolvedValue(undefined);
    vi.mocked(db.recordLoginAudit).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(context);
    await expect(caller.auth.setLocalPassword({ password: "SenhaLocal#2026" })).resolves.toEqual({ success: true });
    expect(db.setLocalPassword).toHaveBeenCalledWith({ userId: 1, password: "SenhaLocal#2026", currentPassword: undefined });
    expect(db.recordLoginAudit).toHaveBeenCalledWith(expect.objectContaining({ userId: 1, action: "local_password_configured", success: true }));
  });
});
