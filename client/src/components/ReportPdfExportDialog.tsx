import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Download } from "lucide-react";
import { useState } from "react";
import type { W9PdfCoverOptions } from "@/lib/w9PdfBrand";

export function ReportPdfExportDialog({ reportTitle, disabled, onConfirm }: { reportTitle: string; disabled?: boolean; onConfirm: (options: W9PdfCoverOptions) => void }) {
  const [open, setOpen] = useState(false); const [subtitle, setSubtitle] = useState(""); const [notes, setNotes] = useState("");
  const confirm = () => { onConfirm({ subtitle: subtitle.trim() || undefined, notes: notes.trim() || undefined }); setOpen(false); };
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button size="sm" variant="outline" disabled={disabled}><Download className="mr-2 size-4" />Exportar PDF</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Personalizar capa do relatório</DialogTitle><DialogDescription>Inclua um subtítulo e observações que serão exibidos na capa institucional do PDF.</DialogDescription></DialogHeader><div className="grid gap-4"><label className="grid gap-2 text-sm font-medium">Subtítulo personalizado<Input value={subtitle} onChange={event => setSubtitle(event.target.value)} maxLength={140} placeholder={reportTitle} /></label><label className="grid gap-2 text-sm font-medium">Observações de capa<Textarea value={notes} onChange={event => setNotes(event.target.value)} maxLength={650} rows={5} placeholder="Ex.: versão para reunião de coordenação, prioridade territorial e período analisado." /></label></div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={confirm}><Download className="mr-2 size-4" />Gerar relatório</Button></DialogFooter></DialogContent></Dialog>;
}
