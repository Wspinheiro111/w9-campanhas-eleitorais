import { createHash } from "node:crypto";
import { evaluateCompliance, type ComplianceReviewStatus, type ComplianceRules } from "./complianceEngine";
import { calculateSyntheticElectionWindow } from "./syntheticContentPolicy";

export type ContentComplianceMaterial = {
  title: string;
  body: string;
  assetUrl?: string | null;
  assetKey?: string | null;
  channel: string;
  objective?: string | null;
  scheduledAt?: Date | null;
  isSynthetic: boolean;
  syntheticDisclosure?: string | null;
  syntheticUsesCandidateOrPublicPerson?: boolean | null;
};

export type CampaignElectionConfiguration = {
  electionEndsAt?: Date | null;
  electionTimeZone?: string | null;
};

function normalizedMaterial(material: ContentComplianceMaterial) {
  return {
    title: material.title.trim(),
    body: material.body,
    assetUrl: material.assetUrl ?? null,
    assetKey: material.assetKey ?? null,
    channel: material.channel,
    objective: material.objective?.trim() || null,
    scheduledAt: material.scheduledAt?.toISOString() ?? null,
    isSynthetic: material.isSynthetic,
    syntheticDisclosure: material.syntheticDisclosure?.trim() || null,
    syntheticUsesCandidateOrPublicPerson: material.syntheticUsesCandidateOrPublicPerson ?? null,
  };
}

export function hashContentComplianceMaterial(material: ContentComplianceMaterial) {
  return createHash("sha256").update(JSON.stringify(normalizedMaterial(material))).digest("hex");
}

export function evaluateCampaignContentCompliance(input: {
  rules: ComplianceRules;
  campaign: CampaignElectionConfiguration;
  material: ContentComplianceMaterial;
  reviewStatus: ComplianceReviewStatus;
  now?: Date;
}) {
  const syntheticUseDeclared = input.material.syntheticUsesCandidateOrPublicPerson !== null && input.material.syntheticUsesCandidateOrPublicPerson !== undefined;
  const window = calculateSyntheticElectionWindow({
    isSynthetic: input.material.isSynthetic,
    usesCandidateOrPublicPerson: input.material.syntheticUsesCandidateOrPublicPerson === true,
    electionEndsAt: input.campaign.electionEndsAt,
    electionTimeZone: input.campaign.electionTimeZone,
    now: input.now,
  });
  const evaluation = evaluateCompliance({
    action: "content.publish",
    rules: input.rules,
    content: {
      isSynthetic: input.material.isSynthetic,
      disclosureProvided: Boolean(input.material.syntheticDisclosure?.trim()),
      reviewStatus: input.reviewStatus,
      syntheticUseDeclared,
      usesCandidateOrPublicPerson: input.material.syntheticUsesCandidateOrPublicPerson === true,
      restrictedWindowConfigured: window.configured,
      withinRestrictedSyntheticWindow: window.withinRestrictedWindow,
    },
  });
  return { evaluation, window, contentHash: hashContentComplianceMaterial(input.material) };
}

export function materialContentChanged(current: ContentComplianceMaterial, next: ContentComplianceMaterial) {
  return hashContentComplianceMaterial(current) !== hashContentComplianceMaterial(next);
}

export function shouldInvalidateSyntheticReview(input: {
  current: ContentComplianceMaterial & { complianceReviewStatus?: ComplianceReviewStatus };
  next: ContentComplianceMaterial;
}) {
  if (!materialContentChanged(input.current, input.next)) return false;
  return input.current.isSynthetic || input.next.isSynthetic || input.current.complianceReviewStatus === "approved";
}
