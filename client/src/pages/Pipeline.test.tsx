// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const moveMutate = vi.fn();
vi.mock("@/contexts/CampaignContext", () => ({ useCampaign: () => ({ activeCampaign: { id: 1 } }) }));
vi.mock("@/components/CampaignShell", () => ({ CampaignGate: ({ children }: { children: React.ReactNode }) => <>{children}</>, EmptyPanel: ({ title }: { title: string }) => <div>{title}</div>, PageHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock("@/lib/trpc", () => ({ trpc: { voters: { list: { useQuery: () => ({ data: [{ id: 22, name: "Ana", neighborhood: "Centro", pipelineStage: "identified" }], isLoading: false, refetch: vi.fn() }) }, movePipeline: { useMutation: () => ({ mutate: moveMutate, isPending: false }) } }, followups: { list: { useQuery: () => ({ data: [], refetch: vi.fn() }) }, updateStatus: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } } } }));

import Pipeline from "./Pipeline";

describe("pipeline", () => {
  it("move um contato para a próxima etapa", async () => {
    const user = userEvent.setup();
    render(<Pipeline />);
    await user.click(screen.getByRole("button", { name: /mover para abordados/i }));
    expect(moveMutate).toHaveBeenCalledWith({ voterId: 22, pipelineStage: "approached" });
  });
});
