// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ refetch: vi.fn(), invalidate: vi.fn(), setGoal: vi.fn(), mode: "error" as "error" | "success" }));
vi.mock("@/contexts/CampaignContext", () => ({ useCampaign: () => ({ activeCampaign: { id: 1, name: "Teste" } }) }));
vi.mock("@/lib/trpc", () => ({ trpc: { useUtils: () => ({ volunteers: { training: { monthlyRanking: { invalidate: mocks.invalidate } } } }), volunteers: { training: { monthlyRanking: { useQuery: () => mocks.mode === "error" ? ({ isLoading: false, isError: true, refetch: mocks.refetch }) : ({ isLoading: false, isError: false, data: [{ coordinatorMemberId: 10, name: "Norte", region: "Norte", assignedVolunteers: 2, completedTrainingsThisMonth: 1, targetCompletions: 2, goalProgress: 50, hasGoal: true }], refetch: mocks.refetch }) }, setMonthlyGoal: { useMutation: () => ({ mutate: mocks.setGoal, isPending: false }) } } } } }));

import { MonthlyTrainingTeamRanking } from "./MonthlyTrainingTeamRanking";

describe("ranking mensal de formação", () => {
  beforeEach(() => { mocks.mode = "error"; mocks.refetch.mockReset(); });
  it("mostra estado de erro e permite nova tentativa", () => {
    render(<MonthlyTrainingTeamRanking />);
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar o ranking mensal");
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
  });

  it("mostra trilhas concluídas integralmente no cenário positivo", () => {
    mocks.mode = "success";
    render(<MonthlyTrainingTeamRanking />);
    expect(screen.getByText("Trilhas concluídas no mês")).toBeInTheDocument();
    expect(screen.getByText(/1 trilha\(s\) concluída\(s\) no mês/)).toBeInTheDocument();
  });
});
