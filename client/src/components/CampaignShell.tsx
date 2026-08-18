import { useCampaign } from "@/contexts/CampaignContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Landmark, Plus, Sparkles } from "lucide-react";
import { FormEvent, ReactNode, useState } from "react";
import { toast } from "sonner";

export function CampaignGate({ children }: { children: ReactNode }) {
  const { activeCampaign, campaigns, loading, refetchCampaigns } = useCampaign();
  const [name, setName] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [electionLabel, setElectionLabel] = useState("");
  const [region, setRegion] = useState("");
  const createCampaign = trpc.campaign.create.useMutation({
    onSuccess: () => { toast.success("Campanha criada com segurança."); refetchCampaigns(); },
    onError: error => toast.error(error.message),
  });

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    createCampaign.mutate({ name, candidateName, electionLabel, region });
  };

  if (loading) return <div className="space-y-5 p-4 md:p-7"><Skeleton className="h-10 w-64" /><Skeleton className="h-64 w-full" /></div>;
  if (activeCampaign) return <>{children}</>;

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-4xl items-center py-8">
      <div className="grid w-full overflow-hidden rounded-[2rem] border border-border/60 bg-card shadow-[0_24px_80px_-40px_rgba(20,50,38,.55)] lg:grid-cols-[.9fr_1.1fr]">
        <div className="relative overflow-hidden bg-[#0f3527] p-8 text-white sm:p-11">
          <div className="absolute -right-12 -top-16 h-52 w-52 rounded-full bg-[#c9a85b]/20 blur-2xl" />
          <div className="relative">
            <div className="mb-12 flex size-11 items-center justify-center rounded-2xl bg-[#c9a85b] text-[#173426]"><Landmark className="size-5" /></div>
            <p className="text-xs font-semibold uppercase tracking-[.22em] text-[#e4cc8d]">W9 Campanhas</p>
            <h1 className="mt-4 font-serif text-3xl leading-tight">A inteligência começa com uma operação bem estruturada.</h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/70">Crie o ambiente exclusivo da campanha para organizar equipe, agenda, atividades, contatos e indicadores com governança.</p>
          </div>
        </div>
        <form onSubmit={handleCreate} className="p-8 sm:p-11">
          <div className="mb-8"><p className="text-sm font-semibold text-primary">Início da operação</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Configure a primeira campanha</h2><p className="mt-2 text-sm text-muted-foreground">Os dados serão separados por campanha e o seu perfil será definido como administrador.</p></div>
          <div className="grid gap-4">
            <div className="space-y-2"><Label htmlFor="campaign-name">Nome da campanha</Label><Input id="campaign-name" value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: Projeto Cidade 2028" required /></div>
            <div className="space-y-2"><Label htmlFor="candidate-name">Candidato(a)</Label><Input id="candidate-name" value={candidateName} onChange={event => setCandidateName(event.target.value)} placeholder="Nome completo" required /></div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="election-label">Eleição / cargo</Label><Input id="election-label" value={electionLabel} onChange={event => setElectionLabel(event.target.value)} placeholder="Ex.: Vereador 2028" required /></div><div className="space-y-2"><Label htmlFor="region">Região-base</Label><Input id="region" value={region} onChange={event => setRegion(event.target.value)} placeholder="Município ou região" required /></div></div>
          </div>
          <Button type="submit" size="lg" className="mt-7 w-full bg-[#0f3527] text-white hover:bg-[#174a35]" disabled={createCampaign.isPending}>{createCampaign.isPending ? "Criando ambiente..." : <><Plus className="mr-2 size-4" />Criar campanha</>}</Button>
          {campaigns.length > 0 && <p className="mt-4 text-center text-xs text-muted-foreground"><Sparkles className="mr-1 inline size-3" />Selecione outra campanha pelo menu superior após a sincronização.</p>}
        </form>
      </div>
    </section>
  );
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  const { activeCampaign, campaigns, setActiveCampaignId } = useCampaign();
  return <header className="mb-7 flex flex-col gap-5 border-b border-border/70 pb-6 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.18em] text-primary">{eyebrow}</p><h1 className="mt-2 font-serif text-3xl tracking-tight text-foreground sm:text-4xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p></div><div className="flex flex-wrap items-center gap-3"><select aria-label="Selecionar campanha" value={activeCampaign?.id ?? ""} onChange={event => setActiveCampaignId(Number(event.target.value))} className="h-10 max-w-[220px] rounded-lg border border-border bg-card px-3 text-sm font-medium outline-none ring-offset-background focus:ring-2 focus:ring-ring">{campaigns.map(campaign => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select>{action}</div></header>;
}

export function EmptyPanel({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center"><p className="font-semibold text-foreground">{title}</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>{action && <div className="mt-5">{action}</div>}</div>;
}
