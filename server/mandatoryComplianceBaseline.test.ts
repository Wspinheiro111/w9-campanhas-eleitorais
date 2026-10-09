import { describe, expect, it } from "vitest";
import { MANDATORY_COMPLIANCE_BASELINE, assertMandatoryComplianceSettings } from "./mandatoryComplianceBaseline";

describe("mandatory compliance baseline", () => {
  it("versiona o baseline obrigatório separadamente da política local", () => {
    expect(MANDATORY_COMPLIANCE_BASELINE.version).toBe("tse-2026.1");
  });

  it("não permite desativar o bloqueio de receita identificada por CNPJ", () => {
    expect(() => assertMandatoryComplianceSettings({ blockBusinessDonation: false, blockSyntheticPublicationWindow: true })).toThrow("MANDATORY_BUSINESS_DONATION_RULE");
  });

  it("não permite desativar a janela objetiva de conteúdo sintético", () => {
    expect(() => assertMandatoryComplianceSettings({ blockBusinessDonation: true, blockSyntheticPublicationWindow: false })).toThrow("MANDATORY_SYNTHETIC_WINDOW_RULE");
  });

  it("aceita política local quando preserva o baseline", () => {
    expect(() => assertMandatoryComplianceSettings({ blockBusinessDonation: true, blockSyntheticPublicationWindow: true })).not.toThrow();
  });
});
