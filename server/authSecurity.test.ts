import { describe, expect, it } from "vitest";
import { hashIp, hashSecurityIdentifier } from "./authSecurity";

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
