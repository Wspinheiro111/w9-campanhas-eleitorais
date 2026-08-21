import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./campaignDb", () => ({
  getCampaignAccess: vi.fn(),
  createFinancialEntry: vi.fn(),
  getFinancialEntry: vi.fn(),
  updateFinancialEntryReview: vi.fn(),
  getFinancialSummary: vi.fn(),
}));

import * as db from "./campaignDb";
import { appRouter } from "./routers";
import {
  getInitialFinancialEntryStatus,
  isFinancialEntryIncludedInActiveBalance,
  isFinancialStatusTransitionAllowed,
  type FinancialEntryStatus,
} from "./financialStatus";

const campaign = {
  id: 1,
  organizationId: 3,
  ownerId: 99,
  name: "Campanha de teste",
  candidateName: "Candidata",
  electionLabel: "Vereança",
  region: "Centro",
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date(),
};

function context(): TrpcContext {
  return {
    user: { id: 99, openId: "finance-user", name: "Coordenação", email: "coord@example.com", loginMethod: "local", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {}, get: () => "example.test" } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function access(role: "admin" | "coordinator" | "partner") {
  return { campaign, member: { id: 10, campaignId: 1, userId: 99, role }, organizationMember: { id: 8, organizationId: 3, userId: 99, role: "manager" } };
}

let currentStatus: FinancialEntryStatus;

function entry() {
  return { id: 71, campaignId: 1, entryType: "expense", category: "Serviços", counterpartyName: "Fornecedor", amountCents: 12500, status: currentStatus };
}

const createPayload = {
  campaignId: 1,
  category: "Mobilização",
  counterpartyName: "Contraparte de teste",
  amountCents: 12500,
};

beforeEach(() => {
  currentStatus = "pending";
  vi.mocked(db.getFinancialEntry).mockImplementation(async () => entry() as never);
  vi.mocked(db.updateFinancialEntryReview).mockImplementation(async input => {
    currentStatus = input.status;
  });
});

afterEach(() => vi.clearAllMocks());

describe("política do ciclo financeiro", () => {
  it("inicia lançamentos não liquidados como pendentes e lançamentos liquidados como pagos", () => {
    expect(getInitialFinancialEntryStatus(null)).toBe("pending");
    expect(getInitialFinancialEntryStatus(undefined)).toBe("pending");
    expect(getInitialFinancialEntryStatus(new Date())).toBe("paid");
  });

  it("permite o fluxo pendente, em revisão, aprovado, pago, conciliado e encerrado", () => {
    expect(isFinancialStatusTransitionAllowed("pending", "under_review")).toBe(true);
    expect(isFinancialStatusTransitionAllowed("under_review", "approved")).toBe(true);
    expect(isFinancialStatusTransitionAllowed("approved", "paid")).toBe(true);
    expect(isFinancialStatusTransitionAllowed("paid", "reconciled")).toBe(true);
    expect(isFinancialStatusTransitionAllowed("reconciled", "closed")).toBe(true);
  });

  it("bloqueia saltos de status e saídas de estados finais", () => {
    expect(isFinancialStatusTransitionAllowed("pending", "paid")).toBe(false);
    expect(isFinancialStatusTransitionAllowed("approved", "under_review")).toBe(false);
    expect(isFinancialStatusTransitionAllowed("paid", "closed")).toBe(false);
    expect(isFinancialStatusTransitionAllowed("reconciled", "paid")).toBe(false);
    expect(isFinancialStatusTransitionAllowed("closed", "reconciled")).toBe(false);
    expect(isFinancialStatusTransitionAllowed("cancelled", "under_review")).toBe(false);
  });

  it("mantém no saldo ativo lançamentos em andamento e exclui rejeitados ou cancelados", () => {
    expect(isFinancialEntryIncludedInActiveBalance("pending")).toBe(true);
    expect(isFinancialEntryIncludedInActiveBalance("approved")).toBe(true);
    expect(isFinancialEntryIncludedInActiveBalance("paid")).toBe(true);
    expect(isFinancialEntryIncludedInActiveBalance("rejected")).toBe(false);
    expect(isFinancialEntryIncludedInActiveBalance("cancelled")).toBe(false);
    expect(isFinancialEntryIncludedInActiveBalance("closed")).toBe(false);
  });
});

describe("financeLegal.entries", () => {
  it.each(["income", "expense"] as const)("encaminha a criação de %s para o ciclo financeiro", async entryType => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("coordinator") as never);
    vi.mocked(db.createFinancialEntry).mockResolvedValue(entryType === "income" ? 101 : 102);

    const result = await appRouter.createCaller(context()).financeLegal.entries.create({ ...createPayload, entryType });

    expect(result).toEqual({ id: entryType === "income" ? 101 : 102 });
    expect(db.createFinancialEntry).toHaveBeenCalledWith(expect.objectContaining({ ...createPayload, entryType, createdByUserId: 99, paidAt: null }));
  });

  it("registra as transições permitidas de revisão até o encerramento pela coordenação", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("coordinator") as never);
    const caller = appRouter.createCaller(context());

    for (const [from, status] of [["pending", "under_review"], ["under_review", "approved"], ["approved", "paid"], ["paid", "reconciled"], ["reconciled", "closed"]] as const) {
      currentStatus = from;
      await expect(caller.financeLegal.entries.review({ entryId: 71, status, reviewNotes: `Transição ${from} para ${status}` })).resolves.toEqual({ success: true });
      expect(currentStatus).toBe(status);
    }

    expect(db.updateFinancialEntryReview).toHaveBeenNthCalledWith(5, expect.objectContaining({ id: 71, status: "closed", reviewedByUserId: 99 }));
  });

  it("bloqueia salto direto de pendente para pago", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("admin") as never);
    currentStatus = "pending";

    await expect(appRouter.createCaller(context()).financeLegal.entries.review({ entryId: 71, status: "paid" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.updateFinancialEntryReview).not.toHaveBeenCalled();
  });

  it("impede parceiro de revisar ou aprovar receitas e despesas", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("partner") as never);

    await expect(appRouter.createCaller(context()).financeLegal.entries.review({ entryId: 71, status: "under_review" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.updateFinancialEntryReview).not.toHaveBeenCalled();
  });

  it("rejeita status fora do ciclo financeiro suportado", async () => {
    await expect(appRouter.createCaller(context()).financeLegal.entries.review({ entryId: 71, status: "archived" as never })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.getFinancialEntry).not.toHaveBeenCalled();
  });

  it("permite à coordenação consultar o resumo financeiro consolidado", async () => {
    const summary = { incomeCents: 50000, expenseCents: 12500, balanceCents: 37500, paidIncomeCents: 0, paidExpenseCents: 0, pendingCount: 1 };
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("admin") as never);
    vi.mocked(db.getFinancialSummary).mockResolvedValue(summary as never);

    await expect(appRouter.createCaller(context()).financeLegal.summary({ campaignId: 1 })).resolves.toEqual(summary);
    expect(db.getFinancialSummary).toHaveBeenCalledWith(1);
  });
});
