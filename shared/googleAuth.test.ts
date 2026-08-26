import { describe, expect, it } from "vitest";
import { GOOGLE_OAUTH_BROKER_ORIGIN, normalizeGoogleReturnOrigin } from "./googleAuth";

describe("origem de retorno Google", () => {
  it("aceita somente os domínios publicados do W9", () => {
    expect(normalizeGoogleReturnOrigin("https://w9campanhaseleitorais.com.br/login")).toBe("https://w9campanhaseleitorais.com.br");
    expect(normalizeGoogleReturnOrigin("https://www.w9campanhaseleitorais.com.br")).toBe("https://www.w9campanhaseleitorais.com.br");
  });

  it("rejeita origens externas e inválidas", () => {
    expect(normalizeGoogleReturnOrigin("https://example.com")).toBe(GOOGLE_OAUTH_BROKER_ORIGIN);
    expect(normalizeGoogleReturnOrigin("javascript:alert(1)")).toBe(GOOGLE_OAUTH_BROKER_ORIGIN);
  });
});
