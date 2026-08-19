// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/contexts/OrganizationContext", () => ({
  useOrganization: () => ({
    activeOrganizationId: 1,
    setActiveOrganizationId: vi.fn(),
    organizations: [{ organization: { id: 1, name: "Organização teste", legalName: null }, membership: { role: "viewer" } }],
  }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    organization: {
      invitations: {
        list: { useQuery: () => ({ data: [] }) },
        create: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      },
      members: {
        list: { useQuery: () => ({ data: [{ member: { id: 1, role: "viewer" }, user: { name: "Leitor", email: "leitor@teste.com" } }] }) },
        updateRole: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      },
    },
  },
}));

import Organizations from "./Organizations";

describe("permissões de organizações", () => {
  it("bloqueia controles de convite e papel para um leitor", () => {
    render(<Organizations />);

    expect(screen.getByRole("button", { name: /gerar convite/i })).toBeDisabled();
    expect(screen.getByText(/seu papel atual permite somente consulta/i)).toBeInTheDocument();
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
    screen.getAllByRole("combobox").forEach(control => expect(control).toBeDisabled());
  });
});
