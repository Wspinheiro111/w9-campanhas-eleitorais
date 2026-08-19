// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/contexts/OrganizationContext", () => ({ useOrganization: () => ({ activeOrganizationId: 1, organizations: [{ organization: { id: 1, name: "Org técnica" }, membership: { role: "admin" } }] }) }));
vi.mock("@/lib/trpc", () => ({ trpc: { organization: { performance: { byRoute: { useQuery: () => ({ isLoading: false, data: { summary: { requests: 24, averageDurationMs: 125, errorCount: 2, maxDurationMs: 480 }, routes: [{ route: "campaign.list", method: "GET", requests: 24, averageDurationMs: 125, maxDurationMs: 480, errorCount: 2 }] }, refetch: vi.fn() }) } } } } }));

import TechnicalPerformance from "./TechnicalPerformance";

describe("painel técnico", () => {
  it("mostra indicadores e o ranking de rotas da organização ativa", () => {
    render(<TechnicalPerformance />);
    expect(screen.getByText("Desempenho por rota")).toBeInTheDocument();
    expect(screen.getByText("campaign.list")).toBeInTheDocument();
    expect(screen.getAllByText("24").length).toBeGreaterThan(0);
    expect(screen.getAllByText("125 ms").length).toBeGreaterThan(0);
  });
});
