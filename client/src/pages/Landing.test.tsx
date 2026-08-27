// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const submitDemo = vi.fn();
const submitContact = vi.fn();
vi.mock("@/lib/trpc", () => ({ trpc: { demoRequests: { submit: { useMutation: () => ({ mutate: submitDemo, isPending: false, error: null }) } }, contactRequests: { submit: { useMutation: () => ({ mutate: submitContact, isPending: false, error: null }) } } } }));
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
    expect(screen.getByRole("button", { name: /enviar mensagem/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Como podemos ajudar?")).toBeInTheDocument();
    expect(screen.getByLabelText("Melhor data e horário para a demonstração")).toHaveAttribute("type", "datetime-local");
    expect(screen.getByLabelText("Vídeo visual de apresentação do W9 Campanhas Eleitorais")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^ouvir$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /som ligado/i })).toBeInTheDocument();
    expect(screen.getAllByText(/locução pt-br/i)).toHaveLength(2);
    expect(screen.getByText("VOZ NATURAL PT-BR")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /CRM eleitoral/i })).toHaveAttribute("href", "/crm-eleitoral");
    expect(screen.getByRole("link", { name: /Financeiro e jurídico/i })).toHaveAttribute("href", "/financeiro-e-juridico-de-campanha");
    const narration = document.querySelector("audio");
    expect(narration).toHaveAttribute("preload", "auto");
    expect(narration).toHaveAttribute("autoplay");
    expect(narration?.querySelector("source")).toHaveAttribute("src", "/manus-storage/w9-trailer-narracao-natural_557e1c29.wav");
    const trailer = screen.getByLabelText("Vídeo visual de apresentação do W9 Campanhas Eleitorais");
    expect(trailer).toHaveAttribute("poster", "/manus-storage/w9-campanhas-eleitorais-trailer-poster_d8022fb8.jpg");
    expect(trailer.querySelector("source")).toHaveAttribute("src", "/manus-storage/w9-campanhas-eleitorais-trailer-web_ba22df5b.mp4");
  });
});
