# Auditoria de Site, SEO e Prontidão — W9 Campanhas Eleitorais

**Data da verificação:** 27 de agosto de 2026  
**Domínio avaliado:** `https://w9campanhaseleitorais.com.br`

## Resumo executivo

**O W9 Campanhas Eleitorais tem produto e apresentação comercial em nível avançado, com uma landing funcional, autenticação moderna e boa base de acessibilidade, mas ainda não deve ser tratado como um ativo de aquisição orgânica plenamente preparado nem como código de produção sem pendências de segurança.** A home e a tela de login responderam em HTTPS e apresentam uma jornada comercial coerente: trailer, explicação dos módulos, pedido de demonstração com consentimento e acesso à conta ao final. A medição móvel do PageSpeed registrou 81 em performance, 94 em acessibilidade, 77 em boas práticas e 92 em SEO; o site é utilizável no celular, embora o LCP de 3,6 s esteja acima da referência de 2,5 s recomendada para boa experiência [1] [2]. O diagnóstico técnico confirma HSTS e `X-Content-Type-Options`, PWA com manifesto e uma suíte atual de 200 testes aprovada. Em contrapartida, `robots.txt` e `sitemap.xml` retornam o HTML da aplicação, faltam metadados sociais, canonical e marcação estruturada, e o Similarweb não possui cobertura suficiente para medir visitas, palavras-chave, canais ou backlinks. A prioridade imediata não é criar mais páginas: é corrigir segurança de dependências, tornar a indexação explícita, reduzir o custo da mídia inicial e instrumentar dados próprios no Search Console e GA4.

> **Nota de dados:** Similarweb foi a fonte escolhida para métricas públicas. A consulta não encontrou estimativas confiáveis para o domínio no período analisado; por isso, este relatório não infere tráfego, rankings, backlinks ou conversões. Esses dados precisam ser confirmados por Google Search Console, GA4 e o analytics do próprio site.

## Nível atual da plataforma

| Pilar | Avaliação | Evidência observada |
|---|---|---|
| Produto e fluxos operacionais | **Avançado** | A plataforma reúne CRM, campo offline, equipe, escalas, eventos, financeiro, jurídico, relatórios, PWA, auditoria e administração global. |
| Apresentação comercial | **Boa** | Landing com proposta clara, trailer, módulos explicados, solicitação de demonstração, contato e acesso à conta ao final. |
| Autenticação e isolamento | **Avançado** | A interface pública disponibiliza Google, e-mail/senha e passkey; a base do projeto contém MFA, isolamento organizacional e painel administrativo separado. |
| Qualidade automatizada | **Boa** | `pnpm check` foi concluído e 53 arquivos de teste, com 200 testes, passaram nesta verificação [5]. |
| Segurança de dependências | **Crítica** | `pnpm audit --prod` identificou 81 vulnerabilidades: 10 baixas, 49 moderadas, 21 altas e 1 crítica [5]. |
| SEO técnico | **Parcial** | Título, descrição, idioma e manifesto existem; porém não há robots, sitemap, canonical, Open Graph/Twitter Cards ou JSON-LD configurados. |
| Tráfego orgânico e autoridade | **Não mensurável ainda** | Similarweb não retornou estimativas suficientes para o domínio. |

## Disponibilidade, jornada e experiência pública

**A jornada de venda está bem construída e o endereço oficial está disponível.** A landing retornou HTTP 200 por HTTPS, apresenta CTAs para demonstração e contato com textos de consentimento, e preserva o acesso à conta como etapa final. A tela `/login` também respondeu corretamente, oferecendo Google, e-mail/senha e passkey [3]. Isso posiciona o site acima de uma landing genérica: ele conecta diretamente a promessa comercial a um produto operacional já existente.

O trailer e a narração responderam HTTP 200 quando testados diretamente. O áudio foi servido como `audio/wav`, com cerca de 2,3 MB, e o vídeo tinha aproximadamente 6,4 MB; o vídeo retornou `binary/octet-stream`, em vez de um tipo de conteúdo de vídeo específico. No navegador de auditoria, o comando de ouvir foi iniciado, mas os elementos de mídia continuaram sem estado de carregamento disponível. Isso não comprova uma falha para usuários reais, mas justifica novo teste em celular físico antes de campanhas pagas.

## Desempenho móvel e página pública

**O desempenho móvel é bom, mas o carregamento do conteúdo principal ainda é o principal gargalo mensurado.** O PageSpeed Insights registrou Performance 81, Acessibilidade 94, Boas Práticas 77 e SEO 92 em teste de laboratório móvel. A página teve FCP de 3,4 s, LCP de 3,6 s, TBT de 0 ms, CLS de 0 e Speed Index de 4,7 s [1]. O resultado de TBT e CLS é positivo: o site não demonstrou bloqueio significativo de interação nem instabilidade visual nessa execução. O LCP, porém, está acima do valor de 2,5 s recomendado pelo Google [2].

O primeiro ajuste deve concentrar-se no herói: preservar o trailer, mas usar poster leve, carregamento adiado de vídeo fora da ação do usuário, formatos otimizados e fontes com carregamento que não bloqueie a primeira pintura. A chamada não autenticada a `auth.me` também apareceu entre os recursos mais demorados na observação do navegador; ela deve ser revista para que a landing comercial não dependa de consulta de sessão antes de apresentar a mensagem principal.

## SEO e arquitetura de descoberta

**O site tem mensagem comercial e conteúdo suficiente para uma boa página principal, mas falta a infraestrutura que permite aos mecanismos encontrá-lo, entendê-lo e compartilhá-lo corretamente.** O HTML base declara idioma `pt-BR`, título, uma descrição curta e manifesto PWA. A descrição atual — “W9 Campanhas: plataforma segura de gestão de campanhas eleitorais.” — é muito breve e não explora a proposta de valor, os módulos ou a intenção comercial principal [4].

O problema técnico mais objetivo é de indexação: `https://w9campanhaseleitorais.com.br/robots.txt` e `https://w9campanhaseleitorais.com.br/sitemap.xml` responderam com o HTML da aplicação, não com um arquivo `robots` ou XML de sitemap. Não foram encontradas no cliente referências a canonical, Open Graph, Twitter Cards, marcação JSON-LD ou sitemap. Um canonical para o domínio raiz pode ser aplicado sem reativar qualquer redirecionamento de domínio; ele apenas declara a URL preferida aos buscadores, respeitando a decisão de manter `w9campanhaseleitorais.com.br` como endereço oficial.

Também não há evidência de páginas públicas específicas para intenções comerciais como “sistema para gestão de campanha eleitoral”, “CRM eleitoral”, “controle de equipe de campanha”, “prestação de contas de campanha” ou “aplicativo de campo offline”. A home sozinha pode servir à marca, mas limita a capacidade de disputar buscas não relacionadas diretamente ao nome W9. Esses conteúdos devem ser institucionais e operacionais, sem persuasão dirigida a eleitores ou promessa de resultado eleitoral.

## Tráfego, palavras-chave e autoridade

**Ainda não há base pública confiável para avaliar crescimento orgânico, posicionamento ou backlinks.** O Similarweb retornou “Data not found” para visitas globais, taxa de rejeição, visitantes únicos, ranking, países e canais desktop. O retorno de canais móveis mostrou zero em todos os canais de maio a julho de 2026 [6]. Para um domínio recente, esse padrão costuma significar ausência de cobertura estatística suficiente; não deve ser lido como ausência comprovada de visitantes.

Sem Search Console, não é possível separar marca de descoberta não relacionada à marca, listar consultas, medir impressões, avaliar páginas indexadas ou identificar oportunidades de posição 11–20. Sem GA4 ou analytics acessível, também não é possível confirmar o desempenho de Reels, tráfego de campanhas, formulários iniciados, pedidos de demonstração concluídos ou origem real dos leads. A próxima avaliação deve usar dados próprios, não uma estimativa de terceiro.

## Segurança e operação

**A superfície pública apresenta sinais básicos positivos de proteção, mas a cadeia de dependências precisa de tratamento antes de qualquer classificação de prontidão total.** A resposta HTTPS trouxe HSTS com validade anual, `includeSubDomains` e `preload`, além de `X-Content-Type-Options: nosniff`. Não foram observados nos cabeçalhos públicos coletados uma Content Security Policy, `X-Frame-Options`, `Referrer-Policy` ou `Permissions-Policy`. Essas ausências devem ser avaliadas junto ao runtime e às integrações de autenticação, para evitar quebrar funcionalidades ao endurecer a política.

O ponto mais sério é o resultado da auditoria de produção: 81 vulnerabilidades, incluindo uma crítica em `fast-xml-parser`, transitiva via SDK AWS, com correção disponível em versão posterior. Há ainda dependências com alertas altos, como cadeias associadas a `@trpc/server`, `axios`, `drizzle-orm`, `lodash` e outras [5]. A existência do alerta não comprova exploração no W9, mas impede afirmar que a base esteja “100% pronta” sem atualização controlada, validação de compatibilidade e nova auditoria.

## Prioridades finais

1. **Problema:** A auditoria de dependências encontrou 1 vulnerabilidade crítica, 21 altas e 49 moderadas em componentes de produção. **Correção:** Atualizar as dependências diretas e transitivas afetadas em uma branch de segurança, executar a suíte completa, validar uploads, autenticação e S3, e repetir `pnpm audit --prod` até remover os alertas corrigíveis.

2. **Problema:** `robots.txt` e `sitemap.xml` não existem como recursos rastreáveis, e faltam canonical, metadados sociais e Schema.org. **Correção:** Publicar robots e sitemap XML reais, adicionar canonical para o domínio raiz, Open Graph/Twitter Cards, metadescrição comercial completa e JSON-LD de `SoftwareApplication`/`Organization`.

3. **Problema:** O LCP móvel de 3,6 s está acima do referencial de boa experiência e o herói carrega mídia relevante. **Correção:** Otimizar o trailer com poster, carregamento adiado, tipo MIME correto, compressão e revisão da chamada de sessão na landing; medir novamente em PageSpeed e em aparelhos reais.

4. **Problema:** Não há métricas confiáveis de tráfego, pesquisa, conversão ou origem de leads para orientar investimento. **Correção:** Verificar o domínio no Search Console, enviar o sitemap, conectar GA4/analytics com eventos de trailer, clique, formulário e demonstração concluída, e revisar o primeiro relatório após 30 dias.

5. **Problema:** A home concentra todo o potencial de descoberta orgânica. **Correção:** Criar páginas públicas institucionais para os principais módulos e necessidades operacionais, com conteúdo verificável, consentimento e linguagem responsável.

## Referências

[1] [PageSpeed Insights — relatório móvel da landing, 27 ago. 2026](https://pagespeed.web.dev/analysis/https-w9campanhaseleitorais-com-br/wg8qx8ec6k?form_factor=mobile)  
[2] [web.dev — Web Vitals e limiares de Core Web Vitals](https://web.dev/articles/vitals)  
[3] [W9 Campanhas Eleitorais — landing e login públicos](https://w9campanhaseleitorais.com.br/)  
[4] [Metadados de cliente verificados — `client/index.html`](../client/index.html)  
[5] [Registros de TypeScript, testes e auditoria de dependências — 27 ago. 2026](./quality_audit_2026-08-27.log)  
[6] [Coleta Similarweb — 27 ago. 2026](./similarweb_audit_2026-08-27.json)
