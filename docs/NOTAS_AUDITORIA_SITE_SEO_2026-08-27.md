# Notas de Auditoria — Site e SEO

## Evidências públicas iniciais

- Em 27 de agosto de 2026, `https://w9campanhaseleitorais.com.br/` respondeu e exibiu a landing comercial com trailer, roteiro, demonstração com consentimento, contato e acesso à conta.
- A landing apresenta a marca W9 Campanhas Eleitorais, proposta comercial clara e CTAs para demonstração e login. A prévia visual exibiu o player de vídeo ainda em carregamento; a confirmação de reprodução requer teste funcional específico.
- `https://w9campanhaseleitorais.com.br/login` respondeu e expôs login por Google, e-mail/senha e passkey.
- `https://w9campanhaseleitorais.com.br/manifest.webmanifest` respondeu com nome, idioma pt-BR, cores e ícone PWA.
- As requisições a `/robots.txt` e `/sitemap.xml` receberam o shell da aplicação em vez de conteúdo de robots ou sitemap XML, o que sugere ausência desses recursos públicos ou fallback indevido de rota; isso deve ser confirmado no código e em testes HTTP.
- No teste público do controle “Ouvir trailer”, o elemento de áudio recebeu comando de reprodução, mas permaneceu com `readyState: 0` e sem duração disponível na coleta do navegador. O vídeo também estava com `readyState: 0`. Esse resultado indica que os URLs de mídia devem ser validados por HTTP e em dispositivo real, pois a prévia visual isolada não comprovou o carregamento dos ativos.
- Os ativos de áudio e vídeo retornaram HTTP 200 por HTTPS no teste direto. O áudio foi servido como `audio/wav` (aproximadamente 2,3 MB) e o vídeo como `binary/octet-stream` (aproximadamente 6,4 MB), ambos com cerca de 2,3 segundos de transferência no ambiente de auditoria. A tipagem genérica do vídeo é um ponto técnico de melhoria, pois o servidor deveria informar um `Content-Type` de vídeo adequado.
- A navegação registrada no navegador exibiu aproximadamente 9,8 segundos até `load` e 9,8 segundos até o DOM completo, com 370.795 bytes de documento transferidos. Essa é uma única observação de laboratório no ambiente da auditoria e não substitui Core Web Vitals de usuários reais. O PageSpeed Insights foi iniciado no navegador após a API retornar limite de cota, mas a análise ainda estava em processamento no momento do registro.
- O PageSpeed Insights concluiu uma medição móvel de laboratório em 27 de agosto de 2026. O resultado foi: Performance 81, Acessibilidade 94, Boas Práticas 77 e SEO 92. As métricas indicadas foram FCP 3,4 s, LCP 3,6 s, TBT 0 ms, CLS 0 e Speed Index 4,7 s. Não havia dados de usuários reais (CrUX) para o domínio no relatório.

## Limites conhecidos nesta etapa

- Dados de tráfego e palavras-chave ainda não foram coletados; a fonte selecionada pelo usuário é Similarweb.
- Esta anotação separa observações públicas de conclusões de SEO e não substitui dados de Search Console ou GA4.

## Similarweb — resultado da coleta

O Similarweb não disponibilizou estimativas de visitas globais, taxa de rejeição, visitantes únicos, ranking global, países ou canais desktop para `w9campanhaseleitorais.com.br` no período analisado (fevereiro a julho de 2026). O único retorno de canais móveis apresentou zero em todos os canais entre maio e julho de 2026. Para um domínio recente e de baixo volume, esse resultado deve ser tratado como insuficiência de cobertura do painel público — não como prova de ausência de acessos.

Não há, portanto, base suficiente para afirmar volume de tráfego, palavras-chave posicionadas, backlinks, origem geográfica ou desempenho orgânico. A fonte adequada para validar esses dados é o Google Search Console, complementado pelo GA4 ou pelo analytics já instalado na aplicação.
