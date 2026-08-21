import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { TOTP } from "otpauth";
import { ENV } from "./_core/env";

const key = createHash("sha256").update(ENV.cookieSecret || "w9-auth-security").digest();

function encrypt(value: string) {
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", key, iv); const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}
function decrypt(value: string) {
  const [ivEncoded, tagEncoded, encryptedEncoded] = value.split(".");
  if (!ivEncoded || !tagEncoded || !encryptedEncoded) throw new Error("MFA_SECRET_INVALID");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivEncoded, "base64url")); decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedEncoded, "base64url")), decipher.final()]).toString("utf8");
}

export function createMfaEnrollment(label: string) {
  const totp = new TOTP({ issuer: "W9 Campanhas", label, algorithm: "SHA1", digits: 6, period: 30 });
  return { secretCiphertext: encrypt(totp.secret.base32), otpauthUrl: totp.toString() };
}
export function verifyMfaCode(secretCiphertext: string, code: string) {
  const secret = decrypt(secretCiphertext);
  const totp = new TOTP({ issuer: "W9 Campanhas", algorithm: "SHA1", digits: 6, period: 30, secret });
  return totp.validate({ token: code.replace(/\s/g, ""), window: 1 }) !== null;
}
export function hashSecurityIdentifier(value: string) { return createHash("sha256").update(value.trim().toLowerCase()).digest("hex"); }
export function hashIp(value: string | undefined) { return value ? createHash("sha256").update(value).digest("hex") : null; }
