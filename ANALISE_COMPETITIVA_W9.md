# Análise competitiva: W9 Campanhas Eleitorais

## Veredito executivo

O **W9 já é competitivo na operação interna** de uma campanha municipal ou regional. Ele se destaca pela arquitetura multi-tenant, controles de acesso, LGPD, CRM segmentado, campo offline, inteligência territorial, voluntariado com treinamento e certificação, além de auditoria e relatórios. Essa combinação é mais madura do que a de muitas ferramentas pontuais.

O principal espaço de evolução está na **ativação externa da base**: comunicação consentida em escala, eventos como funil de mobilização, ações públicas reutilizáveis e expansão distribuída de voluntários. Referências como NationBuilder, NGP VAN, Mobilize, Ecanvasser e Action Network tratam esses fluxos como integrados ao CRM e não como ferramentas isoladas.[1][2][3][4][5]

> **Síntese do Gemini:** o W9 tem uma base robusta de organização, governança e voluntariado, mas precisa ampliar a interação proativa com eleitores e apoiadores para reduzir a lacuna em relação às plataformas internacionais de mobilização.

## Comparação por capacidade

| Capacidade | Situação do W9 | Referências de mercado | Leitura competitiva |
|---|---|---|---|
| CRM, segmentação, LGPD e governança | Forte: CRM, deduplicação, consentimentos, RBAC, auditoria e multi-tenant. | NationBuilder e NGP VAN também concentram dados, segmentação e permissões.[1][2] | **Força competitiva.** |
| Campo e inteligência territorial | Forte: campo offline, mapa, pesquisas, score e sala de crise. | Ecanvasser amplia com talking points, status e formulários totalmente configuráveis.[4] | **Bom, com espaço para padronização de campo.** |
| Voluntariado e treinamento | Forte: portal privado, tarefas, prazos, certificados, ranking, metas e medalhas. | Mobilize inclui descoberta de oportunidades, RSVPs, lembretes e recrutamento entre pares.[3] | **Diferencial interno; falta aquisição e recorrência externa.** |
| Comunicação consentida em escala | Parcial: lembretes assistidos e notificações visuais, sem disparo externo automático. | NationBuilder e Action Network oferecem e-mail/SMS, segmentação, A/B e automações.[1][5] | **Maior lacuna funcional.** |
| Eventos e mobilização | Parcial: agenda e tarefas, mas sem fluxo de RSVP, check-in e pós-evento. | Mobilize e NGP VAN tratam evento como ciclo completo de mobilização.[2][3] | **Prioridade alta.** |
| Portal público de ações | Parcial: formulário público de captação e portal de voluntários. | NationBuilder e Action Network oferecem páginas de ação, pesquisas, petições e eventos.[1][5] | **Oportunidade clara de expansão.** |
| Arrecadação e prestação de contas | Ausente. | NationBuilder e NGP VAN incluem captação; NGP VAN também destaca conformidade.[1][2] | **Estratégico, porém regulado e de maior esforço.** |

## Prioridades recomendadas

| Prioridade | Impacto | Esforço | Horizonte | Primeiro passo seguro |
|---|---:|---:|---|---|
| **1. Hub de comunicação consentida** | Alto | Alto | 31–90 dias | Criar centro de preferências, segmentação por consentimento e histórico de campanhas; integrar envio só após definição de provedor e políticas de opt-in. |
| **2. Gestão completa de eventos** | Alto | Médio | 31–90 dias | Transformar agenda em ciclo com página de RSVP, lista de presença, check-in, pesquisa pós-evento e follow-up. |
| **3. Playbooks de campo e formulários configuráveis** | Médio | Médio | 31–90 dias | Adicionar talking points por campanha, versões de roteiro, campos customizados e coleta de consentimento com assinatura. |
| **4. Recrutamento entre pares e líderes voluntários** | Médio | Médio | 90+ dias | Permitir indicação consentida, vínculo de recrutador e papéis de líder com limites de acesso. |
| **5. Portal público de ações da campanha** | Médio | Médio | 90+ dias | Criar blocos reutilizáveis para notícia, formulário, agenda, pesquisa e convite de voluntariado. |
| **6. Captação e conformidade eleitoral** | Alto | Alto | 90+ dias | Fazer descoberta regulatória e técnica antes de pagamentos; a Resolução TSE nº 23.607/2019 disciplina arrecadação, gastos e prestação de contas.[6] |

## Recomendação de foco

Eu priorizaria primeiro **gestão completa de eventos** e a fundação do **hub de comunicação consentida**. Juntas, essas frentes fecham o ciclo que hoje termina dentro do W9: segmentar um contato, convidá-lo, confirmar presença, registrar participação, medir retorno e direcionar o próximo passo. A implementação deve manter trilha de auditoria, opção de descadastramento e finalidade de consentimento em cada canal.

Em seguida, avançaria para **playbooks de campo** e **recrutamento entre pares**. Isso aproveita os módulos já maduros — Campo Offline, CRM, Mobilização e Portal do Voluntário — sem exigir uma mudança estrutural de produto.

Por fim, a arrecadação não deve ser tratada como uma funcionalidade simples de checkout. Ela merece uma fase própria de requisitos jurídicos, segurança, conciliação e prestação de contas, pois a regulamentação eleitoral brasileira a enquadra explicitamente.[6]

## O que não priorizar agora

Não recomendo priorizar microtargeting sensível, automação de comunicação sem consentimento, postagem automática em redes sociais ou integrações de alto risco antes de consolidar os fluxos de consentimento, eventos e comunicação direta. Essas escolhas preservam a proposta do W9 de operação responsável, auditável e aderente à LGPD.

## Referências

[1]: https://nationbuilder.com/feature_guide "NationBuilder Feature Guide"
[2]: https://www.ngpvan.com/ "NGP VAN: Technology powering campaigns and advocacy"
[3]: https://www.ngpvan.com/solutions/mobilize/ "Mobilize: Volunteer recruitment and event management"
[4]: https://support.ecanvasser.com/en/articles/2721045-building-your-customized-canvassing-app "Ecanvasser: Building your customized canvassing app"
[5]: https://actionnetwork.org/get-started-mobile/ "Action Network: Mobile Messaging and feature comparison"
[6]: https://www.tse.jus.br/eleicoes/contas-eleitorais "TSE: Contas eleitorais e Resolução nº 23.607/2019"
