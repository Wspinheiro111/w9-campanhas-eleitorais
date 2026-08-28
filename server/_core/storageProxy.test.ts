import { describe, expect, it } from "vitest";
import { normalizeStorageKey } from "./storageProxy";

describe("normalizeStorageKey", () => {
  it("preserva uma chave simples de armazenamento", () => {
    expect(normalizeStorageKey("assets/trailer.mp4")).toBe("assets/trailer.mp4");
  });

  it("recompõe o wildcard nomeado do Express 5 sem barra inicial", () => {
    expect(normalizeStorageKey(["assets", "trailer.mp4"])).toBe("assets/trailer.mp4");
    expect(normalizeStorageKey(["/assets", "trailer.mp4"])).toBe("assets/trailer.mp4");
  });

  it("rejeita chave ausente", () => {
    expect(normalizeStorageKey(undefined)).toBeUndefined();
  });
});
