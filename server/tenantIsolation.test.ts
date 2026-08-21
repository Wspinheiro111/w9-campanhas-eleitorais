import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./campaignDb", () => ({
  getCampaignAccess: vi.fn(),
  listCampaignsForUser: vi.fn(),
  listOrganizationsForUser: vi.fn(),
  getOrganizationMembership: vi.fn(),
  createOrganizationForUser: vi.fn(),
  createOrganizationInvitation: vi.fn(),
  listOrganizationInvitations: vi.fn(),
  listOrganizationAuditLogs: vi.fn(),
  getRoutePerformanceMetrics: vi.fn(),
  recordClientInterfaceError: vi.fn(),
  acceptOrganizationInvitation: vi.fn(),
}));

import * as db from "./campaignDb";
import { appRouter } from "./routers";

const ctx: TrpcContext = {
  user: { id: 20, openId: "tenant-test", name: "Pessoa Teste", email: "tenant@example.com", loginMethod: "password", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};

afterEach(() => vi.clearAllMocks());

describe("isolamento multi-tenant", () => {
  it("bloqueia acesso a uma campanha sem vínculo ativo com a organização", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.campaign.details({ campaignId: 91 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("bloqueia a seleção de uma organização que não pertence ao usuário", async () => {
    vi.mocked(db.getOrganizationMembership).mockResolvedValue(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.organization.select({ organizationId: 9 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("bloqueia a listagem de campanhas de uma organização sem vínculo", async () => {
    vi.mocked(db.getOrganizationMembership).mockResolvedValue(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.campaign.list({ organizationId: 9 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("lista campanhas somente dentro da organização ativa informada", async () => {
    vi.mocked(db.getOrganizationMembership).mockResolvedValue({ id: 4, organizationId: 2, userId: 20, role: "operator", active: true } as never);
    vi.mocked(db.listCampaignsForUser).mockResolvedValue([] as never);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.campaign.list({ organizationId: 2 })).resolves.toEqual([]);
    expect(db.listCampaignsForUser).toHaveBeenCalledWith(20, 2);
  });

  it("permite que gerente crie convite por telefone apenas na própria organização", async () => {
    vi.mocked(db.getOrganizationMembership).mockResolvedValue({ id: 4, organizationId: 2, userId: 20, role: "manager", active: true } as never);
    vi.mocked(db.createOrganizationInvitation).mockResolvedValue(31);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.organization.invitations.create({ organizationId: 2, phone: "(51) 99999-8888", role: "operator" });
    expect(result.invitationId).toBe(31);
    expect(result.token).toHaveLength(43);
    expect(db.createOrganizationInvitation).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 2, phone: "(51) 99999-8888", invitedById: 20, role: "operator" }));
  });

  it("impede operador de emitir convites", async () => {
    vi.mocked(db.getOrganizationMembership).mockResolvedValue({ id: 4, organizationId: 2, userId: 20, role: "operator", active: true } as never);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.organization.invitations.create({ organizationId: 2, phone: "(51) 99999-8888", role: "viewer" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("impede gerente de alterar papéis organizacionais", async () => {
    vi.mocked(db.getOrganizationMembership).mockResolvedValue({ id: 4, organizationId: 2, userId: 20, role: "manager", active: true } as never);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.organization.members.updateRole({ organizationId: 2, memberId: 8, role: "admin" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("permite que um gestor consulte a auditoria apenas da própria organização", async () => {
    vi.mocked(db.getOrganizationMembership).mockResolvedValue({ id: 4, organizationId: 2, userId: 20, role: "manager", active: true } as never);
    vi.mocked(db.listOrganizationAuditLogs).mockResolvedValue([] as never);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.organization.audit.list({ organizationId: 2 })).resolves.toEqual([]);
    expect(db.listOrganizationAuditLogs).toHaveBeenCalledWith(2, 100);
  });

  it("impede operador de consultar a auditoria administrativa", async () => {
    vi.mocked(db.getOrganizationMembership).mockResolvedValue({ id: 4, organizationId: 2, userId: 20, role: "operator", active: true } as never);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.organization.audit.list({ organizationId: 2 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("permite que gestor consulte métricas técnicas apenas da própria organização", async () => {
    vi.mocked(db.getOrganizationMembership).mockResolvedValue({ id: 4, organizationId: 2, userId: 20, role: "manager", active: true } as never);
    vi.mocked(db.getRoutePerformanceMetrics).mockResolvedValue({ periodDays: 7, since: new Date(), summary: {}, routes: [] } as never);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.organization.performance.byRoute({ organizationId: 2, days: 7 })).resolves.toMatchObject({ periodDays: 7 });
    expect(db.getRoutePerformanceMetrics).toHaveBeenCalledWith({ organizationId: 2, days: 7 });
  });

  it("impede operador de consultar métricas técnicas", async () => {
    vi.mocked(db.getOrganizationMembership).mockResolvedValue({ id: 4, organizationId: 2, userId: 20, role: "operator", active: true } as never);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.organization.performance.byRoute({ organizationId: 2, days: 7 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("permite que integrante registre erro de interface somente no escopo da própria organização", async () => {
    vi.mocked(db.getOrganizationMembership).mockResolvedValue({ id: 4, organizationId: 2, userId: 20, role: "operator", active: true } as never);
    vi.mocked(db.recordClientInterfaceError).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.organization.performance.reportClientError({ organizationId: 2, route: "/equipe", source: "error_boundary", fingerprint: "a".repeat(64), message: "Falha de interface sanitizada" })).resolves.toEqual({ recorded: true });
    expect(db.recordClientInterfaceError).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 2, userId: 20, route: "/equipe" }));
  });

  it("impede registrar erro de interface fora da organização do integrante", async () => {
    vi.mocked(db.getOrganizationMembership).mockResolvedValue(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.organization.performance.reportClientError({ organizationId: 3, route: "/equipe", source: "window_error", fingerprint: "a".repeat(64), message: "Falha de interface sanitizada" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("encaminha o aceite de convite ao vínculo do usuário autenticado", async () => {
    vi.mocked(db.acceptOrganizationInvitation).mockResolvedValue(2);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.organization.invitations.accept({ token: "a".repeat(43) })).resolves.toEqual({ organizationId: 2 });
    expect(db.acceptOrganizationInvitation).toHaveBeenCalledWith({ userId: 20, tokenHash: expect.any(String) });
  });
});
