// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { trackPublicEvent } from "./publicAnalytics";

afterEach(() => {
  delete window.umami;
});

describe("analytics pública", () => {
  it("envia somente evento e propriedades não identificáveis quando Umami está disponível", () => {
    const track = vi.fn();
    window.umami = { track };

    trackPublicEvent("demo_request_submitted", { source: "landing" });

    expect(track).toHaveBeenCalledWith("demo_request_submitted", { source: "landing" });
  });

  it("não falha quando a analytics pública ainda não carregou", () => {
    expect(() => trackPublicEvent("solution_page_opened", { solution: "CRM eleitoral" })).not.toThrow();
  });
});
