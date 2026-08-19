import { EmptyPanel, PageHeader } from "@/components/CampaignShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCampaign } from "@/contexts/CampaignContext";
import { getQueuedVisits, queueOfflineVisit, removeQueuedVisits, type OfflineVisit } from "@/lib/offlineVisits";
import { trpc } from "@/lib/trpc";
import { CloudOff, RefreshCw, Save, Smartphone, Wifi } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

export default function FieldOps() {
  const { activeCampaign } = useCampaign();
  const utils = trpc.useUtils();
  const [voterId, setVoterId] = useState(""); const [outcome, setOutcome] = useState<OfflineVisit["outcome"]>("contacted"); const [notes, setNotes] = useState(""); const [pending, setPending] = useState(0);
  const visits = trpc.field.list.useQuery({ campaignId: activeCampaign?.id ?? 0 }, { enabled: Boolean(activeCampaign) });
  const voters = trpc.voters.list.useQuery({ campaignId: activeCampaign?.id ?? 0 }, { enabled: Boolean(activeCampaign) });
  const sync = trpc.field.sync.useMutation({ onSuccess: async (result) => { await utils.field.list.invalidate(); toast.success(`${result.created} visita(s) sincronizada(s).${result.duplicates ? ` ${result.duplicates} já existiam.` : ""}`); }, onError: error => toast.error(error.message) });
  const refreshQueue = async () => setPending((await getQueuedVisits()).length);
  useEffect(() => { refreshQueue(); const onOnline = () => flushQueue(); window.addEventListener("online", onOnline); return () => window.removeEventListener("online", onOnline); }, []);
  const flushQueue = async () => {
    if (!activeCampaign || !navigator.onLine) return;
    const queued = (await getQueuedVisits()).filter(visit => visit.campaignId === activeCampaign.id);
    if (!queued.length) return;
    try { await sync.mutateAsync({ campaignId: activeCampaign.id, visits: queued.map(visit => ({ voterId: visit.voterId, clientReference: visit.clientReference, outcome: visit.outcome, notes: visit.notes, occurredAt: new Date(visit.occurredAt) })) }); await removeQueuedVisits(queued.map(visit => visit.clientReference)); await refreshQueue(); } catch { toast.error("As visitas permanecem armazenadas neste dispositivo até a próxima tentativa."); }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!activeCampaign) return;
    const visit: OfflineVisit = { campaignId: activeCampaign.id, voterId: voterId ? Number(voterId) : undefined, clientReference: crypto.randomUUID(), outcome, notes: notes || undefined, occurredAt: new Date().toISOString() };
    if (!navigator.onLine) { await queueOfflineVisit(visit); await refreshQueue(); setNotes(""); toast.success("Visita salva offline. Ela será sincronizada quando houver internet."); return; }
    try { await sync.mutateAsync({ campaignId: activeCampaign.id, visits: [{ voterId: visit.voterId, clientReference: visit.clientReference, outcome: visit.outcome, notes: visit.notes, occurredAt: new Date(visit.occurredAt) }] }); setNotes(""); } catch { await queueOfflineVisit(visit); await refreshQueue(); toast.message("Sem conexão estável: a visita foi mantida offline."); }
  };
  if (!activeCampaign) return <EmptyPanel title="Selecione uma campanha" description="O canvassing de campo é organizado por campanha." />;
  return <section><PageHeader eyebrow="Operação de campo" title="Canvassing offline" description="Registre visitas em campo mesmo sem conexão. O dispositivo preserva os dados e sincroniza quando voltar a ficar online." action={<div className="flex items-center gap-2 text-xs text-muted-foreground">{navigator.onLine ? <Wifi className="size-4 text-emerald-600" /> : <CloudOff className="size-4 text-amber-600" />}{navigator.onLine ? "Conectado" : "Modo offline"}</div>} />
    <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]"><form onSubmit={submit} className="rounded-2xl border bg-card p-5 shadow-sm"><div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-primary/10 p-2 text-primary"><Smartphone className="size-5" /></span><div><h2 className="font-semibold">Registrar visita</h2><p className="text-sm text-muted-foreground">O registro fica seguro neste dispositivo até a sincronização.</p></div></div><div className="space-y-4"><div className="space-y-2"><Label htmlFor="visit-voter">Contato relacionado</Label><select id="visit-voter" value={voterId} onChange={event => setVoterId(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Visita sem contato identificado</option>{(voters.data ?? []).map(voter => <option value={voter.id} key={voter.id}>{voter.name}{voter.neighborhood ? ` · ${voter.neighborhood}` : ""}</option>)}</select></div><div className="space-y-2"><Label htmlFor="visit-outcome">Resultado</Label><select id="visit-outcome" value={outcome} onChange={event => setOutcome(event.target.value as OfflineVisit["outcome"])} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="contacted">Contato realizado</option><option value="absent">Ausente</option><option value="refused">Recusou atendimento</option><option value="follow_up">Requer retorno</option><option value="other">Outro</option></select></div><div className="space-y-2"><Label htmlFor="visit-notes">Observações</Label><Textarea id="visit-notes" value={notes} onChange={event => setNotes(event.target.value)} placeholder="Contexto da visita, demandas ou encaminhamentos." maxLength={3000} /></div><Button type="submit" className="w-full" disabled={sync.isPending}><Save className="mr-2 size-4" />Registrar visita</Button></div></form>
      <div className="space-y-5"><div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4"><div><p className="font-semibold text-amber-900">{pending === 1 ? "1 registro aguardando sincronização" : `${pending} registros aguardando sincronização`}</p><p className="mt-1 text-sm text-amber-800">A fila offline é local a este dispositivo e pode ser enviada quando houver conexão.</p></div><Button variant="outline" size="sm" onClick={flushQueue} disabled={!pending || sync.isPending || !navigator.onLine}><RefreshCw className="mr-2 size-4" />Sincronizar</Button></div><div className="rounded-2xl border bg-card"><div className="border-b p-4"><h2 className="font-semibold">Últimas visitas sincronizadas</h2></div><div className="divide-y">{(visits.data ?? []).slice(0, 8).map(item => <div key={item.visit.id} className="p-4"><div className="flex justify-between gap-4"><p className="font-medium">{item.voter?.name ?? "Visita sem contato"}</p><span className="text-xs text-muted-foreground">{new Date(item.visit.occurredAt).toLocaleString("pt-BR")}</span></div><p className="mt-1 text-sm text-muted-foreground">{item.visit.outcome} {item.visit.notes ? `· ${item.visit.notes}` : ""}</p></div>)}{!visits.data?.length && <p className="p-6 text-sm text-muted-foreground">Nenhuma visita sincronizada ainda.</p>}</div></div></div></div></section>;
}
