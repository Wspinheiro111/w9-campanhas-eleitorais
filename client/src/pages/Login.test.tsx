// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const loginMutate = vi.fn();

vi.mock("wouter", () => ({ useLocation: () => ["/login", vi.fn()] }));
vi.mock("@/lib/trpc", () => ({ trpc: { auth: { login: { useMutation: () => ({ mutate: loginMutate, isPending: false }) }, register: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }, beginPasskeyLogin: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) }, finishPasskeyLogin: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) } } } }));

import Login from "./Login";

describe("acesso local", () => {
  it("envia e-mail e senha pelo formulário de login", async () => {
    const user = userEvent.setup();
    render(<Login />);
    const [email] = screen.getAllByRole("textbox");
    await user.type(email, "gestor@teste.com");
    await user.type(screen.getByLabelText(/senha/i), "senha-segura-123");
    await user.click(screen.getByRole("button", { name: /entrar com e-mail/i }));
    expect(loginMutate).toHaveBeenCalledWith({ email: "gestor@teste.com", password: "senha-segura-123" });
  });
});
