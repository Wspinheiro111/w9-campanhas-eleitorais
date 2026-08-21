export const FINANCIAL_AMOUNT_PLACEHOLDER = "A consultar";

const statusLabels = {
  draft: "Rascunho",
  pending: "Aguardando revisão",
  under_review: "Em revisão",
  approved: "Aprovado",
  rejected: "Rejeitado",
  paid: "Pago / recebido",
  reconciled: "Conciliado",
  closed: "Encerrado",
  cancelled: "Cancelado",
} as const;

const nextStatus = {
  pending: "under_review",
  under_review: "approved",
  approved: "paid",
  paid: "reconciled",
  reconciled: "closed",
} as const;

export type FinancialPresentationStatus = keyof typeof statusLabels;

export function getFinancialStatusLabel(status: string) {
  return statusLabels[status as FinancialPresentationStatus] ?? status;
}

export function getNextFinancialStatus(status: string) {
  return nextStatus[status as keyof typeof nextStatus] ?? null;
}

export function getNextFinancialStatusActionLabel(status: string) {
  const next = getNextFinancialStatus(status);
  return next ? `Marcar como ${getFinancialStatusLabel(next).toLowerCase()}` : null;
}
