# Comparativo de sugestões — Manus e GPT

> **Nota informativa.** Esta priorização técnica não substitui revisão jurídica eleitoral, contábil ou de proteção de dados antes de um pleito específico.

## Síntese

As sugestões operacionais propostas anteriormente pela Manus estão, em sua maior parte, implementadas no W9 Campanhas Eleitorais. As sugestões do GPT são, em sua maioria, evoluções de conformidade sobre módulos que já existem: elas não requerem duplicar CRM, financeiro, consentimento, biblioteca de conteúdo ou Sala de Crise, mas adicionar controles de prevenção, evidência e aprovação humana.

## Situação das sugestões da Manus

| Sugestão | Situação | O que já existe | Próximo incremento, se desejado |
| --- | --- | --- | --- |
| Mapa de prioridades territoriais | **Concluída** | Mapa territorial, mapa de calor, pesquisas, score de mobilização e dashboard executivo. | Refinar critérios de prioridade por campanha, se necessário. |
| Agenda de rua com check-in | **Concluída** | Ações de rua, presença, materiais, ocorrências e encaminhamentos. | Adicionar exportação operacional específica, se necessário. |
| Central de demandas da comunidade | **Concluída** | Protocolos, responsáveis, prazo, status e histórico de devolutivas. | Adicionar indicadores de prazo médio, se necessário. |
| Gestão de materiais | **Concluída** | Estoque, distribuição, devolução e vínculo com equipe, território e evento. | Adicionar inventário físico periódico, se necessário. |
| Monitor de metas operacionais | **Concluída** | Meta, valor-alvo, progresso, prazo, estado de atenção e auditoria. | Adicionar modelos de metas por tipo de campanha. |
| Painel de voluntariado | **Concluída** | Inscrição, disponibilidade, formação, tarefas, certificados e histórico. | Adicionar visão comparativa temporal, se necessário. |
| Biblioteca de respostas aprovadas | **Parcial** | Biblioteca de conteúdos, materiais, templates de comunicação e aprovação. | Unificar respostas curtas aprovadas, versões e uso permitido em um catálogo próprio. |
| Registro de riscos e crises | **Parcial** | Sala de Crise com gravidade, responsável, prazo e decisões. | Incluir playbooks de crise, evidências com integridade e confirmação jurídica antes de resposta externa. |
| Relatório diário de coordenação | **Concluída** | Pendências, agenda, ações de rua, demandas, metas e cobertura territorial. | Adicionar distribuição interna agendada, caso venha a ser solicitada. |
| Auditoria de privacidade e consentimento | **Parcial** | Consentimento, finalidade, validade, revogação, preferências e auditoria. | Criar uma auditoria consolidada de retenção, supressão e exportações de dados pessoais. |

## Sugestões do GPT ainda a evoluir

| Prioridade | Sugestão | Estado atual | Entrega recomendada |
| --- | --- | --- | --- |
| P0 | Motor de conformidade de propaganda e internet | **Parcial**: há biblioteca aprovada e regras internas. | Checklist versionado por canal, UF, período e eleição, com dupla aprovação e evidência de revisão. |
| P0 | Selo de conteúdo sintético e proveniência | **Pendente** | Etiqueta visível para material criado ou alterado por IA, autoria, versões e aprovação humana. |
| P0 | Reconciliação financeira e pré-validação | **Parcial**: há lançamentos, status, documentos e auditoria. | Conciliação assistida de extratos, alertas de evidência pendente e exportações preparatórias revisáveis por contador. |
| P0 | Ledger omnicanal de consentimento | **Parcial** | Unificar landing, CRM, eventos e campo em trilha append-only com recibo, supressão e monitoramento de pedidos do titular. |
| P0 | Prevenção de disparo e telemarketing indevido | **Parcial**: comunicações externas automatizadas não são ativadas. | Simulador e bloqueio de lotes sem consentimento, finalidade, canal permitido e aprovação identificada. |
| P1 | Governança de dados sensíveis e retenção | **Pendente** | Classificação de campos e anexos, mascaramento, prazo de retenção, justificativa de acesso e anonimização assistida. |
| P1 | Integrações oficiais e validações cadastrais | **Pendente** | Avaliar somente fontes autorizadas, com credenciais segregadas e revisão humana de divergências. |
| P1 | Playbooks de crise e desinformação | **Parcial** | Estender a Sala de Crise com fontes oficiais, evidência com carimbo de tempo, dupla checagem e aprovação jurídica. |
| P2 | Transparência e relatórios de integridade públicos | **Pendente** | Gerar rascunhos agregados e anonimizados para aprovação editorial e jurídica, sem publicação automática. |
| P2 | Acessibilidade 360° | **Parcial**: contraste e interface responsiva já são considerados. | Verificar teclado, textos alternativos, legendas, audiodescrição e acessibilidade de todos os materiais exportados. |

## Próximas três prioridades sugeridas

1. **Ledger omnicanal de consentimento**, pois reaproveita a Central de Consentimento e fortalece a origem, a finalidade e a revogação dos dados em todos os pontos de entrada.
2. **Prevenção de comunicação indevida**, para transformar o consentimento já registrado em bloqueios e aprovações operacionais antes de qualquer integração externa.
3. **Selo de conteúdo sintético e proveniência**, para dar transparência a materiais apoiados por IA e conectar a geração de conteúdo à biblioteca de aprovações.

Esses três incrementos ampliam os controles já existentes sem criar automação persuasiva, disparo em massa ou perfilamento de pessoas.

## Referência da análise

O diagnóstico de conformidade e a matriz de prioridades do GPT estão registrados em [Parecer GPT — Evolução funcional e conformidade eleitoral](./PARECER_GPT_FUNCIONALIDADES_ELEITORAIS_2026-08-26.md), com referências oficiais do TSE utilizadas na análise original.
