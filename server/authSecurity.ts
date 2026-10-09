import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { TOTP } from "otpauth";
import { ENV } from "./_core/env";

export type TotpKeyRing = {
  current: { id: string; key: Buffer };
  byId: Map<string, Buffer>;
};

function decodeBase64UrlStrict(encoded: string, errorCode: string) {
  if (!encoded || !/^[A-Za-z0-9_-]+$/.test(encoded)) throw new Error(errorCode);
  let decoded: Buffer;
  try {
    decoded = Buffer.from(encoded, "base64url");
  } catch {
    throw new Error(errorCode);
  }
  if (!decoded.length || decoded.toString("base64url") !== encoded) throw new Error(errorCode);
  return decoded;
}

function decodeDedicatedKey(encoded: string) {
  const decoded = decodeBase64UrlStrict(encoded.trim(), "TOTP_ENCRYPTION_KEY_INVALID");
  if (decoded.length !== 32) throw new Error("TOTP_ENCRYPTION_KEY_INVALID");
  return decoded;
}

function keyId(key: Buffer) {
  return createHash("sha256").update(key).digest("hex").slice(0, 16);
}

function previousKeys(raw: string) {
  return raw.split(",").map(value => value.trim()).filter(Boolean);
}

export function validateTotpEncryptionConfiguration(input: {
  isProduction: boolean;
  currentKey: string;
  previousKeysRaw: string;
}) {
  if (!input.currentKey.trim()) {
    if (input.isProduction) throw new Error("TOTP_ENCRYPTION_KEY_REQUIRED");
    return;
  }
  decodeDedicatedKey(input.currentKey);
  previousKeys(input.previousKeysRaw).forEach(decodeDedicatedKey);
}

export function validateRuntimeTotpEncryptionConfiguration() {
  validateTotpEncryptionConfiguration({
    isProduction: ENV.isProduction,
    currentKey: ENV.totpEncryptionKey,
    previousKeysRaw: ENV.totpEncryptionPreviousKeys,
  });
}

export function buildTotpKeyRing(input: { currentKey: string; previousKeys: string[] }): TotpKeyRing {
  if (!input.currentKey.trim()) throw new Error("TOTP_ENCRYPTION_KEY_REQUIRED");
  const current = decodeDedicatedKey(input.currentKey);
  const byId = new Map<string, Buffer>();
  const currentId = keyId(current);
  byId.set(currentId, current);
  for (const encoded of input.previousKeys) {
    const key = decodeDedicatedKey(encoded);
    byId.set(keyId(key), key);
  }
  return { current: { id: currentId, key: current }, byId };
}

function runtimeKeyRing() {
  return buildTotpKeyRing({
    currentKey: ENV.totpEncryptionKey,
    previousKeys: previousKeys(ENV.totpEncryptionPreviousKeys),
  });
}

function encryptAesGcm(value: string, key: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return {
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    ciphertext: encrypted.toString("base64url"),
  };
}

function decryptAesGcm(ivEncoded: string, tagEncoded: string, encryptedEncoded: string, key: Buffer) {
  try {
    const iv = decodeBase64UrlStrict(ivEncoded, "MFA_SECRET_INVALID");
    const tag = decodeBase64UrlStrict(tagEncoded, "MFA_SECRET_INVALID");
    const encrypted = decodeBase64UrlStrict(encryptedEncoded, "MFA_SECRET_INVALID");
    if (iv.length !== 12 || tag.length !== 16) throw new Error("MFA_SECRET_INVALID");
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("MFA_SECRET_INVALID");
  }
}

export function encryptTotpSecret(value: string, keyRing: TotpKeyRing) {
  const encrypted = encryptAesGcm(value, keyRing.current.key);
  return `v2.${keyRing.current.id}.${encrypted.iv}.${encrypted.tag}.${encrypted.ciphertext}`;
}

export function encryptLegacyTotpSecretForTest(value: string, legacyJwtSecret: string) {
  if (!legacyJwtSecret) throw new Error("MFA_LEGACY_KEY_NOT_AVAILABLE");
  const legacyKey = createHash("sha256").update(legacyJwtSecret).digest();
  const encrypted = encryptAesGcm(value, legacyKey);
  return `${encrypted.iv}.${encrypted.tag}.${encrypted.ciphertext}`;
}

export function decryptTotpSecret(value: string, input: { keyRing: TotpKeyRing; legacyJwtSecret: string }) {
  const parts = value.split(".");
  if (parts[0] === "v2") {
    const [, id, ivEncoded, tagEncoded, encryptedEncoded] = parts;
    if (!id || !ivEncoded || !tagEncoded || !encryptedEncoded || parts.length !== 5) throw new Error("MFA_SECRET_INVALID");
    const key = input.keyRing.byId.get(id);
    if (!key) throw new Error("MFA_KEY_NOT_AVAILABLE");
    return decryptAesGcm(ivEncoded, tagEncoded, encryptedEncoded, key);
  }

  const [ivEncoded, tagEncoded, encryptedEncoded] = parts;
  if (!ivEncoded || !tagEncoded || !encryptedEncoded || parts.length !== 3) throw new Error("MFA_SECRET_INVALID");
  if (!input.legacyJwtSecret) throw new Error("MFA_LEGACY_KEY_NOT_AVAILABLE");
  const legacyKey = createHash("sha256").update(input.legacyJwtSecret).digest();
  return decryptAesGcm(ivEncoded, tagEncoded, encryptedEncoded, legacyKey);
}

export function createMfaEnrollment(label: string) {
  const totp = new TOTP({ issuer: "W9 Campanhas", label, algorithm: "SHA1", digits: 6, period: 30 });
  return { secretCiphertext: encryptTotpSecret(totp.secret.base32, runtimeKeyRing()), otpauthUrl: totp.toString() };
}

export function verifyMfaCode(secretCiphertext: string, code: string) {
  const secret = decryptTotpSecret(secretCiphertext, { keyRing: runtimeKeyRing(), legacyJwtSecret: ENV.cookieSecret });
  const totp = new TOTP({ issuer: "W9 Campanhas", algorithm: "SHA1", digits: 6, period: 30, secret });
  return totp.validate({ token: code.replace(/\s/g, ""), window: 1 }) !== null;
}

export function hashSecurityIdentifier(value: string) { return createHash("sha256").update(value.trim().toLowerCase()).digest("hex"); }
export function hashIp(value: string | undefined) { return value ? createHash("sha256").update(value).digest("hex") : null; }
