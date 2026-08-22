export type CommercialInteractionExport = { kind: string; description: string; createdAt: Date | string; actorName?: string | null };

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] ?? char);

export function buildCommercialHistoryPrintDocument(input: { organizationName: string; contactName: string; contactPhone: string; nextContactAt?: Date | string | null; nextContactNote?: string | null; interactions: CommercialInteractionExport[] }) {
  const nextContact = input.nextContactAt ? new Date(input.nextContactAt).toLocaleString("pt-BR") : "Não agendado";
  const rows = input.interactions.map(item => `<article><header><strong>${escapeHtml(item.kind)}</strong><time>${new Date(item.createdAt).toLocaleString("pt-BR")}</time></header><p>${escapeHtml(item.description)}</p><small>Registrado por ${escapeHtml(item.actorName || "Administração")}</small></article>`).join("") || "<p>Nenhuma interação registrada.</p>";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>Histórico comercial - ${escapeHtml(input.organizationName)}</title><style>body{font-family:Arial,sans-serif;color:#17231d;margin:36px;line-height:1.45}h1{color:#103527;margin-bottom:4px}h2{font-size:15px;margin-top:28px;border-bottom:1px solid #d8dfdb;padding-bottom:8px}p{margin:6px 0}.meta{color:#526159}.next{background:#f3f6f4;border-left:4px solid #c9a85b;padding:12px;margin-top:20px}article{border:1px solid #d8dfdb;border-radius:8px;padding:12px;margin:10px 0;break-inside:avoid}header{display:flex;justify-content:space-between;gap:12px;font-size:13px}time,small{color:#526159}@media print{body{margin:16px}}</style></head><body><h1>Histórico comercial</h1><p class="meta">${escapeHtml(input.organizationName)} · ${escapeHtml(input.contactName)} · ${escapeHtml(input.contactPhone)}</p><section class="next"><strong>Próximo contato:</strong> ${escapeHtml(nextContact)}${input.nextContactNote ? `<br /><span>${escapeHtml(input.nextContactNote)}</span>` : ""}</section><h2>Interações</h2>${rows}</body></html>`;
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
