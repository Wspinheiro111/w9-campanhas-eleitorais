import { describe, expect, it } from "vitest";

describe("integração direta com Gemini", () => {
  it("valida a chave no catálogo oficial de modelos", async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    expect(apiKey).toBeTruthy();

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey!)}`);
    expect(response.ok).toBe(true);

    const payload = await response.json() as { models?: unknown[] };
    expect(Array.isArray(payload.models)).toBe(true);
  }, 20_000);
});
