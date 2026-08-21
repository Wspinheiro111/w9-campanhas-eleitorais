import { describe, expect, it } from "vitest";
import { assertUploadRateLimit, clearUploadRateLimitForTests } from "./uploadRateLimit";

describe("limite de uploads", () => {
  it("permite até dez uploads por usuário e campanha a cada janela de dez minutos", () => {
    clearUploadRateLimitForTests();
    for (let index = 0; index < 10; index += 1) assertUploadRateLimit({ userId: 8, campaignId: 3 });
    expect(() => assertUploadRateLimit({ userId: 8, campaignId: 3 })).toThrow(/Limite de 10 uploads/i);
  });

  it("mantém contadores separados por usuário e campanha", () => {
    clearUploadRateLimitForTests();
    for (let index = 0; index < 10; index += 1) assertUploadRateLimit({ userId: 8, campaignId: 3 });
    expect(() => assertUploadRateLimit({ userId: 9, campaignId: 3 })).not.toThrow();
    expect(() => assertUploadRateLimit({ userId: 8, campaignId: 4 })).not.toThrow();
  });
});
