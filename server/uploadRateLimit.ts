import { TRPCError } from "@trpc/server";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_UPLOADS_PER_WINDOW = 10;
const uploadAttempts = new Map<string, number[]>();

export function assertUploadRateLimit(input: { userId: number; campaignId: number }) {
  const key = `${input.userId}:${input.campaignId}`;
  const now = Date.now();
  const recentAttempts = (uploadAttempts.get(key) ?? []).filter(timestamp => timestamp > now - WINDOW_MS);

  if (recentAttempts.length >= MAX_UPLOADS_PER_WINDOW) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Limite de 10 uploads por campanha a cada 10 minutos. Aguarde alguns minutos para tentar novamente." });
  }

  recentAttempts.push(now);
  uploadAttempts.set(key, recentAttempts);
}

export function clearUploadRateLimitForTests() {
  uploadAttempts.clear();
}
