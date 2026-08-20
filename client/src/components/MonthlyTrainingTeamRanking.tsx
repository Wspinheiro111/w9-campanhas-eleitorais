import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCampaign } from "@/contexts/CampaignContext";
import { trpc } from "@/lib/trpc";
import { Download, FileSpreadsheet, Goal, Medal, Save, Trophy } from "lucide-react";
import { jsPDF } from "jspdf";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const todayMonth = () => new Date().toISOString().slice(0, 7);

type RankingItem = {
  coordinatorMemberId: number;
  name: string;
  region: string | null;
  assignedVolunteers: number;
  completedTrainingsThisMonth: number;
  targetCompletions: number;
  goalProgress: number;
  hasGoal: boolean;
};

function medalFor(item: RankingItem, rank: number) {
  if (!item.hasGoal || item.goalProgress < 100) return null;
  if (item.goalProgress >= 125) return { label: "Destaque mensal", className: "border-amber-300 bg-amber-100 text-amber-950" };
  if (rank === 0) return { label: "Liderança de meta", className: "border-emerald-300 bg-emerald-100 text-emerald-950" };
  return { label: "Meta atingida", className: "border-sky-300 bg-sky-100 text-sky-950" };
}

function csvValue(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }

export function MonthlyTrainingTeamRanking() {
  const { activeCampaign } = useCampaign();
  const utils = trpc.useUtils();
  const [month, setMonth] = useState(todayMonth);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const ranking = trpc.volunteers.training.monthlyRanking.useQuery({ campaignId: activeCampaign!.id, month });
  const setGoal = trpc.volunteers.training.setMonthlyGoal.useMutation({
    onSuccess: async () => { await utils.volunteers.training.monthlyRanking.invalidate(); setDrafts({}); toast.success("Meta mensal atualizada."); },
    onError: error => toast.error(error.message),
  });
  const totals = useMemo(() => (ranking.data ?? []).reduce((acc, item) => ({ completed: acc.completed + item.completedTrainingsThisMonth, target: acc.target + item.targetCompletions }), { completed: 0, target: 0 }), [ranking.data]);

  const exportCsv = () => {
    const rows = [["Posição", "Equipe responsável", "Região", "Voluntários vinculados", "Trilhas concluídas", "Meta mensal", "Avanço da meta", "Medalha"], ...(ranking.data ?? []).map((item, index) => [index + 1, item.name, item.region ?? "Sem região", item.assignedVolunteers, item.completedTrainingsThisMonth, item.targetCompletions, `${item.goalProgress}%`, medalFor(item, index)?.label ?? "Sem medalha"])];
    const blob = new Blob(["\uFEFF", rows.map(row => row.map(csvValue).join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `ranking-formacao-${month}.csv`; link.click(); URL.revokeObjectURL(url); toast.success("Ranking exportado em CSV.");
  };

  const exportPdf = () => {
    const pdf = new jsPDF({ unit: "mm", format: "a4" }); const rows = ranking.data ?? [];
    pdf.setFillColor(16, 53, 39); pdf.rect(0, 0, 210, 34, "F"); pdf.setTextColor(255, 253, 248); pdf.setFont("times", "bold"); pdf.setFontSize(20); pdf.text("Ranking mensal de formação", 15, 18); pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.text(`${activeCampaign!.name} · ${month}`, 15, 26);
    pdf.setTextColor(28, 36, 31); pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.text(`Trilhas concluídas: ${totals.completed}`, 15, 45); pdf.text(`Meta consolidada: ${totals.target}`, 88, 45);
    let y = 61; pdf.setFontSize(9); pdf.text("#", 15, y); pdf.text("Equipe", 25, y); pdf.text("Concluídas", 105, y); pdf.text("Meta", 132, y); pdf.text("Avanço", 151, y); pdf.text("Medalha", 171, y); y += 5; pdf.setDrawColor(210, 213, 210); pdf.line(15, y, 195, y); y += 6; pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
    rows.forEach((item, index) => { if (y > 278) { pdf.addPage(); y = 22; } pdf.text(String(index + 1), 15, y); pdf.text(pdf.splitTextToSize(`Equipe de ${item.name}`, 70), 25, y); pdf.text(String(item.completedTrainingsThisMonth), 110, y); pdf.text(String(item.targetCompletions), 136, y); pdf.text(`${item.goalProgress}%`, 154, y); pdf.text(pdf.splitTextToSize(medalFor(item, index)?.label ?? "—", 22), 171, y); y += 9; });
    pdf.setFontSize(8); pdf.setTextColor(95, 102, 98); pdf.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 15, 289); pdf.save(`ranking-formacao-${month}.pdf`); toast.success("Ranking exportado em PDF.");
  };

  if (ranking.isLoading) return <div className="mt-6 h-72 animate-pulse rounded-2xl bg-muted" />;
  if (ranking.isError) return <section className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5" role="alert"><h2 className="font-serif text-xl text-rose-950">Não foi possível carregar o ranking mensal</h2><p className="mt-1 text-sm text-rose-800">Tente novamente para consultar metas e conclusões integrais da trilha.</p><Button className="mt-4" variant="outline" onClick={() => ranking.refetch()}>Tentar novamente</Button></section>;

  return <section className="mt-6 rounded-2xl border bg-card p-5 shadow-sm">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
      <div className="flex gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#103527] text-white"><Trophy className="size-5" /></span><div><h2 className="font-serif text-2xl">Ranking mensal de formação</h2><p className="mt-1 text-sm text-muted-foreground">Comparativo por equipe responsável, baseado em voluntários que concluíram integralmente a trilha no mês.</p></div></div>
      <div className="flex flex-wrap items-end gap-2"><label className="text-xs font-semibold text-muted-foreground">Mês de referência<Input aria-label="Mês de referência do ranking" className="mt-1" type="month" value={month} onChange={event => setMonth(event.target.value || todayMonth())} /></label><Button size="sm" variant="outline" disabled={!(ranking.data ?? []).length} onClick={exportCsv}><FileSpreadsheet className="mr-2 size-4" />CSV</Button><Button size="sm" variant="outline" disabled={!(ranking.data ?? []).length} onClick={exportPdf}><Download className="mr-2 size-4" />PDF</Button></div>
    </div>
    <div className="mt-5 grid gap-3 sm:grid-cols-3"><Metric label="Equipes no ranking" value={ranking.data?.length ?? 0} /><Metric label="Trilhas concluídas no mês" value={totals.completed} /><Metric label="Meta consolidada" value={totals.target} /></div>
    <div className="mt-6 space-y-3">{(ranking.data ?? []).map((item, index) => { const targetValue = drafts[item.coordinatorMemberId] ?? String(item.targetCompletions); const medal = medalFor(item, index); return <article key={item.coordinatorMemberId} className="rounded-xl border p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-center"><div className="flex min-w-0 flex-1 items-start gap-3"><span className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${index === 0 ? "bg-[#c9a85b] text-[#103527]" : "bg-muted text-primary"}`}>{index === 0 ? <Medal className="size-5" /> : index + 1}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-medium">Equipe de {item.name}</h3>{item.region && <Badge variant="outline">{item.region}</Badge>}{medal && <Badge className={medal.className}>{medal.label}</Badge>}</div><p className="mt-1 text-xs text-muted-foreground">{item.assignedVolunteers} voluntário(s) vinculado(s) · {item.completedTrainingsThisMonth} trilha(s) concluída(s) no mês</p></div></div><div className="w-full lg:w-56"><div className="flex justify-between text-xs font-medium text-muted-foreground"><span>Avanço da meta</span><span>{item.hasGoal ? `${item.goalProgress}%` : "Sem meta"}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-[#c9a85b]" style={{ width: `${item.goalProgress}%` }} /></div></div><div className="flex items-end gap-2"><label className="min-w-24 text-xs font-semibold text-muted-foreground">Meta do mês<Input aria-label={`Meta da equipe de ${item.name}`} className="mt-1" type="number" min="0" value={targetValue} onChange={event => setDrafts({ ...drafts, [item.coordinatorMemberId]: event.target.value })} /></label><Button size="sm" variant="outline" disabled={setGoal.isPending || Number(targetValue) === item.targetCompletions} onClick={() => setGoal.mutate({ campaignId: activeCampaign!.id, coordinatorMemberId: item.coordinatorMemberId, month, targetCompletions: Math.max(0, Number(targetValue) || 0) })}><Save className="mr-1 size-3" />Salvar</Button></div></div></article>; })}{!(ranking.data ?? []).length && <div className="rounded-xl border border-dashed bg-muted/30 p-6 text-center"><Goal className="mx-auto size-5 text-primary" /><p className="mt-2 text-sm font-medium">Ainda não há equipes com voluntários vinculados</p><p className="mt-1 text-xs text-muted-foreground">Associe voluntários a responsáveis de equipe para iniciar o ranking mensal.</p></div>}</div>
  </section>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-xl bg-muted/50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 font-serif text-3xl">{value}</p></div>; }
