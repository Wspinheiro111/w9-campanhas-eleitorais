const prompt = `Você é um especialista independente em tecnologia para campanhas políticas, CRM de apoiadores e organização de base. Analise, em português brasileiro, as lacunas competitivas mais relevantes de uma plataforma chamada W9 Campanhas Eleitorais.

ESCOPO ATUAL DO W9:
- multi-tenant, RBAC, Google OAuth e login local;
- CRM de contatos/eleitores, segmentação, importação CSV com deduplicação e LGPD;
- agenda, tarefas, equipe, pipeline, conteúdos, relatórios, mapa territorial, campo offline, pesquisas rápidas, mobilização e score;
- portal de voluntários com tarefas, treinamento, prazos, certificados PDF com QR, histórico, ranking, metas e medalhas;
- IA no servidor, sala de crise, auditoria e painel técnico.

EVIDÊNCIAS DE CONCORRENTES:
- NationBuilder: CRM de apoiadores, e-mail/SMS em massa, automações, site de ação, eventos e captação financeira.
- NGP VAN: captação e conformidade, canvassing, phone banking, texting, eventos e mobilização integrados.
- Mobilize: oportunidades presenciais/virtuais/híbridas, RSVPs, lembretes, follow-up, pesquisas pós-evento, recrutamento entre pares e líderes voluntários.
- Ecanvasser: campos/status customizáveis, pesquisas por equipe, talking points sincronizados para campo, consentimento/assinatura digital e prévia móvel.
- Action Network: e-mail/SMS segmentados, A/B testing, automações, analytics, ações, eventos, pesquisas, captação e grupos.

RESTRIÇÕES E CONTEXTO:
- Foco no mercado brasileiro e em campanhas municipais/regionais.
- Dados sensíveis e LGPD são prioridades.
- O produto ainda não envia alertas externos automáticos por decisão anterior, mas pode evoluir se houver ganho claro.
- Não recomende uso ilícito de dados, microtargeting indevido, desinformação ou automação sem consentimento.

ENTREGUE APENAS JSON VÁLIDO, no formato:
{
  "veredito": "...",
  "forcas": ["..."],
  "prioridades": [
    {"nome":"...","por_que":"...","impacto":"alto|medio|baixo","esforco":"alto|medio|baixo","horizonte":"0-30 dias|31-90 dias|90+ dias","primeiro_passo":"..."}
  ],
  "nao_priorizar_agora": ["..."]
}
Inclua entre 5 e 7 prioridades, ordenadas por prioridade.`;

const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.2 } }),
});
if (!response.ok) throw new Error(`Gemini HTTP ${response.status}: ${await response.text()}`);
const body = await response.json();
const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
if (!text) throw new Error("Gemini não retornou conteúdo analisável.");
console.log(text);
