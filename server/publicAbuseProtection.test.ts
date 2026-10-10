import { describe, expect, it } from "vitest";
import {
  PublicFormRejectedError,
  assertPublicFormTiming,
  normalizePublicEmail,
  normalizePublicPhone,
  publicCommandKey,
} from "./publicAbuseProtection";

describe("public abuse protection helpers", () => {
  it("normaliza e-mail e telefone antes de deduplicar", () => {
    expect(normalizePublicEmail("  ANA@EXAMPLE.COM ")).toBe("ana@example.com");
    expect(normalizePublicPhone("(55) 9 9999-0000")).toBe("55999990000");
    expect(normalizePublicPhone("  ")).toBeNull();
  });

  it("usa requestId como fronteira de idempotência, não a identidade da pessoa", () => {
    const first = publicCommandKey({ campaignId: 1, routeKey: "public_intake", normalizedEmail: "ana@example.com", requestId: "11111111-1111-4111-8111-111111111111" });
    const retry = publicCommandKey({ campaignId: 1, routeKey: "public_intake", normalizedEmail: "ana@example.com", requestId: "11111111-1111-4111-8111-111111111111" });
    const newSubmission = publicCommandKey({ campaignId: 1, routeKey: "public_intake", normalizedEmail: "ana@example.com", requestId: "22222222-2222-4222-8222-222222222222" });
    expect(retry).toBe(first);
    expect(newSubmission).not.toBe(first);
  });

  it("rejeita honeypot preenchido e submissão rápida demais", () => {
    const now = Date.now();
    expect(() => assertPublicFormTiming({ website: "bot.example", formStartedAt: now - 5_000, now })).toThrow(PublicFormRejectedError);
    expect(() => assertPublicFormTiming({ formStartedAt: now - 500, now })).toThrow(PublicFormRejectedError);
    expect(() => assertPublicFormTiming({ formStartedAt: now - 2_000, now })).not.toThrow();
  });
});
