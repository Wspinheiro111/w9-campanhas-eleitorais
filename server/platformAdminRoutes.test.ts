import { describe, expect, it, vi, afterEach } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./campaignDb", () => ({
  listPlatformDemoRequests: vi.fn(),
  getPlatformCommandCenterOverview: vi.fn(),
  countUnviewedPlatformDemoRequests: vi.fn(),
  markPlatformDemoRequestsViewed: vi.fn(),
  updatePlatformDemoRequestStatus: vi.fn(),
  listPlatformCustomers: vi.fn(),
  createPlatformCustomer: vi.fn(),
  getPlatformCustomer: vi.fn(),
  createOrganizationInvitation: vi.fn(),
  markPlatformCustomerAccessReleased: vi.fn(),
  updatePlatformCustomerStatus: vi.fn(),
  listPlatformCustomerInteractions: vi.fn(),
  addPlatformCustomerInteraction: vi.fn(),
}));

import * as db from "./campaignDb";
import { appRouter } from "./routers";

const baseContext: Omit<TrpcContext, "user"> = {
  req: { ip: "127.0.0.1", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};

const platformAdminContext: TrpcContext = {
  ...baseContext,
  user: { id: 1, openId: "platform-admin", name: "Administração", email: "gerentewilliam.pinheiro@gmail.com", loginMethod: "password", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
};

const otherGlobalAdminContext: TrpcContext = {
  ...baseContext,
  user: { id: 3, openId: "other-platform-admin", name: "Outro Admin", email: "admin@w9.local", loginMethod: "password", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
};

const ordinaryUserContext: TrpcContext = {
  ...baseContext,
  user: { id: 2, openId: "ordinary-user", name: "Operação", email: "operacao@w9.local", loginMethod: "password", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
};

afterEach(() => vi.clearAllMocks());

describe("administração geral de compradores diretos", () => {
  it("expõe indicadores agregados apenas ao proprietário da plataforma", async () => {
    const summary = { organizations: { total: 1, active: 1, suspended: 0 }, customers: { total: 0, pending: 0, accessReleased: 0, active: 0, suspended: 0 }, users: { total: 1, firstAccessPending: 0 }, commercial: { newDemoRequests: 0, newContactRequests: 0 }, security: { mfaFactors: 1, passkeys: 0, events24h: 2, failedLogins24h: 0 }, operations: { requests24h: 4, serverErrors24h: 0, averageDurationMs: 34, interfaceErrors7d: 0, auditEvents7d: 0 } };
    vi.mocked(db.getPlatformCommandCenterOverview).mockResolvedValue(summary);
    const caller = appRouter.createCaller(platformAdminContext);
    await expect(caller.platformAdmin.overview()).resolves.toEqual(summary);
    await expect(appRouter.createCaller(ordinaryUserContext).platformAdmin.overview()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("mantém a fila de demonstrações restrita à administração da plataforma", async () => {
    vi.mocked(db.listPlatformDemoRequests).mockResolvedValue([] as never);
    const caller = appRouter.createCaller(platformAdminContext);
    await expect(caller.platformAdmin.demoRequests.list()).resolves.toEqual([]);
    expect(db.listPlatformDemoRequests).toHaveBeenCalledOnce();
    const ordinaryCaller = appRouter.createCaller(ordinaryUserContext);
    await expect(ordinaryCaller.platformAdmin.demoRequests.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("informa e permite confirmar a visualização de novos pedidos", async () => {
    vi.mocked(db.countUnviewedPlatformDemoRequests).mockResolvedValue(2);
    vi.mocked(db.markPlatformDemoRequestsViewed).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(platformAdminContext);
    await expect(caller.platformAdmin.demoRequests.unseenCount()).resolves.toBe(2);
    await expect(caller.platformAdmin.demoRequests.markViewed()).resolves.toEqual({ updated: true });
    expect(db.markPlatformDemoRequestsViewed).toHaveBeenCalledOnce();
  });

  it("impede usuários comuns de consultar compradores", async () => {
    const caller = appRouter.createCaller(ordinaryUserContext);
    await expect(caller.platformAdmin.customers.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("impede qualquer outro administrador global de acessar o portal exclusivo", async () => {
    const caller = appRouter.createCaller(otherGlobalAdminContext);
    await expect(caller.platformAdmin.customers.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("cadastra usuário master com senha provisória normalizando o telefone", async () => {
    vi.mocked(db.createPlatformCustomer).mockResolvedValue({ customerId: 7, organizationId: 22 });
    const caller = appRouter.createCaller(platformAdminContext);
    await expect(caller.platformAdmin.customers.create({ organizationName: "Comitê Direto", fiscalId: "529.982.247-25", contactName: "Pessoa Compradora", contactPhone: "(51) 99999-8888", contactEmail: "master@example.com", temporaryPassword: "SenhaTemp#2026" })).resolves.toEqual({ customerId: 7, organizationId: 22 });
    expect(db.createPlatformCustomer).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: 1, contactPhone: "51999998888", fiscalId: "52998224725", contactEmail: "master@example.com", temporaryPassword: "SenhaTemp#2026" }));
  });

  it("libera acesso por convite seguro somente para um comprador cadastrado", async () => {
    vi.mocked(db.getPlatformCustomer).mockResolvedValue({ customer: { id: 7, contactPhone: "51999998888" }, organization: { id: 22 } } as never);
    vi.mocked(db.createOrganizationInvitation).mockResolvedValue(91);
    vi.mocked(db.markPlatformCustomerAccessReleased).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(platformAdminContext);
    const result = await caller.platformAdmin.customers.releaseAccess({ customerId: 7, origin: "https://w9.example" });
    expect(result.phone).toBe("51999998888");
    expect(result.invitationUrl).toMatch(/^https:\/\/w9\.example\/onboarding\?invite=[a-f0-9]{64}$/);
    expect(db.createOrganizationInvitation).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 22, phone: "51999998888", invitedById: 1, role: "admin" }));
    expect(db.markPlatformCustomerAccessReleased).toHaveBeenCalledWith({ customerId: 7, invitationId: 91, actorUserId: 1 });
  });

  it("suspende e reativa o acesso somente pela administração geral", async () => {
    vi.mocked(db.updatePlatformCustomerStatus).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(platformAdminContext);
    await expect(caller.platformAdmin.customers.setStatus({ customerId: 7, status: "suspended" })).resolves.toEqual({ updated: true });
    expect(db.updatePlatformCustomerStatus).toHaveBeenCalledWith({ customerId: 7, status: "suspended", actorUserId: 1 });
    const ordinaryCaller = appRouter.createCaller(ordinaryUserContext);
    await expect(ordinaryCaller.platformAdmin.customers.setStatus({ customerId: 7, status: "active" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("registra e consulta interações comerciais pelo cliente selecionado", async () => {
    vi.mocked(db.addPlatformCustomerInteraction).mockResolvedValue(12);
    vi.mocked(db.listPlatformCustomerInteractions).mockResolvedValue([] as never);
    const caller = appRouter.createCaller(platformAdminContext);
    await expect(caller.platformAdmin.customers.addInteraction({ customerId: 7, kind: "whatsapp", description: "Retorno comercial solicitado para a próxima semana." })).resolves.toEqual({ interactionId: 12 });
    expect(db.addPlatformCustomerInteraction).toHaveBeenCalledWith(expect.objectContaining({ customerId: 7, kind: "whatsapp", actorUserId: 1 }));
    await expect(caller.platformAdmin.customers.history({ customerId: 7 })).resolves.toEqual([]);
  });
});
