import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Award, CheckCircle2, ShieldCheck } from "lucide-react";
import { useRoute } from "wouter";

export default function CertificateValidation() {
  const [, params] = useRoute("/certificados/validar/:certificateCode"); const certificateCode = params?.certificateCode ?? "";
  const validation = trpc.volunteers.certificates.validate.useQuery({ certificateCode }, { enabled: certificateCode.length >= 10, retry: false });
  if (validation.isLoading) return <div className="h-80 animate-pulse rounded-2xl bg-muted" />;
  if (!validation.data) return <section className="mx-auto max-w-2xl rounded-2xl border bg-card p-8 text-center shadow-sm"><ShieldCheck className="mx-auto size-10 text-primary" /><h1 className="mt-4 font-serif text-3xl">Validação indisponível</h1><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">O certificado não foi localizado ou sua conta não tem permissão de coordenação para consultar esta campanha.</p><Button className="mt-6" asChild><a href="/">Voltar ao painel</a></Button></section>;
  const certificate = validation.data;
  return <section className="mx-auto max-w-3xl"><div className="overflow-hidden rounded-3xl border border-[#c9a85b]/60 bg-[#103527] p-1 shadow-[0_22px_65px_-38px_rgba(16,53,39,.85)]"><div className="rounded-[1.35rem] border border-[#c9a85b]/35 bg-[#103527] p-7 text-[#f8f4e9]"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div className="flex gap-3"><span className="flex size-12 items-center justify-center rounded-xl bg-[#c9a85b] text-[#103527]"><Award className="size-6" /></span><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#e4cc8d]">Validação interna</p><h1 className="mt-1 font-serif text-3xl">Certificado confirmado</h1><p className="mt-2 text-sm text-[#f8f4e9]/75">A emissão pertence à campanha consultada pela sua organização.</p></div></div><Badge className="h-fit bg-emerald-100 text-emerald-900 hover:bg-emerald-100"><CheckCircle2 className="mr-1 size-3" />Válido</Badge></div><div className="mt-7 grid gap-4 border-y border-[#e4cc8d]/25 py-5 sm:grid-cols-2"><Info label="Voluntário" value={certificate.volunteerName} /><Info label="Campanha" value={certificate.campaignName} /><Info label="Candidatura" value={certificate.candidateName} /><Info label="Materiais concluídos" value={String(certificate.completedMaterials)} /></div><div className="mt-5 flex flex-col gap-2 text-xs text-[#f8f4e9]/70 sm:flex-row sm:justify-between"><span>Emitido em {new Date(certificate.issuedAt).toLocaleDateString("pt-BR")}</span><span>Código: <strong className="font-mono text-[#e4cc8d]">{certificate.certificateCode}</strong></span></div></div></div></section>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-bold uppercase tracking-wide text-[#e4cc8d]">{label}</p><p className="mt-1 text-sm font-medium text-[#f8f4e9]">{value}</p></div>; }
