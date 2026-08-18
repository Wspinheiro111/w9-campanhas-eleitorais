import { describe, expect, it } from "vitest";
import { deduplicateWithFlask } from "./flaskDeduplication";

describe("deduplicateWithFlask", () => {
  it("detecta e-mail e telefone já existentes e repetidos no próprio arquivo", async () => {
    const result = await deduplicateWithFlask({
      existing: [{ email: "ana@exemplo.com", phone: "51999990000" }],
      incoming: [
        { row: 2, name: "Ana", phone: "(51) 99999-0000", email: "ANA@EXEMPLO.COM", address: null, neighborhood: null, region: null, contactProfile: null, engagementLevel: "medium", primaryDemand: null, notes: null, contactConsent: true },
        { row: 3, name: "Bruno", phone: "51988880000", email: "bruno@exemplo.com", address: null, neighborhood: null, region: null, contactProfile: null, engagementLevel: "medium", primaryDemand: null, notes: null, contactConsent: true },
        { row: 4, name: "Bruno repetido", phone: "51988880000", email: "", address: null, neighborhood: null, region: null, contactProfile: null, engagementLevel: "medium", primaryDemand: null, notes: null, contactConsent: true },
      ],
    });
    expect(result.accepted).toHaveLength(1);
    expect(result.accepted[0].name).toBe("Bruno");
    expect(result.duplicates).toEqual(expect.arrayContaining([
      expect.objectContaining({ row: 2, reasons: expect.arrayContaining(["E-mail já cadastrado na campanha", "Telefone já cadastrado na campanha"]) }),
      expect.objectContaining({ row: 4, reasons: expect.arrayContaining(["Telefone duplicado dentro deste arquivo"]) }),
    ]));
  });
});
