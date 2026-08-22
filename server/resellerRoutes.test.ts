import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./campaignDb", () => ({
  listResellerClients: vi.fn(),
  listResellerProposals: vi.fn(),
  createResellerClient: vi.fn(),
  linkResellerClient: vi.fn(),
  updateResellerClient: vi.fn(),
  openResellerSupportAccess: vi.fn(),
  createResellerProposal: vi.fn(),
  updateResellerProposalStatus: vi.fn(),
}));

import * as db from "./campaignDb";
import { appRouter } from "./routers";

const adminContext: TrpcContext = { user: { id: 1, openId: "platform-admin", name: "Administração", email: "admin@w9.local", loginMethod: "google", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
const userContext: TrpcContext = { ...adminContext, user: { ...adminContext.user!, id: 2, role: "user" } };

afterEach(() => vi.clearAllMocks());

describe("painel de revendedor", () => {
  it("resume clientes e propostas somente para administrador da plataforma", async () => {
    vi.mocked(db.listResellerClients).mockResolvedValue([{ client: { id: 8, active: true }, organization: { id: 3, status: "active" } }] as never);
    vi.mocked(db.listResellerProposals).mockResolvedValue([{ id: 9, status: "negotiation" }] as never);
    const caller = appRouter.createCaller(adminContext);
    await expect(caller.reseller.overview()).resolves.toMatchObject({ summary: { totalClients: 1, activeClients: 1, openProposals: 1 } });
    expect(db.listResellerClients).toHaveBeenCalledWith(1);
  });

  it("bloqueia usuários comuns no painel de revendedor", async () => {
    const caller = appRouter.createCaller(userContext);
    await expect(caller.reseller.overview()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("cria cliente no escopo do revendedor autenticado", async () => {
    vi.mocked(db.createResellerClient).mockResolvedValue(12);
    const caller = appRouter.createCaller(adminContext);
    await expect(caller.reseller.clients.create({ name: "Cliente de teste", legalName: "Cliente de teste LTDA" })).resolves.toEqual({ organizationId: 12 });
    expect(db.createResellerClient).toHaveBeenCalledWith(expect.objectContaining({ resellerUserId: 1, name: "Cliente de teste" }));
  });
});
