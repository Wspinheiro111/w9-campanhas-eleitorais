import { cn } from "@/lib/utils";

export function BrandMark({ compact = false, className }: { compact?: boolean; className?: string }) {
  return <div className={cn("flex items-center gap-3", className)} aria-label="W9 Campanhas Eleitorais">
    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#FFC300] text-[16px] font-black tracking-tighter text-[#0F1C3F]">W9</span>
    {!compact && <span className="leading-[.9]"><span className="block text-[12px] font-black tracking-[.13em] text-white">W9 CAMPANHAS</span><span className="block text-[12px] font-black tracking-[.13em] text-[#FFC300]">ELEITORAIS</span></span>}
  </div>;
}
