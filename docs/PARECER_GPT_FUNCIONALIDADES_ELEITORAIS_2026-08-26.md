# Parecer GPT — Evolução funcional e conformidade eleitoral

> **Aviso informativo.** Este parecer combina uma revisão técnica do GPT com referências públicas oficiais. Não substitui assessoria jurídica eleitoral, contábil ou de proteção de dados. Regras, prazos e formatos devem ser revistos pela assessoria especializada da campanha antes do uso em um pleito específico.

## Síntese executiva

O W9 Campanhas Eleitorais já possui uma base operacional extensa: multi-organização, controle de acesso, CRM com consentimento, campo offline, eventos, escalas, treinamento, financeiro, jurídico, relatórios, auditoria e Central de Comando. A recomendação do GPT foi priorizar evoluções que aumentem **prevenção**, **rastreabilidade**, **privacidade** e **aprovação humana**, em vez de automação persuasiva ou perfilamento político de pessoas.

A priorização é consistente com as regras atuais da Justiça Eleitoral: propaganda e conteúdo eleitoral digital seguem a Resolução TSE nº 23.610/2019; o TSE destaca a vedação de telemarketing e de disparos em massa sem consentimento; e a prestação de contas demanda rastreabilidade de recursos, gastos e documentos. [1] [2] [3] A LGPD requer finalidade, necessidade, transparência e medidas reforçadas para dados sensíveis, entre os quais se encontra a opinião política. [4]

## Dez sugestões priorizadas

| Prioridade | Funcionalidade proposta | Benefício operacional | Salvaguardas indispensáveis | Esforço |
| --- | --- | --- | --- | --- |
| **P0** | **1. Motor de Conformidade de Propaganda e Internet** | Criar uma pré-checagem por eleição, UF, canal e período antes da aprovação de peças, posts e impulsionamentos. | Regras versionadas, dupla aprovação, evidência de revisão, trilha de auditoria e revisão jurídica do catálogo de regras. | Alto |
| **P0** | **2. Selo de conteúdo sintético e proveniência** | Identificar conteúdos produzidos ou alterados por IA, registrar autoria/edições e exigir aviso visível antes de publicação. | Metadados de procedência, marcação visível, aprovação humana para exceções, controle de acesso e retenção mínima. | Médio |
| **P0** | **3. Reconciliação financeira e pré-validação para prestação de contas** | Complementar o financeiro com conciliação de extratos, alertas de documentos pendentes, classificação padronizada e exportações preparatórias. | Separação entre lançamento e aprovação, criptografia, auditoria, bloqueio pós-fechamento e revisão contábil/jurídica dos layouts oficiais. | Alto |
| **P0** | **4. Ledger omnicanal de consentimento** | Unificar opt-in, finalidade, canal, recibo, preferência e revogação para contatos vindos de landing, CRM, eventos e campo. | Registro append-only com hash, verificação de identidade em pedidos do titular, lista de supressão e prazos de atendimento monitorados. | Médio |
| **P0** | **5. Prevenção de disparo em massa e telemarketing indevido** | Bloquear ou encaminhar para aprovação lotes de comunicação sem base legal, consentimento ou justificativa operacional válida. | Limites por canal, análise por metadados, simulação prévia, responsáveis identificados e proibição de ativação automática. | Médio |
| **P1** | **6. Governança de dados sensíveis e retenção** | Detectar campos sensíveis em notas e anexos, aplicar mascaramento e definir retenção/anonimização por finalidade. | Criptografia por campo, acesso justificado, auditoria de leitura/exportação, expiração automatizada e revisão de base legal. | Médio |
| **P1** | **7. Integrações oficiais e validações cadastrais** | Avaliar integrações oficiais ou importações certificadas para validação de dados cadastrais, reconciliação e conferências contextuais. | Credenciais segregadas, cache seguro, limitação de requisições, documentação de fonte e aprovação humana de inconsistências. | Alto |
| **P1** | **8. Playbooks de crise e desinformação** | Expandir a sala de crise com coleta de evidências, fontes oficiais, responsáveis, prazos e protocolos de resposta. | Carimbo do tempo, hash de evidência, dupla checagem factual e aprovação jurídica antes de qualquer resposta externa. | Baixo |
| **P2** | **9. Transparência e relatórios de integridade públicos** | Gerar, sob aprovação, páginas ou relatórios com dados agregados, políticas de privacidade, uso de IA e versões de documentos públicos. | Anonimização, revisão editorial/jurídica, assinatura/versionamento e ausência de dados pessoais sem base legal. | Médio |
| **P2** | **10. Acessibilidade 360° para plataforma e materiais** | Criar verificações de contraste, teclado, texto alternativo, legendas e audiodescrição nos materiais e fluxos do sistema. | Validação automática e humana, alternativa textual, testes de teclado e tratamento temporário/seguro de mídias. | Médio |

## Leitura prática das prioridades

As cinco iniciativas P0 tratam dos riscos mais diretos: materiais e propaganda digital, conteúdo sintético, controles financeiros, consentimento e comunicação em escala. O W9 já contém partes relevantes dessa base — biblioteca de conteúdos, financeiro-jurídico, consentimento, auditoria e notificações —, portanto a evolução deve ser incremental e reutilizar os controles existentes, sem criar cadastros paralelos.

As iniciativas P1 elevam maturidade de proteção de dados, validações e gestão de incidentes. A recomendação é iniciar pelo playbook de crise, por ter menor esforço e aproveitar a Sala de Crise existente; em paralelo, desenhar a classificação de dados e o plano de retenção com orientação jurídica. Integrações externas só devem ser ativadas após confirmar fonte, finalidade, permissões, custos e regras de cada serviço.

As duas P2 aumentam transparência e inclusão, mas não devem publicar informações automaticamente. Todo material público deve passar pela mesma governança de aprovação, e quaisquer dados pessoais devem ser suprimidos ou anonimizados quando não houver fundamento legal claro para divulgação.

## Matriz de decisão

| Ordem sugerida | Entrega | Motivo de iniciar nesta sequência |
| --- | --- | --- |
| 1 | Ledger omnicanal de consentimento | Reforça a base de CRM, captação e comunicações antes de qualquer ampliação de canais. |
| 2 | Prevenção de disparo e telemarketing | Transforma a política de consentimento em bloqueios e aprovações operacionais. |
| 3 | Motor de conformidade de propaganda | Concentra revisão humana e regras por período/canal sobre a biblioteca e os playbooks existentes. |
| 4 | Selo de conteúdo sintético | Cria transparência de IA e aproveita os recursos de geração/curadoria já existentes. |
| 5 | Reconciliação e pré-validação financeira | Deve avançar com contador e advogado eleitoral, preservando que o sistema não substitui os canais oficiais. |

## Limites de conformidade

O sistema não deve inferir opinião política, segmentar indivíduos por perfil político, criar mensagens persuasivas individualizadas, executar disparos automatizados sem consentimento verificável, prometer vitória eleitoral ou substituir a análise humana de advogado, contador ou responsável de campanha. As funcionalidades devem apoiar **organização, documentação, revisão e prestação de contas**, com registros auditáveis de quem aprovou cada ação.

## Referências

[1] [Tribunal Superior Eleitoral — Resolução TSE nº 23.610/2019](https://www.tse.jus.br/legislacao/compilada/res/2019/resolucao-no-23-610-de-18-de-dezembro-de-2019)

[2] [Tribunal Superior Eleitoral — Regras para propaganda eleitoral nas Eleições 2026](https://www.tse.jus.br/comunicacao/noticias/2026/Julho/por-dentro-das-eleicoes-conheca-as-regras-estabelecidas-para-a-propaganda-eleitoral)

[3] [Tribunal Superior Eleitoral — Regras para prestação de contas eleitorais nas Eleições 2026](https://www.tse.jus.br/comunicacao/noticias/2026/Agosto/por-dentro-das-eleicoes-conheca-as-regras-para-prestacao-de-contas-eleitorais)

[4] [Tribunal Superior Eleitoral — Proteção de dados pessoais e LGPD](https://www.tse.jus.br/transparencia-e-prestacao-de-contas/informacoes-exigidas-por-lei/protecao-de-dados-pessoais-1)
