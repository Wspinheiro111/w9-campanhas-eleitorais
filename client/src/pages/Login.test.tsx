// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const loginMutate = vi.fn();
const navigate = vi.fn();
let loginOptions: { onSuccess?: (result: { requiresMfa?: boolean }) => void } | undefined;
let finishPasskeyOptions: { onSuccess?: () => void } | undefined;

vi.mock("wouter", () => ({ useLocation: () => ["/login", navigate] }));
vi.mock("@/lib/trpc", () => ({ trpc: { auth: { login: { useMutation: (options: typeof loginOptions) => { loginOptions = options; return { mutate: loginMutate, isPending: false }; } }, register: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }, beginPasskeyLogin: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) }, finishPasskeyLogin: { useMutation: (options: typeof finishPasskeyOptions) => { finishPasskeyOptions = options; return { mutateAsync: vi.fn(), isPending: false }; } } } } }));

import Login from "./Login";

afterEach(() => {
  cleanup();
  loginMutate.mockClear();
  navigate.mockClear();
  loginOptions = undefined;
  finishPasskeyOptions = undefined;
});

describe("acesso local", () => {
  it("redireciona ao dashboard após login normal, MFA e passkey", () => {
    render(<Login />);
    act(() => loginOptions?.onSuccess?.({}));
    expect(navigate).toHaveBeenCalledWith("/painel");
    act(() => loginOptions?.onSuccess?.({ requiresMfa: true }));
    expect(screen.getByLabelText(/código do autenticador/i)).toBeInTheDocument();
    act(() => finishPasskeyOptions?.onSuccess?.());
    expect(navigate).toHaveBeenCalledWith("/painel");
  });

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
