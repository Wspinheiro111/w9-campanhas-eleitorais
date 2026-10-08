import { describe, expect, it } from "vitest";
import { OFFLINE_VISIT_NOTES_MAX, OFFLINE_VISIT_TTL_MS, isExpiredOfflineVisit, prepareStoredOfflineVisit, summarizeOfflineVisits, type OfflineVisit } from "./offlineVisits";

const visit: OfflineVisit = {
  campaignId: 7,
  voterId: 10,
  clientReference: "11111111-1111-4111-8111-111111111111",
  outcome: "contacted",
  notes: "observação",
  occurredAt: "2026-10-08T12:00:00.000Z",
};

describe("offline visit retention", () => {
  it("associa a fila ao usuário e define TTL", () => {
    const now = new Date("2026-10-08T12:00:00.000Z");
    const stored = prepareStoredOfflineVisit(42, visit, now);
    expect(stored.ownerUserId).toBe(42);
    expect(stored.createdAt).toBe(now.toISOString());
    expect(Date.parse(stored.expiresAt) - now.getTime()).toBe(OFFLINE_VISIT_TTL_MS);
  });

  it("limita notas locais sem adicionar PII nova", () => {
    const stored = prepareStoredOfflineVisit(42, { ...visit, notes: "x".repeat(OFFLINE_VISIT_NOTES_MAX + 100) });
    expect(stored.notes).toHaveLength(OFFLINE_VISIT_NOTES_MAX);
    expect(stored).not.toHaveProperty("name");
    expect(stored).not.toHaveProperty("email");
    expect(stored).not.toHaveProperty("phone");
    expect(stored).not.toHaveProperty("address");
  });

  it("considera registro legado sem owner/TTL expirado e remove no próximo acesso", () => {
    expect(isExpiredOfflineVisit({ clientReference: visit.clientReference } as never)).toBe(true);
  });

  it("expira exatamente no limite", () => {
    const now = new Date("2026-10-08T12:00:00.000Z");
    const stored = prepareStoredOfflineVisit(42, visit, now);
    expect(isExpiredOfflineVisit(stored, new Date(now.getTime() + OFFLINE_VISIT_TTL_MS - 1))).toBe(false);
    expect(isExpiredOfflineVisit(stored, new Date(now.getTime() + OFFLINE_VISIT_TTL_MS))).toBe(true);
  });

  it("resume quantidade e item mais antigo", () => {
    const first = prepareStoredOfflineVisit(42, visit, new Date("2026-10-08T12:00:00.000Z"));
    const second = prepareStoredOfflineVisit(42, { ...visit, clientReference: "22222222-2222-4222-8222-222222222222" }, new Date("2026-10-08T13:00:00.000Z"));
    expect(summarizeOfflineVisits([second, first])).toEqual({ count: 2, oldestCreatedAt: first.createdAt });
  });
});
