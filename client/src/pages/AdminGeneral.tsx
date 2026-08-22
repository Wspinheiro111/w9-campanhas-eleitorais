import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Copy, MessageCircle, Plus, ShieldCheck, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";

const digits = (value: string) => value.replace(/\D/g, "").slice(0, 11);
const formatPhone = (value: string) => {
  const phone = digits(value);
  if (phone.length <= 2) return phone ? `(${phone}` : "";
  if (phone.length <= 6) return `(${phone.slice(0, 2)}) ${phone.slice(2)}`;
  if (phone.length <= 10) return `(${phone.slice(0, 2)}) ${phone.slice(2, 6)}-${phone.slice(6)}`;
  return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
};

const statusLabels = { pending: "Aguardando liberação", access_released: "Acesso liberado", active: "Ativo", suspended: "Suspenso" } as const;

export default function AdminGeneral() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [form, setForm] = useState({ organizationName: "", legalName: "", fiscalId: "", contactName: "", contactPhone: "" });
  const [accessRole, setAccessRole] = useState<"admin" | "manager" | "operator" | "viewer">("admin");
  const [released, setReleased] = useState<{ phone: string; invitationUrl: string } | null>(null);
  const customers = trpc.platformAdmin.customers.list.useQuery(undefined, { enabled: user?.role === "admin" });
  const createCustomer = trpc.platformAdmin.customers.create.useMutation({ onSuccess: () => { setForm({ organizationName: "", legalName: "", fiscalId: "", contactName: "", contactPhone: "" }); utils.platformAdmin.customers.list.invalidate(); } });
  const releaseAccess = trpc.platformAdmin.customers.releaseAccess.useMutation({ onSuccess: result => { setReleased(result); utils.platformAdmin.customers.list.invalidate(); } });
  const validPhone = useMemo(() => { const phone = digits(form.contactPhone); return phone.length === 10 || phone.length === 11; }, [form.contactPhone]);

  if (user?.role !== "admin") return <Card><CardHeader><CardTitle>Acesso restrito</CardTitle><CardDescription>Este painel é exclusivo da administração geral da plataforma.</CardDescription></CardHeader></Card>;

  const release = (customerId: number) => releaseAccess.mutate({ customerId, role: accessRole, origin: window.location.origin });
  const shareOnWhatsApp = () => { if (!released) return; window.open(`https://wa.me/55${released.phone}?text=${encodeURIComponent(`Seu acesso ao W9 Campanhas está pronto. Aceite o convite seguro: ${released.invitationUrl}`)}`, "_blank", "noopener,noreferrer"); };
  return <div className="space-y-6"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Venda direta</p><h1 className="font-serif text-3xl font-bold tracking-tight">Administração geral</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Cadastre compradores, crie suas organizações e libere o acesso inicial por convite seguro.</p></div><Badge className="w-fit gap-1"><ShieldCheck className="size-3.5" />Acesso de plataforma</Badge></div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)]"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Plus className="size-4 text-primary" />Novo comprador</CardTitle><CardDescription>O comprador receberá o acesso somente após sua liberação explícita.</CardDescription></CardHeader><CardContent><form className="grid gap-4" onSubmit={event => { event.preventDefault(); if (validPhone) createCustomer.mutate({ ...form, contactPhone: digits(form.contactPhone) }); }}><div className="grid gap-2"><Label htmlFor="customer-org">Organização / campanha</Label><Input id="customer-org" value={form.organizationName} onChange={event => setForm(current => ({ ...current, organizationName: event.target.value }))} placeholder="Ex.: Comitê Maria Silva" required /></div><div className="grid gap-2"><Label htmlFor="customer-name">Responsável comprador</Label><Input id="customer-name" value={form.contactName} onChange={event => setForm(current => ({ ...current, contactName: event.target.value }))} placeholder="Nome completo" required /></div><div className="grid gap-2"><Label htmlFor="customer-phone">Telefone / WhatsApp</Label><Input id="customer-phone" value={formatPhone(form.contactPhone)} onChange={event => setForm(current => ({ ...current, contactPhone: digits(event.target.value) }))} placeholder="(51) 99999-9999" aria-invalid={form.contactPhone.length > 0 && !validPhone} required />{form.contactPhone && !validPhone && <p className="text-xs font-medium text-destructive">Informe um telefone brasileiro válido.</p>}</div><div className="grid gap-2 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="customer-legal">Razão social</Label><Input id="customer-legal" value={form.legalName} onChange={event => setForm(current => ({ ...current, legalName: event.target.value }))} placeholder="Opcional" /></div><div className="grid gap-2"><Label htmlFor="customer-fiscal">CPF/CNPJ</Label><Input id="customer-fiscal" value={form.fiscalId} onChange={event => setForm(current => ({ ...current, fiscalId: event.target.value }))} placeholder="Opcional" /></div></div><Button type="submit" disabled={!validPhone || createCustomer.isPending}>{createCustomer.isPending ? "Cadastrando..." : "Cadastrar comprador"}</Button></form></CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="size-4 text-primary" />Compradores cadastrados</CardTitle><CardDescription>Libere o acesso quando a venda estiver confirmada. Cada liberação gera um convite com validade de sete dias.</CardDescription></CardHeader><CardContent><div className="space-y-3">{customers.isLoading && <p className="text-sm text-muted-foreground">Carregando compradores...</p>}{customers.data?.length === 0 && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhum comprador cadastrado ainda.</p>}{customers.data?.map(({ customer, organization, invitation }) => <div key={customer.id} className="rounded-xl border bg-card p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{organization.name}</p><Badge variant={customer.status === "active" ? "default" : "secondary"}>{statusLabels[customer.status]}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{customer.contactName} · {formatPhone(customer.contactPhone)}</p>{invitation && <p className="mt-1 text-xs text-muted-foreground">Convite: {invitation.status === "accepted" ? "aceito" : invitation.status === "pending" ? "pendente" : invitation.status}</p>}</div><div className="flex flex-wrap gap-2"><Select value={accessRole} onValueChange={value => setAccessRole(value as typeof accessRole)}><SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="admin">Administrador</SelectItem><SelectItem value="manager">Gestor</SelectItem><SelectItem value="operator">Operador</SelectItem><SelectItem value="viewer">Leitor</SelectItem></SelectContent></Select><Button size="sm" onClick={() => release(customer.id)} disabled={releaseAccess.isPending}>Liberar acesso</Button></div></div></div>)}</div></CardContent></Card></div>
    {released && <Card className="border-primary/30 bg-primary/5"><CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 size-5 text-primary" /><div><p className="font-semibold">Acesso liberado</p><p className="text-sm text-muted-foreground">Envie o convite pelo canal aprovado pela sua operação.</p></div></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(released.invitationUrl)}><Copy className="mr-1.5 size-3.5" />Copiar link</Button><Button size="sm" onClick={shareOnWhatsApp}><MessageCircle className="mr-1.5 size-3.5" />Abrir WhatsApp</Button></div></CardContent></Card>}
  </div>;
}
