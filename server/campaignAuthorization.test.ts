import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { TrpcContext } from "./_core/context";

vi.mock("./campaignDb", () => ({
  getCampaignAccess: vi.fn(),
  getOrganizationMembership: vi.fn(),
}));

import * as db from "./campaignDb";
import { router } from "./_core/trpc";
import {
  assertOwnedCampaignRecord,
  buildCampaignAuthorization,
  campaignCapabilityProcedure,
  hasCampaignCapability,
  hasOrganizationCapability,
  requireCampaignAuthorization,
} from "./campaignAuthorization";

function access(campaignRole: "admin" | "coordinator" | "partner" | null, organizationRole: "admin" | "manager" | "operator" | "viewer" = "operator", ownerId = 999) {
  return {
    campaign: { id: 7, organizationId: 3, ownerId, name: "Campanha" },
    member: campaignRole ? { id: campaignRole === "partner" ? 42 : 41, campaignId: 7, userId: 99, role: campaignRole } : null,
    organizationMember: { id: 5, organizationId: 3, userId: 99, role: organizationRole, active: true },
  } as never;
}

function context(userId = 99): TrpcContext {
  return {
    user: { id: userId, openId: `auth-${userId}`, name: "Usuário", email: "user@example.com", loginMethod: "local", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

afterEach(() => vi.clearAllMocks());

describe("campaign capability authorization", () => {
  it("mantém papéis de organização e campanha independentes", () => {
    const authorization = buildCampaignAuthorization(access("partner", "admin"), 99);
    expect(authorization.organizationRole).toBe("admin");
    expect(authorization.campaignRole).toBe("partner");
    expect(hasOrganizationCapability(authorization, "organization.manage")).toBe(true);
    expect(hasCampaignCapability(authorization, "campaign.read")).toBe(true);
    expect(hasCampaignCapability(authorization, "campaign.manage")).toBe(false);
    expect(hasCampaignCapability(authorization, "team.manage")).toBe(false);
  });

  it("preserva admin, coordinator e partner sem ampliar team.manage", () => {
    const admin = buildCampaignAuthorization(access("admin"), 99);
    const coordinator = buildCampaignAuthorization(access("coordinator"), 99);
    const partner = buildCampaignAuthorization(access("partner"), 99);

    expect(hasCampaignCapability(admin, "team.manage")).toBe(true);
    expect(hasCampaignCapability(admin, "finance.manage")).toBe(true);
    expect(hasCampaignCapability(coordinator, "campaign.manage")).toBe(true);
    expect(hasCampaignCapability(coordinator, "finance.manage")).toBe(true);
    expect(hasCampaignCapability(coordinator, "team.manage")).toBe(false);
    expect(hasCampaignCapability(partner, "records.read_own")).toBe(true);
    expect(hasCampaignCapability(partner, "records.read_all")).toBe(false);
  });

  it("trata o owner sem member explícito como admin da campanha sem confundir o papel organizacional", () => {
    const authorization = buildCampaignAuthorization(access(null, "viewer", 99), 99);
    expect(authorization.campaignRole).toBe("admin");
    expect(authorization.organizationRole).toBe("viewer");
    expect(hasCampaignCapability(authorization, "team.manage")).toBe(true);
    expect(hasOrganizationCapability(authorization, "organization.manage")).toBe(false);
  });

  it("restringe partner aos próprios registros", () => {
    const partner = buildCampaignAuthorization(access("partner"), 99);
    expect(() => assertOwnedCampaignRecord(partner, 42)).not.toThrow();
    expect(() => assertOwnedCampaignRecord(partner, 77)).toThrowError(expect.objectContaining({ code: "FORBIDDEN" }));

    const coordinator = buildCampaignAuthorization(access("coordinator"), 99);
    expect(() => assertOwnedCampaignRecord(coordinator, 77)).not.toThrow();
  });

  it("nega usuário sem vínculo server-side", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(null);
    await expect(requireCampaignAuthorization(99, 7)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("procedure builder exige capability a partir do campaignId recebido, sem confiar em papel do cliente", async () => {
    const testRouter = router({
      manage: campaignCapabilityProcedure("campaign.manage")
        .input(z.object({ campaignId: z.number().int().positive() }))
        .query(({ ctx }) => ({ role: ctx.campaignAuthorization.campaignRole })),
    });

    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("partner", "admin") as never);
    await expect(testRouter.createCaller(context()).manage({ campaignId: 7 })).rejects.toMatchObject({ code: "FORBIDDEN" });

    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("coordinator", "viewer") as never);
    await expect(testRouter.createCaller(context()).manage({ campaignId: 7 })).resolves.toEqual({ role: "coordinator" });
  });
});
