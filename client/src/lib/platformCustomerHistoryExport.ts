import { w9PrintCover, w9PrintHeader, w9PrintStyles } from "./w9PdfBrand";

export type CommercialInteractionExport = { kind: string; description: string; createdAt: Date | string; actorName?: string | null };

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] ?? char);

export function buildCommercialHistoryPrintDocument(input: { organizationName: string; contactName: string; contactPhone: string; nextContactAt?: Date | string | null; nextContactNote?: string | null; interactions: CommercialInteractionExport[] }) {
  const nextContact = input.nextContactAt ? new Date(input.nextContactAt).toLocaleString("pt-BR") : "Não agendado";
  const rows = input.interactions.map(item => `<article><header><strong>${escapeHtml(item.kind)}</strong><time>${new Date(item.createdAt).toLocaleString("pt-BR")}</time></header><p>${escapeHtml(item.description)}</p><small>Registrado por ${escapeHtml(item.actorName || "Administração")}</small></article>`).join("") || "<p>Nenhuma interação registrada.</p>";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>Histórico comercial - ${escapeHtml(input.organizationName)}</title><style>${w9PrintStyles}</style></head><body>${w9PrintCover("Histórico comercial", `Registro de interações de ${escapeHtml(input.organizationName)}.`)}${w9PrintHeader("Histórico comercial")}<p class="w9-meta">${escapeHtml(input.organizationName)} · ${escapeHtml(input.contactName)} · ${escapeHtml(input.contactPhone)}</p><section class="next"><strong>Próximo contato:</strong> ${escapeHtml(nextContact)}${input.nextContactNote ? `<br /><span>${escapeHtml(input.nextContactNote)}</span>` : ""}</section><h2>Interações</h2>${rows}</body></html>`;
}

export function printCommercialHistory(input: Parameters<typeof buildCommercialHistoryPrintDocument>[0]) {
  const popup = window.open("", "_blank", "noopener,noreferrer");
  if (!popup) return false;
  popup.document.write(buildCommercialHistoryPrintDocument(input));
  popup.document.close();
  popup.focus();
  window.setTimeout(() => popup.print(), 180);
  return true;
}
