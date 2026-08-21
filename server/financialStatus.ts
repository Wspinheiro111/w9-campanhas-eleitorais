export const financialEntryStatuses = ["draft", "pending", "under_review", "approved", "rejected", "paid", "cancelled"] as const;
export const financialReviewStatuses = ["under_review", "approved", "rejected", "paid", "cancelled"] as const;

export type FinancialEntryStatus = (typeof financialEntryStatuses)[number];
export type FinancialReviewStatus = (typeof financialReviewStatuses)[number];

const allowedTransitions: Record<FinancialEntryStatus, readonly FinancialReviewStatus[]> = {
  draft: ["under_review", "cancelled"],
  pending: ["under_review", "cancelled"],
  under_review: ["approved", "rejected", "cancelled"],
  approved: ["paid", "cancelled"],
  rejected: ["under_review", "cancelled"],
  paid: [],
  cancelled: [],
};

export function getInitialFinancialEntryStatus(paidAt?: Date | null): "pending" | "paid" {
  return paidAt ? "paid" : "pending";
}

export function isFinancialStatusTransitionAllowed(from: FinancialEntryStatus, to: FinancialReviewStatus) {
  return from === to || allowedTransitions[from].includes(to);
}

export function isFinancialEntryIncludedInActiveBalance(status: FinancialEntryStatus) {
  return !["rejected", "cancelled"].includes(status);
}
