import { useAuth } from "@/_core/hooks/useAuth";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isPlatformAdminEmail } from "@shared/platformAdmin";
import { Activity, Building2, LockKeyhole, LogOut, Settings2, ShieldCheck, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import AdminCommandCenter, { type CommandSection } from "./AdminCommandCenter";
import AdminGeneral from "./AdminGeneral";

export default function AdminPortal() {
  const { user, loading, logout } = useAuth();
  const [section, setSection] = useState<CommandSection>("overview");

  useEffect(() => {
    if (!loading && !user) window.location.assign("/login");
  }, [loading, user]);

  if (loading || !user) return <main className="grid min-h-screen place-items-center bg-[#071329] p-6 text-white"><p className="animate-pulse text-sm text-white/70">Validando acesso administrativo...</p></main>;

  if (!isPlatformAdminEmail(user.email)) return <main className="grid min-h-screen place-items-center bg-[#071329] p-6"><Card className="w-full max-w-lg border-white/10 bg-[#0F1C3F] text-white shadow-2xl"><CardHeader><div className="mb-2 grid size-11 place-items-center rounded-xl bg-destructive/15 text-destructive"><LockKeyhole className="size-5" /></div><CardTitle>Acesso restrito</CardTitle><CardDescription className="text-white/60">Este portal administrativo é independente do sistema operacional e está disponível somente ao proprietário autorizado.</CardDescription></CardHeader><CardContent><Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => window.location.assign("/")}>Voltar ao site</Button></CardContent></Card></main>;

  const navigation: { id: CommandSection; label: string; icon: typeof Activity }[] = [{ id: "overview", label: "Visão geral", icon: Activity }, { id: "customers", label: "Clientes e usuários", icon: UsersRound }, { id: "security", label: "Segurança", icon: ShieldCheck }, { id: "health", label: "Saúde da plataforma", icon: Building2 }, { id: "future", label: "Capacidades futuras", icon: Settings2 }];
  return <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(0,168,89,.17),transparent_32%),#071329] text-foreground"><header className="border-b border-white/10 bg-[#0A1634]/95 px-5 py-4 text-white backdrop-blur sm:px-8"><div className="mx-auto flex max-w-[1540px] flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><BrandMark /><div className="hidden border-l border-white/15 pl-3 sm:block"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#FFC300]">Portal independente</p><p className="text-sm font-semibold">Central de Comando W9</p></div></div><div className="flex items-center gap-3"><span className="hidden text-right text-xs text-white/60 sm:block">Administrador exclusivo<br /><strong className="font-medium text-white">{user.email}</strong></span><Button variant="outline" size="sm" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={logout}><LogOut className="mr-1.5 size-3.5" />Sair</Button></div></div></header><div className="mx-auto grid w-full max-w-[1540px] lg:grid-cols-[230px_minmax(0,1fr)]"><aside className="border-b border-white/10 bg-[#091632]/80 p-3 lg:min-h-[calc(100vh-73px)] lg:border-b-0 lg:border-r lg:p-5"><p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[.16em] text-white/45">Controle SaaS</p><nav className="flex gap-2 overflow-x-auto lg:flex-col">{navigation.map(item => { const Icon = item.icon; const active = section === item.id; return <button key={item.id} type="button" onClick={() => setSection(item.id)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition ${active ? "bg-[#FFC300] font-semibold text-[#071329]" : "text-white/65 hover:bg-white/5 hover:text-white"}`}><Icon className="size-4" />{item.label}</button>; })}</nav></aside><section className="min-w-0 p-4 sm:p-6 lg:p-8">{section === "customers" ? <AdminGeneral /> : <AdminCommandCenter section={section} onNavigate={setSection} />}</section></div></main>;
}
