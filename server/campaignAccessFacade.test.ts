import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./campaignDbCore", () => ({
  getCampaignAccess: vi.fn(),
}));

import { getCampaignAccess as getCampaignAccessCore } from "./campaignDbCore";
import { getCampaignAccess } from "./campaignDb";

const mockedCore = vi.mocked(getCampaignAccessCore);

function accessFixture(input: { ownerId: number; memberRole?: "admin" | "coordinator" | "partner" | null }) {
  return {
    campaign: { ownerId: input.ownerId },
    member: input.memberRole ? { role: input.memberRole } : null,
    organizationMember: { active: true },
  } as Awaited<ReturnType<typeof getCampaignAccessCore>>;
}

describe("campaignDb access facade", () => {
  beforeEach(() => {
    mockedCore.mockReset();
  });

  it("nega acesso ao membro da organização sem vínculo com a campanha", async () => {
    mockedCore.mockResolvedValue(accessFixture({ ownerId: 10, memberRole: null }));

    await expect(getCampaignAccess(99, 20)).resolves.toBeNull();
  });

  it("mantém acesso do verdadeiro owner", async () => {
    const access = accessFixture({ ownerId: 10, memberRole: null });
    mockedCore.mockResolvedValue(access);

    await expect(getCampaignAccess(99, 10)).resolves.toBe(access);
  });

  it("mantém acesso de campaignMember explícito", async () => {
    const access = accessFixture({ ownerId: 10, memberRole: "partner" });
    mockedCore.mockResolvedValue(access);

    await expect(getCampaignAccess(99, 20)).resolves.toBe(access);
  });
});
