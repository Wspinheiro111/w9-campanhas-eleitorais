import { describe, expect, it } from "vitest";
import { buildCommercialHistoryPrintDocument } from "./platformCustomerHistoryExport";

describe("relatório de histórico comercial", () => {
  it("inclui o próximo contato e neutraliza conteúdo HTML em interações", () => {
    const html = buildCommercialHistoryPrintDocument({ organizationName: "Comitê Aurora", contactName: "Ana", contactPhone: "(51) 99999-9999", nextContactAt: "2026-08-30T15:00:00.000Z", nextContactNote: "Retornar proposta", interactions: [{ kind: "Ligação", description: "<script>alert(1)</script>", createdAt: "2026-08-21T15:00:00.000Z", actorName: "Will" }] });
    expect(html).toContain("Próximo contato");
    expect(html).toContain("Retornar proposta");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>alert");
  });
});
