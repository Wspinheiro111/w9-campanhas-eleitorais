import { describe, expect, it } from "vitest";
import { w9PrintCover, w9PrintHeader, w9PrintStyles, W9_PDF_COLORS } from "./w9PdfBrand";

describe("marca dos relatórios W9", () => {
  it("fornece cores institucionais e cabeçalho com o monograma", () => {
    expect(W9_PDF_COLORS.navy).toEqual([15, 28, 63]);
    expect(W9_PDF_COLORS.yellow).toEqual([255, 195, 0]);
    expect(w9PrintHeader("Carteira de clientes")).toContain("W9 CAMPANHAS");
    expect(w9PrintCover("Carteira de clientes")).toContain("RELATÓRIO INSTITUCIONAL");
    expect(typeof W9_PDF_COLORS.border).toBe("object");
    expect(w9PrintStyles).toContain("#00A859");
  });
});
