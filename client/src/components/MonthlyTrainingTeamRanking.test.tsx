// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ refetch: vi.fn(), invalidate: vi.fn(), setGoal: vi.fn(), saveRules: vi.fn(), recordHistory: vi.fn(), mode: "error" as "error" | "success", progress: 50, historyError: false, priorError: false, rankingCalls: 0 }));
vi.mock("@/contexts/CampaignContext", () => ({ useCampaign: () => ({ activeCampaign: { id: 1, name: "Teste" } }) }));
vi.mock("@/lib/trpc", () => ({ trpc: { useUtils: () => ({ volunteers: { training: { monthlyRanking: { invalidate: mocks.invalidate }, recognition: { rules: { invalidate: mocks.invalidate }, history: { invalidate: mocks.invalidate } } } } }), volunteers: { training: { monthlyRanking: { useQuery: () => { mocks.rankingCalls += 1; const isPrior = mocks.rankingCalls % 2 === 0; if (isPrior && mocks.priorError) return { isLoading: false, isError: true, refetch: mocks.refetch }; return mocks.mode === "error" && !isPrior ? ({ isLoading: false, isError: true, refetch: mocks.refetch }) : ({ isLoading: false, isError: false, data: [{ coordinatorMemberId: 10, name: "Norte", region: "Norte", assignedVolunteers: 2, completedTrainingsThisMonth: 1, targetCompletions: 2, goalProgress: mocks.progress, hasGoal: true }], refetch: mocks.refetch }); } }, setMonthlyGoal: { useMutation: () => ({ mutate: mocks.setGoal, isPending: false }) }, recognition: { rules: { useQuery: () => ({ isLoading: false, isError: false, data: { achievedThreshold: 100, standoutThreshold: 125 }, refetch: mocks.refetch }) }, history: { useQuery: () => ({ isLoading: false, isError: mocks.historyError, data: mocks.historyError ? undefined : [], refetch: mocks.refetch }) }, updateRules: { useMutation: () => ({ mutate: mocks.saveRules, isPending: false }) }, recordHistory: { useMutation: () => ({ mutate: mocks.recordHistory, isPending: false }) } } } } } }));

import { describePositionChange, MonthlyTrainingTeamRanking } from "./MonthlyTrainingTeamRanking";

describe("ranking mensal de formação", () => {
  beforeEach(() => { mocks.mode = "error"; mocks.progress = 50; mocks.historyError = false; mocks.priorError = false; mocks.rankingCalls = 0; mocks.refetch.mockReset(); });
  it("mostra estado de erro e permite nova tentativa", () => {
    render(<MonthlyTrainingTeamRanking />);
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar o ranking mensal");
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(mocks.refetch).toHaveBeenCalledTimes(2);
  });

  it("mostra trilhas concluídas integralmente no cenário positivo", () => {
    mocks.mode = "success";
    render(<MonthlyTrainingTeamRanking />);
    expect(screen.getByText("Trilhas concluídas no mês")).toBeInTheDocument();
    expect(screen.getByText(/1 trilha\(s\) concluída\(s\) no mês/)).toBeInTheDocument();
  });

  it("destaca medalha por superação da meta e controles de exportação", () => {
    mocks.mode = "success"; mocks.progress = 125;
    render(<MonthlyTrainingTeamRanking />);
    expect(screen.getByText("Destaque mensal")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "CSV" }).at(-1)).toBeEnabled();
    expect(screen.getAllByRole("button", { name: "PDF" }).at(-1)).toBeEnabled();
  });

  it("informa falhas do histórico e da referência do mês anterior", () => {
    mocks.mode = "success"; mocks.historyError = true; mocks.priorError = true;
    render(<MonthlyTrainingTeamRanking />);
    expect(screen.getByText(/Não foi possível comparar com/)).toBeInTheDocument();
    expect(screen.getByText("Não foi possível carregar o histórico.")).toBeInTheDocument();
  });

  it("descreve corretamente a comparação de posição entre meses", () => {
    expect(describePositionChange(2, 1)).toBe("Subiu 1 posição(ões)");
    expect(describePositionChange(1, 3)).toBe("Caiu 2 posição(ões)");
    expect(describePositionChange(1, 1)).toBe("Manteve a posição");
    expect(describePositionChange(null, 1)).toBe("Sem posição anterior");
  });
});
