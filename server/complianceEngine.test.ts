import { describe, expect, it } from "vitest";
import { evaluateCompliance, type ComplianceRules } from "./complianceEngine";

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

describe("motor de compliance eleitoral", () => {
  it("bloqueia contato eleitoral por telefone e contatos suprimidos", () => {
    const result = evaluateCompliance({ action: "communication.log_electoral", rules, channel: "phone", voter: { doNotContact: false, isSuppressed: false, channelAllowed: true, hasActiveEvidence: true } });
    expect(result.decision).toBe("blocked");
    expect(result.reasons[0]).toContain("telefone");
  });

  it("não permite reimportação como autorização de comunicação", () => {
    const result = evaluateCompliance({ action: "contact.import", rules });
    expect(result.decision).toBe("needs_human_review");
  });

  it("requer identificação e revisão humana para conteúdo sintético", () => {
    const withoutDisclosure = evaluateCompliance({ action: "content.publish", rules, content: { isSynthetic: true, disclosureProvided: false, reviewStatus: "pending" } });
    const awaitingReview = evaluateCompliance({ action: "content.publish", rules, content: { isSynthetic: true, disclosureProvided: true, reviewStatus: "pending" } });
    expect(withoutDisclosure.decision).toBe("blocked");
    expect(awaitingReview.decision).toBe("needs_human_review");
  });

  it("bloqueia pesquisa pública sem referência de registro", () => {
    const result = evaluateCompliance({ action: "survey.publish", rules, survey: { classification: "public_disclosure", methodologyProvided: true, reviewStatus: "approved" } });
    expect(result.decision).toBe("blocked");
  });

  it("exige revisão humana para exportação de contatos", () => {
    const result = evaluateCompliance({ action: "communication.export_contacts", rules, export: { purposeConfirmed: true, reviewStatus: "pending" } });
    expect(result.decision).toBe("needs_human_review");
  });
});
