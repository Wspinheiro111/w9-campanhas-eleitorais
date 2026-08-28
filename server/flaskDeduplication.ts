import { spawn } from "node:child_process";
import path from "node:path";
import type { ContactImportRow } from "./csvContacts";

export type ImportContact = ContactImportRow & { row: number };
export type ExistingContact = { id: number; name: string; email: string | null; phone: string | null; neighborhood: string | null; contactConsent: boolean; doNotContact: boolean };
export type ImportReviewItem = { row: number; name: string; existing: ExistingContact | null; reasons: string[] };
export type DeduplicationResult = { newContacts: ImportContact[]; updates: ImportReviewItem[]; candidates: ImportReviewItem[] };

export function deduplicateWithFlask(input: { existing: ExistingContact[]; incoming: ImportContact[] }): Promise<DeduplicationResult> {
  return new Promise((resolve, reject) => {
    const servicePath = path.resolve(process.cwd(), "python/deduplication_service.py");
    const child = spawn("python3", [servicePath], { stdio: ["pipe", "pipe", "pipe"] });
    let output = ""; let errors = "";
    const timeout = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("A verificação de duplicidades excedeu o tempo permitido.")); }, 10_000);
    child.stdout.on("data", chunk => { output += String(chunk); });
    child.stderr.on("data", chunk => { errors += String(chunk); });
    child.on("error", error => { clearTimeout(timeout); reject(error); });
    child.on("close", code => {
      clearTimeout(timeout);
      if (code !== 0) { reject(new Error(errors || "O serviço de deduplicação não respondeu.")); return; }
      try { resolve(JSON.parse(output) as DeduplicationResult); } catch { reject(new Error("O serviço de deduplicação retornou um formato inválido.")); }
    });
    child.stdin.write(JSON.stringify(input));
    child.stdin.end();
  });
}
