# Painel Técnico de Desempenho por Rota

## Escopo de telemetria

O painel mede **volume de requisições**, **latência média**, **pico de latência**, **contagem de erros** e **taxa de erro** por rota da API. A telemetria cobre chamadas tRPC e rotas HTTP de API, como autenticação e armazenamento. Os registros são separados por organização quando o cliente envia a organização ativa no cabeçalho de telemetria.

> A telemetria não registra corpo de requisições, parâmetros, cookies, tokens, e-mails ou outros dados pessoais. Cada evento armazena somente rota, método, status, duração, presença de erro, organização opcional e data.

| Controle | Implementação |
| --- | --- |
| Isolamento | Métricas filtradas por organização ativa e liberadas apenas para administradores e gestores. |
| Privacidade | Sem payloads, cabeçalhos de autenticação ou identificadores pessoais nos eventos. |
| Período | Filtros de 24 horas, 7 dias e 30 dias. |
| Ranking | Até 100 rotas ordenadas por volume, com volume, média, pico e percentual de erro. |
| Normalização | Chaves de armazenamento e segmentos numéricos são substituídos por parâmetros genéricos antes do registro. |
| Cálculo | O fluxo de produção reutiliza a mesma agregação testada para volume, média, pico e taxa de erro, sempre filtrada pela organização ativa. |

## Validação visual

O painel foi revisado em **desktop (1280 px)** e **celular (390 px)**. Os cards, filtros temporais e estado vazio mantiveram legibilidade e hierarquia. Como a coleta começa com esta versão, o estado inicial corretamente informa a ausência de telemetria até que a equipe utilize as rotas da organização.

## Verificação técnica

Os comandos `pnpm check`, `pnpm test` e `pnpm build` foram aprovados. A suíte final contém **63 testes aprovados**, incluindo os cenários de acesso de gestor e bloqueio de operador para métricas técnicas, a renderização dos indicadores, o ranking por rota e a agregação de volume, média, pico e taxa de erro entre organizações.
