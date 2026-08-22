// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const submitDemo = vi.fn();
vi.mock("@/lib/trpc", () => ({ trpc: { demoRequests: { submit: { useMutation: () => ({ mutate: submitDemo, isPending: false, error: null }) } } } }));
import Landing from "./Landing";

describe("landing comercial", () => {
  it("apresenta o sistema, capta demonstração e mantém o acesso à conta no encerramento", () => {
    render(<Landing />);
    expect(screen.getByText(/Toda campanha sente a mesma dor/i)).toBeInTheDocument();
    expect(screen.getByText("+1 milhão")).toBeInTheDocument();
    expect(screen.getByText("Acesso à conta")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /entrar na conta/i })).toHaveAttribute("href", "/login");
    expect(screen.getByText("Quero uma demonstração")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /solicitar demonstração/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Melhor data e horário para a demonstração")).toHaveAttribute("type", "datetime-local");
    expect(screen.getByLabelText("Vídeo de apresentação do W9 Campanhas Eleitorais")).toBeInTheDocument();
  });
});
