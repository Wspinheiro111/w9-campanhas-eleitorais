import { describe, expect, it } from "vitest";
import { deduplicateWithFlask } from "./flaskDeduplication";

describe("deduplicateWithFlask", () => {
  it("classifica identificadores existentes para atualização e nome/bairro para confirmação manual", async () => {
    const result = await deduplicateWithFlask({
      existing: [{ id: 9, name: "Ana Existente", email: "ana@exemplo.com", phone: "51999990000", neighborhood: "Centro" }, { id: 10, name: "Carla", email: null, phone: null, neighborhood: "Norte" }],
      incoming: [
        { row: 2, name: "Ana", phone: "(51) 99999-0000", email: "ANA@EXEMPLO.COM", address: null, neighborhood: null, region: null, contactProfile: null, engagementLevel: "medium", primaryDemand: null, notes: null, contactConsent: true },
        { row: 3, name: "Bruno", phone: "51988880000", email: "bruno@exemplo.com", address: null, neighborhood: null, region: null, contactProfile: null, engagementLevel: "medium", primaryDemand: null, notes: null, contactConsent: true },
        { row: 4, name: "Carla", phone: "", email: "", address: null, neighborhood: "Norte", region: null, contactProfile: null, engagementLevel: "medium", primaryDemand: null, notes: null, contactConsent: true },
      ],
    });
    expect(result.newContacts).toHaveLength(1);
    expect(result.newContacts[0].name).toBe("Bruno");
    expect(result.updates).toEqual(expect.arrayContaining([
      expect.objectContaining({ row: 2, reasons: expect.arrayContaining(["E-mail já cadastrado na campanha", "Telefone já cadastrado na campanha"]) }),
    ]));
    expect(result.candidates).toEqual(expect.arrayContaining([expect.objectContaining({ row: 4, existing: expect.objectContaining({ id: 10 }), reasons: ["Possível duplicidade por nome e bairro"] })]));
  });
});
