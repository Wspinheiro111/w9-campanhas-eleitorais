export type CampaignRole = "admin" | "coordinator" | "partner";

export function canManageCampaign(role: CampaignRole) {
  return role === "admin" || role === "coordinator";
}

export function canManageTeam(role: CampaignRole) {
  return role === "admin";
}

export function canAccessOwnedRecord(role: CampaignRole, recordOwnerMemberId: number | null, currentMemberId: number | null) {
  return role !== "partner" || (recordOwnerMemberId !== null && recordOwnerMemberId === currentMemberId);
}
