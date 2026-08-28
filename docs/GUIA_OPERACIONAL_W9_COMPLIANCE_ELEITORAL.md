# Guia Operacional — W9 Compliance Eleitoral

**Versão:** 2026.1  
**Data:** 28 de agosto de 2026  
**Abrangência:** controles internos do W9 Campanhas Eleitorais para organizações e campanhas isoladas.

## Finalidade e limite do recurso

O **W9 Compliance Eleitoral** organiza evidências, aplica bloqueios técnicos objetivos e encaminha situações sensíveis para revisão humana. Ele foi projetado para reduzir riscos operacionais em contatos, comunicações, conteúdo sintético, pesquisas e registros financeiros. As decisões registradas no módulo são internas, rastreáveis e vinculadas à campanha e à organização corretas.

> O sistema **não substitui** assessoria jurídica, contábil ou decisão da Justiça Eleitoral. Ele não declara homologação, aprovação oficial, regularidade automática nem efetua envio ao PesqEle, CONTA+JE ou a qualquer sistema público. A coordenação mantém a responsabilidade de revisar cada pendência e consultar profissionais habilitados quando necessário.

## Painel e papéis de uso

O painel está disponível no menu operacional como **W9 Compliance Eleitoral**. Ele consolida pendências, regras internas, decisões, bloqueios de contato, solicitações de titulares e o ledger cronológico de consentimentos. Somente perfis de gestão da campanha podem acessar informações consolidadas; revisões decisórias permanecem reservadas ao perfil administrativo da própria campanha.

| Área | O que o sistema faz | Ação humana necessária |
|---|---|---|
| Regras da campanha | Mantém uma versão de política e parâmetros de bloqueio por campanha. | Administrador revisa regras e registra a atualização. |
| Decisões | Registra ação solicitada, motivo, regra aplicada, solicitante, revisor e data. | Administrador aprova ou bloqueia a pendência justificada. |
| Consentimento | Mantém evento cronológico com canal, finalidade, fonte, evidência, validade e situação. | Coordenação confirma a evidência antes de conceder contato eleitoral. |
| Supressão | Bloqueia o contato revogado ou marcado como não contatável, mesmo após nova importação. | A remoção do bloqueio exige decisão rastreável e fundamento apropriado. |
| Dados do titular | Registra pedido de acesso, correção, exclusão, oposição ou portabilidade com prazo interno. | Responsável verifica identidade e conclui o atendimento. |

## Contatos e comunicações

O módulo preserva o consentimento já registrado durante reimportações de CSV. Contatos importados sem evidência recebem evento de ledger **“importado sem autorização”**; a importação, o formulário público e a transcrição de áudio não podem criar ou restaurar autorização eleitoral de forma automática.

Uma revogação registrada no módulo de consentimento cria também uma supressão ativa. Antes de registrar uma comunicação eleitoral, o sistema verifica a campanha, o contato, o canal, a existência de evidência ativa e eventual supressão. Comunicação eleitoral por telefone foi removida do fluxo operacional; os canais disponíveis são e-mail e WhatsApp, sempre condicionados às regras aplicáveis e à evidência de autorização correspondente.

| Situação detectada | Comportamento do W9 |
|---|---|
| Sem evidência ativa no canal | Bloqueia o registro de comunicação eleitoral. |
| Revogação ou lista de supressão ativa | Bloqueia o registro, inclusive após reimportação. |
| Telefone como canal eleitoral | Bloqueia o uso no fluxo operacional. |
| Exportação de contatos | Gera uma pendência de revisão humana e decisão auditável; não libera exportação automática. |

## Conteúdo, IA e pesquisa

Conteúdos marcados como sintéticos devem ter identificação transparente antes de qualquer aprovação. Quando a política interna exigir, materiais criados ou significativamente alterados por IA ficam em revisão humana. O sistema registra quem solicitou, quais motivos foram avaliados, qual regra foi aplicada e quem aprovou ou bloqueou. A checagem de janelas temporais funciona como controle preventivo interno, não como atestado jurídico de prazo eleitoral.

Pesquisas podem ser classificadas como **uso interno** ou **pretendida para divulgação pública**. As internas continuam o fluxo operacional normal. As destinadas a divulgação ficam em rascunho e exigem referência de registro, metodologia resumida e aprovação humana no painel antes de qualquer uso externo. Essa separação reduz o risco de tratar um levantamento interno como divulgação pública sem os requisitos adequados [2].

| Tipo de item | Estado inicial | Condição para prosseguir |
|---|---|---|
| Conteúdo não sintético | Sem revisão obrigatória | Fluxo de conteúdo usual da campanha. |
| Conteúdo sintético | Pendente, conforme a regra da campanha | Identificação adequada e revisão humana, quando exigida. |
| Pesquisa interna | Ativa ou rascunho, conforme escolha operacional | Uso interno sob a política da campanha. |
| Pesquisa para divulgação | Rascunho e pendente | Registro/referência, metodologia e revisão humana documentada. |

## Financeiro e prestação de contas preparatória

Para receitas e despesas, o W9 adiciona uma conferência preparatória: origem, situação de evidência, estado de revisão, revisor, data e observação. Despesas sem documento ou recibo são bloqueadas quando essa regra estiver ativa. Lançamentos sem a evidência mínima solicitada podem ficar pendentes de revisão humana. A política também permite bloquear receita identificada por CNPJ, quando ativada pela campanha.

Esses campos ajudam a equipe a organizar informações antes da conferência contábil. Eles **não** equivalem à prestação oficial e não substituem o sistema indicado pela Justiça Eleitoral [3].

## Rotina recomendada de coordenação

No início da campanha, o administrador deve abrir o painel de compliance, conferir a versão de regras, cadastrar as fontes normativas usadas pela equipe e designar responsável pelas pendências. Antes de iniciar comunicações, a coordenação deve revisar os contatos importados sem evidência e manter o registro de consentimento separado por finalidade e canal.

Diariamente, a equipe deve consultar conteúdos sintéticos pendentes, pesquisas classificadas para divulgação, lançamentos financeiros sem comprovação e solicitações de titulares abertas. Toda aprovação ou bloqueio deve conter uma justificativa clara. Mensalmente, recomenda-se exportar internamente a lista de decisões para revisão jurídica e contábil, usando apenas o mínimo necessário de dados pessoais.

## Evidências de validação técnica

Foram criadas tabelas isoladas por `organizationId` e `campaignId` para ledger, supressões, decisões, fontes normativas e solicitações de titulares. A migração foi aplicada de forma aditiva e a verificação do banco confirmou os dois campos de isolamento nas seis estruturas de compliance. A suíte automatizada executada após a implementação aprovou **58 arquivos e 215 testes**, incluindo testes específicos do motor de regras e das rotas de compliance.

## Referências

[1] [Lei nº 13.709/2018 — Lei Geral de Proteção de Dados Pessoais](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)  
[2] [Tribunal Superior Eleitoral — Pesquisas eleitorais](https://www.tse.jus.br/eleicoes/pesquisas-eleitorais)  
[3] [Tribunal Superior Eleitoral — Prestação de contas nas Eleições 2026](https://www.tse.jus.br/eleicoes/eleicoes-2026-content/prestacao-de-contas)  
[4] [Tribunal Superior Eleitoral — Uso de IA na campanha eleitoral de 2026](https://www.tse.jus.br/comunicacao/noticias/2026/Abril/por-dentro-das-eleicoes-conheca-as-regras-sobre-uso-de-ia-na-campanha-eleitoral-de-2026)
