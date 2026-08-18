import { LucideIcon } from "lucide-react";

export function MetricCard({ label, value, supporting, icon: Icon, tone = "green" }: { label: string; value: number | string; supporting: string; icon: LucideIcon; tone?: "green" | "gold" | "slate" | "rose" }) {
  const tones = { green: "bg-emerald-950 text-[#e3c46f]", gold: "bg-[#c9a85b]/15 text-[#8c6c25]", slate: "bg-slate-900 text-white", rose: "bg-rose-900 text-rose-100" };
  return <article className="group rounded-2xl border border-border/75 bg-card p-5 shadow-[0_12px_28px_-24px_rgba(0,0,0,.6)] transition-transform duration-200 hover:-translate-y-0.5"><div className="flex items-start justify-between"><p className="text-sm font-medium text-muted-foreground">{label}</p><span className={`flex size-9 items-center justify-center rounded-xl ${tones[tone]}`}><Icon className="size-4" /></span></div><p className="mt-6 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-2 text-xs text-muted-foreground">{supporting}</p></article>;
}
