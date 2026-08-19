// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const createTask = vi.fn();

vi.mock("@/contexts/CampaignContext", () => ({
  useCampaign: () => ({ activeCampaign: { id: 1, name: "Campanha teste", memberRole: "admin" } }),
}));

vi.mock("@/components/CampaignShell", () => ({
  CampaignGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  EmptyPanel: ({ title, action }: { title: string; action?: React.ReactNode }) => <section><h2>{title}</h2>{action}</section>,
  PageHeader: ({ title, action }: { title: string; action?: React.ReactNode }) => <header><h1>{title}</h1>{action}</header>,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    tasks: {
      list: { useQuery: () => ({ data: [], isLoading: false, refetch: vi.fn() }) },
      create: { useMutation: () => ({ mutate: createTask, isPending: false }) },
      updateStatus: { useMutation: () => ({ mutate: vi.fn() }) },
    },
    goals: {
      list: { useQuery: () => ({ data: [], refetch: vi.fn() }) },
      create: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
    team: { list: { useQuery: () => ({ data: [] }) } },
  },
}));

import Tasks from "./Tasks";

describe("fluxo de tarefas", () => {
  it("abre o formulário pelo estado vazio e envia a tarefa preenchida", async () => {
    const user = userEvent.setup();
    render(<Tasks />);

    await user.click(screen.getByRole("button", { name: /criar primeira tarefa/i }));
    await user.type(screen.getByLabelText("Tarefa"), "Revisar agenda territorial");
    fireEvent.submit(screen.getByLabelText("Tarefa").closest("form")!);

    expect(createTask).toHaveBeenCalledWith(expect.objectContaining({ campaignId: 1, title: "Revisar agenda territorial" }));
  });
});
