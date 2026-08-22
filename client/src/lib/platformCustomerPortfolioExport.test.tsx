import { describe, expect, it } from "vitest";
import { buildCustomerPortfolioCsv, buildCustomerPortfolioPrintDocument } from "./platformCustomerPortfolioExport";

describe("exportação da carteira de clientes", () => {
  const rows = [{ organizationName: "Comitê Aurora", contactName: "=Ana", contactPhone: "(51) 99999-9999", status: "Ativo", nextContactAt: "2026-09-01T15:00:00.000Z", nextContactNote: "<reunião>", accessReleasedAt: null, updatedAt: "2026-08-22T15:00:00.000Z" }];
  it("gera CSV com proteção contra fórmula", () => { expect(buildCustomerPortfolioCsv(rows)).toContain("'=Ana"); });
  it("neutraliza HTML no relatório para impressão", () => { const html = buildCustomerPortfolioPrintDocument(rows); expect(html).toContain("&lt;reunião&gt;"); expect(html).not.toContain("<reunião>"); });
});
