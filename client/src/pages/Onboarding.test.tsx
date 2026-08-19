// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const createMutate = vi.fn();

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 7, name: "Gestora" }, loading: false }) }));
vi.mock("wouter", () => ({ useLocation: () => ["/onboarding", vi.fn()] }));
vi.mock("@/lib/trpc", () => ({ trpc: { useUtils: () => ({ organization: { mine: { invalidate: vi.fn() } } }), organization: { mine: { useQuery: () => ({ data: [], isLoading: false }) }, create: { useMutation: () => ({ mutate: createMutate, isPending: false }) }, invitations: { accept: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } } } } }));

import Onboarding from "./Onboarding";

describe("onboarding organizacional", () => {
  it("cria a primeira organização a partir do formulário", async () => {
    const user = userEvent.setup();
    render(<Onboarding />);
    await user.type(screen.getByPlaceholderText(/movimento cidade viva/i), "Organização Cívica");
    await user.click(screen.getByRole("button", { name: /criar organização segura/i }));
    expect(createMutate).toHaveBeenCalledWith({ name: "Organização Cívica", legalName: undefined, fiscalId: undefined });
  });
});
