// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const previewMutate = vi.fn();
const commitMutate = vi.fn();
vi.mock("qrcode", () => ({ default: { toDataURL: vi.fn() } }));
vi.mock("@/contexts/CampaignContext", () => ({ useCampaign: () => ({ activeCampaign: { id: 1 } }) }));
vi.mock("@/components/CampaignShell", () => ({ CampaignGate: ({ children }: { children: React.ReactNode }) => <>{children}</>, EmptyPanel: ({ title, action }: { title: string; action?: React.ReactNode }) => <section><h2>{title}</h2>{action}</section>, PageHeader: ({ title, action }: { title: string; action?: React.ReactNode }) => <header><h1>{title}</h1>{action}</header> }));
vi.mock("@/lib/trpc", () => ({ trpc: { voters: { list: { useQuery: () => ({ data: [], isLoading: false, refetch: vi.fn() }) }, interactions: { useQuery: () => ({ data: [] }) }, create: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }, previewCsv: { useMutation: (options: { onSuccess: (value: unknown) => void }) => ({ mutate: (input: unknown) => { previewMutate(input); options.onSuccess({ errors: [], newContacts: [{ row: 2, name: "Ana", email: "ana@teste.com", phone: null }], updates: [], candidates: [] }); }, isPending: false }) }, commitCsv: { useMutation: () => ({ mutate: commitMutate, isPending: false }) }, addInteraction: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } } } }));

import Voters from "./Voters";

describe("importação de contatos", () => {
  it("analisa a planilha e permite confirmar a importação após a prévia", async () => {
    const user = userEvent.setup();
    render(<Voters />);
    await user.click(screen.getByRole("button", { name: /importar csv/i }));
    const file = new File(["nome;email;consentimento\nAna;ana@teste.com;Sim"], "contatos.csv", { type: "text/csv" });
    Object.defineProperty(file, "text", { value: () => Promise.resolve("nome;email;consentimento\nAna;ana@teste.com;Sim") });
    fireEvent.change(screen.getByLabelText(/selecionar arquivo csv/i), { target: { files: [file] } });
    await waitFor(() => expect(previewMutate).toHaveBeenCalledWith(expect.objectContaining({ campaignId: 1 })));
    expect(await screen.findByText(/1 novo\(s\) contato\(s\) serão criados/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /confirmar e aplicar importação/i }));
    expect(commitMutate).toHaveBeenCalledWith(expect.objectContaining({ campaignId: 1, approvedUpdateRows: [], approvedCandidateRows: [] }));
  });
});
