// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReportPdfExportDialog } from "./ReportPdfExportDialog";

describe("ReportPdfExportDialog", () => {
  it("encaminha subtítulo e observações preenchidos antes da exportação", () => {
    const confirm = vi.fn();
    render(<ReportPdfExportDialog reportTitle="Progresso da formação" onConfirm={confirm} />);
    fireEvent.click(screen.getByRole("button", { name: "Exportar PDF" }));
    fireEvent.change(screen.getByLabelText("Subtítulo personalizado"), { target: { value: "Reunião de coordenação" } });
    fireEvent.change(screen.getByLabelText("Observações de capa"), { target: { value: "Prioridade para a equipe territorial." } });
    fireEvent.click(screen.getByRole("button", { name: "Gerar relatório" }));
    expect(confirm).toHaveBeenCalledWith({ subtitle: "Reunião de coordenação", notes: "Prioridade para a equipe territorial." });
  });
});
