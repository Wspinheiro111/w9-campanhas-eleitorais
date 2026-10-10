import { describe, expect, it } from "vitest";
import { buildCampaignAuthorization, hasCampaignCapability, hasOrganizationCapability } from "./campaignAuthorization";

describe("campaign authorization with partial test access", () => {
  it("preserva capability da campanha mas não concede nenhuma capability organizacional", () => {
    const authorization = buildCampaignAuthorization({
      campaign: { id: 1, organizationId: 3, ownerId: 99 },
      member: { id: 10, campaignId: 1, userId: 99, role: "admin" },
    } as never, 99);

    expect(hasCampaignCapability(authorization, "team.manage")).toBe(true);
    expect(authorization.organizationRole).toBeNull();
    expect(hasOrganizationCapability(authorization, "organization.read")).toBe(false);
    expect(hasOrganizationCapability(authorization, "organization.manage")).toBe(false);
  });
});
