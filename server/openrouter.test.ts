import { afterEach, describe, expect, it, vi } from "vitest";
import {
  generateWithOpenRouter,
  OPENROUTER_MODEL_CHAIN,
  OpenRouterApiError,
  resetOpenRouterCooldowns,
} from "./openrouter";

function fakeResponse(status: number, payload: unknown, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: async () => payload,
  } as Response;
}

afterEach(() => {
  resetOpenRouterCooldowns();
  vi.unstubAllGlobals();
});

describe("OpenRouter model fallback", () => {
  it("advances to the next model after a rate limit and preserves the configured order", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(fakeResponse(429, { error: { message: "rate limit" } }, { "retry-after": "60" }))
      .mockResolvedValueOnce(fakeResponse(200, { choices: [{ message: { content: "Resposta do segundo modelo" } }] }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateWithOpenRouter({
      systemInstruction: "Você é um assistente de teste.",
      messages: [{ role: "user", content: "Olá" }],
    });

    expect(result).toBe("Resposta do segundo modelo");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe(OPENROUTER_MODEL_CHAIN[0]);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).model).toBe(OPENROUTER_MODEL_CHAIN[1]);
  });

  it("does not repeat models and reports the complete chain when all models fail", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse(503, { error: { message: "temporarily unavailable" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(generateWithOpenRouter({
      systemInstruction: "Teste",
      messages: [{ role: "user", content: "Teste" }],
    })).rejects.toMatchObject({ status: 503, attemptedModels: [...OPENROUTER_MODEL_CHAIN] });

    expect(fetchMock).toHaveBeenCalledTimes(OPENROUTER_MODEL_CHAIN.length);
    const attempted = fetchMock.mock.calls.map(call => JSON.parse(call[1].body).model);
    expect(new Set(attempted).size).toBe(OPENROUTER_MODEL_CHAIN.length);
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("gemini"), expect.anything());
  });

  it("advances after a provider timeout or transport failure", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new DOMException("The operation was aborted", "AbortError"))
      .mockResolvedValueOnce(fakeResponse(200, { choices: [{ message: { content: "Resposta após timeout" } }] }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateWithOpenRouter({ systemInstruction: "Teste", messages: [{ role: "user", content: "Teste" }] });

    expect(result).toBe("Resposta após timeout");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it("does not hide invalid credentials behind a model fallback", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fakeResponse(401, { error: { message: "invalid key" } })));

    const error = await generateWithOpenRouter({ systemInstruction: "Teste", messages: [{ role: "user", content: "Teste" }] }).catch(value => value);
    expect(error).toBeInstanceOf(OpenRouterApiError);
    expect(error.status).toBe(401);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});
