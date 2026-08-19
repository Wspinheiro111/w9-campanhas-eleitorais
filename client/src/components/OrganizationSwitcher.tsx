import { useOrganization } from "@/contexts/OrganizationContext";
import { Building2, ChevronDown, Plus } from "lucide-react";
import { useLocation } from "wouter";

export function OrganizationSwitcher() {
  const { organizations, activeOrganizationId, setActiveOrganizationId } = useOrganization();
  const [, navigate] = useLocation();
  const active = organizations.find(item => item.organization.id === activeOrganizationId);
  if (!organizations.length) return <button onClick={() => navigate("/onboarding")} className="flex items-center gap-2 rounded-lg bg-white/10 px-2 py-1.5 text-xs text-white/80"><Plus className="size-3.5" />Criar organização</button>;
  return <details className="group relative w-full"><summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg bg-white/10 px-2 py-1.5 text-xs text-white/85 hover:bg-white/15"><Building2 className="size-3.5 text-[#e4cc8d]" /><span className="min-w-0 flex-1 truncate">{active?.organization.name ?? "Selecionar organização"}</span><ChevronDown className="size-3.5 transition-transform group-open:rotate-180" /></summary><div className="absolute left-0 top-full z-50 mt-2 w-60 rounded-xl border border-white/15 bg-[#123b2b] p-1.5 shadow-xl">{organizations.map(item => <button key={item.organization.id} onClick={() => setActiveOrganizationId(item.organization.id)} className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs hover:bg-white/10 ${item.organization.id === activeOrganizationId ? "bg-white/10 text-[#e4cc8d]" : "text-white/75"}`}><span className="truncate">{item.organization.name}</span><span className="ml-2 text-[10px] uppercase text-white/40">{item.membership.role}</span></button>)}<button onClick={() => navigate("/onboarding")} className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-white/10 px-2.5 py-2 text-xs text-white/75 hover:bg-white/10"><Plus className="size-3.5" />Nova organização</button></div></details>;
}
