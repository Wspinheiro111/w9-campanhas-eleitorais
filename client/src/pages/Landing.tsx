import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/BrandMark";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { trackPublicEvent } from "@/lib/publicAnalytics";
import {
  ArrowDown,
  ArrowRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Landmark,
  MapPinned,
  Megaphone,
  MessageCircle,
  Pause,
  Play,
  ShieldCheck,
  Target,
  UsersRound,
  Volume2,
  VolumeX,
  WifiOff,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";

const storyLines = [
  "Toda campanha começa com esperança grande. A organização é o que transforma intenção em presença.",
  "WhatsApp lotado, planilhas que não fecham e uma equipe que precisa decidir mais rápido.",
  "Quando cada frente opera separada, contatos, tarefas e oportunidades se perdem no caminho.",
  "Enquanto a coordenação apaga incêndios, o território deixa de receber atenção estratégica.",
  "E se tudo funcionasse em um só sistema? Um QG digital em que cada movimento fica visível.",
  "Esse é o W9 Campanhas Eleitorais: operação, inteligência e equipe na mesma direção.",
];

const storyCueSeconds = [0, 7.7, 15.6, 23.7, 31.2, 39.2];

const painPoints = [
  { icon: Megaphone, title: "Mensagens e contatos dispersos", text: "Conversas, demandas e pessoas importantes acabam separadas em grupos e planilhas." },
  { icon: UsersRound, title: "Lideranças sem acompanhamento", text: "A coordenação precisa saber quem está ativo, em qual região e com qual prioridade." },
  { icon: CalendarDays, title: "Agenda dupla, equipe no escuro", text: "Tarefas e compromissos precisam de responsável, prazo e contexto para acontecer." },
  { icon: Landmark, title: "Financeiro sem controle central", text: "Documentos e lançamentos exigem organização, rastreabilidade e prestação de contas." },
  { icon: MapPinned, title: "Território sem leitura atual", text: "O mapa de atuação precisa revelar onde há relacionamento, demanda e mobilização." },
];

const solutionCards = [
  { number: "01", icon: UsersRound, title: "Organize", detail: "CRM, equipe, agenda, tarefas e demandas em uma visão compartilhada." },
  { number: "02", icon: MapPinned, title: "Mobilize", detail: "Território, campo offline, eventos e relacionamentos com responsáveis definidos." },
  { number: "03", icon: ClipboardCheck, title: "Controle", detail: "Financeiro, jurídico, relatórios, segurança e auditoria para a operação." },
  { number: "04", icon: Bot, title: "Inteligência", detail: "Apoio com IA, indicadores e conteúdo para priorizar a próxima decisão." },
];

const allModules = [
  "Planejamento e estratégia", "Equipe e voluntariado", "CRM eleitoral e território", "Campo offline", "Comunicação e conteúdos", "Eventos e mobilização", "Financeiro e jurídico", "PWA e segurança",
];

const solutionLinks = [
  { href: "/gestao-de-campanha-eleitoral", label: "Gestão de campanha" },
  { href: "/crm-eleitoral", label: "CRM eleitoral" },
  { href: "/gestao-de-equipe-de-campanha", label: "Gestão de equipe" },
  { href: "/gestao-de-campo-eleitoral", label: "Gestão de campo" },
  { href: "/financeiro-e-juridico-de-campanha", label: "Financeiro e jurídico" },
];

export default function Landing() {
  const [activeLine, setActiveLine] = useState(0);
  const [isTrailerPlaying, setIsTrailerPlaying] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const narrationRef = useRef<HTMLAudioElement | null>(null);
  const [demoForm, setDemoForm] = useState({ name: "", email: "", phone: "", organizationName: "", role: "candidate" as "candidate" | "party" | "coordination" | "other", city: "", state: "", message: "", preferredDemoAt: "", consent: false, website: "" });
  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "", message: "", consent: false, website: "" });
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const requestDemo = trpc.demoRequests.submit.useMutation({
    onSuccess: () => {
      setDemoSubmitted(true);
      trackPublicEvent("demo_request_submitted", { source: "landing" });
      setDemoForm({ name: "", email: "", phone: "", organizationName: "", role: "candidate", city: "", state: "", message: "", preferredDemoAt: "", consent: false, website: "" });
    },
  });
  const requestContact = trpc.contactRequests.submit.useMutation({
    onSuccess: () => {
      setContactSubmitted(true);
      trackPublicEvent("contact_request_submitted", { source: "landing" });
      setContactForm({ name: "", email: "", phone: "", message: "", consent: false, website: "" });
    },
  });

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }), { threshold: 0.12 });
    document.querySelectorAll(".landing-observe").forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const stopTrailer = () => {
    narrationRef.current?.pause();
    setIsTrailerPlaying(false);
  };

  const playNarration = async () => {
    const narration = narrationRef.current;
    if (!narration) return;
    narration.playbackRate = speechRate;
    narration.muted = !soundEnabled;
    try {
      await narration.play();
      setIsTrailerPlaying(true);
    } catch {
      setIsTrailerPlaying(false);
    }
  };

  const playFromLine = (index: number) => {
    setActiveLine(index);
    const narration = narrationRef.current;
    if (!narration) return;
    narration.currentTime = storyCueSeconds[index];
    void playNarration();
  };

  const openTrailer = () => {
    document.getElementById("trailer")?.scrollIntoView({ behavior: "smooth", block: "center" });
    trackPublicEvent("trailer_opened", { source: "landing" });
    void playNarration();
  };

  useEffect(() => () => {
    narrationRef.current?.pause();
  }, []);

  return <main className="min-h-screen overflow-hidden bg-[#0A132E] font-sans text-white selection:bg-[#FFC300] selection:text-[#0F1C3F]">
    <section className="relative overflow-hidden border-b border-white/10 bg-[#0A132E]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.22]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.22) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
      <div className="pointer-events-none absolute -right-40 top-[-13rem] size-[35rem] rounded-full bg-[#00A859]/20 blur-[110px]" />
      <div className="pointer-events-none absolute -left-40 bottom-[-15rem] size-[35rem] rounded-full bg-[#FFC300]/15 blur-[110px]" />

      <nav className="relative z-10 mx-auto flex max-w-[1280px] items-center justify-between border-b border-white/10 px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <BrandMark />
          <Badge className="hidden border-white/15 bg-white/5 text-[10px] font-bold tracking-wider text-white/75 sm:inline-flex">ELEIÇÕES 2026</Badge>
        </div>
        <div className="flex items-center gap-2"><a href="#contato" className="hidden rounded-full px-3 py-2 text-[11px] font-bold text-white/75 transition hover:bg-white/10 sm:inline-flex">FALE COM A W9</a><Link href="/login" className="rounded-full border border-[#FFC300]/70 bg-[#FFC300] px-4 py-2 text-xs font-black tracking-wide text-[#0F1C3F] transition hover:bg-white sm:px-5">VER SISTEMA AO VIVO</Link></div>
      </nav>

      <div className="relative z-10 mx-auto grid max-w-[1280px] gap-12 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:gap-16 lg:pb-28 lg:pt-24">
        <div className="landing-reveal">
          <p className="inline-flex rounded-full border border-[#FFC300]/30 bg-[#FFC300]/10 px-3 py-1 text-[10px] font-black tracking-[.16em] text-[#FFC300]">TRAILER OFICIAL • NARRAÇÃO HUMANA PT-BR</p>
          <h1 className="mt-6 max-w-[720px] font-[Anton,sans-serif] text-5xl uppercase leading-[.88] tracking-tight sm:text-6xl md:text-7xl lg:text-[82px]">
            Toda campanha sente a mesma dor. <span className="text-[#FFC300]">Poucas encontram a solução.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-white/65 sm:text-lg">O sistema que transforma <strong className="text-white">caos em estratégia</strong> e estratégia em <strong className="text-[#FFC300]">execução.</strong> O <strong className="text-white">W9 Campanhas Eleitorais</strong> centraliza a operação para candidatos, partidos e coordenações.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={openTrailer} className="rounded-full bg-[#FFC300] px-6 font-black tracking-wide text-[#0F1C3F] hover:bg-white"><Volume2 className="mr-2 size-4" />OUVIR TRAILER DE 30s</Button>
            <a href="#roteiro" className="inline-flex items-center rounded-full border border-white/20 px-5 py-2 text-xs font-bold tracking-wide text-white/90 transition hover:bg-white/10">LER ROTEIRO COMPLETO <ArrowDown className="ml-2 size-3.5" /></a>
          </div>
          <div className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-white/10 pt-6">
            {[['+1 milhão', 'eleitores mapeados por campanha'], ['100%', 'organizado, sem planilha solta'], ['24/7', 'QG digital no bolso']].map(([value, label]) => <div key={value}><p className="font-[Anton,sans-serif] text-2xl text-[#FFC300]">{value}</p><p className="mt-1 text-[10px] font-bold uppercase leading-4 tracking-wide text-white/45">{label}</p></div>)}
          </div>
        </div>

          <section id="trailer" className="landing-reveal relative rounded-[28px] border border-white/10 bg-[#12204A]/90 p-3 shadow-[0_40px_120px_rgba(0,0,0,.55)] backdrop-blur" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center justify-between border-b border-white/10 px-3 pb-3"><div className="flex gap-1.5"><i className="size-2.5 rounded-full bg-red-400" /><i className="size-2.5 rounded-full bg-[#FFC300]" /><i className="size-2.5 rounded-full bg-[#00A859]" /></div><p className="text-[9px] font-black tracking-[.18em] text-white/40">W9_PLAYER • LOCUÇÃO PT-BR</p></div>
          <div className="p-3 sm:p-5"><audio ref={narrationRef} preload="none" onTimeUpdate={(event) => { const time = event.currentTarget.currentTime; const cueIndex = storyCueSeconds.reduce((current, cue, index) => time >= cue ? index : current, 0); setActiveLine(cueIndex); }} onEnded={() => setIsTrailerPlaying(false)}><source src="/manus-storage/w9-trailer-narracao-natural_557e1c29.wav" type="audio/wav" />Seu navegador não suporta a reprodução de áudio.</audio><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black tracking-[.14em] text-[#FFC300]">{isTrailerPlaying ? "REPRODUZINDO NARRAÇÃO" : "PRONTO PARA OUVIR"} • {activeLine + 1}/{storyLines.length} FRASES</p><p className="mt-3 font-[Anton,sans-serif] text-2xl uppercase leading-none sm:text-3xl">{storyLines[activeLine]}</p></div><span className="shrink-0 rounded-full bg-[#00A859]/20 px-2 py-1 text-[9px] font-bold text-[#67ecad]">VOZ NATURAL PT-BR</span></div>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#FFC300] transition-all" style={{ width: `${((activeLine + 1) / storyLines.length) * 100}%` }} /></div>
            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              <video className="aspect-video w-full" autoPlay muted loop controls playsInline preload="metadata" poster="/manus-storage/w9-campanhas-eleitorais-trailer-poster_d8022fb8.jpg" aria-label="Vídeo visual de apresentação do W9 Campanhas Eleitorais"><source src="/manus-storage/w9-campanhas-eleitorais-trailer-web_ba22df5b.mp4" type="video/mp4" />Seu navegador não suporta a reprodução de vídeo.</video>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-white/10 pb-4"><Button type="button" onClick={isTrailerPlaying ? stopTrailer : openTrailer} size="sm" className="bg-[#FFC300] font-black text-[#0F1C3F] hover:bg-white">{isTrailerPlaying ? <Pause className="mr-1.5 size-3.5 fill-current" /> : <Play className="mr-1.5 size-3.5 fill-current" />}{isTrailerPlaying ? "PAUSAR" : "OUVIR"}</Button><Button type="button" variant="outline" size="sm" onClick={() => { const next = !soundEnabled; setSoundEnabled(next); if (narrationRef.current) narrationRef.current.muted = !next; }} className="border-white/20 text-white hover:bg-white/10 hover:text-white">{soundEnabled ? <Volume2 className="mr-1.5 size-3.5" /> : <VolumeX className="mr-1.5 size-3.5" />}{soundEnabled ? "SOM LIGADO" : "SOM DESLIGADO"}</Button>{[0.9, 1, 1.15].map(rate => <button type="button" key={rate} onClick={() => { setSpeechRate(rate); if (narrationRef.current) narrationRef.current.playbackRate = rate; }} className={`rounded-md px-2 py-1 text-[10px] font-black transition ${speechRate === rate ? "bg-[#00A859] text-[#071a13]" : "bg-white/10 text-white/65 hover:bg-white/20"}`}>{rate}×</button>)}</div>
            <div className="mt-4 max-h-36 space-y-1 overflow-auto pr-1">{storyLines.map((line, index) => <button type="button" key={line} onClick={() => playFromLine(index)} className={`flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left text-xs transition ${activeLine === index ? "bg-[#FFC300] text-[#0F1C3F]" : "text-white/65 hover:bg-white/10"}`}><span className="grid size-5 shrink-0 place-items-center rounded-full bg-black/20 text-[10px] font-black">{index + 1}</span><span className="line-clamp-2 leading-5">{line}</span></button>)}</div>
          </div>
        </section>
      </div>
    </section>

    <section id="roteiro" className="landing-deferred bg-[#0F1C3F] px-5 py-20 sm:px-8 lg:py-28">
      <div className="landing-observe mx-auto grid max-w-[1280px] gap-12 lg:grid-cols-[.98fr_.82fr] lg:items-center">
        <div><p className="text-[11px] font-black uppercase tracking-[.2em] text-[#FFC300]">0–25s • A dor real</p><h2 className="mt-3 max-w-lg font-[Anton,sans-serif] text-5xl uppercase leading-[.88] sm:text-6xl">Você conhece <span className="text-white/35">essa cena?</span></h2>
          <div className="mt-8 space-y-3">{painPoints.map(({ icon: Icon, title, text }) => <article key={title} className="flex gap-4 rounded-xl border border-white/10 bg-white/[.035] p-4 transition hover:border-[#FFC300]/35 hover:bg-white/[.06]"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/10 text-[#FFC300]"><Icon className="size-4" /></span><div><h3 className="text-sm font-bold">{title}</h3><p className="mt-1 text-xs leading-5 text-white/50">{text}</p></div></article>)}</div>
        </div>
        <aside className="relative overflow-hidden rounded-[28px] border border-[#FFC300]/20 bg-gradient-to-br from-[#FFC300] to-[#00A859] p-[1px] shadow-[0_25px_70px_rgba(0,0,0,.35)]"><div className="relative h-full rounded-[27px] bg-[#0A132E] p-7"><p className="text-[10px] font-black tracking-[.16em] text-[#FFC300]">LOCUÇÃO PT-BR • CLIQUE PARA OUVIR</p><p className="mt-5 font-[Anton,sans-serif] text-3xl uppercase leading-[.95]">“O caos não é falta de trabalho. É falta de sistema.”</p><p className="mt-5 text-sm leading-6 text-white/60">Centralize contatos, agenda, território, tarefas e evidências para que a campanha tenha memória, ritmo e responsáveis claros.</p><Button onClick={openTrailer} variant="outline" className="mt-7 border-[#FFC300]/60 bg-[#FFC300] font-black text-[#0F1C3F] hover:bg-white"><Volume2 className="mr-2 size-4" />OUVIR AGORA</Button></div></aside>
      </div>
    </section>

    <section className="landing-deferred bg-[#0A132E] px-5 py-20 sm:px-8 lg:py-28">
      <div className="landing-observe mx-auto max-w-[1280px]"><div className="max-w-3xl"><p className="text-[11px] font-black uppercase tracking-[.2em] text-[#00A859]">25–60s • A virada</p><h2 className="mt-3 font-[Anton,sans-serif] text-5xl uppercase leading-[.88] sm:text-6xl">Um só sistema. <span className="text-[#FFC300]">Toda a campanha em movimento.</span></h2><p className="mt-6 max-w-2xl text-base leading-7 text-white/60">O W9 Campanhas Eleitorais conecta o que a coordenação precisa enxergar para agir: pessoas, território, rotina, comunicação e controles operacionais.</p></div>
        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{solutionCards.map(({ number, icon: Icon, title, detail }, index) => <article key={title} className={`group rounded-2xl border p-6 transition hover:-translate-y-1 ${index === 1 ? "border-[#FFC300] bg-[#FFC300] text-[#0F1C3F]" : index === 3 ? "border-[#00A859]/40 bg-[#00A859]/10" : "border-white/10 bg-white/[.035]"}`}><div className="flex items-center justify-between"><span className="font-[Anton,sans-serif] text-2xl opacity-50">{number}</span><Icon className={`size-5 ${index === 1 ? "" : "text-[#FFC300]"}`} /></div><h3 className="mt-12 font-[Anton,sans-serif] text-3xl uppercase">{title}</h3><p className={`mt-3 text-sm leading-6 ${index === 1 ? "text-[#0F1C3F]/70" : "text-white/55"}`}>{detail}</p></article>)}</div>
        <div className="mt-8 flex flex-wrap gap-2">{allModules.map(module => <span key={module} className="rounded-full border border-white/10 bg-white/[.035] px-3 py-1.5 text-xs font-semibold text-white/65">{module}</span>)}</div>
        <nav aria-label="Páginas de soluções do W9" className="mt-8 border-t border-white/10 pt-6"><p className="text-[10px] font-black uppercase tracking-[.16em] text-white/45">Conheça cada frente de operação</p><div className="mt-3 flex flex-wrap gap-x-5 gap-y-3">{solutionLinks.map(({ href, label }) => <Link key={href} href={href} onClick={() => trackPublicEvent("solution_page_opened", { solution: label })} className="inline-flex items-center text-sm font-bold text-[#FFC300] transition hover:text-white">{label}<ArrowRight className="ml-1.5 size-3.5" /></Link>)}</div></nav>
      </div>
    </section>

    <section id="demonstracao" className="landing-deferred relative overflow-hidden bg-[#FFC300] px-5 py-20 text-[#0F1C3F] sm:px-8 lg:py-28">
      <div className="pointer-events-none absolute inset-0 opacity-[.15]" style={{ backgroundImage: "linear-gradient(90deg, #0F1C3F 1px, transparent 1px), linear-gradient(#0F1C3F 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      <div className="landing-observe relative mx-auto grid max-w-[1280px] gap-12 lg:grid-cols-[.86fr_1.14fr] lg:items-start"><div><p className="text-[11px] font-black uppercase tracking-[.2em] text-[#0F1C3F]/65">60–90s • A próxima decisão</p><h2 className="mt-3 font-[Anton,sans-serif] text-5xl uppercase leading-[.88] sm:text-6xl">Sua campanha merece método, não improviso.</h2><p className="mt-6 max-w-xl text-base leading-7 text-[#0F1C3F]/75">Conte o que sua coordenação precisa organizar. A demonstração mostra como o W9 Campanhas Eleitorais se encaixa na realidade de candidatos, partidos e equipes.</p><div className="mt-8 space-y-3">{["Demonstração guiada pelos desafios da operação.", "Horário preferencial escolhido por você.", "Sem compromisso e sem valores expostos na página pública."].map(item => <p key={item} className="flex items-start gap-2 text-sm font-bold"><CheckCircle2 className="mt-0.5 size-4" />{item}</p>)}</div></div>
        <form className="grid gap-4 rounded-[26px] bg-[#0F1C3F] p-6 text-white shadow-[0_20px_60px_rgba(15,28,63,.3)] sm:grid-cols-2 sm:p-8" onSubmit={(event) => { event.preventDefault(); setDemoSubmitted(false); requestDemo.mutate({ ...demoForm, phone: demoForm.phone.replace(/\D/g, ""), city: demoForm.city || undefined, state: demoForm.state || undefined, message: demoForm.message || undefined, preferredDemoAt: new Date(demoForm.preferredDemoAt), consent: true }); }}>
          <div className="sm:col-span-2"><p className="font-[Anton,sans-serif] text-3xl uppercase">Quero uma demonstração</p><p className="mt-1 text-sm text-white/55">Preencha os dados e a administração entra em contato.</p></div>
          <div className="grid gap-2"><Label htmlFor="demo-name" className="text-white/80">Seu nome</Label><Input id="demo-name" className="border-white/15 bg-white/5 text-white" value={demoForm.name} onChange={(event) => setDemoForm(current => ({ ...current, name: event.target.value }))} required maxLength={180} /></div>
          <div className="grid gap-2"><Label htmlFor="demo-email" className="text-white/80">E-mail profissional</Label><Input id="demo-email" className="border-white/15 bg-white/5 text-white" type="email" value={demoForm.email} onChange={(event) => setDemoForm(current => ({ ...current, email: event.target.value }))} required maxLength={320} /></div>
          <div className="grid gap-2"><Label htmlFor="demo-phone" className="text-white/80">Telefone / WhatsApp</Label><Input id="demo-phone" className="border-white/15 bg-white/5 text-white" inputMode="tel" value={demoForm.phone} onChange={(event) => setDemoForm(current => ({ ...current, phone: event.target.value }))} required placeholder="(00) 00000-0000" maxLength={32} /></div>
          <div className="grid gap-2"><Label htmlFor="demo-org" className="text-white/80">Campanha, partido ou organização</Label><Input id="demo-org" className="border-white/15 bg-white/5 text-white" value={demoForm.organizationName} onChange={(event) => setDemoForm(current => ({ ...current, organizationName: event.target.value }))} required maxLength={180} /></div>
          <div className="grid gap-2"><Label htmlFor="demo-role" className="text-white/80">Seu papel</Label><select id="demo-role" className="h-9 rounded-md border border-white/15 bg-white/5 px-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-[#FFC300]" value={demoForm.role} onChange={(event) => setDemoForm(current => ({ ...current, role: event.target.value as typeof current.role }))}><option className="text-[#0F1C3F]" value="candidate">Candidato(a)</option><option className="text-[#0F1C3F]" value="party">Partido</option><option className="text-[#0F1C3F]" value="coordination">Coordenação de campanha</option><option className="text-[#0F1C3F]" value="other">Outro</option></select></div>
          <div className="grid grid-cols-[1fr_72px] gap-3"><div className="grid gap-2"><Label htmlFor="demo-city" className="text-white/80">Cidade</Label><Input id="demo-city" className="border-white/15 bg-white/5 text-white" value={demoForm.city} onChange={(event) => setDemoForm(current => ({ ...current, city: event.target.value }))} maxLength={120} /></div><div className="grid gap-2"><Label htmlFor="demo-state" className="text-white/80">UF</Label><Input id="demo-state" className="border-white/15 bg-white/5 text-white" value={demoForm.state} onChange={(event) => setDemoForm(current => ({ ...current, state: event.target.value.toUpperCase().slice(0, 2) }))} maxLength={2} /></div></div>
          <div className="grid gap-2 sm:col-span-2"><Label htmlFor="demo-time" className="text-white/80">Melhor data e horário para a demonstração</Label><Input id="demo-time" className="border-white/15 bg-white/5 text-white" type="datetime-local" min={new Date().toISOString().slice(0, 16)} value={demoForm.preferredDemoAt} onChange={(event) => setDemoForm(current => ({ ...current, preferredDemoAt: event.target.value }))} required /><p className="text-xs text-white/45">O horário é uma preferência. A confirmação é feita pela administração.</p></div>
          <div className="grid gap-2 sm:col-span-2"><Label htmlFor="demo-message" className="text-white/80">O que você quer organizar melhor? <span className="font-normal text-white/45">(opcional)</span></Label><Textarea id="demo-message" className="border-white/15 bg-white/5 text-white" value={demoForm.message} onChange={(event) => setDemoForm(current => ({ ...current, message: event.target.value }))} maxLength={2000} rows={3} placeholder="Ex.: equipe de rua, território, agenda ou prestação de contas." /></div>
          <div className="hidden" aria-hidden="true"><Label htmlFor="demo-website">Website</Label><Input id="demo-website" tabIndex={-1} autoComplete="off" value={demoForm.website} onChange={(event) => setDemoForm(current => ({ ...current, website: event.target.value }))} /></div>
          <Label className="flex cursor-pointer items-start gap-2 text-xs leading-5 text-white/55 sm:col-span-2"><input type="checkbox" className="mt-1 accent-[#FFC300]" checked={demoForm.consent} onChange={(event) => setDemoForm(current => ({ ...current, consent: event.target.checked }))} required />Autorizo o contato sobre a demonstração e o tratamento destes dados exclusivamente para esse atendimento.</Label>
          {demoSubmitted && <p className="rounded-lg bg-[#00A859]/20 px-3 py-2 text-sm font-medium text-[#8af5bd] sm:col-span-2">Solicitação recebida. A administração entrará em contato para combinar a demonstração.</p>}
          {requestDemo.error && <p className="rounded-lg bg-destructive/20 px-3 py-2 text-sm text-red-200 sm:col-span-2">{requestDemo.error.message}</p>}
          <Button type="submit" className="bg-[#FFC300] font-black tracking-wide text-[#0F1C3F] hover:bg-white sm:col-span-2" disabled={!demoForm.consent || requestDemo.isPending}>{requestDemo.isPending ? "ENVIANDO SOLICITAÇÃO..." : "SOLICITAR DEMONSTRAÇÃO"}<ArrowRight className="ml-2 size-4" /></Button>
        </form>
      </div>
    </section>

    <section id="contato" className="landing-deferred bg-[#12204A] px-5 py-20 sm:px-8 lg:py-24"><div className="landing-observe mx-auto grid max-w-[1040px] gap-10 lg:grid-cols-[.82fr_1.18fr] lg:items-start"><div><p className="text-[11px] font-black uppercase tracking-[.2em] text-[#00A859]">Fale com a W9</p><h2 className="mt-3 font-[Anton,sans-serif] text-5xl uppercase leading-[.88] sm:text-6xl">Uma dúvida? <span className="text-[#FFC300]">A conversa começa aqui.</span></h2><p className="mt-6 max-w-md text-base leading-7 text-white/65">Envie sua mensagem para a equipe comercial. Se preferir uma apresentação completa, você também pode solicitar uma demonstração acima.</p><a href="#demonstracao" className="mt-7 inline-flex items-center text-sm font-black text-[#FFC300] hover:text-white">QUERO UMA DEMONSTRAÇÃO <ArrowRight className="ml-2 size-4" /></a></div><form className="grid gap-4 rounded-[26px] border border-white/10 bg-[#0A132E] p-6 shadow-[0_20px_60px_rgba(0,0,0,.25)] sm:grid-cols-2 sm:p-8" onSubmit={event => { event.preventDefault(); setContactSubmitted(false); requestContact.mutate({ ...contactForm, phone: contactForm.phone.replace(/\D/g, ""), consent: true }); }}><div className="sm:col-span-2"><p className="flex items-center gap-2 font-[Anton,sans-serif] text-3xl uppercase"><MessageCircle className="size-6 text-[#FFC300]" />Contato rápido</p><p className="mt-1 text-sm text-white/55">A equipe recebe sua mensagem no painel interno.</p></div><div className="grid gap-2"><Label htmlFor="contact-name" className="text-white/80">Seu nome</Label><Input id="contact-name" className="border-white/15 bg-white/5 text-white" value={contactForm.name} onChange={event => setContactForm(current => ({ ...current, name: event.target.value }))} required maxLength={180} /></div><div className="grid gap-2"><Label htmlFor="contact-phone" className="text-white/80">Telefone / WhatsApp</Label><Input id="contact-phone" className="border-white/15 bg-white/5 text-white" inputMode="tel" value={contactForm.phone} onChange={event => setContactForm(current => ({ ...current, phone: event.target.value }))} required placeholder="(00) 00000-0000" maxLength={32} /></div><div className="grid gap-2 sm:col-span-2"><Label htmlFor="contact-email" className="text-white/80">E-mail</Label><Input id="contact-email" className="border-white/15 bg-white/5 text-white" type="email" value={contactForm.email} onChange={event => setContactForm(current => ({ ...current, email: event.target.value }))} required maxLength={320} /></div><div className="grid gap-2 sm:col-span-2"><Label htmlFor="contact-message" className="text-white/80">Como podemos ajudar?</Label><Textarea id="contact-message" className="border-white/15 bg-white/5 text-white" value={contactForm.message} onChange={event => setContactForm(current => ({ ...current, message: event.target.value }))} required minLength={8} maxLength={2000} rows={4} placeholder="Conte brevemente o contexto da sua campanha ou sua dúvida." /></div><div className="hidden" aria-hidden="true"><Label htmlFor="contact-website">Website</Label><Input id="contact-website" tabIndex={-1} autoComplete="off" value={contactForm.website} onChange={event => setContactForm(current => ({ ...current, website: event.target.value }))} /></div><Label className="flex cursor-pointer items-start gap-2 text-xs leading-5 text-white/55 sm:col-span-2"><input type="checkbox" className="mt-1 accent-[#FFC300]" checked={contactForm.consent} onChange={event => setContactForm(current => ({ ...current, consent: event.target.checked }))} required />Autorizo o contato sobre esta solicitação e o tratamento destes dados exclusivamente para este atendimento.</Label>{contactSubmitted && <p className="rounded-lg bg-[#00A859]/20 px-3 py-2 text-sm font-medium text-[#8af5bd] sm:col-span-2">Mensagem recebida. A equipe entrará em contato pelos dados informados.</p>}{requestContact.error && <p className="rounded-lg bg-destructive/20 px-3 py-2 text-sm text-red-200 sm:col-span-2">{requestContact.error.message}</p>}<Button type="submit" className="bg-[#FFC300] font-black tracking-wide text-[#0F1C3F] hover:bg-white sm:col-span-2" disabled={!contactForm.consent || requestContact.isPending}>{requestContact.isPending ? "ENVIANDO MENSAGEM..." : "ENVIAR MENSAGEM"}<ArrowRight className="ml-2 size-4" /></Button></form></div></section>

    <section className="landing-deferred border-t border-white/10 bg-[#0A132E] px-5 py-16 sm:px-8"><div className="landing-observe mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-7 md:flex-row md:items-center"><div><p className="text-[11px] font-black uppercase tracking-[.2em] text-[#00A859]">W9 Campanhas Eleitorais</p><h2 className="mt-2 font-[Anton,sans-serif] text-4xl uppercase leading-[.9] sm:text-5xl">A campanha é sua. <span className="text-[#FFC300]">O sistema é o seu QG.</span></h2></div><div className="rounded-2xl border border-white/10 bg-white/[.04] p-5 md:w-[350px]"><p className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="size-4 text-[#00A859]" />Acesso à conta</p><p className="mt-2 text-xs leading-5 text-white/55">Entre com Google, e-mail e senha, MFA ou passkey para acessar sua operação.</p><Button asChild className="mt-5 w-full bg-[#FFC300] font-black text-[#0F1C3F] hover:bg-white"><Link href="/login">ENTRAR NA CONTA <ArrowRight className="ml-2 size-4" /></Link></Button></div></div></section>
  </main>;
}
