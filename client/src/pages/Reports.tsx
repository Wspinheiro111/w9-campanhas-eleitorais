import { CampaignGate, EmptyPanel, PageHeader } from "@/components/CampaignShell";
import { MetricCard } from "@/components/MetricCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCampaign } from "@/contexts/CampaignContext";
import { trpc } from "@/lib/trpc";
import { BarChart3, CalendarDays, CircleAlert, ContactRound, Download, Flag, Target } from "lucide-react";

function ReportsContent() {
  const { activeCampaign } = useCampaign();
  const { data, isLoading } = trpc.reports.summary.useQuery({ campaignId: activeCampaign!.id });
  const exportCsv = () => {
    if (!data || !activeCampaign) return;
    const rows: Array<Array<string | number>> = [
      ["Indicador", "Valor"],
      ["Contatos cadastrados", data.voters],
      ["Eventos registrados", data.events],
      ["Ocorrências registradas", data.incidents],
      ...data.goals.map(goal => [`Meta: ${goal.title}`, `${goal.currentValue}/${goal.targetValue} ${goal.unit}`]),
      ...data.tasks.map(task => [`Tarefa: ${task.title}`, task.status]),
    ];
    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-${activeCampaign.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  if (isLoading) return <div className="h-64 animate-pulse rounded-2xl bg-muted" />;
  const completed = data?.tasks.filter(task => task.status === "done").length ?? 0;
  return <><PageHeader eyebrow="Prestação de contas" title="Relatórios e progresso" description="Consolide o andamento das metas, atividades e registros da campanha em um resumo exportável." action={<Button onClick={exportCsv} disabled={!data} className="bg-[#103527] text-white hover:bg-[#174a35]"><Download className="mr-2 size-4" />Exportar CSV</Button>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Contatos" value={data?.voters ?? 0} supporting="Registros na base da campanha" icon={ContactRound} /><MetricCard label="Eventos" value={data?.events ?? 0} supporting="Compromissos registrados" icon={CalendarDays} tone="gold" /><MetricCard label="Tarefas concluídas" value={completed} supporting={`${data?.tasks.length ?? 0} atividades no total`} icon={BarChart3} tone="slate" /><MetricCard label="Ocorrências" value={data?.incidents ?? 0} supporting="Registros de campo" icon={CircleAlert} tone="rose" /></div>
    <section className="mt-7 rounded-2xl border border-border bg-card p-5"><div className="flex items-center gap-2"><Target className="size-5 text-primary" /><div><h2 className="font-semibold">Acompanhamento de metas</h2><p className="mt-1 text-xs text-muted-foreground">Evolução com base nos valores registrados pela equipe.</p></div></div>{data?.goals.length ? <div className="mt-6 space-y-5">{data.goals.map(goal => { const progress = goal.targetValue ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100)) : 0; return <div key={goal.id} className="rounded-xl bg-muted/45 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">{goal.title}</p><p className="mt-1 text-xs text-muted-foreground">Prazo: {goal.deadline ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(goal.deadline) : "não definido"}</p></div><Badge variant={goal.status === "completed" ? "default" : "secondary"}>{goal.currentValue} / {goal.targetValue} {goal.unit}</Badge></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-right text-xs text-muted-foreground">{progress}% concluído</p></div>; })}</div> : <EmptyPanel title="Metas ainda não foram registradas" description="Assim que a coordenação cadastrar objetivos, este relatório passará a exibir o progresso consolidado." />}</section>
    <section className="mt-6 rounded-2xl border border-border bg-card p-5"><div className="flex items-center gap-2"><Flag className="size-5 text-primary" /><div><h2 className="font-semibold">Atividades recentes</h2><p className="mt-1 text-xs text-muted-foreground">Resumo das tarefas acompanhadas no período.</p></div></div>{data?.tasks.length ? <div className="mt-5 divide-y divide-border">{data.tasks.slice(0, 10).map(task => <div key={task.id} className="flex items-center justify-between gap-4 py-3"><div><p className="text-sm font-medium">{task.title}</p><p className="mt-1 text-xs text-muted-foreground">Prioridade {task.priority === "urgent" ? "urgente" : task.priority}</p></div><Badge variant={task.status === "done" ? "default" : "secondary"}>{task.status === "in_progress" ? "Em andamento" : task.status === "done" ? "Concluída" : task.status === "todo" ? "A fazer" : task.status}</Badge></div>)}</div> : <EmptyPanel title="Sem atividades para consolidar" description="As tarefas da operação serão apresentadas aqui para apoiar as rotinas de prestação de contas." />}</section>
  </>;
}
export default function Reports() { return <CampaignGate><ReportsContent /></CampaignGate>; }
