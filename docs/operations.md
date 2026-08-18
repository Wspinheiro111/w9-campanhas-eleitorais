# Operação do W9 Campanhas

## Primeiro acesso

O primeiro usuário autenticado como proprietário do projeto recebe o perfil administrativo da plataforma. Após o acesso, crie a campanha com os dados do candidato, cargo/eleição e região-base. Esse usuário fica automaticamente vinculado como administrador da campanha.

## Papéis de campanha

| Papel | Acesso principal |
| --- | --- |
| Administrador | Configura dados da campanha, administra equipe, agenda, metas, tarefas, indicadores, CRM, monitoramento, relatórios e IA. |
| Coordenador | Opera agenda, tarefas, metas, contatos, monitoramento, indicadores, relatórios e recursos de IA. |
| Parceiro | Visualiza e atualiza apenas tarefas, contatos e registros de campo sob sua própria responsabilidade. |

## Recursos de IA e áudio

O assistente e o processamento de áudio executam no servidor. A gravação de campo exige confirmação de base legítima e consentimento para o registro do contato. Todo resultado gerado por IA deve passar por revisão humana, especialmente antes de divulgação ou encaminhamento externo.

## Resumo diário e prazos

O painel inicial apresenta três faixas de prioridade: tarefas **vencidas**, tarefas com prazo **para hoje** e tarefas dos **próximos três dias**. Tarefas concluídas não aparecem nos alertas. O perfil parceiro visualiza somente os prazos de itens sob sua responsabilidade; administradores e coordenadores visualizam a agenda operacional consolidada.

## Importação de contatos por CSV

No módulo **Contatos**, use **Modelo CSV** para baixar a estrutura de planilha aceita e **Importar CSV** para enviar o arquivo preenchido. A importação aceita até 1.000 linhas e 2 MB por operação. As colunas obrigatórias são `nome` e `consentimento`; use `Sim` para confirmar a autorização de registro e contato. O sistema também valida e-mail, nível de engajamento e limites de tamanho dos campos. Se houver qualquer erro, nenhum contato é salvo e um relatório por linha é apresentado para correção.

## Validação técnica

Antes de disponibilizar uma nova versão, execute `pnpm check`, `pnpm test` e `pnpm build`. A suíte atual cobre logout, regras de perfil, bloqueios de contratos e cenários de edição da campanha, agenda, indicadores, tarefas, histórico de interações e acesso ao processamento de áudio.
