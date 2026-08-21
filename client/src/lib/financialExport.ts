import { FINANCIAL_AMOUNT_PLACEHOLDER, getFinancialStatusLabel } from "./financialPresentation";

type ExportableEntry = {
  id: number;
  entryType: "income" | "expense";
  category: string;
  counterpartyName: string;
  status: string;
  dueDate?: Date | string | null;
  paidAt?: Date | string | null;
};

type ExportableDocument = {
  id: number;
  documentType: string;
  title: string;
  status: string;
  expiresAt?: Date | string | null;
  fileName?: string | null;
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR");
const formatDate = (value?: Date | string | null) => value ? dateFormatter.format(new Date(value)) : "—";

export function escapeCsvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function buildFinancialExportRows(entries: ExportableEntry[], documents: ExportableDocument[]) {
  const entryRows = entries.map(entry => [
    "Lançamento",
    entry.entryType === "income" ? "Receita" : "Despesa",
    entry.category,
    entry.counterpartyName,
    FINANCIAL_AMOUNT_PLACEHOLDER,
    getFinancialStatusLabel(entry.status),
    formatDate(entry.dueDate),
    formatDate(entry.paidAt),
    "—",
  ]);
  const documentRows = documents.map(document => [
    "Documento jurídico",
    document.documentType,
    document.title,
    "—",
    FINANCIAL_AMOUNT_PLACEHOLDER,
    getFinancialStatusLabel(document.status),
    formatDate(document.expiresAt),
    "—",
    document.fileName ?? "Sem anexo",
  ]);
  return [
    ["Tipo", "Classificação", "Referência", "Contraparte", "Valor", "Status", "Vencimento", "Data de pagamento", "Anexo"],
    ...entryRows,
    ...documentRows,
  ];
}
