import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CampaignGate, PageHeader } from "@/components/CampaignShell";
import { useCampaign } from "@/contexts/CampaignContext";
import { buildFinancialExportRows, escapeCsvCell } from "@/lib/financialExport";
import { FINANCIAL_AMOUNT_PLACEHOLDER, getFinancialStatusLabel, getNextFinancialStatus, getNextFinancialStatusActionLabel } from "@/lib/financialPresentation";
import { trpc } from "@/lib/trpc";
import { BookOpenCheck, Download, ExternalLink, FileSpreadsheet, FileText, FileUp, Landmark, Plus, Scale, WalletCards } from "lucide-react";
import { jsPDF } from "jspdf";
import { type ComponentType, useState } from "react";
import { toast } from "sonner";

type EntryTypeFilter = "all" | "income" | "expense";

function Screen() {
  const { activeCampaign } = useCampaign();
  const utils = trpc.useUtils();
  const id = activeCampaign!.id;
  const summary = trpc.financeLegal.summary.useQuery({ campaignId: id });
  const entries = trpc.financeLegal.entries.list.useQuery({ campaignId: id });
  const docs = trpc.financeLegal.documents.list.useQuery({ campaignId: id });
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [docType, setDocType] = useState("Contrato");
  const [docTitle, setDocTitle] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [exportFilter, setExportFilter] = useState<EntryTypeFilter>("all");

  const createEntry = trpc.financeLegal.entries.create.useMutation({
    onSuccess: () => { setAmount(""); setCategory(""); setCounterparty(""); void utils.financeLegal.invalidate(); },
  });
  const createDoc = trpc.financeLegal.documents.create.useMutation({
    onSuccess: () => { setDocTitle(""); void utils.financeLegal.invalidate(); },
  });
  const reviewEntry = trpc.financeLegal.entries.review.useMutation({ onSuccess: () => void utils.financeLegal.invalidate() });
  const reviewDoc = trpc.financeLegal.documents.review.useMutation({ onSuccess: () => void utils.financeLegal.invalidate() });
  const uploadDocument = trpc.financeLegal.documents.upload.useMutation({
    onSuccess: () => { setUploadError(null); void utils.financeLegal.documents.list.invalidate({ campaignId: id }); },
  });

  const financialEntries = entries.data ?? [];
  const legalDocuments = docs.data ?? [];
  const filteredEntries = financialEntries.filter(entry => exportFilter === "all" || entry.entryType === exportFilter);
  const exportRows = buildFinancialExportRows(filteredEntries, legalDocuments);

  const handlePdfUpload = async (documentId: number, file?: File) => {
    if (!file) return;
    if (file.type !== "application/pdf" || file.size > 5 * 1024 * 1024) {
      setUploadError("Selecione um PDF válido de até 5 MB.");
      return;
    }
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Não foi possível ler o PDF selecionado."));
        reader.readAsDataURL(file);
      });
      uploadDocument.mutate({ documentId, fileName: file.name, base64 });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Não foi possível preparar o PDF.");
    }
  };

  const exportCsv = () => {
    const content = exportRows.map(row => row.map(escapeCsvCell).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `prestacao-contas-${activeCampaign!.name.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório financeiro exportado em CSV.");
  };

  const exportPdf = () => {
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    pdf.setFillColor(16, 53, 39);
    pdf.rect(0, 0, 210, 33, "F");
    pdf.setTextColor(255, 253, 248);
    pdf.setFont("times", "bold");
    pdf.setFontSize(20);
    pdf.text("Prestação de contas & jurídico", 15, 18);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(`${activeCampaign!.name} · ${exportFilter === "all" ? "Receitas e despesas" : exportFilter === "income" ? "Receitas" : "Despesas"}`, 15, 26);
    pdf.setTextColor(28, 36, 31);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text("Valores financeiros: A consultar", 15, 44);
    let y = 55;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    exportRows.slice(1).forEach(row => {
      const line = pdf.splitTextToSize(row.join(" · "), 178);
      if (y + line.length * 4 > 280) { pdf.addPage(); y = 20; }
      pdf.text(line, 15, y);
      y += line.length * 4 + 4;
    });
    if (exportRows.length === 1) pdf.text("Nenhum lançamento ou documento disponível para o filtro selecionado.", 15, y);
    pdf.setFontSize(8);
    pdf.setTextColor(95, 102, 98);
    pdf.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 15, 289);
    pdf.save("prestacao-contas-juridico.pdf");
    toast.success("Relatório financeiro exportado em PDF.");
  };

  const s = summary.data;

  return <section>
    <PageHeader eyebrow="Conformidade e recursos" title="Prestação de Contas & Jurídico" description="Registre recursos, despesas, contratos e pendências da campanha. Este painel organiza a conferência operacional; a validação jurídica e contábil final permanece sob responsabilidade profissional." />

    <div className="mt-6 grid gap-4 md:grid-cols-4">
      {([ ["Receitas", s?.incomeCents ?? 0, Landmark], ["Despesas", s?.expenseCents ?? 0, WalletCards], ["Saldo", s?.balanceCents ?? 0, Scale], ["Pendências", s?.pendingCount ?? 0, BookOpenCheck] ] as Array<[string, number, ComponentType<{ className?: string }>]>).map(([label, value, Icon]) => <article key={label} className="rounded-2xl border bg-card p-5 shadow-sm"><Icon className="size-5 text-primary" /><p className="mt-3 text-xs font-bold uppercase text-muted-foreground">{label}</p><p className="mt-1 font-serif text-2xl">{label !== "Pendências" ? FINANCIAL_AMOUNT_PLACEHOLDER : value}</p></article>)}
    </div>

    <section className="mt-6 rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Relatório interno</p><h2 className="mt-1 font-serif text-xl">Exportar prestação de contas</h2><p className="mt-1 text-sm text-muted-foreground">A exportação inclui lançamentos e documentos jurídicos, preservando a indicação “A consultar” para todos os valores.</p></div><div className="flex flex-col gap-2 sm:flex-row sm:items-center"><Select value={exportFilter} onValueChange={value => setExportFilter(value as EntryTypeFilter)}><SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Receitas e despesas</SelectItem><SelectItem value="income">Somente receitas</SelectItem><SelectItem value="expense">Somente despesas</SelectItem></SelectContent></Select><Button variant="outline" onClick={exportCsv}><FileSpreadsheet className="mr-2 size-4" />CSV</Button><Button onClick={exportPdf}><FileText className="mr-2 size-4" />PDF</Button></div></div>
    </section>

    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <section className="rounded-2xl border bg-card p-5"><h2 className="font-serif text-xl">Novo lançamento</h2><p className="mt-1 text-sm text-muted-foreground">Os valores informados neste cadastro ficam restritos ao controle interno e são exibidos como “A consultar” neste painel.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Select value={type} onValueChange={value => setType(value as "income" | "expense")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="income">Receita / doação</SelectItem><SelectItem value="expense">Despesa</SelectItem></SelectContent></Select><Input placeholder="Categoria" value={category} onChange={event => setCategory(event.target.value)} /><Input placeholder="Doador, fornecedor ou beneficiário" value={counterparty} onChange={event => setCounterparty(event.target.value)} /><Input inputMode="decimal" placeholder="Valor interno em R$" value={amount} onChange={event => setAmount(event.target.value)} /></div><Button className="mt-4" disabled={!category || !counterparty || !Number(amount.replace(",", ".")) || createEntry.isPending} onClick={() => createEntry.mutate({ campaignId: id, entryType: type, category, counterpartyName: counterparty, amountCents: Math.round(Number(amount.replace(",", ".")) * 100) })}><Plus className="mr-1 size-4" />Registrar lançamento</Button><div className="mt-5 space-y-2">{financialEntries.map(entry => { const nextStatus = getNextFinancialStatus(entry.status); const nextActionLabel = getNextFinancialStatusActionLabel(entry.status); return <div key={entry.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 p-3 text-sm"><span><b>{entry.entryType === "income" ? "Receita" : "Despesa"}</b> · {entry.category} · {entry.counterpartyName}<br/><span className="text-muted-foreground">{FINANCIAL_AMOUNT_PLACEHOLDER} · {getFinancialStatusLabel(entry.status)}</span></span>{nextStatus && nextActionLabel && <Button size="sm" variant="outline" disabled={reviewEntry.isPending} onClick={() => reviewEntry.mutate({ entryId: entry.id, status: nextStatus })}>{nextActionLabel}</Button>}</div>; })}{!financialEntries.length && <p className="text-sm text-muted-foreground">Nenhum lançamento registrado.</p>}</div></section>

      <section className="rounded-2xl border bg-card p-5"><h2 className="font-serif text-xl">Repositório jurídico</h2><p className="mt-1 text-sm text-muted-foreground">Anexe um PDF por documento e consulte-o sem sair do ambiente da campanha.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Select value={docType} onValueChange={setDocType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Contrato", "Termo de voluntariado", "Nota fiscal", "Recibo", "Relatório", "Outro"].map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select><Input placeholder="Título do documento" value={docTitle} onChange={event => setDocTitle(event.target.value)} /></div><Button className="mt-4" disabled={!docTitle || createDoc.isPending} onClick={() => createDoc.mutate({ campaignId: id, documentType: docType, title: docTitle })}><Plus className="mr-1 size-4" />Adicionar ao repositório</Button>{uploadError && <p role="alert" className="mt-3 text-sm text-destructive">{uploadError}</p>}{uploadDocument.error && <p role="alert" className="mt-3 text-sm text-destructive">{uploadDocument.error.message}</p>}<div className="mt-5 space-y-2">{legalDocuments.map(document => <div key={document.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 p-3 text-sm"><span><b>{document.documentType}</b> · {document.title}<br/><Badge variant="outline" className="mt-1">{document.status}</Badge>{document.fileName && <span className="ml-2 text-muted-foreground">{document.fileName}</span>}</span><span className="flex shrink-0 items-center gap-2">{document.url && <Button size="sm" variant="outline" asChild><a href={document.url} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 size-4" />Visualizar PDF</a></Button>}<Button size="sm" variant="outline" asChild disabled={uploadDocument.isPending}><label className="cursor-pointer"><FileUp className="mr-1 size-4" />{uploadDocument.isPending ? "Enviando" : "Anexar PDF"}<input className="sr-only" type="file" accept="application/pdf" onChange={event => void handlePdfUpload(document.id, event.target.files?.[0])} /></label></Button>{["pending", "under_review"].includes(document.status) && <Button size="sm" variant="outline" onClick={() => reviewDoc.mutate({ documentId: document.id, status: "approved" })}>Aprovar</Button>}</span></div>)}{!legalDocuments.length && <p className="text-sm text-muted-foreground">Nenhum documento registrado.</p>}</div></section>
    </div>

    <p className="mt-5 rounded-xl border border-amber-400/40 bg-amber-50 p-4 text-sm text-amber-950">Recomendação operacional: associe comprovantes, notas fiscais e contratos antes da aprovação. A geração de arquivos oficiais e a interpretação da legislação eleitoral devem ser revisadas por contador e advogado responsáveis.</p>
  </section>;
}

export default function FinanceLegal() {
  return <CampaignGate><Screen /></CampaignGate>;
}
