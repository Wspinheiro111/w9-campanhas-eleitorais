import { CampaignGate, EmptyPanel, PageHeader } from "@/components/CampaignShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCampaign } from "@/contexts/CampaignContext";
import { trpc } from "@/lib/trpc";
import { ArrowRight, ContactRound, UsersRound } from "lucide-react";

const stages = ["identified", "approached", "engaged", "mobilized"] as const;
const labels: Record<(typeof stages)[number], string> = { identified: "Identificados", approached: "Abordados", engaged: "Engajados", mobilized: "Mobilizados" };

function PipelineContent() {
  const { activeCampaign } = useCampaign();
  const { data: contacts, isLoading, refetch } = trpc.voters.list.useQuery({ campaignId: activeCampaign!.id });
  const move = trpc.voters.movePipeline.useMutation({ onSuccess: () => void refetch() });
  if (isLoading) return <div className="h-96 animate-pulse rounded-2xl bg-muted" />;
  return <><PageHeader eyebrow="Relacionamento" title="Pipeline de mobilização" description="Acompanhe a evolução da base consentida, desde a identificação até a mobilização." />
    {contacts?.length ? <div className="grid gap-4 xl:grid-cols-4">{stages.map((stage, index) => { const entries = contacts.filter(contact => contact.pipelineStage === stage); const next = stages[index + 1]; return <section key={stage} className="min-h-[440px] rounded-2xl border border-border bg-card p-4"><div className="flex items-center justify-between border-b border-border pb-3"><div><h2 className="font-semibold">{labels[stage]}</h2><p className="mt-1 text-xs text-muted-foreground">{entries.length} contato(s)</p></div><Badge variant={stage === "mobilized" ? "default" : "secondary"}>{index + 1}/4</Badge></div><div className="mt-4 space-y-3">{entries.map(contact => <article key={contact.id} className="rounded-xl border border-border bg-muted/35 p-3"><div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold">{contact.name}</p><ContactRound className="size-4 text-primary" /></div><p className="mt-1 text-xs text-muted-foreground">{contact.neighborhood || contact.region || "Território não informado"}</p>{next ? <Button size="sm" variant="outline" className="mt-3 w-full" disabled={move.isPending} onClick={() => move.mutate({ voterId: contact.id, pipelineStage: next })}>Mover para {labels[next]}<ArrowRight className="ml-2 size-3" /></Button> : <p className="mt-3 text-xs font-medium text-primary">Mobilização concluída</p>}</article>)}</div></section>; })}</div> : <EmptyPanel title="Nenhum contato disponível no pipeline" description="Adicione contatos consentidos no CRM ou use o formulário público para iniciar o relacionamento." action={<span className="inline-flex items-center gap-2 text-sm font-medium text-primary"><UsersRound className="size-4" />Base de relacionamento</span>} />}
  </>;
}
export default function Pipeline() { return <CampaignGate><PipelineContent /></CampaignGate>; }
