export * from "./campaignDbCore";

import { getCampaignAccess as getCampaignAccessCore } from "./campaignDbCore";
import { resolveCampaignRole } from "./campaignPolicy";

export async function getCampaignAccess(campaignId: number, userId: number) {
  const access = await getCampaignAccessCore(campaignId, userId);
  if (!access) return null;

  const role = resolveCampaignRole({
    memberRole: access.member?.role,
    campaignOwnerId: access.campaign.ownerId,
    userId,
  });

  return role ? access : null;
}
