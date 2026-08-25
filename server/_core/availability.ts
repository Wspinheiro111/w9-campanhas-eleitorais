import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { notifyOwner } from "./notification";

export type AvailabilityStatus = {
  ok: boolean;
  checkedAt: string;
  database: "ok" | "unavailable";
  error?: string;
};

export async function checkAvailability(): Promise<AvailabilityStatus> {
  const checkedAt = new Date().toISOString();
  try {
    const db = await getDb();
    if (!db) throw new Error("database_not_configured");
    await db.execute(sql`SELECT 1`);
    return { ok: true, checkedAt, database: "ok" };
  } catch (error) {
    return {
      ok: false,
      checkedAt,
      database: "unavailable",
      error: error instanceof Error ? error.message.slice(0, 180) : "availability_check_failed",
    };
  }
}

export async function runInternalAvailabilityCheck() {
  const status = await checkAvailability();
  if (!status.ok) {
    await notifyOwner({
      title: "W9 Campanhas Eleitorais: atenção à disponibilidade",
      content: `A verificação interna identificou indisponibilidade de banco às ${status.checkedAt}. Motivo: ${status.error ?? "não informado"}.`,
    });
  }
  return status;
}
