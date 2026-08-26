import { describe, expect, it } from "vitest";
import { isValidCpfOrCnpj, normalizeBrDocument } from "./brDocument";

describe("validação de CPF e CNPJ", () => {
  it("aceita documentos válidos e normaliza a pontuação", () => {
    expect(isValidCpfOrCnpj("529.982.247-25")).toBe(true);
    expect(isValidCpfOrCnpj("04.252.011/0001-10")).toBe(true);
    expect(normalizeBrDocument("529.982.247-25")).toBe("52998224725");
  });

  it("rejeita números repetidos, incompletos e dígitos inválidos", () => {
    expect(isValidCpfOrCnpj("111.111.111-11")).toBe(false);
    expect(isValidCpfOrCnpj("529.982.247-24")).toBe(false);
    expect(isValidCpfOrCnpj("04.252.011/0001-11")).toBe(false);
  });
});
