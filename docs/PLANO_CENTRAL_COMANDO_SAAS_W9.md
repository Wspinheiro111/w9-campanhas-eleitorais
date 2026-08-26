# Plano de adaptação — Central de Comando SaaS do W9 Campanhas Eleitorais

## Decisão de escopo

O **W9 Campanhas Eleitorais** já possui uma área administrativa independente em `/paineladmin`. Ela é protegida no frontend e, principalmente, no backend por uma verificação de e-mail exclusivo. A nova Central de Comando deve evoluir essa estrutura em vez de criar um segundo painel, manter o proprietário como único administrador global e preservar o isolamento por organização já existente.

O painel continuará fora da navegação operacional de campanhas. Usuários master terão administração limitada à própria organização e nunca receberão acesso ao portal global.

## Diagnóstico do ambiente atual

| Área | O que já existe | Reaproveitamento na Central de Comando |
|---|---|---|
| Acesso global | `/paineladmin` independente; verificação server-side do e-mail do proprietário; login por senha, Google, MFA e passkeys | Manter a regra de proprietário exclusivo, acrescentar uma interface de controle mais clara e preservar o bloqueio no backend. |
| Clientes e organizações | Organizações multi-tenant, carteira de clientes, CPF/CNPJ único, suspensão/reativação, histórico comercial e convites legados | Transformar a carteira no módulo **Clientes**, com visão resumida e acesso a detalhes reais por organização. |
| Usuários master | Cadastro por CPF/CNPJ, e-mail, senha provisória, vínculo administrativo somente à organização e troca obrigatória no primeiro acesso | Consolidar no módulo **Usuários**, com status de primeiro acesso e controles que não exponham senhas. |
| Comercial | Pedidos de demonstração, mensagens de contato, status e histórico de relacionamento | Reaproveitar como fila comercial e ações rápidas da visão geral. |
| Segurança | Senha local, Google, MFA, passkeys, rate limit, auditoria de login e bloqueio progressivo | Criar cartões e consultas administrativas sem expor hashes, tokens, códigos ou segredos. |
| Auditoria | Logs por organização e histórico comercial | Exibir trilha administrativa consolidada apenas quando o dado existir, sem inventar eventos. |
| Saúde técnica | Endpoint de saúde, monitor interno, telemetria de rotas, erros de interface e painel técnico | Criar indicadores agregados de disponibilidade, volume, erros e latência, preservando detalhes técnicos sensíveis. |
| IA e integrações | Gemini no servidor; armazenamento e autenticação internos | Mostrar apenas status operacional e uso disponível. Não haverá custo estimado, segredo ou chave no frontend. |

No diagnóstico atual, existem dados reais de organizações, usuários, telemetria e erros de interface. Não existem ainda registros reais de planos, assinaturas, cobrança SaaS, licenças, feature flags, tickets, backups gerenciados ou limites de consumo. Esses módulos não devem ser simulados.

## O que será criado na primeira evolução

A primeira versão da Central de Comando terá o nome interno **Central de Comando W9** e manterá a rota `/paineladmin`. A interface será independente do painel de campanha e organizada em uma barra lateral própria, com os módulos abaixo.

| Módulo | Dados reais e ações previstas | Proteção |
|---|---|---|
| Visão geral | Clientes, organizações, usuários, leads, contatos, disponibilidade, erros e atividade recente | Somente proprietário exclusivo. |
| Clientes | Lista, busca, status, CPF/CNPJ, responsável, histórico e suspensão/reativação | Operações registradas em auditoria. |
| Usuários master | Status de ativação, primeiro acesso, organização, bloqueio e redefinição segura de acesso quando aplicável | Nunca exibe senha ou hash; sem acesso ao painel global. |
| Comercial | Demonstrações, mensagens de contato, status, lembretes e histórico | Apenas dados recebidos pela plataforma. |
| Segurança | Estado de MFA, passkeys, falhas agregadas, bloqueios e eventos de login | Sem tokens, segredos ou dados de sessão expostos. |
| Auditoria | Eventos administrativos, alterações de clientes e fatos de segurança disponíveis | Filtros e contexto mínimo necessário. |
| Saúde da plataforma | Health check, telemetria de rotas, erros de interface e monitor interno | Métricas agregadas; sem detalhes de infraestrutura que aumentem risco. |
| Configurações | Informações administrativas permitidas, sem alterar credenciais de integrações pelo frontend | Ações críticas exigirão confirmação explícita e auditoria. |

## Recursos que permanecem fora do primeiro escopo

Planos comerciais, assinaturas, cobranças, MRR, ARR, cupons, estornos, licenças, feature flags, suporte por tickets, backup/restauração e impersonação não serão criados como telas fictícias. Eles dependem de fonte de dados e regras de negócio que ainda não existem no W9.

Quando houver integração de cobrança aprovada, o módulo financeiro SaaS deverá usar o provedor como fonte de verdade. Caso seja necessário adicionar planos e limites antes disso, será criado um modelo de entitlements com histórico, validade, auditoria e validação no backend — nunca somente no frontend.

## Segurança e permissões

O atual proprietário exclusivo continuará sendo a única identidade autorizada a acessar a Central de Comando. A regra será mantida no backend, não apenas escondida na interface. O modelo genérico de múltiplos Global Super Admins do documento de referência não será ativado agora, pois conflita com o requisito atual de administrador único.

O primeiro acesso de novos usuários master continuará exigindo troca de senha. Eles serão vinculados exclusivamente à própria organização, e tentativas de abrir `/paineladmin` permanecerão bloqueadas pelo servidor. Operações sensíveis, como suspensão de clientes e recuperação de acesso, deverão registrar quem executou, quando e qual entidade foi afetada.

## Riscos e controles

| Risco | Controle concreto | Critério de aceite |
|---|---|---|
| Escalada de privilégio por URL ou chamada tRPC | Procedimentos exclusivos do proprietário e testes de acesso negado | Usuários normais e masters recebem `FORBIDDEN` mesmo manipulando a rota. |
| Exposição de segredos ou senhas | Hashes apenas no banco; respostas e interfaces sem senha, token ou chave | Nenhuma consulta administrativa retorna credenciais. |
| Métricas fictícias | Cartões usam apenas consultas existentes e apresentam estado indisponível quando não há base real | Nenhum MRR, plano ou ticket é exibido sem dados de origem. |
| Regressão no painel de campanha | Central independente e sem reutilizar `DashboardLayout` operacional | `/paineladmin` não mostra menu ou módulos de campanha. |
| Mistura entre organizações | Consultas operacionais preservam `organizationId` e o painel global limita-se a agregados e ações autorizadas | Testes multi-tenant permanecem aprovados. |

## Sequência de implementação

1. Reorganizar a página independente como Central de Comando, com navegação própria e visão geral alimentada por dados reais.
2. Reaproveitar a carteira, usuários master, leads e histórico comercial em módulos distintos e coerentes.
3. Adicionar agregações globais de segurança, auditoria e saúde somente onde já houver fontes confiáveis.
4. Cobrir autorização, acesso negado, isolamento, primeiro acesso e ações administrativas com testes automatizados.
5. Validar a interface publicada com o proprietário e registrar o que ficou propositalmente pendente de integração futura.

> A Central de Comando será adaptada ao W9 Campanhas Eleitorais. Ela não exibirá módulos artificiais nem substituirá a operação de campanha dos clientes.

## Implementação concluída em 26 de agosto de 2026

O `/paineladmin` foi reorganizado como **Central de Comando W9**, mantendo a página independente do sistema operacional e a autorização exclusiva no backend. A navegação publicada agora contém Visão geral, Clientes e usuários, Segurança, Saúde da plataforma e Capacidades futuras.

| Entrega | Estado confirmado |
| --- | --- |
| Visão geral | Agrega organizações, clientes, usuários, solicitações de demonstração, mensagens de contato e primeiro acesso pendente a partir das tabelas reais. |
| Clientes e usuários | Mantém a carteira comercial e o cadastro de usuário master com CPF/CNPJ, senha provisória e troca obrigatória no primeiro acesso. |
| Segurança | Agrega MFA, passkeys e eventos de autenticação sem retornar hashes, senhas, sessões ou segredos. |
| Saúde | Agrega telemetria de rotas, latência, erros 5xx, erros de interface e eventos organizacionais em janelas de tempo explícitas. |
| Capacidades futuras | Declara planos/licenças, cobrança, tickets e feature flags como não integrados, sem números ou registros simulados. |
| Validação | TypeScript e 191 testes aprovados; validação visual publicada documentada em `VALIDACAO_CENTRAL_COMANDO_2026-08-26.md`. |

O redirecionamento canônico do domínio raiz para `www` não faz parte da Central de Comando e permanece dependente de ajuste externo pela plataforma, para evitar a reintrodução de um ciclo de redirecionamento.
