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

## Referências públicas de busca no setor

Uma amostra pública de buscas por “sistema gestão campanha eleitoral”, “software gestão campanha eleitoral” e “CRM eleitoral campanha” retornou plataformas como ELEGE, CampanhaSys, CampanhaOS, LideraAI, AppCand e Gabinett. Isso confirma que as intenções de busca do setor se concentram em software de gestão de campanha, CRM, território, equipe, metas, inteligência e operação de rua.

Na página pública, o ELEGE estrutura o conteúdo em blocos de recursos, explicação operacional, telas reais, FAQ, segurança/LGPD, multi-campanha e demonstração. A CampanhaSys usa blocos equivalentes para CRM, mapa estratégico, IA, equipe e FAQ. A oportunidade do W9 é cobrir essas intenções em páginas próprias com maior ênfase em gestão operacional, conformidade, consentimento, auditabilidade e prestação de contas, sem reproduzir promessas de resultado eleitoral ou comunicação persuasiva dirigida a eleitores.

**Fontes consultadas:** `https://elege.app.br/` e `https://www.campanhasys.com.br/`, acessadas em 27 de agosto de 2026.

## Validação de prévia durante a melhoria de SEO

Após a reinicialização do ambiente de desenvolvimento, a abertura direta de `http://127.0.0.1:3000/crm-eleitoral` retornou página visualmente vazia no navegador de auditoria. O console apontou apenas falha de conexão do WebSocket do Vite, sem erro React adicional. A checagem de tipos e a suíte automatizada de 206 testes passaram após as alterações de SEO. Como a prévia gerenciada também não disponibilizou URL de captura, a confirmação visual em ambiente de desenvolvimento ficou limitada nesta sessão e requer validação pela prévia do projeto após o checkpoint.

Após a estabilização do servidor, a rota local `/crm-eleitoral` foi carregada normalmente, com conteúdo responsivo, CTAs e a identidade visual da marca. A inspeção do documento confirmou título específico, canonical em `https://w9campanhaseleitorais.com.br/crm-eleitoral`, metadescrição específica, Open Graph específico e Schema.org dinâmico. A tela branca inicial foi transitória durante a partida do servidor, não uma falha persistente da rota.

## Diagnóstico de mídia publicada — 27 ago. 2026

A landing publicada no domínio raiz contém os controles e os elementos de vídeo e áudio. No navegador, o vídeo aponta para `/manus-storage/w9-campanhas-eleitorais-apresentacao_dece88d3.mp4`, declara suporte MP4 e alcança `readyState: 4`, porém apresenta erro de demuxer `PipelineStatus::PIPELINE_ERROR_READ: FFmpegDemuxer: data source error`. A narração aponta para `/manus-storage/w9-trailer-narracao-natural_557e1c29.wav`, sem erro explícito, mas permanece sem pré-carregamento por opção da landing e só deve ser buscada após ação do visitante. O problema prioritário é o arquivo de vídeo publicado ou sua entrega por streaming; os controles não foram removidos da página.

O link com o parâmetro `code` fornecido pelo usuário exibe a mesma estrutura da landing e o vídeo permanece em carregamento. Ao acionar o controle “OUVIR”, a narração mudou para o estado “REPRODUZINDO NARRAÇÃO”, confirmando que o áudio funciona quando iniciado por uma interação explícita, como planejado para respeitar as regras de autoplay dos navegadores. A diferença percebida pelo usuário não está no código da landing; o defeito reproduzido é o vídeo MP4 publicado, que permanece visualmente escuro e apresenta erro de leitura do demuxer.

Uma nova cópia do trailer foi gerada em H.264/AAC, 960×540, `yuv420p`, com `faststart`, 3,24 MB e MIME `video/mp4` no armazenamento. A landing local atualizada exibe um poster JPEG de 57 KB imediatamente e o novo vídeo foi reproduzido automaticamente, de forma silenciosa, com `readyState: 4`, `paused: false` e sem erro. A narração continua sob ação explícita do visitante, o comportamento necessário para compatibilidade com as políticas de autoplay; o botão de ouvir a aciona corretamente.
