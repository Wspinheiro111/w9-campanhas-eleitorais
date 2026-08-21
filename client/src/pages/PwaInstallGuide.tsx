import { PageHeader } from "@/components/CampaignShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, MonitorSmartphone, ShieldCheck, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const steps = [
  { title: "Android (Chrome)", items: ["Abra o W9 no Chrome.", "Toque no menu de três pontos.", "Escolha “Instalar app” ou “Adicionar à tela inicial”.", "Confirme a instalação e abra o ícone W9 na tela inicial."] },
  { title: "iPhone e iPad (Safari)", items: ["Abra o W9 no Safari.", "Toque no botão Compartilhar.", "Selecione “Adicionar à Tela de Início”.", "Confirme em “Adicionar” para criar o ícone W9."] },
  { title: "Computador (Chrome ou Edge)", items: ["Abra o W9 no navegador.", "Use o ícone de instalação na barra de endereço.", "Confirme “Instalar”.", "Abra o W9 pelo atalho criado no computador."] },
];

export default function PwaInstallGuide() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  useEffect(() => { const onPrompt = (event: Event) => { const installEvent = event as BeforeInstallPromptEvent; installEvent.preventDefault(); setDeferredPrompt(installEvent); }; window.addEventListener("beforeinstallprompt", onPrompt); return () => window.removeEventListener("beforeinstallprompt", onPrompt); }, []);
  return <section><PageHeader eyebrow="Aplicativo da equipe" title="Instale o W9 no seu dispositivo" description="Use o W9 como aplicativo, com acesso rápido pela tela inicial e suporte para registrar visitas mesmo sem conexão." action={<Badge variant="outline" className="gap-1.5"><ShieldCheck className="size-3.5" />Uso seguro</Badge>} />
    <div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]"><div className="rounded-2xl border bg-card p-6 shadow-sm"><div className="flex items-start gap-3"><span className="rounded-xl bg-primary/10 p-3 text-primary"><MonitorSmartphone className="size-6" /></span><div><h2 className="font-serif text-2xl">Instalação em poucos passos</h2><p className="mt-1 text-sm text-muted-foreground">Escolha o seu dispositivo e siga as instruções abaixo. A instalação não exige loja de aplicativos.</p></div></div><div className="mt-6 grid gap-4">{steps.map((step, index) => <article key={step.title} className="rounded-xl border p-4"><div className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{index + 1}</span><h3 className="font-semibold">{step.title}</h3></div><ol className="mt-3 space-y-2 pl-10 text-sm text-muted-foreground">{step.items.map(item => <li key={item} className="list-decimal pl-1">{item}</li>)}</ol></article>)}</div>{deferredPrompt && <Button className="mt-6" onClick={() => { void deferredPrompt.prompt(); void deferredPrompt.userChoice.finally(() => setDeferredPrompt(null)); }}><Download className="mr-2 size-4" />Instalar o W9 agora</Button>}</div>
      <aside className="space-y-4"><div className="rounded-2xl border border-primary/20 bg-primary/[.035] p-5"><WifiOff className="size-5 text-primary" /><h2 className="mt-3 font-semibold">Quando estiver sem internet</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">As visitas de campo registradas no W9 ficam guardadas no dispositivo e são sincronizadas automaticamente quando a conexão retornar.</p></div><div className="rounded-2xl border p-5"><h2 className="font-semibold">Atualizações</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Quando houver uma nova versão, o W9 exibirá um aviso. Toque em “Atualizar” para aplicar a melhoria com segurança.</p></div></aside></div></section>;
}
