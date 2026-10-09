import { describe, expect, it } from "vitest";
import { evaluateCampaignContentCompliance, hashContentComplianceMaterial, materialContentChanged, shouldInvalidateSyntheticReview } from "./contentCompliancePolicy";
import type { ComplianceRules } from "./complianceEngine";

const rules: ComplianceRules = {
  ruleVersion: "2026.1",
  blockBusinessDonation: true,
  requireExpenseDocument: true,
  blockElectoralPhoneContact: true,
  requireConsentEvidence: true,
  requireHumanReviewForSyntheticContent: true,
  blockSyntheticPublicationWindow: true,
  requireResearchRegistrationForPublication: true,
  requireFinancialEvidence: true,
};

const campaign = { electionEndsAt: new Date("2026-10-04T20:00:00.000Z"), electionTimeZone: "America/Sao_Paulo" };
const material = {
  title: "Peça institucional",
  body: "Conteúdo informativo.",
  assetUrl: null,
  assetKey: null,
  channel: "social",
  objective: null,
  scheduledAt: null,
  isSynthetic: true,
  syntheticDisclosure: "Conteúdo sintético identificado.",
  syntheticUsesCandidateOrPublicPerson: true,
};

describe("content compliance policy", () => {
  it("aprova após revisão humana fora da janela objetiva", () => {
    const result = evaluateCampaignContentCompliance({ rules, campaign, material, reviewStatus: "approved", now: new Date("2026-09-30T19:59:59.999Z") });
    expect(result.evaluation.decision).toBe("approved");
  });

  it("bloqueia a janela objetiva mesmo com revisão humana aprovada", () => {
    const result = evaluateCampaignContentCompliance({ rules, campaign, material, reviewStatus: "approved", now: new Date("2026-10-03T12:00:00.000Z") });
    expect(result.evaluation.decision).toBe("blocked");
  });

  it("não aplica a janela quando a peça declara que não usa candidata(o) ou pessoa pública", () => {
    const result = evaluateCampaignContentCompliance({ rules, campaign: { electionEndsAt: null, electionTimeZone: null }, material: { ...material, syntheticUsesCandidateOrPublicPerson: false }, reviewStatus: "approved", now: new Date("2026-10-04T20:00:00.000Z") });
    expect(result.evaluation.decision).toBe("approved");
  });

  it("é fail-closed quando a declaração específica está ausente", () => {
    const result = evaluateCampaignContentCompliance({ rules, campaign, material: { ...material, syntheticUsesCandidateOrPublicPerson: null }, reviewStatus: "approved" });
    expect(result.evaluation.decision).toBe("blocked");
  });

  it("hash muda com edição material e permanece estável para o mesmo conteúdo", () => {
    const first = hashContentComplianceMaterial(material);
    expect(hashContentComplianceMaterial({ ...material })).toBe(first);
    expect(hashContentComplianceMaterial({ ...material, body: "Outro texto" })).not.toBe(first);
    expect(materialContentChanged(material, { ...material, body: "Outro texto" })).toBe(true);
  });

  it("edição material de peça sintética aprovada invalida a revisão", () => {
    expect(shouldInvalidateSyntheticReview({ current: { ...material, complianceReviewStatus: "approved" }, next: { ...material, title: "Título revisado" } })).toBe(true);
    expect(shouldInvalidateSyntheticReview({ current: { ...material, complianceReviewStatus: "approved" }, next: { ...material } })).toBe(false);
  });
});
