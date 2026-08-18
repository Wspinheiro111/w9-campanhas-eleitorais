import { describe, expect, it } from "vitest";
import { parseContactsCsv } from "./csvContacts";

describe("parseContactsCsv", () => {
  it("aceita contatos consentidos em CSV separado por ponto e vírgula", () => {
    const csv = "nome;telefone;email;bairro;nivel_engajamento;consentimento\nAna Silva;(51) 99999-0000;ana@example.com;Centro;alto;Sim\nBruno; ; ;Norte;medio;true";
    const result = parseContactsCsv(csv);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({ name: "Ana Silva", engagementLevel: "high", contactConsent: true });
    expect(result.rows[1]).toMatchObject({ name: "Bruno", phone: null, email: null, engagementLevel: "medium" });
  });

  it("informa erros de e-mail e consentimento sem retornar linhas importáveis", () => {
    const csv = "nome;email;consentimento\nAna;email-invalido;Não";
    const result = parseContactsCsv(csv);
    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ row: 2, field: "email" }),
      expect.objectContaining({ row: 2, field: "consentimento" }),
    ]));
  });

  it("exige as colunas de nome e consentimento", () => {
    const result = parseContactsCsv("nome;telefone\nAna;999999999");
    expect(result.rows).toEqual([]);
    expect(result.errors[0]).toMatchObject({ row: 1, field: "cabeçalho" });
  });
});
