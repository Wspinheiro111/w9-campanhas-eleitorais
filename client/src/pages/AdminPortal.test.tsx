// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const authState = { user: { email: "gerentewilliam.pinheiro@gmail.com", name: "William" }, loading: false, logout: vi.fn() };
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => authState }));
vi.mock("@/components/BrandMark", () => ({ BrandMark: () => <span>W9</span> }));
vi.mock("./AdminGeneral", () => ({ default: () => <div>Cadastro de usuários master</div> }));
vi.mock("./AdminCommandCenter", () => ({ default: () => <div>Visão geral da plataforma</div> }));

import AdminPortal from "./AdminPortal";

afterEach(() => { cleanup(); authState.user = { email: "gerentewilliam.pinheiro@gmail.com", name: "William" }; });

describe("AdminPortal", () => {
  it("renderiza o cadastro fora do layout operacional para o proprietário", () => {
    render(<AdminPortal />);
    expect(screen.getByText(/central de comando w9/i)).toBeInTheDocument();
    expect(screen.getByText(/visão geral da plataforma/i)).toBeInTheDocument();
  });

  it("bloqueia qualquer usuário diferente do proprietário", () => {
    authState.user = { email: "gestor@cliente.com", name: "Cliente" };
    render(<AdminPortal />);
    expect(screen.getByText(/acesso restrito/i)).toBeInTheDocument();
    expect(screen.queryByText(/cadastro de usuários master/i)).not.toBeInTheDocument();
  });
});
