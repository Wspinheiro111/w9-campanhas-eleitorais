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
    expect(screen.getByText("Quem quer se eleger não pode depender de planilhas soltas.")).toBeInTheDocument();
    expect(screen.getByText("Acesso à conta")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar na conta" })).toHaveAttribute("href", "/login");
    expect(screen.getByText("Solicite sua demonstração")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Solicitar demonstração" })).toBeInTheDocument();
    expect(screen.getByLabelText("Vídeo de apresentação do W9 Campanhas Eleitorais")).toBeInTheDocument();
  });
});
