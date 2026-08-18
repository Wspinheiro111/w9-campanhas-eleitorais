# Registro de Validação

## Validação manual de interface

Em **18 de agosto de 2026**, o responsável pela revisão confirmou que a aplicação abriu corretamente e que a interface foi verificada nos contextos de **desktop, tablet e celular**. A confirmação foi registrada durante a entrega da versão `1e1e1e84`.

| Breakpoint | Pontos verificados | Resultado informado |
| --- | --- | --- |
| Desktop | Navegação lateral, cabeçalhos, cartões de dados, formulários e tabelas. | Abertura correta. |
| Tablet | Organização dos cards, menus, formulários e área de conteúdo. | Abertura correta. |
| Mobile | Navegação, módulos operacionais e fluxo de áudio para CRM. | Abertura correta. |

## Fluxos autenticados revisados

O responsável confirmou a abertura correta, após login, dos módulos abaixo. A revisão considera a disponibilidade da rota, a navegação pelo menu e a renderização sem tela em branco.

| Fluxo | Escopo revisado |
| --- | --- |
| Dashboard | Visão geral, métricas, eventos e atividades. |
| Equipe | Gestão de membros, responsabilidades e dados de campanha/candidato. |
| Agenda | Calendário, criação e edição de compromissos. |
| Tarefas | Lista, kanban, metas, prioridades e responsáveis. |
| Contatos | Cadastro, filtros de segmentação e histórico de interações. |
| Monitoramento | Ocorrências, feedbacks e indicadores. |
| Inteligência | Chat estratégico, geração de conteúdo e áudio para CRM. |
| Relatórios | Resumos operacionais e exportação. |

## Evidência técnica complementar

Antes da confirmação manual, a validação automatizada executou com êxito `pnpm check`, `pnpm test` e `pnpm build`. A suíte contém **24 testes** para autenticação, contratos, regras de autorização e fluxos críticos. As capturas automatizadas de tela não foram concluídas porque o serviço de pré-visualização expirou durante a sessão; por isso, a verificação visual foi concluída manualmente pelo responsável.
