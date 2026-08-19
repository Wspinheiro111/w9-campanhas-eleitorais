import { Badge } from "@/components/ui/badge";
import { useOrganization } from "@/contexts/OrganizationContext";
import { trpc } from "@/lib/trpc";
import { Activity, Building2, ShieldCheck } from "lucide-react";

const labels: Record<string, string> = {
  "organization.created": "Organização criada",
  "member.invited": "Convite enviado",
  "invitation.accepted": "Convite aceito",
  "member.role_updated": "Papel de integrante alterado",
};

export default function AuditLog() {
  const { activeOrganizationId, organizations } = useOrganization();
  const active = organizations.find(item => item.organization.id === activeOrganizationId);
  const canView = active?.membership.role === "admin" || active?.membership.role === "manager";
  const { data, isLoading } = trpc.organization.audit.list.useQuery({ organizationId: activeOrganizationId || 0, limit: 100 }, { enabled: Boolean(activeOrganizationId && canView) });

  if (!activeOrganizationId || !active) return <section className="rounded-2xl border border-border bg-card p-8 text-center"><Building2 className="mx-auto size-8 text-primary" /><h1 className="mt-4 font-serif text-2xl">Selecione uma organização</h1><p className="mt-2 text-sm text-muted-foreground">O histórico é exibido no contexto da organização ativa.</p></section>;
  if (!canView) return <section className="rounded-2xl border border-border bg-card p-8 text-center"><ShieldCheck className="mx-auto size-8 text-primary" /><h1 className="mt-4 font-serif text-2xl">Acesso restrito</h1><p className="mt-2 text-sm text-muted-foreground">Apenas administradores e gestores visualizam o histórico administrativo.</p></section>;

  return <><header className="mb-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Governança da organização</p><h1 className="mt-2 font-serif text-3xl tracking-tight">Histórico administrativo</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Acompanhe as principais ações administrativas da organização <strong className="font-medium text-foreground">{active.organization.name}</strong>.</p></header>
    <section className="rounded-2xl border border-border bg-card"><div className="flex items-center gap-3 border-b border-border p-5"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Activity className="size-5" /></span><div><h2 className="font-semibold">Eventos recentes</h2><p className="mt-1 text-xs text-muted-foreground">São exibidos os 100 eventos administrativos mais recentes.</p></div></div>{isLoading ? <div className="h-56 animate-pulse bg-muted/50" /> : data?.length ? <div className="divide-y divide-border">{data.map(({ log, actor }) => <article key={log.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{labels[log.action] || log.action}</p><Badge variant="outline">{log.entityType}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{actor?.name || actor?.email || "Sistema"}{log.metadata && typeof log.metadata === "object" ? ` · ${Object.entries(log.metadata as Record<string, unknown>).map(([key, value]) => `${key}: ${String(value)}`).join(" · ")}` : ""}</p></div><time className="shrink-0 text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString("pt-BR")}</time></article>)}</div> : <div className="p-10 text-center text-sm text-muted-foreground">Nenhuma ação administrativa foi registrada nesta organização ainda.</div>}</section>
  </>;
}
