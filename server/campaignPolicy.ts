export type CampaignRole = "admin" | "coordinator" | "partner";

export function resolveCampaignRole(input: {
  memberRole: CampaignRole | null | undefined;
  campaignOwnerId: number | null | undefined;
  userId: number;
}): CampaignRole | null {
  if (input.memberRole) return input.memberRole;
  return input.campaignOwnerId === input.userId ? "admin" : null;
}

export function canManageCampaign(role: CampaignRole) {
  return role === "admin" || role === "coordinator";
}

export function canManageTeam(role: CampaignRole) {
  return role === "admin";
}

export function canAccessOwnedRecord(role: CampaignRole, recordOwnerMemberId: number | null, currentMemberId: number | null) {
  return role !== "partner" || (recordOwnerMemberId !== null && recordOwnerMemberId === currentMemberId);
}
