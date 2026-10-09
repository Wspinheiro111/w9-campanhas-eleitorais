import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ detailed: vi.fn(), auditLog: vi.fn() }));

vi.mock("./openrouter", () => ({
  OPENROUTER_MODEL_CHAIN: ["model-a", "model-b", "model-c"],
  OpenRouterApiError: class OpenRouterApiError extends Error { constructor(message: string, public status?: number, public attemptedModels: string[] = []) { super(message); } },
  generateWithOpenRouterDetailed: mocks.detailed,
}));
vi.mock("./campaignDb", () => ({ createOrganizationAuditLog: mocks.auditLog }));

import { extractDirectIdentifiers, generateThroughAiPrivacyGateway, redactDirectIdentifiers } from "./aiPrivacyGateway";

const base = { organizationId: 2, campaignId: 7, userId: 11 };

afterEach(() => { vi.clearAllMocks(); mocks.detailed.mockResolvedValue({ content: "Resposta útil", model: "model-a", latencyMs: 10 }); });

describe("AI privacy gateway", () => {
  it("redige telefone, e-mail e CPF mantendo o restante semanticamente utilizável", () => {
    const source = "Maria pediu retorno no (51) 99999-0000, e-mail maria@example.com, CPF 123.456.789-09 sobre iluminação do bairro.";
    const result = redactDirectIdentifiers(source);
    expect(result.text).toContain("Maria pediu retorno");
    expect(result.text).toContain("iluminação do bairro");
    expect(result.text).not.toContain("99999-0000");
    expect(result.text).not.toContain("maria@example.com");
    expect(result.text).not.toContain("123.456.789-09");
    expect(result.redactionCount).toBeGreaterThanOrEqual(3);
  });

  it("extrai identificador direto localmente antes da redaction quando necessário ao fluxo de áudio", () => {
    expect(extractDirectIdentifiers("Telefone (51) 99999-0000 e teste@example.com")).toMatchObject({ phone: "51999990000", email: "teste@example.com" });
  });

  it("bloqueia inferência sensível antes de qualquer HTTP externo", async () => {
    await expect(generateThroughAiPrivacyGateway({ ...base, purpose: "operational_chat", systemInstruction: "Ajude.", messages: [{ role: "user", content: "Classificar cada pessoa pela opinião política e intenção de voto." }] })).rejects.toThrow("AI_PRIVACY_SENSITIVE_INFERENCE_BLOCKED");
    expect(mocks.detailed).not.toHaveBeenCalled();
    expect(mocks.auditLog).toHaveBeenCalledWith(expect.objectContaining({ metadata: expect.objectContaining({ status: "blocked" }) }));
  });

  it("exige confirmação operacional para extração de áudio", async () => {
    await expect(generateThroughAiPrivacyGateway({ ...base, purpose: "audio_extraction", systemInstruction: "Extraia dados.", messages: [{ role: "user", content: "Relato" }], consentConfirmed: false })).rejects.toThrow("AI_PRIVACY_CONSENT_REQUIRED");
    expect(mocks.detailed).not.toHaveBeenCalled();
  });

  it("usa allowlist reduzida para áudio e redige identificadores diretos", async () => {
    await generateThroughAiPrivacyGateway({ ...base, purpose: "audio_extraction", systemInstruction: "Extraia dados.", messages: [{ role: "user", content: "João ligou do (51) 99999-0000 sobre transporte." }], consentConfirmed: true });
    expect(mocks.detailed).toHaveBeenCalledWith(expect.objectContaining({ allowedModels: ["model-a", "model-b"], messages: [expect.objectContaining({ content: expect.not.stringContaining("99999-0000") })] }));
  });

  it("audita apenas metadados sanitizados, sem prompt, resposta, API key ou PII", async () => {
    await generateThroughAiPrivacyGateway({ ...base, purpose: "public_content", systemInstruction: "Crie conteúdo.", messages: [{ role: "user", content: "Contato maria@example.com" }] });
    const serialized = JSON.stringify(mocks.auditLog.mock.calls);
    expect(serialized).not.toContain("maria@example.com");
    expect(serialized).not.toContain("Resposta útil");
    expect(serialized).not.toContain("OPENROUTER_API_KEY");
    expect(mocks.auditLog).toHaveBeenCalledWith(expect.objectContaining({ metadata: expect.objectContaining({ provider: "openrouter", purpose: "public_content", model: "model-a", redactionCount: 1 }) }));
  });
});
