import { useCallback, useEffect, useState } from "react";

export function useW9PdfGeneration() {
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const runPdf = useCallback((action: () => void) => {
    setGeneratingPdf(true);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      try { action(); } finally { window.setTimeout(() => setGeneratingPdf(false), 360); }
    }));
  }, []);
  return { generatingPdf, runPdf };
}

export function W9ReportGenerationOverlay({ active }: { active: boolean }) {
  if (!active) return null;
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-[#0A132E]/80 p-5 backdrop-blur-sm" role="status" aria-live="polite" aria-label="Gerando relatório em PDF">
    <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0F1C3F] p-8 text-center text-white shadow-2xl">
      <div className="w9-report-loader mx-auto grid size-20 place-items-center rounded-3xl bg-[#FFC300] text-2xl font-black text-[#0F1C3F]">W9</div>
      <p className="mt-6 font-[Anton,sans-serif] text-2xl uppercase tracking-wide">Preparando relatório</p>
      <p className="mt-2 text-sm leading-6 text-white/65">Aplicando capa e identidade visual da W9 Campanhas Eleitorais.</p>
      <span className="mx-auto mt-6 block h-1.5 w-36 overflow-hidden rounded-full bg-white/10"><i className="w9-report-progress block h-full rounded-full bg-[#00A859]" /></span>
    </div>
  </div>;
}

export function W9GlobalReportGenerationFeedback() {
  const [active, setActive] = useState(false);
  useEffect(() => {
    let timeout: number | undefined;
    const handleClick = (event: MouseEvent) => {
      const source = event.target instanceof Element ? event.target.closest("button") : null;
      if (!source || !/\bPDF\b/i.test(source.textContent ?? "")) return;
      setActive(true);
      if (timeout) window.clearTimeout(timeout);
      timeout = window.setTimeout(() => setActive(false), 700);
    };
    document.addEventListener("click", handleClick, true);
    return () => { document.removeEventListener("click", handleClick, true); if (timeout) window.clearTimeout(timeout); };
  }, []);
  return <W9ReportGenerationOverlay active={active} />;
}
