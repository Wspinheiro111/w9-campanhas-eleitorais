import { afterEach, describe, expect, it, vi } from "vitest";
import { GeminiApiError, generateWithGemini } from "./gemini";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("cliente direto do Gemini", () => {
  it("envia a solicitação ao endpoint oficial somente a partir do servidor", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-gemini-key");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Resposta informativa." }] } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(generateWithGemini({ systemInstruction: "Instruções.", messages: [{ role: "user", content: "Pergunta" }] })).resolves.toBe("Resposta informativa.");
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=test-gemini-key"), expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ systemInstruction: { parts: [{ text: "Instruções." }] }, contents: [{ role: "user", parts: [{ text: "Pergunta" }] }] });
  });

  it("não permite chamada quando a chave não está configurada", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    await expect(generateWithGemini({ systemInstruction: "Instruções.", messages: [{ role: "user", content: "Pergunta" }] })).rejects.toBeInstanceOf(GeminiApiError);
  });
});
