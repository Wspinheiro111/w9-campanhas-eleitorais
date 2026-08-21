// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const organizationMock = vi.hoisted(() => ({ role: "viewer" }));
vi.mock("@/contexts/OrganizationContext", () => ({ useOrganization: () => ({ activeOrganizationId: 1, organizations: [{ organization: { id: 1, name: "Organização teste" }, membership: { role: organizationMock.role } }] }) }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    organization: {
      audit: {
        list: { useQuery: () => ({ data: [] }) },
        securityReport: { useQuery: () => ({ data: [{ version: "5601d352", title: "Auditoria de segurança", publishedAt: new Date("2026-08-21T12:06:00Z"), checks: [{ id: "uploads", label: "Uploads", detail: "Assinatura validada.", result: "passed" }] }] }) },
      },
    },
  },
}));

import AuditLog from "./AuditLog";

describe("painel de auditoria", () => {
  it("não exibe o histórico para um perfil leitor", () => {
    organizationMock.role = "viewer";
    render(<AuditLog />);
    expect(screen.getByText(/acesso restrito/i)).toBeInTheDocument();
    expect(screen.getByText(/apenas administradores e gestores/i)).toBeInTheDocument();
  });

  it("exibe o relatório de segurança por versão para gestão", () => {
    organizationMock.role = "admin";
    render(<AuditLog />);
    expect(screen.getByText(/Relatórios de segurança por versão/i)).toBeInTheDocument();
    expect(screen.getByText(/Versão 5601d352/i)).toBeInTheDocument();
  });
});
