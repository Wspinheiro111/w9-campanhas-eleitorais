// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { normalizeClientRoute, sanitizeClientErrorMessage } from "./clientErrorTelemetry";

describe("telemetria de erro de interface", () => {
  it("remove dados pessoais, URLs e sequências numéricas extensas da mensagem", () => {
    const message = sanitizeClientErrorMessage("Falha para ana@campanha.com em https://privado.exemplo/segredo com protocolo 123456789");
    expect(message).toContain("[e-mail]");
    expect(message).toContain("[url]");
    expect(message).toContain("[número]");
    expect(message).not.toContain("ana@campanha.com");
  });

  it("normaliza identificadores numéricos na rota", () => {
    expect(normalizeClientRoute("/financeiro/987/processos/12?source=menu")).toBe("/financeiro/:id/processos/:id");
  });
});
