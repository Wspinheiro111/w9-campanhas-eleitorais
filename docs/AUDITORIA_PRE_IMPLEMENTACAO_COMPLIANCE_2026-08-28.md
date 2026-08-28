# Auditoria Pré-Implementação — W9 Compliance Eleitoral

**Data:** 28 de agosto de 2026  
**Escopo:** avaliação do material enviado, esquema Drizzle, rotas de campanha, IA, financeiro, consentimento, pesquisas e auditoria.  
**Regra de leitura:** esta auditoria avalia capacidades técnicas do W9 Campanhas Eleitorais; não substitui análise jurídica ou contábil de casos concretos.

## Achados críticos confirmados

| Requisito | Situação | Evidência de código | Impacto e correção necessária |
|---|---|---|---|
| Importação não concede consentimento | **Existe, mas precisa ser alterado** | `server/routers/campaign.ts`, `voters.commitCsv`: atualizações forçam `contactConsent: true` e `doNotContact: false` (linha 306). | Uma reimportação pode reativar contato e remover bloqueio. A importação deve receber origem, finalidade e base documentada; novos registros devem nascer sem autorização de propaganda e reimportações nunca podem remover supressão. |
| Registro por áudio CRM | **Existe, mas precisa ser alterado** | `server/routers/ai.ts`, fluxo de extração cria eleitor com `contactConsent: true`. | O consentimento à gravação ou ao processamento do áudio não é, por si, uma autorização de comunicação eleitoral. O fluxo deve criar o contato sem autorização de comunicação e registrar a origem separadamente. |
| Preferências por canal | **Existe parcialmente** | `voter_communication_preferences` separa e-mail, WhatsApp e telefone. | Falta prova vinculada por canal, finalidade, versão do texto, revogação, motivo e precedência de lista de supressão. |
| Telefone e telemarketing | **Existe, mas precisa ser alterado** | `communicationChannelEnum` e templates/logs aceitam `phone`. | O canal `phone` não pode ser ofertado como propaganda ou automação de chamadas. Deve ser renomeado para contato administrativo e bloqueado em qualquer fluxo de comunicação eleitoral. |
| Comunicação com bloqueio prévio | **Existe parcialmente** | Há candidatos, preferências, templates e logs, mas não há envio externo automatizado. | É necessário um serviço único de decisão que valide bloqueio, canal, prova, finalidade, conteúdo, período e ator antes de criar qualquer comunicação ou liberar integração futura. |
| Opt-out e supressão | **Existe parcialmente** | `voters.doNotContact` existe. | Faltam solicitação de descadastramento, motivo, canal, prazo, fila de atendimento, prevalência sobre importação e lista de supressão por canal. |
| Auditoria de comunicação | **Existe parcialmente** | `campaign_communication_logs` registra canal, template e notas. | Faltam decisão de compliance, fundamento, conteúdo/versionamento, status, provedor, falha, remetente e imutabilidade operacional. |
| Pesquisas e enquetes | **Existe parcialmente** | `campaign_surveys` só possui pergunta, opções e status básico. | Faltam categoria interna/divulgação, registro PesqEle, dados metodológicos, documentos, status jurídico e bloqueio de enquete baseado em regra temporal. |
| Calendário eleitoral | **Não existe** | Não foi localizada uma entidade central de eventos/regras eleitorais atualizáveis. | Criar base versionada de regras, datas, fonte e vigência; decisões do motor consultam essa base, nunca datas espalhadas no frontend. |

## Achados prioritários de governança

| Requisito | Situação | Evidência de código | Impacto e correção necessária |
|---|---|---|---|
| Financeiro eleitoral e doações | **Existe parcialmente** | `campaign_financial_entries`, documentos e regras internas básicas; revisão otimista já existe. | Adicionar classificação de origem, sinalização imutável de revisão, dados de doação, comprovantes, validações de completude e painel de prontidão. O W9 não deve afirmar envio ou regularidade oficial perante o TSE. |
| Prestação de contas | **Existe parcialmente** | Há lançamentos, documentos, revisão e relatório financeiro. | Consolidar pendências, documentos faltantes, inconsistências e conciliação como preparação para análise humana/CONTA+JE; sem simular transmissão oficial. |
| IA e conteúdo sintético | **Existe parcialmente** | `ai_messages` e `campaign_contents` existem; conteúdo tem estados genéricos de rascunho, revisão e aprovação. | Implementar classificação de conteúdo sintético, revisão humana identificada, requisito de identificação visível e bloqueio temporal configurável por regras oficiais. |
| Segmentação e score | **Existe, mas precisa ser alterado** | `voters` possui `contactProfile`, `engagementLevel` e `conversionScore`. | Restringir uso a organização operacional; bloquear categorias sensíveis e inferência de intenção de voto, perfil psicológico ou persuasão individualizada. |
| Direitos do titular e retenção | **Existe parcialmente** | Consentimentos podem ser revogados e há auditoria organizacional. | Faltam Central LGPD de solicitações, prazos, responsáveis, resultados, retenção por categoria e exclusão/anonimização assistida. |
| RBAC e exportação | **Existe parcialmente** | Há papéis organizacionais, de campanha e rotas protegidas. | Adicionar permissões específicas para importação, exportação, consentimento, regras, pesquisa, financeiro e IA; toda exportação de contatos exige finalidade, confirmação e auditoria. |
| Motor e painel de compliance | **Não existe** | Há `campaignComplianceRules` limitado a três campos. | Criar serviço central, decisões versionadas e dashboard de risco, reaproveitando auditoria, consentimento, financeiro, pesquisas e conteúdo existentes. |

## Elementos já corretos e reutilizáveis

O projeto já oferece isolamento por organização e campanha, autenticação reforçada, auditoria organizacional, evidências de consentimento em estrutura básica, preferências por canal, status financeiros, documentos jurídicos, revisão de conteúdo, histórico de IA e controles de acesso. Essas estruturas serão **estendidas**, não recriadas. A comunicação externa automatizada não está ativa, o que reduz risco imediato e permite introduzir a camada de bloqueio antes de qualquer integração de envio.

## Sequência de implementação

1. Corrigir os fluxos que concedem ou restauram consentimento indevidamente e bloquear telefone eleitoral.
2. Criar o ledger por canal, supressão, pedidos de titular e motor de decisão central com auditoria.
3. Integrar o motor às importações, comunicação, conteúdo/IA, pesquisas, exportações e financeiro.
4. Criar calendário e repositório de regras atualizáveis, com fontes e vigência.
5. Entregar painel de W9 Compliance Eleitoral e testes de isolamento, bloqueio, revisão e auditoria.

## Base normativa consultada

As decisões técnicas serão vinculadas às fontes registradas em [`FONTES_OFICIAIS_COMPLIANCE_2026.md`](./FONTES_OFICIAIS_COMPLIANCE_2026.md), incluindo LGPD, TSE sobre IA, pesquisas e prestação de contas. Regras cujo resultado dependa de fatos, documentos ou interpretação jurídica serão classificadas como **revisão humana necessária**, nunca aprovadas automaticamente.
