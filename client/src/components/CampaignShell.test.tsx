// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/contexts/CampaignContext", () => ({
  useCampaign: () => ({ activeCampaign: { id: 7, name: "Campanha teste" }, campaigns: [], loading: false, refetchCampaigns: vi.fn() }),
}));
vi.mock("@/contexts/OrganizationContext", () => ({ useOrganization: () => ({ activeOrganizationId: 3 }) }));
vi.mock("@/lib/trpc", () => ({ trpc: { campaign: { create: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } } } }));

import { CampaignGate } from "./CampaignShell";

describe("CampaignGate", () => {
  it("renderiza o conteúdo protegido sem chamada inválida de hooks", () => {
    render(<CampaignGate><p>Painel protegido carregado</p></CampaignGate>);
    expect(screen.getByText("Painel protegido carregado")).toBeInTheDocument();
  });
});
