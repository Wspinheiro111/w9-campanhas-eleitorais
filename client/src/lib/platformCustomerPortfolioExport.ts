import { w9PrintHeader, w9PrintStyles } from "./w9PdfBrand";

export type CustomerPortfolioRow = { organizationName: string; contactName: string; contactPhone: string; status: string; nextContactAt?: Date | string | null; nextContactNote?: string | null; accessReleasedAt?: Date | string | null; updatedAt: Date | string };
export const customerPortfolioColumns = [
  { key: "organizationName", label: "Organização", value: (row: CustomerPortfolioRow) => row.organizationName },
  { key: "contactName", label: "Responsável", value: (row: CustomerPortfolioRow) => row.contactName },
  { key: "contactPhone", label: "Telefone", value: (row: CustomerPortfolioRow) => row.contactPhone },
  { key: "status", label: "Status", value: (row: CustomerPortfolioRow) => row.status },
  { key: "nextContactAt", label: "Próximo contato", value: (row: CustomerPortfolioRow) => dateLabel(row.nextContactAt) },
  { key: "nextContactNote", label: "Pauta do próximo contato", value: (row: CustomerPortfolioRow) => row.nextContactNote ?? "" },
  { key: "accessReleasedAt", label: "Acesso liberado em", value: (row: CustomerPortfolioRow) => dateLabel(row.accessReleasedAt) },
  { key: "updatedAt", label: "Atualizado em", value: (row: CustomerPortfolioRow) => dateLabel(row.updatedAt) },
] as const;
export type CustomerPortfolioColumnKey = (typeof customerPortfolioColumns)[number]["key"];

const formulaSafe = (value: string) => /^[=+\-@]/.test(value) ? `'${value}` : value;
const csvCell = (value: string) => `"${formulaSafe(value).replace(/"/g, '""')}"`;
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] ?? char);
const dateLabel = (value?: Date | string | null) => value ? new Date(value).toLocaleString("pt-BR") : "—";

const selectedColumns = (keys?: CustomerPortfolioColumnKey[]) => customerPortfolioColumns.filter(column => !keys?.length || keys.includes(column.key));

export function buildCustomerPortfolioCsv(rows: CustomerPortfolioRow[], columns?: CustomerPortfolioColumnKey[]) {
  const selected = selectedColumns(columns);
  const header = selected.map(column => column.label);
  const values = rows.map(row => selected.map(column => column.value(row)));
  return `\uFEFF${[header, ...values].map(columns => columns.map(value => csvCell(value)).join(";")).join("\n")}`;
}

export function downloadCustomerPortfolioCsv(rows: CustomerPortfolioRow[], columns?: CustomerPortfolioColumnKey[]) {
  const blob = new Blob([buildCustomerPortfolioCsv(rows, columns)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "carteira-clientes-w9.csv"; anchor.click(); URL.revokeObjectURL(url);
}

export function buildCustomerPortfolioPrintDocument(rows: CustomerPortfolioRow[], columns?: CustomerPortfolioColumnKey[]) {
  const selected = selectedColumns(columns);
  const tableRows = rows.map(row => `<tr>${selected.map(column => `<td>${escapeHtml(column.value(row) || "—")}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${selected.length}">Nenhum cliente cadastrado.</td></tr>`;
  const headers = selected.map(column => `<th>${escapeHtml(column.label)}</th>`).join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><title>Carteira de clientes - W9 Campanhas Eleitorais</title><style>${w9PrintStyles}</style></head><body>${w9PrintHeader("Carteira de clientes")}<p class="w9-meta">Relatório gerado em ${new Date().toLocaleString("pt-BR")}</p><table><thead><tr>${headers}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
}

export function printCustomerPortfolio(rows: CustomerPortfolioRow[], columns?: CustomerPortfolioColumnKey[]) {
  const popup = window.open("", "_blank", "noopener,noreferrer"); if (!popup) return false;
  popup.document.write(buildCustomerPortfolioPrintDocument(rows, columns)); popup.document.close(); popup.focus(); window.setTimeout(() => popup.print(), 180); return true;
}
