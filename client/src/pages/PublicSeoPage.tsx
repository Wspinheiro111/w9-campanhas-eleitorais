import { useEffect } from "react";
import { trackPublicEvent } from "@/lib/publicAnalytics";

type SeoPageKey = "campaign" | "crm" | "team" | "field" | "finance";

type SeoPageConfig = {
  path: string;
  eyebrow: string;
  title: string;
  description: string;
  keyword: string;
  introduction: string;
  modules: Array<{ title: string; description: string }>;
  workflow: Array<{ number: string; title: string; description: string }>;
  guardrail: string;
};

export const seoPages: Record<SeoPageKey, SeoPageConfig> = {
  campaign: {
    path: "/gestao-de-campanha-eleitoral",
    eyebrow: "Sistema de gestão de campanha eleitoral",
    title: "Gestão de campanha eleitoral com operação integrada",
    description: "Conheça o W9 Campanhas Eleitorais: uma plataforma para organizar equipe, agenda, CRM, território, campo, financeiro, jurídico e relatórios de campanha.",
    keyword: "gestão de campanha eleitoral",
    introduction: "O W9 Campanhas Eleitorais reúne a rotina de coordenação em um único ambiente. Em vez de depender de informações dispersas, a equipe acompanha responsáveis, prazos, registros e prioridades com contexto compartilhado.",
    modules: [
      { title: "Planejamento e rotina", description: "Agenda, tarefas, metas e relatórios para transformar decisões de coordenação em acompanhamentos objetivos." },
      { title: "Pessoas e território", description: "Equipe, voluntariado, CRM, demandas e cobertura territorial com visões adequadas a cada frente de trabalho." },
      { title: "Controles e evidências", description: "Financeiro, documentos, auditoria e permissões para manter a operação organizada e rastreável." },
    ],
    workflow: [
      { number: "01", title: "Centralize", description: "Reúna as informações necessárias para a rotina da campanha em fluxos organizados." },
      { number: "02", title: "Distribua", description: "Defina responsáveis, prazos, escalas e encaminhamentos por equipe e território." },
      { number: "03", title: "Acompanhe", description: "Use indicadores e relatórios para identificar pendências e orientar a próxima decisão." },
    ],
    guardrail: "A plataforma apoia organização e execução. Ela não promete resultado eleitoral, não substitui orientação jurídica e não deve ser usada para comunicação indevida ou tratamento de dados sem base legal.",
  },
  crm: {
    path: "/crm-eleitoral",
    eyebrow: "CRM eleitoral e relacionamento organizado",
    title: "CRM eleitoral para organizar contatos, demandas e histórico",
    description: "Organize cadastros consentidos, históricos de interação, demandas comunitárias e territórios no CRM eleitoral do W9 Campanhas Eleitorais.",
    keyword: "CRM eleitoral",
    introduction: "O CRM do W9 Campanhas Eleitorais ajuda a coordenação a organizar contatos, registros de atendimento, demandas e histórico operacional. A informação deixa de ficar presa em conversas e passa a ter responsável, contexto e acompanhamento.",
    modules: [
      { title: "Cadastros com contexto", description: "Registre contatos, território, origem e informações essenciais para a rotina autorizada da organização." },
      { title: "Histórico e encaminhamentos", description: "Acompanhe interações, tarefas e devolutivas sem depender de memória individual ou planilhas paralelas." },
      { title: "Consentimento e acesso", description: "Mantenha controles de finalidade, consentimento, revogação e permissões por organização." },
    ],
    workflow: [
      { number: "01", title: "Registre", description: "Inclua o contato ou a demanda com a finalidade e as informações necessárias." },
      { number: "02", title: "Encaminhe", description: "Associe responsáveis, prazos e histórico a cada acompanhamento." },
      { number: "03", title: "Consulte", description: "Visualize o contexto da relação antes de uma nova ação da equipe." },
    ],
    guardrail: "Os dados devem ser coletados e utilizados com base legal, finalidade clara e controles de acesso. O W9 não deve ser usado para perfilamento ilícito, disparos sem consentimento ou persuasão direcionada a eleitores.",
  },
  team: {
    path: "/gestao-de-equipe-de-campanha",
    eyebrow: "Gestão de equipe de campanha",
    title: "Gestão de equipe de campanha, escalas e treinamento",
    description: "Coordene equipes e voluntários com escalas, disponibilidade, tarefas, treinamento, certificados e acompanhamento operacional no W9 Campanhas Eleitorais.",
    keyword: "gestão de equipe de campanha eleitoral",
    introduction: "O W9 Campanhas Eleitorais organiza pessoas, escalas, disponibilidade, formação e tarefas. A coordenação passa a enxergar o que está planejado, o que foi executado e quais equipes precisam de atenção.",
    modules: [
      { title: "Escalas e disponibilidade", description: "Planeje jornadas por equipe e território, com filtros, recorrências e alertas de conflito." },
      { title: "Formação acompanhada", description: "Disponibilize trilhas de treinamento, progresso, certificados e reconhecimento interno por equipe." },
      { title: "Rotina de execução", description: "Associe tarefas, responsáveis e prioridades à rotina da coordenação e do campo." },
    ],
    workflow: [
      { number: "01", title: "Estruture", description: "Cadastre equipes, funções, territórios e disponibilidade de maneira organizada." },
      { number: "02", title: "Escale", description: "Monte a programação semanal e ajuste conflitos ou remanejamentos com justificativa." },
      { number: "03", title: "Evolua", description: "Acompanhe formação, participação e pendências para qualificar a rotina de trabalho." },
    ],
    guardrail: "A gestão de equipe deve respeitar regras trabalhistas, termos aplicáveis, privacidade e controles de acesso. Os indicadores são operacionais e não representam garantia de desempenho eleitoral.",
  },
  field: {
    path: "/gestao-de-campo-eleitoral",
    eyebrow: "Gestão de campo e território",
    title: "Gestão de campo eleitoral com operação offline e território",
    description: "Planeje ações, registre check-ins, ocorrências, materiais, demandas e cobertura territorial mesmo com conectividade limitada no W9 Campanhas Eleitorais.",
    keyword: "gestão de campo eleitoral",
    introduction: "A operação de campo precisa registrar o que ocorreu, onde ocorreu e qual é o próximo encaminhamento. O W9 Campanhas Eleitorais centraliza agenda de rua, check-ins, ocorrências, materiais e cobertura territorial em um fluxo consultável.",
    modules: [
      { title: "Agenda de rua", description: "Organize ações por local, equipe, responsável e objetivos operacionais." },
      { title: "Campo com continuidade", description: "Registre presença, materiais, ocorrências e encaminhamentos, inclusive em cenários de conexão limitada." },
      { title: "Visão territorial", description: "Acompanhe cobertura e demandas por área para identificar lacunas de operação." },
    ],
    workflow: [
      { number: "01", title: "Planeje", description: "Defina a ação, o território, a equipe e os recursos necessários." },
      { number: "02", title: "Registre", description: "Faça o check-in e documente o que foi realizado durante a atividade." },
      { number: "03", title: "Encaminhe", description: "Converta ocorrências e demandas em responsáveis, prazos e devolutivas." },
    ],
    guardrail: "Registros de campo precisam observar privacidade, consentimento e segurança da equipe. A plataforma não deve ser usada para constrangimento, manipulação ou segmentação indevida de pessoas.",
  },
  finance: {
    path: "/financeiro-e-juridico-de-campanha",
    eyebrow: "Financeiro e jurídico de campanha",
    title: "Financeiro e jurídico de campanha com rastreabilidade",
    description: "Organize receitas, despesas, documentos, aprovações, processos e relatórios de campanha no módulo financeiro e jurídico do W9 Campanhas Eleitorais.",
    keyword: "controle financeiro de campanha eleitoral",
    introduction: "O W9 Campanhas Eleitorais organiza lançamentos, documentos, aprovações e processos internos em uma visão de controle. A equipe mantém os registros acessíveis para conferência, auditoria e elaboração de relatórios.",
    modules: [
      { title: "Receitas e despesas", description: "Cadastre lançamentos, responsáveis, centro de custo, fornecedor, status e documentação relacionada." },
      { title: "Documentos e processos", description: "Armazene contratos, notas fiscais e relatórios com contexto, permissões e histórico." },
      { title: "Aprovação e relatório", description: "Acompanhe pendências, fluxos de validação e exportações para a gestão interna." },
    ],
    workflow: [
      { number: "01", title: "Registre", description: "Inclua o lançamento ou documento com os dados necessários para conferência." },
      { number: "02", title: "Valide", description: "Use responsáveis, status e histórico para organizar a revisão interna." },
      { number: "03", title: "Consolide", description: "Gere relatórios para análise da coordenação e suporte aos fluxos de prestação de contas." },
    ],
    guardrail: "O W9 apoia controles internos e organização documental; não presta consultoria jurídica, contábil ou eleitoral e não emite certificação automática de conformidade.",
  },
};

function updateMeta(selector: string, attribute: "name" | "property", value: string) {
  const existing = document.querySelector<HTMLMetaElement>(selector);
  if (existing) existing.content = value;
  else {
    const meta = document.createElement("meta");
    meta.setAttribute(attribute, selector.match(/\[.+?="(.+)"\]/)?.[1] ?? "description");
    meta.content = value;
    document.head.appendChild(meta);
  }
}

function usePageMetadata(page: SeoPageConfig) {
  useEffect(() => {
    const canonicalUrl = `https://w9campanhaseleitorais.com.br${page.path}`;
    document.title = `W9 Campanhas Eleitorais | ${page.title}`;
    updateMeta('meta[name="description"]', "name", page.description);
    updateMeta('meta[property="og:title"]', "property", page.title);
    updateMeta('meta[property="og:description"]', "property", page.description);
    updateMeta('meta[property="og:url"]', "property", canonicalUrl);
    updateMeta('meta[name="twitter:title"]', "name", page.title);
    updateMeta('meta[name="twitter:description"]', "name", page.description);

    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.href = canonicalUrl;

    const schemaId = "w9-seo-page-schema";
    const previousSchema = document.getElementById(schemaId);
    previousSchema?.remove();
    const schema = document.createElement("script");
    schema.id = schemaId;
    schema.type = "application/ld+json";
    schema.text = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          name: page.title,
          description: page.description,
          inLanguage: "pt-BR",
          url: canonicalUrl,
          isPartOf: { "@type": "WebSite", name: "W9 Campanhas Eleitorais", url: "https://w9campanhaseleitorais.com.br/" },
        },
        {
          "@type": "SoftwareApplication",
          name: "W9 Campanhas Eleitorais",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          url: canonicalUrl,
          description: page.description,
        },
      ],
    });
    document.head.appendChild(schema);
    trackPublicEvent("seo_solution_view", { page: page.path, keyword: page.keyword });
  }, [page]);
}

export default function PublicSeoPage({ pageKey }: { pageKey: SeoPageKey }) {
  const page = seoPages[pageKey];
  usePageMetadata(page);

  return (
    <main id="conteudo-principal" className="min-h-screen bg-[#07142f] text-white">
      <a href="#conteudo-principal" className="sr-only fixed left-4 top-4 z-50 rounded-md bg-[#f5c518] px-4 py-2 text-sm font-bold text-[#07142f] focus:not-sr-only focus:outline-none">Pular para o conteúdo</a>
      <header className="border-b border-white/10 bg-[#07142f]/95">
        <nav aria-label="Navegação da página de solução" className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-5 sm:px-8">
          <a href="/" className="flex items-center gap-3 font-bold tracking-tight" aria-label="Voltar para a página inicial do W9 Campanhas Eleitorais">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#f5c518] text-sm font-black text-[#07142f]">W9</span>
            <span className="text-sm leading-tight sm:text-base">W9 <span className="text-[#f5c518]">CAMPANHAS</span><br />ELEITORAIS</span>
          </a>
          <a href="/#demonstracao" className="rounded-full bg-[#f5c518] px-4 py-2 text-xs font-black uppercase tracking-wide text-[#07142f] transition hover:bg-[#ffe06c] motion-reduce:transition-none sm:px-5">Solicitar demonstração</a>
        </nav>
      </header>

      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_82%_15%,rgba(0,191,166,0.24),transparent_31%),radial-gradient(circle_at_12%_84%,rgba(245,197,24,0.18),transparent_28%)]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
          <p className="mb-5 text-xs font-black uppercase tracking-[0.2em] text-[#f5c518]">{page.eyebrow}</p>
          <h1 className="max-w-4xl font-['Anton'] text-4xl uppercase leading-[0.98] tracking-wide sm:text-6xl">{page.title}</h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-200 sm:text-xl">{page.introduction}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <a href="/#demonstracao" className="rounded-full bg-[#f5c518] px-6 py-3 text-sm font-black uppercase tracking-wide text-[#07142f] transition hover:bg-[#ffe06c] motion-reduce:transition-none">Quero uma demonstração</a>
            <a href="/" className="rounded-full border border-white/30 px-6 py-3 text-sm font-bold text-white transition hover:border-white hover:bg-white/10 motion-reduce:transition-none">Conhecer o W9</a>
          </div>
        </div>
      </section>

      <section aria-labelledby="solucao-recursos" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.8fr] lg:gap-16">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#00bfa6]">O que a coordenação organiza</p>
            <h2 id="solucao-recursos" className="mt-4 font-['Anton'] text-3xl uppercase leading-tight tracking-wide sm:text-4xl">Uma operação visível para quem precisa decidir e executar.</h2>
          </div>
          <ul className="grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 md:grid-cols-3">
            {page.modules.map((module) => (
              <li key={module.title} className="bg-[#0a1b3d] p-7">
                <h3 className="text-lg font-black text-[#f5c518]">{module.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{module.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="solucao-fluxo" className="border-y border-white/10 bg-[#0a1b3d]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f5c518]">Fluxo de trabalho</p>
          <h2 id="solucao-fluxo" className="mt-4 font-['Anton'] text-3xl uppercase tracking-wide sm:text-4xl">Do planejamento ao acompanhamento.</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {page.workflow.map((step) => (
              <li key={step.number} className="border-t-2 border-[#00bfa6] pt-5">
                <span className="font-['Anton'] text-4xl text-[#f5c518]">{step.number}</span>
                <h3 className="mt-3 text-xl font-black">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="solucao-uso-responsavel" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="grid gap-8 border border-[#f5c518]/35 bg-[#102650] p-8 md:grid-cols-[1.3fr_0.7fr] md:p-12">
          <div>
            <h2 id="solucao-uso-responsavel" className="text-xs font-black uppercase tracking-[0.18em] text-[#f5c518]">Uso responsável</h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-100">{page.guardrail}</p>
          </div>
          <div className="flex items-center md:justify-end">
            <a href="/#demonstracao" className="w-full rounded-full bg-[#f5c518] px-6 py-4 text-center text-sm font-black uppercase tracking-wide text-[#07142f] transition hover:bg-[#ffe06c] motion-reduce:transition-none md:w-auto">Agendar demonstração</a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-9 text-center text-sm text-slate-300 sm:px-8">
        <p>W9 Campanhas Eleitorais · Gestão operacional, dados organizados e execução responsável.</p>
        <a href="/login" className="mt-3 inline-block font-bold text-[#f5c518] hover:text-[#ffe06c]">Acessar a conta</a>
      </footer>
    </main>
  );
}
