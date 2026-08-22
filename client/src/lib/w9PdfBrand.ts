import type { jsPDF } from "jspdf";

export const W9_PDF_COLORS = { navy: [15, 28, 63], yellow: [255, 195, 0], green: [0, 168, 89], ink: [26, 38, 66], muted: [88, 103, 132], border: [210, 219, 232] } as const;

export function addW9PdfHeader(pdf: jsPDF, title: string, subtitle?: string) {
  pdf.setFillColor(...W9_PDF_COLORS.navy);
  pdf.rect(0, 0, 210, 40, "F");
  pdf.setFillColor(...W9_PDF_COLORS.yellow);
  pdf.roundedRect(15, 8, 10, 10, 1.4, 1.4, "F");
  pdf.setTextColor(...W9_PDF_COLORS.navy);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("W9", 16.7, 14.7);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(7);
  pdf.text("W9 CAMPANHAS", 29, 12.3);
  pdf.setTextColor(...W9_PDF_COLORS.yellow);
  pdf.text("ELEITORAIS", 29, 16.2);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.text(title, 15, 28);
  if (subtitle) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(217, 225, 239);
    pdf.text(subtitle, 15, 35);
  }
  pdf.setTextColor(...W9_PDF_COLORS.ink);
  return 52;
}

export function addW9PdfFooter(pdf: jsPDF, note = "Documento interno • W9 Campanhas Eleitorais") {
  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(...W9_PDF_COLORS.border);
    pdf.line(15, 284, 195, 284);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...W9_PDF_COLORS.muted);
    pdf.text(note, 15, 289);
    pdf.text(`${page}/${pageCount}`, 195, 289, { align: "right" });
  }
}

export const w9PrintStyles = `
  :root{color-scheme:light}body{font-family:Arial,Helvetica,sans-serif;color:#1A2642;margin:32px;line-height:1.45}.w9-header{display:flex;align-items:center;gap:10px;background:#0F1C3F;color:#fff;padding:16px 18px;border-radius:12px}.w9-mark{display:grid;place-items:center;width:32px;height:32px;border-radius:7px;background:#FFC300;color:#0F1C3F;font-size:14px;font-weight:900}.w9-name{font-size:10px;font-weight:900;letter-spacing:.12em;line-height:1.05}.w9-name span{display:block;color:#FFC300}.w9-title{font-size:22px;font-weight:800;margin:24px 0 4px}.w9-meta{color:#586784;margin:0}h2{font-size:15px;margin-top:28px;border-bottom:1px solid #D2DBE8;padding-bottom:8px}table{width:100%;border-collapse:collapse;margin-top:22px;font-size:11px}th{background:#0F1C3F;color:#fff;text-align:left}th,td{border:1px solid #D2DBE8;padding:8px;vertical-align:top}tr:nth-child(even){background:#F3F6FB}.next{background:#EEF8F2;border-left:4px solid #00A859;padding:12px;margin-top:20px}article{border:1px solid #D2DBE8;border-radius:8px;padding:12px;margin:10px 0;break-inside:avoid}header{display:flex;justify-content:space-between;gap:12px;font-size:13px}time,small{color:#586784}@media print{body{margin:16px}.w9-header{border-radius:0}}`;

export function w9PrintHeader(title: string) {
  return `<div class="w9-header"><div class="w9-mark">W9</div><div class="w9-name">W9 CAMPANHAS<span>ELEITORAIS</span></div></div><h1 class="w9-title">${title}</h1>`;
}
