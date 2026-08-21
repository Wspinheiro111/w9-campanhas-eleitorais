import { describe, expect, it } from "vitest";
import { buildFinancialExportRows, escapeCsvCell } from "./financialExport";

describe("exportação financeira protegida", () => {
  it("substitui valores por A consultar em lançamentos e documentos", () => {
    const rows = buildFinancialExportRows(
      [{ id: 1, entryType: "income", category: "Doação", counterpartyName: "Apoiador", status: "approved" }],
      [{ id: 2, documentType: "Contrato", title: "Serviço de evento", status: "pending", fileName: "contrato.pdf" }],
    );

    expect(rows).toHaveLength(3);
    expect(rows[1]).toContain("A consultar");
    expect(rows[2]).toContain("A consultar");
    expect(rows.flat().join(" ")).not.toContain("1000");
  });

  it("escapa corretamente células CSV", () => {
    expect(escapeCsvCell('Texto "com aspas"')).toBe('"Texto ""com aspas"""');
  });
});
