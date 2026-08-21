import { describe, expect, it } from "vitest";
import { formatBrazilianPhone, toWhatsAppUrl } from "./phone";

describe("telefones brasileiros", () => {
  it("aplica máscara automática para celular e telefone com código do país", () => {
    expect(formatBrazilianPhone("51999998888")).toBe("(51) 99999-8888");
    expect(formatBrazilianPhone("+55 (51) 99999-8888")).toBe("+55 (51) 99999-8888");
  });

  it("gera URL de WhatsApp somente para telefone brasileiro completo", () => {
    expect(toWhatsAppUrl("(51) 99999-8888")).toBe("https://wa.me/5551999998888");
    expect(toWhatsAppUrl("1234")).toBeNull();
  });
});
