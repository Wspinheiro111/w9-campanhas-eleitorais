// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { W9ReportGenerationOverlay } from "./W9ReportGenerationOverlay";

describe("W9ReportGenerationOverlay", () => {
  it("exibe o monograma e a mensagem de geração enquanto ativo", () => {
    render(<W9ReportGenerationOverlay active />);
    expect(screen.getByRole("status", { name: "Gerando relatório em PDF" })).toBeInTheDocument();
    expect(screen.getByText("W9")).toBeInTheDocument();
    expect(screen.getByText("Preparando relatório")).toBeInTheDocument();
  });

  it("não ocupa a página quando não há exportação em andamento", () => {
    const { container } = render(<W9ReportGenerationOverlay active={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
