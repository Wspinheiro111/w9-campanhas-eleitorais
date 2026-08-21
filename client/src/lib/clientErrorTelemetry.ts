export type ClientErrorSource = "error_boundary" | "window_error" | "unhandled_rejection" | "query_error" | "mutation_error";

export function sanitizeClientErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "Erro inesperado de interface";
  return raw
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[e-mail]")
    .replace(/https?:\/\/[^\s]+/gi, "[url]")
    .replace(/\b\d{7,}\b/g, "[número]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280) || "Erro inesperado de interface";
}

export function normalizeClientRoute(pathname: string) {
  return pathname.split("?")[0].replace(/\/[0-9]+(?=\/|$)/g, "/:id").slice(0, 240) || "/";
}

export async function fingerprintClientError(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}
