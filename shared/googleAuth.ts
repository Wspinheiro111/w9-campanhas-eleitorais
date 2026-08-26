export const GOOGLE_OAUTH_BROKER_ORIGIN = "https://w9campaigns-qbzudlmj.manus.space";

const allowedOrigins = new Set([
  GOOGLE_OAUTH_BROKER_ORIGIN,
  "https://w9campanhaseleitorais.manus.space",
  "https://w9campanhaseleitorais.com.br",
  "https://www.w9campanhaseleitorais.com.br",
]);

export function normalizeGoogleReturnOrigin(value: string | null | undefined) {
  if (!value) return GOOGLE_OAUTH_BROKER_ORIGIN;
  try {
    const origin = new URL(value).origin;
    return allowedOrigins.has(origin) ? origin : GOOGLE_OAUTH_BROKER_ORIGIN;
  } catch {
    return GOOGLE_OAUTH_BROKER_ORIGIN;
  }
}
