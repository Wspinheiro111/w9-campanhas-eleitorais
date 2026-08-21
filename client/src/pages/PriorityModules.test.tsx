// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ voters: [] as unknown[], records: [] as unknown[], crises: [] as unknown[], decisions: [] as unknown[], create: vi.fn(), revoke: vi.fn(), crisisCreate: vi.fn(), crisisUpdate: vi.fn(), addDecision: vi.fn() }));
vi.mock("@/contexts/CampaignContext", () => ({ useCampaign: () => ({ activeCampaign: { id: 1, memberRole: "admin" } }) }));
vi.mock("@/components/CampaignShell", () => ({ PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>, EmptyPanel: ({ title }: { title: string }) => <p>{title}</p> }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ consent: { list: { invalidate: vi.fn() } }, crisis: { list: { invalidate: vi.fn() }, decisions: { invalidate: vi.fn() } } }),
    voters: { list: { useQuery: () => ({ data: mocks.voters, isLoading: false }) } },
    team: { list: { useQuery: () => ({ data: [{ id: 10, name: "Coordenação" }], isLoading: false }) } },
    consent: { list: { useQuery: () => ({ data: mocks.records }) }, create: { useMutation: () => ({ mutate: mocks.create, isPending: false }) }, revoke: { useMutation: () => ({ mutate: mocks.revoke, isPending: false }) } },
    crisis: { list: { useQuery: () => ({ data: mocks.crises }) }, decisions: { useQuery: () => ({ data: mocks.decisions }) }, create: { useMutation: () => ({ mutate: mocks.crisisCreate, isPending: false }) }, update: { useMutation: () => ({ mutate: mocks.crisisUpdate, isPending: false }) }, addDecision: { useMutation: () => ({ mutate: mocks.addDecision, isPending: false }) } },
  },
}));

import ConsentCenter from "./ConsentCenter";
import CrisisRoom from "./CrisisRoom";

describe("interfaces de consentimento e crise", () => {
  afterEach(cleanup);
  beforeEach(() => { mocks.voters = []; mocks.records = []; mocks.crises = []; mocks.decisions = []; mocks.create.mockReset(); mocks.revoke.mockReset(); mocks.crisisCreate.mockReset(); mocks.crisisUpdate.mockReset(); mocks.addDecision.mockReset(); });

  it("exibe validade no formulário de consentimento", () => {
    render(<ConsentCenter />);
    expect(screen.getByLabelText("Validade")).toHaveAttribute("type", "date");
    expect(screen.getByText(/sem data, a autorização permanece ativa/i)).toBeInTheDocument();
  });

  it("permite revogar um consentimento e preserva sua validade no histórico", () => {
    mocks.voters = [{ id: 5, name: "Contato Teste" }]; mocks.records = [{ id: 11, purpose: "Relacionamento", source: "Formulário", evidence: "Checkbox", consentedAt: new Date("2026-08-01T12:00:00Z"), expiresAt: new Date("2026-12-31T12:00:00Z"), status: "active" }];
    render(<ConsentCenter />);
    fireEvent.change(screen.getByLabelText("Contato"), { target: { value: "5" } });
    expect(screen.getByText(/Válido até/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Revogar" }));
    expect(mocks.revoke).toHaveBeenCalledWith({ consentId: 11 });
  });

  it("exibe responsável e prazo ao abrir um caso de crise", () => {
    render(<CrisisRoom />);
    expect(screen.getByLabelText("Responsável")).toBeInTheDocument();
    expect(screen.getByLabelText("Prazo de resposta")).toHaveAttribute("type", "date");
  });

  it("abre, atualiza e exibe o histórico de um caso de crise", () => {
    mocks.crises = [{ crisis: { id: 21, title: "Boato em circulação", description: "Monitorar", severity: "high", status: "open", dueAt: new Date("2026-08-30T12:00:00Z") }, assignee: { name: "Coordenação" } }]; mocks.decisions = [{ id: 31, decision: "Publicar esclarecimento", createdAt: new Date("2026-08-21T12:00:00Z") }];
    render(<CrisisRoom />);
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Caso novo" } }); fireEvent.change(screen.getByLabelText("Contexto"), { target: { value: "Fato verificado" } }); fireEvent.click(screen.getByRole("button", { name: "Abrir caso" }));
    expect(mocks.crisisCreate).toHaveBeenCalledWith(expect.objectContaining({ campaignId: 1, title: "Caso novo", description: "Fato verificado" }));
    fireEvent.change(screen.getByLabelText("Status de Boato em circulação"), { target: { value: "responding" } });
    expect(mocks.crisisUpdate).toHaveBeenCalledWith({ crisisId: 21, status: "responding" });
    fireEvent.click(screen.getByRole("button", { name: "Ver histórico de decisões" }));
    expect(screen.getByText("Publicar esclarecimento")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Registrar decisão ou encaminhamento"), { target: { value: "Acionar equipe" } }); fireEvent.click(screen.getByRole("button", { name: "Adicionar decisão a Boato em circulação" }));
    expect(mocks.addDecision).toHaveBeenCalledWith({ crisisId: 21, decision: "Acionar equipe" });
  });
});
