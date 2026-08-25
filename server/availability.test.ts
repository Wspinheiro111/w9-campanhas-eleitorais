import { describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getDb: vi.fn() }));
vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn().mockResolvedValue(true) }));

import { getDb } from "./db";
import { notifyOwner } from "./_core/notification";
import { checkAvailability, runInternalAvailabilityCheck } from "./_core/availability";

describe("monitoramento interno de disponibilidade", () => {
  it("confirma a saúde quando o banco responde", async () => {
    vi.mocked(getDb).mockResolvedValue({ execute: vi.fn().mockResolvedValue([]) } as never);
    await expect(checkAvailability()).resolves.toMatchObject({ ok: true, database: "ok" });
  });

  it("alerta o responsável quando o banco está indisponível", async () => {
    vi.mocked(getDb).mockResolvedValue(null);
    await expect(runInternalAvailabilityCheck()).resolves.toMatchObject({ ok: false, database: "unavailable" });
    expect(notifyOwner).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringContaining("disponibilidade") }));
  });
});
