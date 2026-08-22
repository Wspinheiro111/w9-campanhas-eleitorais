export type CustomerPortfolioRow = { organizationName: string; contactName: string; contactPhone: string; status: string; nextContactAt?: Date | string | null; nextContactNote?: string | null; accessReleasedAt?: Date | string | null; updatedAt: Date | string };

const formulaSafe = (value: string) => /^[=+\-@]/.test(value) ? `'${value}` : value;
const csvCell = (value: string) => `"${formulaSafe(value).replace(/"/g, '""')}"`;
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] ?? char);
const dateLabel = (value?: Date | string | null) => value ? new Date(value).toLocaleString("pt-BR") : "—";

export function buildCustomerPortfolioCsv(rows: CustomerPortfolioRow[]) {
  const header = ["Organização", "Responsável", "Telefone", "Status", "Próximo contato", "Pauta do próximo contato", "Acesso liberado em", "Atualizado em"];
  const values = rows.map(row => [row.organizationName, row.contactName, row.contactPhone, row.status, dateLabel(row.nextContactAt), row.nextContactNote ?? "", dateLabel(row.accessReleasedAt), dateLabel(row.updatedAt)]);
  return `\uFEFF${[header, ...values].map(columns => columns.map(value => csvCell(value)).join(";")).join("\n")}`;
}

export function downloadCustomerPortfolioCsv(rows: CustomerPortfolioRow[]) {
  const blob = new Blob([buildCustomerPortfolioCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "carteira-clientes-w9.csv"; anchor.click(); URL.revokeObjectURL(url);
}

export function buildCustomerPortfolioPrintDocument(rows: CustomerPortfolioRow[]) {
  const tableRows = rows.map(row => `<tr><td>${escapeHtml(row.organizationName)}</td><td>${escapeHtml(row.contactName)}</td><td>${escapeHtml(row.contactPhone)}</td><td>${escapeHtml(row.status)}</td><td>${escapeHtml(dateLabel(row.nextContactAt))}</td><td>${escapeHtml(row.nextContactNote ?? "—")}</td></tr>`).join("") || `<tr><td colspan="6">Nenhum cliente cadastrado.</td></tr>`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><title>Carteira de clientes - W9</title><style>body{font-family:Arial,sans-serif;color:#17231d;margin:32px}h1{color:#103527;margin:0}p{color:#526159}table{width:100%;border-collapse:collapse;margin-top:22px;font-size:11px}th{background:#103527;color:white;text-align:left}th,td{border:1px solid #d8dfdb;padding:8px;vertical-align:top}tr:nth-child(even){background:#f5f8f6}@media print{body{margin:14px}}</style></head><body><h1>Carteira de clientes</h1><p>Relatório gerado em ${new Date().toLocaleString("pt-BR")}</p><table><thead><tr><th>Organização</th><th>Responsável</th><th>Telefone</th><th>Status</th><th>Próximo contato</th><th>Pauta</th></tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
}

export function printCustomerPortfolio(rows: CustomerPortfolioRow[]) {
  const popup = window.open("", "_blank", "noopener,noreferrer"); if (!popup) return false;
  popup.document.write(buildCustomerPortfolioPrintDocument(rows)); popup.document.close(); popup.focus(); window.setTimeout(() => popup.print(), 180); return true;
}
