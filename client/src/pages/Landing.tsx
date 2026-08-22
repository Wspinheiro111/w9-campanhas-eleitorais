import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Landmark,
  LockKeyhole,
  MapPinned,
  Megaphone,
  ShieldCheck,
  Target,
  UsersRound,
  WifiOff,
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

const modules = [
  { icon: Target, title: "Planejamento e estratégia", text: "Metas, cenários, tarefas, agenda e prioridades para transformar o plano em ritmo de campanha." },
  { icon: UsersRound, title: "Equipe e voluntariado", text: "Funções, equipes, formação, certificados, desempenho e mobilização de quem faz a campanha acontecer." },
  { icon: MapPinned, title: "Território e relacionamento", text: "CRM eleitoral, segmentação, demandas, mapa de calor, pipeline e leitura real das regiões." },
  { icon: WifiOff, title: "Campo offline", text: "Visitas, playbooks, check-ins e ações de rua continuam registradas mesmo sem conexão." },
  { icon: Megaphone, title: "Conteúdo e comunicação", text: "Calendário editorial, materiais, comunicação consentida e histórico por contato e campanha." },
  { icon: BarChart3, title: "Eventos e mobilização", text: "RSVP, presença, metas, indicadores territoriais e alertas para não deixar público na cadeira vazia." },
  { icon: Landmark, title: "Financeiro e jurídico", text: "Receitas, despesas, documentos, aprovações, processos, auditoria e relatórios sem expor valores sensíveis." },
  { icon: Bot, title: "W9 Inteligência", text: "Apoio com Gemini, fontes oficiais, criação de materiais e respostas informativas para a operação." },
];

const outcomes = [
  { number: "01", title: "Menos improviso", text: "A coordenação enxerga o que precisa acontecer agora e no próximo movimento territorial." },
  { number: "02", title: "Mais presença", text: "Equipe, voluntários, eventos e campo trabalham com metas e responsáveis." },
  { number: "03", title: "Decisão mais rápida", text: "Indicadores e relatórios mostram onde reforçar mobilização e relacionamento." },
];

const operatingSignals = [
  { icon: CalendarDays, title: "Ritmo diário", text: "Prazos, tarefas e ações em uma visão única." },
  { icon: UsersRound, title: "Time alinhado", text: "Responsáveis, formação e entregas visíveis." },
  { icon: BarChart3, title: "Decisão com dados", text: "Indicadores para reforçar o que funciona." },
];

export default function Landing() {
  const [demoForm, setDemoForm] = useState({ name: "", email: "", phone: "", organizationName: "", role: "candidate" as "candidate" | "party" | "coordination" | "other", city: "", state: "", message: "", preferredDemoAt: "", consent: false, website: "" });
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const requestDemo = trpc.demoRequests.submit.useMutation({
    onSuccess: () => {
      setDemoSubmitted(true);
      setDemoForm({ name: "", email: "", phone: "", organizationName: "", role: "candidate", city: "", state: "", message: "", preferredDemoAt: "", consent: false, website: "" });
    },
  });

  return (
    <main className="min-h-screen overflow-hidden bg-[#fffaf2] text-[#12382b]">
      <section className="relative isolate overflow-hidden bg-[#103527] px-5 pb-24 pt-6 text-white sm:px-8 lg:px-12">
        <div
          className="absolute inset-0 -z-10 opacity-90"
          style={{
            backgroundImage:
              "radial-gradient(circle at 78% 8%, rgba(255,111,0,.98) 0, transparent 22%), radial-gradient(circle at 72% 78%, rgba(255,211,53,.68) 0, transparent 26%), radial-gradient(circle at 10% 95%, rgba(39,145,102,.72) 0, transparent 34%)",
          }}
        />

        <nav className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#ffcf39] text-[#103527]">
              <ShieldCheck className="size-5" />
            </span>
            <span className="font-serif text-lg font-bold sm:text-xl">W9 Campanhas Eleitorais</span>
          </div>
          <Link href="/login" className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-bold transition hover:bg-white/20">
            Acessar conta
          </Link>
        </nav>

        <div className="mx-auto grid max-w-7xl gap-12 pb-4 pt-20 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
          <div>
            <Badge className="border border-[#ffcf39]/55 bg-[#ffcf39]/15 font-bold text-[#fff0a8]">
              A plataforma para campanhas que querem chegar mais fortes
            </Badge>
            <h1 className="mt-6 max-w-4xl font-serif text-5xl font-bold leading-[1.01] tracking-tight sm:text-6xl lg:text-7xl">
              Quem quer se eleger não pode depender de planilhas soltas.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/80">
              O <strong>W9 Campanhas Eleitorais</strong> transforma pessoas, território, eventos, dados e decisões em uma operação organizada para candidatos, partidos e coordenações que querem disputar com método.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-[#ffcf39] font-bold text-[#103527] hover:bg-[#ffe06b]">
                <Link href="/login">
                  Quero organizar minha campanha <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <a href="#recursos" className="rounded-md border border-white/30 bg-white/5 px-5 py-2.5 text-sm font-bold transition hover:bg-white/15">
                Ver tudo que o sistema entrega
              </a>
            </div>
            <p className="mt-7 text-sm font-medium text-[#fff0a8]">
              “Campanha bem-preparada sabe onde está, quem está fazendo e qual é o próximo passo.”
            </p>

            <div className="mt-12 grid max-w-2xl gap-3 sm:grid-cols-3">
              {operatingSignals.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl border border-white/15 bg-white/10 p-4">
                  <Icon className="size-5 text-[#ffcf39]" />
                  <p className="mt-4 text-sm font-semibold">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-white/65">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/20 bg-white p-5 text-[#103527] shadow-2xl shadow-black/20 sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-[#a15b00]">Central de comando</p>
                <p className="mt-2 font-serif text-3xl font-bold">Sua campanha, em movimento.</p>
              </div>
              <span className="rounded-full bg-[#ffefe0] p-3 text-[#ef6c00]">
                <Target className="size-5" />
              </span>
            </div>

            <div className="mt-7 grid gap-4">
              <div className="rounded-2xl bg-[#eff7f0] p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#466352]">Prioridades da coordenação</span>
                  <ClipboardCheck className="size-5 text-[#ef6c00]" />
                </div>
                <p className="mt-3 font-serif text-2xl font-bold">Do planejamento ao voto</p>
                <div className="mt-4 h-2 rounded-full bg-[#d7ead9]">
                  <div className="h-2 w-4/5 rounded-full bg-[#ef6c00]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-[#103527] p-4 text-white">
                  <MapPinned className="size-5 text-[#ffcf39]" />
                  <p className="mt-5 text-sm font-semibold">Território</p>
                  <p className="mt-1 text-xs text-white/65">Onde mobilizar agora.</p>
                </div>
                <div className="rounded-2xl bg-[#ffcf39] p-4 text-[#103527]">
                  <Bot className="size-5" />
                  <p className="mt-5 text-sm font-bold">Inteligência</p>
                  <p className="mt-1 text-xs">Apoio para agir melhor.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[.82fr_1.18fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-[#ef6c00]">Por que investir agora</p>
            <h2 className="mt-3 font-serif text-4xl font-bold leading-tight">A eleição é disputada todos os dias. Sua organização também precisa ser.</h2>
            <p className="mt-5 text-base leading-7 text-[#607266]">
              O W9 Campanhas Eleitorais reúne a rotina inteira da campanha: quem está na rua, o que acontece em cada território, onde há oportunidade e quais decisões não podem esperar.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {outcomes.map(({ number, title, text }) => (
              <article key={number} className="rounded-3xl border border-[#f1d7b4] bg-white p-6 shadow-sm">
                <span className="font-serif text-3xl font-bold text-[#ef6c00]">{number}</span>
                <h3 className="mt-8 font-serif text-2xl font-bold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#607266]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="recursos" className="bg-[#f6e8d9] px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-[#ef6c00]">Muito além de um painel</p>
            <h2 className="mt-3 font-serif text-4xl font-bold">Uma plataforma completa para fazer a campanha avançar.</h2>
            <p className="mt-5 text-base leading-7 text-[#607266]">
              Planejamento, rua, voluntariado, comunicação, documentos, resultados e segurança de acesso trabalham juntos em uma única plataforma.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {modules.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-3xl border border-[#f0d2ae] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-[#fff1df] text-[#ef6c00]">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-7 font-serif text-xl font-bold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#607266]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#fffaf2] px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.78fr_1.22fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-[#ef6c00]">Conheça a plataforma em 30 segundos</p>
            <h2 className="mt-3 font-serif text-4xl font-bold leading-tight">Do comando à rua, cada frente da campanha conversa com a próxima.</h2>
            <p className="mt-5 text-base leading-7 text-[#607266]">Assista à apresentação do W9 Campanhas Eleitorais e veja como planejamento, território, equipe e indicadores podem atuar na mesma direção.</p>
            <a href="#demonstracao" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#ef6c00] underline-offset-4 hover:underline">Quero ver uma demonstração personalizada <ArrowRight className="size-4" /></a>
          </div>
          <div className="overflow-hidden rounded-[2rem] border-8 border-[#103527] bg-[#103527] shadow-2xl shadow-[#103527]/20">
            <video className="aspect-video w-full bg-[#103527]" controls playsInline preload="metadata" aria-label="Vídeo de apresentação do W9 Campanhas Eleitorais">
              <source src="/manus-storage/w9-campanhas-eleitorais-apresentacao_dece88d3.mp4" type="video/mp4" />
              Seu navegador não suporta a reprodução de vídeo.
            </video>
          </div>
        </div>
      </section>

      <section id="demonstracao" className="bg-[#ffcf39] px-5 py-20 text-[#103527] sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.82fr_1.18fr] lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-[#a15b00]">Demonstração personalizada</p>
            <h2 className="mt-3 max-w-3xl font-serif text-4xl font-bold leading-tight">Veja o W9 Campanhas Eleitorais aplicado à realidade da sua campanha.</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#315445]">Conte o que está em jogo e a administração prepara uma apresentação focada em organização, território, mobilização, segurança e tomada de decisão.</p>
            <div className="mt-8 space-y-3 text-sm font-medium text-[#315445]">
              {[
                "Conversa objetiva para candidatos, partidos e coordenações.",
                "Demonstração guiada pelos desafios reais da sua operação.",
                "Sem compromisso e sem exibição de valores na página pública.",
              ].map((text) => <p key={text} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0" />{text}</p>)}
            </div>
          </div>

          <form className="grid gap-4 rounded-[2rem] bg-white p-6 shadow-xl shadow-[#9b5c00]/20 sm:grid-cols-2 sm:p-8" onSubmit={(event) => {
            event.preventDefault();
            setDemoSubmitted(false);
            requestDemo.mutate({
              ...demoForm,
              phone: demoForm.phone.replace(/\D/g, ""),
              city: demoForm.city || undefined,
              state: demoForm.state || undefined,
              message: demoForm.message || undefined,
              preferredDemoAt: new Date(demoForm.preferredDemoAt),
              consent: true,
            });
          }}>
            <div className="sm:col-span-2"><p className="font-serif text-2xl font-bold">Solicite sua demonstração</p><p className="mt-1 text-sm text-[#607266]">Preencha os dados e entraremos em contato para apresentar a plataforma.</p></div>
            <div className="grid gap-2"><Label htmlFor="demo-name">Seu nome</Label><Input id="demo-name" value={demoForm.name} onChange={(event) => setDemoForm((current) => ({ ...current, name: event.target.value }))} required maxLength={180} /></div>
            <div className="grid gap-2"><Label htmlFor="demo-email">E-mail profissional</Label><Input id="demo-email" type="email" value={demoForm.email} onChange={(event) => setDemoForm((current) => ({ ...current, email: event.target.value }))} required maxLength={320} /></div>
            <div className="grid gap-2"><Label htmlFor="demo-phone">Telefone / WhatsApp</Label><Input id="demo-phone" inputMode="tel" value={demoForm.phone} onChange={(event) => setDemoForm((current) => ({ ...current, phone: event.target.value }))} required placeholder="(00) 00000-0000" maxLength={32} /></div>
            <div className="grid gap-2"><Label htmlFor="demo-org">Campanha, partido ou organização</Label><Input id="demo-org" value={demoForm.organizationName} onChange={(event) => setDemoForm((current) => ({ ...current, organizationName: event.target.value }))} required maxLength={180} /></div>
            <div className="grid gap-2"><Label htmlFor="demo-role">Seu papel</Label><select id="demo-role" className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]" value={demoForm.role} onChange={(event) => setDemoForm((current) => ({ ...current, role: event.target.value as typeof current.role }))}><option value="candidate">Candidato(a)</option><option value="party">Partido</option><option value="coordination">Coordenação de campanha</option><option value="other">Outro</option></select></div>
            <div className="grid grid-cols-[1fr_72px] gap-3"><div className="grid gap-2"><Label htmlFor="demo-city">Cidade</Label><Input id="demo-city" value={demoForm.city} onChange={(event) => setDemoForm((current) => ({ ...current, city: event.target.value }))} maxLength={120} /></div><div className="grid gap-2"><Label htmlFor="demo-state">UF</Label><Input id="demo-state" value={demoForm.state} onChange={(event) => setDemoForm((current) => ({ ...current, state: event.target.value.toUpperCase().slice(0, 2) }))} maxLength={2} /></div></div>
            <div className="grid gap-2 sm:col-span-2"><Label htmlFor="demo-time">Melhor data e horário para a demonstração</Label><Input id="demo-time" type="datetime-local" min={new Date().toISOString().slice(0, 16)} value={demoForm.preferredDemoAt} onChange={(event) => setDemoForm((current) => ({ ...current, preferredDemoAt: event.target.value }))} required /><p className="text-xs text-muted-foreground">O horário é uma preferência. A confirmação será feita pela administração.</p></div>
            <div className="grid gap-2 sm:col-span-2"><Label htmlFor="demo-message">O que você quer organizar melhor? <span className="font-normal text-muted-foreground">(opcional)</span></Label><Textarea id="demo-message" value={demoForm.message} onChange={(event) => setDemoForm((current) => ({ ...current, message: event.target.value }))} maxLength={2000} rows={3} placeholder="Ex.: equipe de rua, território, agenda ou prestação de contas." /></div>
            <div className="hidden" aria-hidden="true"><Label htmlFor="demo-website">Website</Label><Input id="demo-website" tabIndex={-1} autoComplete="off" value={demoForm.website} onChange={(event) => setDemoForm((current) => ({ ...current, website: event.target.value }))} /></div>
            <Label className="flex cursor-pointer items-start gap-2 text-xs leading-5 text-[#466352] sm:col-span-2"><input type="checkbox" className="mt-1" checked={demoForm.consent} onChange={(event) => setDemoForm((current) => ({ ...current, consent: event.target.checked }))} required />Autorizo o contato sobre a demonstração e o tratamento destes dados exclusivamente para esse atendimento.</Label>
            {demoSubmitted && <p className="rounded-lg bg-[#eff7f0] px-3 py-2 text-sm font-medium text-[#1d6a43] sm:col-span-2">Solicitação recebida. A administração entrará em contato para combinar a demonstração.</p>}
            {requestDemo.error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">{requestDemo.error.message}</p>}
            <Button type="submit" className="bg-[#ef6c00] font-bold text-white hover:bg-[#c85400] sm:col-span-2" disabled={!demoForm.consent || requestDemo.isPending}>{requestDemo.isPending ? "Enviando solicitação..." : "Solicitar demonstração"}<ArrowRight className="ml-2 size-4" /></Button>
          </form>
        </div>
      </section>

      <section className="bg-[#103527] px-5 py-20 text-white sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_.9fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-[#ffcf39]">Para candidatos, partidos e coordenações</p>
            <h2 className="mt-3 max-w-3xl font-serif text-4xl font-bold">Não deixe a próxima eleição ser decidida pela falta de organização.</h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/70">
              Da primeira reunião à reta final, o W9 Campanhas Eleitorais mantém sua equipe focada no que gera presença, relacionamento e capacidade de decisão.
            </p>
            <div className="mt-8 grid gap-3 text-sm text-white/80 sm:grid-cols-2">
              {["Multi-organização e papéis definidos", "PWA para uso em campo", "Auditoria e controles operacionais", "Inteligência com apoio de IA"].map((text) => (
                <span key={text} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-[#ffcf39]" />
                  {text}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/15 bg-white/10 p-7 backdrop-blur">
            <LockKeyhole className="size-7 text-[#ffcf39]" />
            <p className="mt-6 font-serif text-3xl font-bold">Acesso à conta</p>
            <p className="mt-3 text-sm leading-6 text-white/65">Entre pelo método mais adequado à sua conta: Google, e-mail e senha, MFA ou passkey.</p>
            <Button asChild className="mt-7 w-full bg-[#ffcf39] font-bold text-[#103527] hover:bg-[#ffe06b]">
              <Link href="/login">
                Entrar na conta <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <p className="mt-4 text-center text-xs text-white/50">Quer conhecer a ferramenta? Fale com a administração para organizar a implantação.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
