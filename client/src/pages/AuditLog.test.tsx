// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/contexts/OrganizationContext", () => ({ useOrganization: () => ({ activeOrganizationId: 1, organizations: [{ organization: { id: 1, name: "Organização teste" }, membership: { role: "viewer" } }] }) }));
vi.mock("@/lib/trpc", () => ({ trpc: { organization: { audit: { list: { useQuery: () => ({ data: [] }) } } } } }));

import AuditLog from "./AuditLog";

describe("painel de auditoria", () => {
  it("não exibe o histórico para um perfil leitor", () => {
    render(<AuditLog />);
    expect(screen.getByText(/acesso restrito/i)).toBeInTheDocument();
    expect(screen.getByText(/apenas administradores e gestores/i)).toBeInTheDocument();
  });
});
