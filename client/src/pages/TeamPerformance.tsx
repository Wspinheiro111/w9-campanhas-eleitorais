import { CampaignGate, EmptyPanel, PageHeader } from "@/components/CampaignShell";
import { Badge } from "@/components/ui/badge";
import { useCampaign } from "@/contexts/CampaignContext";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Flag, UsersRound } from "lucide-react";

function TeamPerformanceContent() {
  const { activeCampaign } = useCampaign();
  const { data, isLoading } = trpc.team.performance.useQuery({ campaignId: activeCampaign!.id });
  if (isLoading) return <div className="h-80 animate-pulse rounded-2xl bg-muted" />;
  return <><PageHeader eyebrow="Execução" title="Metas por equipe" description="Compare tarefas, entregas, compromissos e metas vinculadas à atuação de cada integrante." />
    {data?.length ? <section className="overflow-hidden rounded-2xl border border-border bg-card"><div className="grid grid-cols-[minmax(180px,1.5fr)_repeat(4,minmax(78px,1fr))] gap-3 border-b border-border bg-muted/35 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><span>Integrante</span><span>Tarefas</span><span>Concluídas</span><span>Metas</span><span>Eventos</span></div>{data.map(item => { const rate = item.tasks ? Math.round((item.completed / item.tasks) * 100) : 0; return <article key={item.member.id} className="grid grid-cols-[minmax(180px,1.5fr)_repeat(4,minmax(78px,1fr))] gap-3 border-b border-border px-5 py-4 last:border-0"><div><p className="font-semibold">{item.member.name}</p><p className="mt-1 text-xs text-muted-foreground">{item.member.responsibility || item.member.role}</p><div className="mt-3 h-1.5 max-w-44 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${rate}%` }} /></div><p className="mt-1 text-xs text-muted-foreground">{rate}% concluído</p></div><span className="text-sm font-medium">{item.tasks}</span><span className="text-sm font-medium text-primary">{item.completed}</span><span><Badge variant="secondary">{item.goals}</Badge></span><span className="text-sm font-medium">{item.events}</span></article>; })}</section> : <EmptyPanel title="A equipe ainda não possui indicadores de execução" description="Atribua tarefas, metas e eventos aos integrantes para visualizar o desempenho consolidado." action={<span className="inline-flex items-center gap-2 text-sm font-medium text-primary"><CheckCircle2 className="size-4" />Acompanhe as entregas</span>} />}
    <div className="mt-6 flex items-center gap-3 rounded-2xl border border-primary/15 bg-primary/[.035] p-5 text-sm text-muted-foreground"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Flag className="size-5" /></span><p>As metas são atribuídas indiretamente pelas tarefas vinculadas a cada objetivo. Use a distribuição de tarefas para equilibrar a execução territorial.</p></div>
  </>;
}
export default function TeamPerformance() { return <CampaignGate><TeamPerformanceContent /></CampaignGate>; }
