import { describe, expect, it } from "vitest";
import {
  buildTotpKeyRing,
  decryptTotpSecret,
  encryptLegacyTotpSecretForTest,
  encryptTotpSecret,
  hashIp,
  hashSecurityIdentifier,
  validateTotpEncryptionConfiguration,
} from "./authSecurity";

const currentKey = Buffer.alloc(32, 0x11).toString("base64url");
const previousKey = Buffer.alloc(32, 0x22).toString("base64url");
const legacyJwtSecret = "legacy-jwt-secret-used-before-dedicated-totp-key";

describe("segurança de autenticação", () => {
  it("normaliza o identificador de login sem manter o e-mail em texto puro", () => {
    expect(hashSecurityIdentifier("  Pessoa@Exemplo.com ")).toBe(hashSecurityIdentifier("pessoa@exemplo.com"));
    expect(hashSecurityIdentifier("pessoa@exemplo.com")).not.toContain("pessoa");
  });

  it("gera hash opcional para IP de auditoria", () => {
    expect(hashIp(undefined)).toBeNull();
    expect(hashIp("203.0.113.10")).toHaveLength(64);
  });
});

describe("criptografia TOTP dedicada", () => {
  it("gera ciphertext v2 com key-id e faz round-trip com a chave dedicada", () => {
    const ring = buildTotpKeyRing({ currentKey, previousKeys: [] });
    const ciphertext = encryptTotpSecret("JBSWY3DPEHPK3PXP", ring);

    expect(ciphertext.startsWith("v2.")).toBe(true);
    expect(ciphertext).not.toContain("JBSWY3DPEHPK3PXP");
    expect(decryptTotpSecret(ciphertext, { keyRing: ring, legacyJwtSecret })).toBe("JBSWY3DPEHPK3PXP");
  });

  it("continua lendo ciphertext v2 depois da rotação quando a chave antiga está na lista anterior", () => {
    const oldRing = buildTotpKeyRing({ currentKey: previousKey, previousKeys: [] });
    const ciphertext = encryptTotpSecret("ROTATIONSECRET", oldRing);
    const rotatedRing = buildTotpKeyRing({ currentKey, previousKeys: [previousKey] });

    expect(decryptTotpSecret(ciphertext, { keyRing: rotatedRing, legacyJwtSecret })).toBe("ROTATIONSECRET");
  });

  it("continua lendo o formato legado durante a migração sem usá-lo para novas escritas", () => {
    const legacyCiphertext = encryptLegacyTotpSecretForTest("LEGACYSECRET", legacyJwtSecret);
    const ring = buildTotpKeyRing({ currentKey, previousKeys: [] });

    expect(legacyCiphertext.startsWith("v2.")).toBe(false);
    expect(decryptTotpSecret(legacyCiphertext, { keyRing: ring, legacyJwtSecret })).toBe("LEGACYSECRET");
    expect(encryptTotpSecret("NEWSECRET", ring).startsWith("v2.")).toBe(true);
  });

  it("falha quando o ciphertext v2 é adulterado ou a chave correspondente não existe", () => {
    const ring = buildTotpKeyRing({ currentKey, previousKeys: [] });
    const ciphertext = encryptTotpSecret("SECRET", ring);
    const parts = ciphertext.split(".");
    parts[parts.length - 1] = `${parts.at(-1)}A`;

    expect(() => decryptTotpSecret(parts.join("."), { keyRing: ring, legacyJwtSecret })).toThrow();
    const wrongRing = buildTotpKeyRing({ currentKey: previousKey, previousKeys: [] });
    expect(() => decryptTotpSecret(ciphertext, { keyRing: wrongRing, legacyJwtSecret })).toThrow("MFA_KEY_NOT_AVAILABLE");
  });
});

describe("configuração TOTP", () => {
  it("recusa produção sem chave dedicada", () => {
    expect(() => validateTotpEncryptionConfiguration({ isProduction: true, currentKey: "", previousKeysRaw: "" })).toThrow("TOTP_ENCRYPTION_KEY_REQUIRED");
  });

  it("recusa chave com tamanho inválido", () => {
    expect(() => validateTotpEncryptionConfiguration({ isProduction: true, currentKey: Buffer.alloc(16).toString("base64url"), previousKeysRaw: "" })).toThrow("TOTP_ENCRYPTION_KEY_INVALID");
  });

  it("aceita produção com 32 bytes e lista opcional de chaves anteriores", () => {
    expect(() => validateTotpEncryptionConfiguration({ isProduction: true, currentKey, previousKeysRaw: previousKey })).not.toThrow();
  });
});
