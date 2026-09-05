import { describe, expect, it } from "vitest";

describe("OpenRouter API configuration", () => {
  it("authenticates against the models catalog without exposing the key", async () => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    expect(apiKey).toBeTruthy();

    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://w9campanhaseleitorais.com.br",
        "X-Title": "W9 Campanhas Eleitorais",
      },
    });

    expect(response.ok).toBe(true);
    const payload = await response.json() as { data?: unknown };
    expect(Array.isArray(payload.data)).toBe(true);
  }, 15_000);
});
