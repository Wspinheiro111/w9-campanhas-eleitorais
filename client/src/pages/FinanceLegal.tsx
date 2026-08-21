import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CampaignGate, PageHeader } from "@/components/CampaignShell";
import { useCampaign } from "@/contexts/CampaignContext";
import { buildFinancialExportRows, escapeCsvCell } from "@/lib/financialExport";
import { FINANCIAL_AMOUNT_PLACEHOLDER, getFinancialStatusLabel, getNextFinancialStatus, getNextFinancialStatusActionLabel } from "@/lib/financialPresentation";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, BookOpenCheck, Download, ExternalLink, FileSpreadsheet, FileText, FileUp, Landmark, Plus, Scale, Settings2, ShieldAlert, WalletCards } from "lucide-react";
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
  const events = trpc.planning.list.useQuery({ campaignId: id });
  const rulesQuery = trpc.financeLegal.rules.get.useQuery({ campaignId: id });
  const alertsQuery = trpc.financeLegal.internalAlerts.useQuery({ campaignId: id });
  const legalProcesses = trpc.financeLegal.legalProcesses.list.useQuery({ campaignId: id });
  const legalProcessMembers = trpc.financeLegal.legalProcesses.members.useQuery({ campaignId: id });
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [eventId, setEventId] = useState("none");
  const [processTitle, setProcessTitle] = useState("");
  const [processDocumentId, setProcessDocumentId] = useState("none");
  const [processOwnerMemberId, setProcessOwnerMemberId] = useState("none");
  const [processDeadline, setProcessDeadline] = useState("");
  const [processNotes, setProcessNotes] = useState("");
  const [docType, setDocType] = useState("Contrato");
  const [docTitle, setDocTitle] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [exportFilter, setExportFilter] = useState<EntryTypeFilter>("all");

  const createEntry = trpc.financeLegal.entries.create.useMutation({
    onSuccess: () => { setAmount(""); setCategory(""); setCounterparty(""); setSupplierName(""); setCostCenter(""); setEventId("none"); void utils.financeLegal.invalidate(); },
  });
  const createDoc = trpc.financeLegal.documents.create.useMutation({
    onSuccess: () => { setDocTitle(""); void utils.financeLegal.invalidate(); },
  });
  const reviewEntry = trpc.financeLegal.entries.review.useMutation({ onSuccess: () => void utils.financeLegal.invalidate() });
  const reviewDoc = trpc.financeLegal.documents.review.useMutation({ onSuccess: () => void utils.financeLegal.invalidate() });
  const uploadDocument = trpc.financeLegal.documents.upload.useMutation({
    onSuccess: () => { setUploadError(null); void utils.financeLegal.documents.list.invalidate({ campaignId: id }); },
  });
  const updateRules = trpc.financeLegal.rules.update.useMutation({
    onSuccess: () => { void utils.financeLegal.rules.get.invalidate({ campaignId: id }); void utils.financeLegal.internalAlerts.invalidate({ campaignId: id }); toast.success("Regras internas atualizadas."); },
  });
  const createLegalProcess = trpc.financeLegal.legalProcesses.create.useMutation({
    onSuccess: () => { setProcessTitle(""); setProcessDocumentId("none"); setProcessOwnerMemberId("none"); setProcessDeadline(""); setProcessNotes(""); void utils.financeLegal.legalProcesses.invalidate(); toast.success("Processo jurídico registrado."); },
  });
  const updateLegalProcess = trpc.financeLegal.legalProcesses.update.useMutation({ onSuccess: () => { void utils.financeLegal.legalProcesses.invalidate(); toast.success("Processo jurídico atualizado."); } });

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

    <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
      <section className="rounded-2xl border bg-card p-5 shadow-sm"><div className="flex items-start gap-3"><span className="rounded-xl bg-primary/10 p-2 text-primary"><ShieldAlert className="size-5" /></span><div><p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Conformidade interna</p><h2 className="mt-1 font-serif text-xl">Regras de conferência</h2><p className="mt-1 text-sm text-muted-foreground">Controles configuráveis para a operação. Eles não substituem a análise jurídica ou contábil profissional.</p></div></div>{rulesQuery.data && <div className="mt-5 grid gap-4 md:grid-cols-3"><label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm"><input type="checkbox" className="mt-1 size-4 accent-primary" checked={rulesQuery.data.blockBusinessDonation} disabled={updateRules.isPending} onChange={event => updateRules.mutate({ campaignId: id, blockBusinessDonation: event.target.checked, requireExpenseDocument: rulesQuery.data!.requireExpenseDocument, reviewDeadlineHours: rulesQuery.data!.reviewDeadlineHours })} /><span><b>Restringir CNPJ em receitas</b><br/><span className="text-muted-foreground">Bloqueia a inclusão identificada por CNPJ conforme regra interna.</span></span></label><label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm"><input type="checkbox" className="mt-1 size-4 accent-primary" checked={rulesQuery.data.requireExpenseDocument} disabled={updateRules.isPending} onChange={event => updateRules.mutate({ campaignId: id, blockBusinessDonation: rulesQuery.data!.blockBusinessDonation, requireExpenseDocument: event.target.checked, reviewDeadlineHours: rulesQuery.data!.reviewDeadlineHours })} /><span><b>Exigir documento para despesa</b><br/><span className="text-muted-foreground">Solicita número de documento ou recibo no cadastro.</span></span></label><label className="rounded-xl border p-3 text-sm"><b className="flex items-center gap-2"><Settings2 className="size-4" />Prazo de revisão (horas)</b><Input className="mt-2" type="number" min="1" max="720" value={rulesQuery.data.reviewDeadlineHours} disabled={updateRules.isPending} onChange={event => { const value = Number(event.target.value); if (Number.isInteger(value) && value >= 1 && value <= 720) updateRules.mutate({ campaignId: id, blockBusinessDonation: rulesQuery.data!.blockBusinessDonation, requireExpenseDocument: rulesQuery.data!.requireExpenseDocument, reviewDeadlineHours: value }); }} /></label></div>}</section>
      <section className="rounded-2xl border bg-card p-5 shadow-sm"><div className="flex items-start gap-3"><span className="rounded-xl bg-amber-100 p-2 text-amber-700"><AlertTriangle className="size-5" /></span><div><p className="text-xs font-bold uppercase tracking-[.14em] text-amber-700">Acompanhamento interno</p><h2 className="mt-1 font-serif text-xl">Alertas financeiros</h2><p className="mt-1 text-sm text-muted-foreground">Pendências de revisão e documentação identificadas pelas regras desta campanha.</p></div></div><div className="mt-4 space-y-2">{alertsQuery.data?.alerts.map(alert => <article key={alert.key} className="rounded-xl border border-amber-300/60 bg-amber-50/60 p-3 text-sm"><p className="font-semibold text-amber-950">{alert.title}</p><p className="mt-1 text-amber-900">{alert.description}</p></article>)}{alertsQuery.data && !alertsQuery.data.alerts.length && <p className="rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">Nenhuma pendência encontrada pelas regras internas atuais.</p>}{alertsQuery.isLoading && <p className="text-sm text-muted-foreground">Verificando pendências internas…</p>}</div></section>
    </div>

    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <section className="rounded-2xl border bg-card p-5"><h2 className="font-serif text-xl">Novo lançamento</h2><p className="mt-1 text-sm text-muted-foreground">Os valores informados neste cadastro ficam restritos ao controle interno e são exibidos como “A consultar” neste painel.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Select value={type} onValueChange={value => setType(value as "income" | "expense")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="income">Receita / doação</SelectItem><SelectItem value="expense">Despesa</SelectItem></SelectContent></Select><Input placeholder="Categoria" value={category} onChange={event => setCategory(event.target.value)} /><Input placeholder="Doador, fornecedor ou beneficiário" value={counterparty} onChange={event => setCounterparty(event.target.value)} /><Input placeholder="Fornecedor (opcional)" value={supplierName} onChange={event => setSupplierName(event.target.value)} /><Input placeholder="Centro de custo (opcional)" value={costCenter} onChange={event => setCostCenter(event.target.value)} /><Select value={eventId} onValueChange={setEventId}><SelectTrigger><SelectValue placeholder="Evento vinculado" /></SelectTrigger><SelectContent><SelectItem value="none">Sem evento vinculado</SelectItem>{(events.data ?? []).map(event => <SelectItem key={event.id} value={String(event.id)}>{event.title}</SelectItem>)}</SelectContent></Select><Input inputMode="decimal" placeholder="Valor interno em R$" value={amount} onChange={event => setAmount(event.target.value)} /></div><Button className="mt-4" disabled={!category || !counterparty || !Number(amount.replace(",", ".")) || createEntry.isPending} onClick={() => createEntry.mutate({ campaignId: id, entryType: type, category, counterpartyName: counterparty, supplierName: supplierName || undefined, costCenter: costCenter || undefined, eventId: eventId === "none" ? undefined : Number(eventId), amountCents: Math.round(Number(amount.replace(",", ".")) * 100) })}><Plus className="mr-1 size-4" />Registrar lançamento</Button><div className="mt-5 space-y-2">{financialEntries.map(entry => { const nextStatus = getNextFinancialStatus(entry.status); const nextActionLabel = getNextFinancialStatusActionLabel(entry.status); const eventTitle = entry.eventId ? events.data?.find(event => event.id === entry.eventId)?.title : null; return <div key={entry.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 p-3 text-sm"><span><b>{entry.entryType === "income" ? "Receita" : "Despesa"}</b> · {entry.category} · {entry.counterpartyName}<br/><span className="text-muted-foreground">{FINANCIAL_AMOUNT_PLACEHOLDER} · {getFinancialStatusLabel(entry.status)}{entry.supplierName ? ` · Fornecedor: ${entry.supplierName}` : ""}{entry.costCenter ? ` · Centro: ${entry.costCenter}` : ""}{eventTitle ? ` · Evento: ${eventTitle}` : ""}</span></span>{nextStatus && nextActionLabel && <Button size="sm" variant="outline" disabled={reviewEntry.isPending} onClick={() => reviewEntry.mutate({ entryId: entry.id, status: nextStatus, expectedVersion: entry.version })}>{nextActionLabel}</Button>}</div>; })}{!financialEntries.length && <p className="text-sm text-muted-foreground">Nenhum lançamento registrado.</p>}</div></section>

      <section className="rounded-2xl border bg-card p-5"><h2 className="font-serif text-xl">Repositório jurídico</h2><p className="mt-1 text-sm text-muted-foreground">Anexe um PDF por documento e consulte-o sem sair do ambiente da campanha.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Select value={docType} onValueChange={setDocType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Contrato", "Termo de voluntariado", "Nota fiscal", "Recibo", "Relatório", "Outro"].map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select><Input placeholder="Título do documento" value={docTitle} onChange={event => setDocTitle(event.target.value)} /></div><Button className="mt-4" disabled={!docTitle || createDoc.isPending} onClick={() => createDoc.mutate({ campaignId: id, documentType: docType, title: docTitle })}><Plus className="mr-1 size-4" />Adicionar ao repositório</Button>{uploadError && <p role="alert" className="mt-3 text-sm text-destructive">{uploadError}</p>}{uploadDocument.error && <p role="alert" className="mt-3 text-sm text-destructive">{uploadDocument.error.message}</p>}<div className="mt-5 space-y-2">{legalDocuments.map(document => <div key={document.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 p-3 text-sm"><span><b>{document.documentType}</b> · {document.title}<br/><Badge variant="outline" className="mt-1">{document.status}</Badge>{document.fileName && <span className="ml-2 text-muted-foreground">{document.fileName}</span>}</span><span className="flex shrink-0 items-center gap-2">{document.url && <Button size="sm" variant="outline" asChild><a href={document.url} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 size-4" />Visualizar PDF</a></Button>}<Button size="sm" variant="outline" asChild disabled={uploadDocument.isPending}><label className="cursor-pointer"><FileUp className="mr-1 size-4" />{uploadDocument.isPending ? "Enviando" : "Anexar PDF"}<input className="sr-only" type="file" accept="application/pdf" onChange={event => void handlePdfUpload(document.id, event.target.files?.[0])} /></label></Button>{["pending", "under_review"].includes(document.status) && <Button size="sm" variant="outline" onClick={() => reviewDoc.mutate({ documentId: document.id, status: "approved" })}>Aprovar</Button>}</span></div>)}{!legalDocuments.length && <p className="text-sm text-muted-foreground">Nenhum documento registrado.</p>}</div></section>
    </div>

    <section className="mt-6 rounded-2xl border bg-card p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Acompanhamento jurídico</p><h2 className="mt-1 font-serif text-xl">Processos e providências</h2><p className="mt-1 text-sm text-muted-foreground">Registre o encaminhamento interno, associe um documento, atribua o responsável e acompanhe o prazo. Este controle não substitui análise jurídica profissional.</p><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5"><Input placeholder="Título do processo" value={processTitle} onChange={event => setProcessTitle(event.target.value)} /><Select value={processDocumentId} onValueChange={setProcessDocumentId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem documento vinculado</SelectItem>{legalDocuments.map(document => <SelectItem key={document.id} value={String(document.id)}>{document.title}</SelectItem>)}</SelectContent></Select><Select value={processOwnerMemberId} onValueChange={setProcessOwnerMemberId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem responsável</SelectItem>{(legalProcessMembers.data ?? []).map(member => <SelectItem key={member.id} value={String(member.id)}>{member.name}</SelectItem>)}</SelectContent></Select><Input type="date" value={processDeadline} onChange={event => setProcessDeadline(event.target.value)} /><Input placeholder="Observação interna" value={processNotes} onChange={event => setProcessNotes(event.target.value)} /></div><Button className="mt-4" disabled={!processTitle || createLegalProcess.isPending} onClick={() => createLegalProcess.mutate({ campaignId: id, title: processTitle, documentId: processDocumentId === "none" ? undefined : Number(processDocumentId), ownerMemberId: processOwnerMemberId === "none" ? undefined : Number(processOwnerMemberId), deadlineAt: processDeadline ? new Date(`${processDeadline}T12:00:00`) : undefined, notes: processNotes || undefined })}><Plus className="mr-1 size-4" />Criar processo jurídico</Button><div className="mt-5 grid gap-3 md:grid-cols-2">{(legalProcesses.data ?? []).map(process => <article key={process.id} className="rounded-xl border bg-muted/40 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{process.title}</p><p className="mt-1 text-sm text-muted-foreground">{process.documentTitle ?? "Sem documento"} · {process.ownerName ?? "Sem responsável"}{process.deadlineAt ? ` · Prazo ${new Date(process.deadlineAt).toLocaleDateString("pt-BR")}` : ""}</p>{process.notes && <p className="mt-2 text-sm">{process.notes}</p>}</div><Select value={process.status} onValueChange={status => updateLegalProcess.mutate({ id: process.id, status: status as "open" | "in_progress" | "waiting" | "closed", deadlineAt: process.deadlineAt ? new Date(process.deadlineAt) : null, notes: process.notes ?? null })}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="open">Aberto</SelectItem><SelectItem value="in_progress">Em andamento</SelectItem><SelectItem value="waiting">Aguardando</SelectItem><SelectItem value="closed">Encerrado</SelectItem></SelectContent></Select></div></article>)}{legalProcesses.data && !legalProcesses.data.length && <p className="rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">Nenhum processo jurídico registrado nesta campanha.</p>}</div></section>

    <p className="mt-5 rounded-xl border border-amber-400/40 bg-amber-50 p-4 text-sm text-amber-950">Recomendação operacional: associe comprovantes, notas fiscais e contratos antes da aprovação. A geração de arquivos oficiais e a interpretação da legislação eleitoral devem ser revisadas por contador e advogado responsáveis.</p>
  </section>;
}

export default function FinanceLegal() {
  return <CampaignGate><Screen /></CampaignGate>;
}
