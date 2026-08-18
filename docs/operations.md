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

## Validação técnica

Antes de disponibilizar uma nova versão, execute `pnpm check`, `pnpm test` e `pnpm build`. A suíte atual cobre logout, regras de perfil, bloqueios de contratos e cenários de edição da campanha, agenda, indicadores, tarefas, histórico de interações e acesso ao processamento de áudio.
