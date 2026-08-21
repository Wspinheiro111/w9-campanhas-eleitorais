import { describe, expect, it } from "vitest";
import { FINANCIAL_AMOUNT_PLACEHOLDER, getFinancialStatusLabel, getNextFinancialStatus, getNextFinancialStatusActionLabel } from "./financialPresentation";

describe("apresentação financeira protegida", () => {
  it("oculta valores monetários com a indicação definida pela coordenação", () => {
    expect(FINANCIAL_AMOUNT_PLACEHOLDER).toBe("A consultar");
  });

  it("traduz os estados detalhados e orienta somente a próxima transição permitida", () => {
    expect(getFinancialStatusLabel("reconciled")).toBe("Conciliado");
    expect(getFinancialStatusLabel("closed")).toBe("Encerrado");
    expect(getNextFinancialStatus("pending")).toBe("under_review");
    expect(getNextFinancialStatusActionLabel("approved")).toBe("Marcar como pago / recebido");
    expect(getNextFinancialStatus("closed")).toBeNull();
  });
});
