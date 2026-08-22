import { describe, expect, it, vi, afterEach } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./campaignDb", () => ({
  listPlatformCustomers: vi.fn(),
  createPlatformCustomer: vi.fn(),
  getPlatformCustomer: vi.fn(),
  createOrganizationInvitation: vi.fn(),
  markPlatformCustomerAccessReleased: vi.fn(),
}));

import * as db from "./campaignDb";
import { appRouter } from "./routers";

const baseContext: Omit<TrpcContext, "user"> = {
  req: { ip: "127.0.0.1", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};

const platformAdminContext: TrpcContext = {
  ...baseContext,
  user: { id: 1, openId: "platform-admin", name: "Administração", email: "admin@w9.local", loginMethod: "password", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
};

const ordinaryUserContext: TrpcContext = {
  ...baseContext,
  user: { id: 2, openId: "ordinary-user", name: "Operação", email: "operacao@w9.local", loginMethod: "password", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
};

afterEach(() => vi.clearAllMocks());

describe("administração geral de compradores diretos", () => {
  it("impede usuários comuns de consultar compradores", async () => {
    const caller = appRouter.createCaller(ordinaryUserContext);
    await expect(caller.platformAdmin.customers.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("cadastra comprador direto normalizando o telefone", async () => {
    vi.mocked(db.createPlatformCustomer).mockResolvedValue({ customerId: 7, organizationId: 22 });
    const caller = appRouter.createCaller(platformAdminContext);
    await expect(caller.platformAdmin.customers.create({ organizationName: "Comitê Direto", contactName: "Pessoa Compradora", contactPhone: "(51) 99999-8888" })).resolves.toEqual({ customerId: 7, organizationId: 22 });
    expect(db.createPlatformCustomer).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: 1, contactPhone: "51999998888" }));
  });

  it("libera acesso por convite seguro somente para um comprador cadastrado", async () => {
    vi.mocked(db.getPlatformCustomer).mockResolvedValue({ customer: { id: 7, contactPhone: "51999998888" }, organization: { id: 22 } } as never);
    vi.mocked(db.createOrganizationInvitation).mockResolvedValue(91);
    vi.mocked(db.markPlatformCustomerAccessReleased).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(platformAdminContext);
    const result = await caller.platformAdmin.customers.releaseAccess({ customerId: 7, role: "admin", origin: "https://w9.example" });
    expect(result.phone).toBe("51999998888");
    expect(result.invitationUrl).toMatch(/^https:\/\/w9\.example\/onboarding\?invite=[a-f0-9]{64}$/);
    expect(db.createOrganizationInvitation).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 22, phone: "51999998888", invitedById: 1, role: "admin" }));
    expect(db.markPlatformCustomerAccessReleased).toHaveBeenCalledWith({ customerId: 7, invitationId: 91, actorUserId: 1 });
  });
});
