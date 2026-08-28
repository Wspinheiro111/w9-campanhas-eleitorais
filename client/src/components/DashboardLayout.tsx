import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useCampaign } from "@/contexts/CampaignContext";
import { isPaletteAccessible, type CustomPalette, useTheme } from "@/contexts/ThemeContext";
import { useIsMobile } from "@/hooks/useMobile";
import { Activity, BarChart3, BellRing, BookOpenText, Bot, Building2, Calculator, CalendarDays, CheckSquare, ClipboardCheck, ContactRound, Download, Flag, Flame, Gauge, HeartHandshake, LayoutDashboard, LogOut, MapPinned, MessageSquare, Mic, Palette, PanelLeft, Radar, Scale, ShieldCheck, Siren, UsersRound } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { BrandMark } from "./BrandMark";
import { OrganizationSwitcher } from "./OrganizationSwitcher";

export const menuItems = [
  { icon: LayoutDashboard, label: "Visão geral", path: "/painel" },
  { icon: Gauge, label: "Dashboard executivo", path: "/executivo", requiresManage: true },
  { icon: Building2, label: "Organizações", path: "/organizacoes" },
  { icon: Gauge, label: "Painel técnico", path: "/tecnico" },
  { icon: UsersRound, label: "Equipe", path: "/equipe" },
  { icon: CalendarDays, label: "Escalas e disponibilidade", path: "/escalas", requiresManage: true },
  { icon: BellRing, label: "Notificações", path: "/notificacoes" },
  { icon: HeartHandshake, label: "Voluntários", path: "/voluntarios", requiresManage: true },
  { icon: CalendarDays, label: "Agenda", path: "/agenda" },
  { icon: BarChart3, label: "Indicadores de eventos", path: "/eventos/indicadores", requiresManage: true },
  { icon: Scale, label: "Prestação de contas", path: "/prestacao-contas", requiresManage: true },
  { icon: CheckSquare, label: "Tarefas", path: "/tarefas" },
  { icon: Flag, label: "Metas operacionais", path: "/metas-operacionais", requiresManage: true },
  { icon: CalendarDays, label: "Coordenação diária", path: "/coordenacao-diaria", requiresManage: true },
  { icon: ContactRound, label: "Contatos", path: "/contatos" },
  { icon: MessageSquare, label: "Comunicação", path: "/comunicacao", requiresManage: true },
  { icon: ClipboardCheck, label: "Campo offline", path: "/campo" },
  { icon: MapPinned, label: "Rua, demandas e materiais", path: "/operacoes-rua" },
  { icon: ShieldCheck, label: "Consentimentos", path: "/consentimentos" },
  { icon: ShieldCheck, label: "W9 Compliance Eleitoral", path: "/compliance", requiresManage: true },
  { icon: Siren, label: "Sala de crise", path: "/crise" },
  { icon: UsersRound, label: "Pipeline", path: "/pipeline" },
  { icon: Flame, label: "Mobilização", path: "/mobilizacao" },
  { icon: Calculator, label: "Simulador", path: "/simulador" },
  { icon: MapPinned, label: "Território", path: "/territorio" },
  { icon: UsersRound, label: "Desempenho", path: "/equipe/desempenho" },
  { icon: BarChart3, label: "Benchmark", path: "/benchmark-equipe", requiresManage: true },
  { icon: BookOpenText, label: "Conteúdos", path: "/conteudos" },
  { icon: Mic, label: "Áudio para CRM", path: "/audio-crm" },
  { icon: Radar, label: "Monitoramento", path: "/monitoramento" },
  { icon: Download, label: "Instalar aplicativo", path: "/instalar-app" },
  { icon: Bot, label: "W9 Inteligência", path: "/inteligencia" },
  { icon: BarChart3, label: "Relatórios", path: "/relatorios" },
  { icon: ShieldCheck, label: "Segurança", path: "/seguranca" },
  { icon: Activity, label: "Auditoria", path: "/auditoria" },
];
const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 268;
const MIN_WIDTH = 220;
const MAX_WIDTH = 380;

const paletteLabels: Record<keyof CustomPalette, string> = { primary: "Principal", secondary: "Secundária", accent: "Destaque", background: "Fundo", surface: "Superfície", text: "Texto", border: "Borda" };
function ThemePicker() {
  const { theme, setTheme, themes, customPalette, saveCustomPalette } = useTheme(); const [open, setOpen] = useState(false); const [draft, setDraft] = useState<CustomPalette>(customPalette); const valid = isPaletteAccessible(draft); const currentTheme = themes.find(item => item.id === theme); const currentLabel = currentTheme?.label ?? "Paleta personalizada"; const currentSwatches = currentTheme?.swatches ?? [customPalette.primary, customPalette.accent, customPalette.surface];
  useEffect(() => { setDraft(customPalette); }, [customPalette]);
  const save = () => { if (saveCustomPalette(draft)) setOpen(false); };
  return <><DropdownMenu><DropdownMenuTrigger asChild><button className="flex w-full items-center gap-2 rounded-lg border border-white/15 px-2.5 py-2 text-left text-xs text-sidebar-foreground transition-colors hover:bg-sidebar-accent" aria-label="Selecionar identidade visual"><Palette className="size-3.5 shrink-0" /><span className="min-w-0 flex-1 truncate">{currentLabel}</span><span className="flex -space-x-1">{currentSwatches.map(color => <i key={color} className="size-3 rounded-full border border-white/40" style={{ backgroundColor: color }} />)}</span></button></DropdownMenuTrigger><DropdownMenuContent align="start" className="w-80 p-2"><p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Identidade visual</p><div className="grid gap-1">{themes.map(item => <DropdownMenuItem key={item.id} onSelect={() => setTheme(item.id)} className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 ${theme === item.id ? "bg-accent" : ""}`}><span className="flex -space-x-1.5">{item.swatches.map(color => <i key={color} className="size-5 rounded-full border-2 border-card" style={{ backgroundColor: color }} />)}</span><span className="min-w-0"><span className="block text-sm font-medium">{item.label}</span><span className="block truncate text-xs text-muted-foreground">{item.description}</span></span></DropdownMenuItem>)}<DropdownMenuItem onSelect={() => setOpen(true)} className={`mt-1 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-2 py-2.5 ${theme === "custom" ? "bg-accent" : ""}`}><span className="flex -space-x-1.5">{[customPalette.primary, customPalette.accent, customPalette.surface].map(color => <i key={color} className="size-5 rounded-full border-2 border-card" style={{ backgroundColor: color }} />)}</span><span><span className="block text-sm font-medium">Paleta personalizada</span><span className="block text-xs text-muted-foreground">Defina cores manualmente</span></span></DropdownMenuItem></div></DropdownMenuContent></DropdownMenu><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Paleta personalizada</DialogTitle><DialogDescription>Defina os tokens principais da aplicação. O salvamento exige contraste adequado para texto e ações.</DialogDescription></DialogHeader><div className="grid gap-3 sm:grid-cols-2">{(Object.keys(paletteLabels) as Array<keyof CustomPalette>).map(key => <label key={key} className="rounded-xl border bg-card p-3 text-sm font-medium"><span className="mb-2 block">{paletteLabels[key]}</span><span className="flex items-center gap-2"><input aria-label={`Cor ${paletteLabels[key]}`} type="color" value={draft[key]} onChange={event => setDraft(current => ({ ...current, [key]: event.target.value.toUpperCase() }))} className="size-10 rounded border-0 bg-transparent p-0" /><input value={draft[key]} onChange={event => setDraft(current => ({ ...current, [key]: event.target.value.toUpperCase() }))} className="h-10 min-w-0 flex-1 rounded-md border bg-background px-2 font-mono text-xs" /></span></label>)}</div><div className="rounded-xl border p-4" style={{ backgroundColor: draft.background, color: draft.text, borderColor: draft.border }}><p className="font-serif text-lg">Prévia da paleta</p><p className="mt-1 text-sm">Texto, superfície e borda conforme as cores informadas.</p><button type="button" className="mt-3 rounded-md px-3 py-2 text-sm font-semibold" style={{ backgroundColor: draft.primary, color: "#ffffff" }}>Ação principal</button></div>{!valid && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">A combinação de texto, fundo ou ação não alcança o contraste mínimo. Ajuste as cores para continuar.</p>}<DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save} disabled={!valid}>Aplicar paleta</Button></DialogFooter></DialogContent></Dialog></>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => Number(localStorage.getItem(SIDEBAR_WIDTH_KEY)) || DEFAULT_WIDTH);
  const { loading, user } = useAuth();
  useEffect(() => { localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth)); }, [sidebarWidth]);
  useEffect(() => { if (!loading && !user) window.location.assign("/login"); else if (user?.mustChangePassword) window.location.assign("/primeiro-acesso"); }, [loading, user]);
  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) return <DashboardLayoutSkeleton />;
  return <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}><DashboardLayoutContent setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent></SidebarProvider>;
}

function DashboardLayoutContent({ children, setSidebarWidth }: { children: React.ReactNode; setSidebarWidth: (width: number) => void }) {
  const { user, logout } = useAuth(); const { activeCampaign } = useCampaign(); const [location, setLocation] = useLocation(); const { state, toggleSidebar } = useSidebar(); const isCollapsed = state === "collapsed"; const [isResizing, setIsResizing] = useState(false); const sidebarRef = useRef<HTMLDivElement>(null); const isMobile = useIsMobile(); const visibleMenuItems = menuItems.filter(item => !item.requiresManage || activeCampaign?.memberRole !== "partner"); const activeItem = visibleMenuItems.find(item => item.path === location);
  useEffect(() => { if (isCollapsed) setIsResizing(false); }, [isCollapsed]);
  useEffect(() => { const move = (event: MouseEvent) => { if (!isResizing) return; const left = sidebarRef.current?.getBoundingClientRect().left ?? 0; const next = event.clientX - left; if (next >= MIN_WIDTH && next <= MAX_WIDTH) setSidebarWidth(next); }; const up = () => setIsResizing(false); if (isResizing) { document.addEventListener("mousemove", move); document.addEventListener("mouseup", up); document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none"; } return () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); document.body.style.cursor = ""; document.body.style.userSelect = ""; }; }, [isResizing, setSidebarWidth]);
  return <><div className="relative" ref={sidebarRef}><Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground" disableTransition={isResizing}><SidebarHeader className="border-b border-sidebar-border px-3 py-3"><div className="flex items-center gap-3"><button onClick={toggleSidebar} className="flex size-9 shrink-0 items-center justify-center rounded-xl text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" aria-label="Alternar navegação"><PanelLeft className="size-4" /></button>{!isCollapsed && <BrandMark />}</div>{!isCollapsed && <div className="mt-3 space-y-2"><OrganizationSwitcher /><ThemePicker /></div>}</SidebarHeader><SidebarContent className="gap-0 px-2 py-5"><p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.17em] text-sidebar-foreground/45 group-data-[collapsible=icon]:hidden">Operação</p><SidebarMenu>{visibleMenuItems.map(item => <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={location === item.path} onClick={() => setLocation(item.path)} tooltip={item.label} className="h-10 rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground"><item.icon className="size-4" /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarContent><SidebarFooter className="border-t border-sidebar-border p-3"><DropdownMenu><DropdownMenuTrigger asChild><button className="flex w-full items-center gap-3 rounded-xl px-1.5 py-1.5 text-left transition-colors hover:bg-sidebar-accent group-data-[collapsible=icon]:justify-center"><Avatar className="size-8 border border-sidebar-border"><AvatarFallback className="bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">{user?.name?.charAt(0).toUpperCase()}</AvatarFallback></Avatar><div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-medium text-sidebar-foreground">{user?.name || "Usuário"}</p><p className="mt-0.5 truncate text-[11px] text-sidebar-foreground/50">{user?.email || "Acesso seguro"}</p></div></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48"><DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive"><LogOut className="mr-2 size-4" />Sair da plataforma</DropdownMenuItem></DropdownMenuContent></DropdownMenu></SidebarFooter></Sidebar><div className={`absolute right-0 top-0 z-50 h-full w-1 cursor-col-resize transition-colors hover:bg-sidebar-primary/60 ${isCollapsed ? "hidden" : ""}`} onMouseDown={() => setIsResizing(true)} /></div><SidebarInset className="min-h-screen bg-background">{isMobile && <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-3 backdrop-blur"><SidebarTrigger className="rounded-lg" /><span className="text-sm font-semibold">{activeItem?.label ?? "W9 Campanhas"}</span></div>}<main className="mx-auto w-full max-w-[1540px] flex-1 p-4 sm:p-6 lg:p-8">{children}</main></SidebarInset></>;
}
