import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { BarChart3, BookOpenText, Bot, CalendarDays, CheckSquare, ContactRound, LayoutDashboard, LogOut, MapPinned, Mic, PanelLeft, Radar, ShieldCheck, UsersRound } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

const menuItems = [
  { icon: LayoutDashboard, label: "Visão geral", path: "/" },
  { icon: UsersRound, label: "Equipe", path: "/equipe" },
  { icon: CalendarDays, label: "Agenda", path: "/agenda" },
  { icon: CheckSquare, label: "Tarefas", path: "/tarefas" },
  { icon: ContactRound, label: "Contatos", path: "/contatos" },
  { icon: UsersRound, label: "Pipeline", path: "/pipeline" },
  { icon: MapPinned, label: "Território", path: "/territorio" },
  { icon: UsersRound, label: "Desempenho", path: "/equipe/desempenho" },
  { icon: BookOpenText, label: "Conteúdos", path: "/conteudos" },
  { icon: Mic, label: "Áudio para CRM", path: "/audio-crm" },
  { icon: Radar, label: "Monitoramento", path: "/monitoramento" },
  { icon: Bot, label: "W9 Inteligência", path: "/inteligencia" },
  { icon: BarChart3, label: "Relatórios", path: "/relatorios" },
];
const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 268;
const MIN_WIDTH = 220;
const MAX_WIDTH = 380;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => Number(localStorage.getItem(SIDEBAR_WIDTH_KEY)) || DEFAULT_WIDTH);
  const { loading, user } = useAuth();
  useEffect(() => { localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth)); }, [sidebarWidth]);
  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) return <div className="flex min-h-screen items-center justify-center bg-[#f8f7f2] p-5"><div className="w-full max-w-md rounded-[2rem] border border-border bg-card p-9 text-center shadow-[0_24px_80px_-40px_rgba(20,50,38,.55)]"><div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#103527] text-[#e4cc8d]"><ShieldCheck className="size-6" /></div><h1 className="mt-6 font-serif text-3xl">Acesso protegido</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Entre para acessar o ambiente seguro de gestão da campanha.</p><Button onClick={() => startLogin()} size="lg" className="mt-7 w-full bg-[#103527] text-white hover:bg-[#174a35]">Entrar na plataforma</Button></div></div>;
  return <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}><DashboardLayoutContent setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent></SidebarProvider>;
}

function DashboardLayoutContent({ children, setSidebarWidth }: { children: React.ReactNode; setSidebarWidth: (width: number) => void }) {
  const { user, logout } = useAuth(); const [location, setLocation] = useLocation(); const { state, toggleSidebar } = useSidebar(); const isCollapsed = state === "collapsed"; const [isResizing, setIsResizing] = useState(false); const sidebarRef = useRef<HTMLDivElement>(null); const isMobile = useIsMobile(); const activeItem = menuItems.find(item => item.path === location);
  useEffect(() => { if (isCollapsed) setIsResizing(false); }, [isCollapsed]);
  useEffect(() => { const move = (event: MouseEvent) => { if (!isResizing) return; const left = sidebarRef.current?.getBoundingClientRect().left ?? 0; const next = event.clientX - left; if (next >= MIN_WIDTH && next <= MAX_WIDTH) setSidebarWidth(next); }; const up = () => setIsResizing(false); if (isResizing) { document.addEventListener("mousemove", move); document.addEventListener("mouseup", up); document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none"; } return () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); document.body.style.cursor = ""; document.body.style.userSelect = ""; }; }, [isResizing, setSidebarWidth]);
  return <><div className="relative" ref={sidebarRef}><Sidebar collapsible="icon" className="border-r border-[#214837] bg-[#103527] text-white" disableTransition={isResizing}><SidebarHeader className="h-[74px] justify-center border-b border-white/10 px-3"><div className="flex items-center gap-3"><button onClick={toggleSidebar} className="flex size-9 shrink-0 items-center justify-center rounded-xl text-white/70 transition-colors hover:bg-white/10 hover:text-white" aria-label="Alternar navegação"><PanelLeft className="size-4" /></button>{!isCollapsed && <div className="flex min-w-0 items-center gap-2"><span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#c9a85b] text-[#103527]"><ShieldCheck className="size-4" /></span><span className="truncate font-serif text-lg text-white">W9 Campanhas</span></div>}</div></SidebarHeader><SidebarContent className="gap-0 px-2 py-5"><p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.17em] text-white/35 group-data-[collapsible=icon]:hidden">Operação</p><SidebarMenu>{menuItems.map(item => <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={location === item.path} onClick={() => setLocation(item.path)} tooltip={item.label} className="h-10 rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white data-[active=true]:bg-[#c9a85b] data-[active=true]:text-[#103527]"><item.icon className="size-4" /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarContent><SidebarFooter className="border-t border-white/10 p-3"><DropdownMenu><DropdownMenuTrigger asChild><button className="flex w-full items-center gap-3 rounded-xl px-1.5 py-1.5 text-left transition-colors hover:bg-white/10 group-data-[collapsible=icon]:justify-center"><Avatar className="size-8 border border-white/20"><AvatarFallback className="bg-[#c9a85b] text-xs font-bold text-[#103527]">{user?.name?.charAt(0).toUpperCase()}</AvatarFallback></Avatar><div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-medium text-white">{user?.name || "Usuário"}</p><p className="mt-0.5 truncate text-[11px] text-white/45">{user?.email || "Acesso seguro"}</p></div></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48"><DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive"><LogOut className="mr-2 size-4" />Sair da plataforma</DropdownMenuItem></DropdownMenuContent></DropdownMenu></SidebarFooter></Sidebar><div className={`absolute right-0 top-0 z-50 h-full w-1 cursor-col-resize transition-colors hover:bg-[#c9a85b]/60 ${isCollapsed ? "hidden" : ""}`} onMouseDown={() => setIsResizing(true)} /></div><SidebarInset className="min-h-screen bg-[#f8f7f2]">{isMobile && <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-3 backdrop-blur"><SidebarTrigger className="rounded-lg" /><span className="text-sm font-semibold">{activeItem?.label ?? "W9 Campanhas"}</span></div>}<main className="mx-auto w-full max-w-[1540px] flex-1 p-4 sm:p-6 lg:p-8">{children}</main></SidebarInset></>;
}
