export const MANDATORY_COMPLIANCE_BASELINE = {
  version: "tse-2026.1",
  blocksBusinessDonations: true,
  requiresSyntheticDisclosure: true,
  requiresSyntheticRestrictedWindow: true,
} as const;

export function assertMandatoryComplianceSettings(input: {
  blockBusinessDonation: boolean;
  blockSyntheticPublicationWindow: boolean;
}) {
  if (!input.blockBusinessDonation) {
    throw new Error("MANDATORY_BUSINESS_DONATION_RULE");
  }
  if (!input.blockSyntheticPublicationWindow) {
    throw new Error("MANDATORY_SYNTHETIC_WINDOW_RULE");
  }
}
