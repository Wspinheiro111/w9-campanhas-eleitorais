# Testes de Carga Operacionais

O executor `scripts/load-test.mjs` mede disponibilidade e rotas de CRM, relatórios e sincronização offline sem criar, editar ou excluir dados. Por segurança, os cenários protegidos só são executados quando o operador fornece uma sessão autorizada de um ambiente de homologação.

| Cenário | Rota configurável | Pré-condição | Métricas |
|---|---|---|---|
| Disponibilidade | `/api/health` | Nenhuma | Taxa de sucesso, throughput, p50, p95 e máximo |
| CRM | `W9_LOAD_TEST_CRM_PATH` | Cookie de sessão de homologação | Taxa de sucesso, throughput, p50, p95 e máximo |
| Relatórios | `W9_LOAD_TEST_REPORTS_PATH` | Cookie de sessão de homologação | Taxa de sucesso, throughput, p50, p95 e máximo |
| Sincronização offline | `W9_LOAD_TEST_OFFLINE_PATH` | Cookie de sessão de homologação | Taxa de sucesso, throughput, p50, p95 e máximo |

Para uma verificação local e não destrutiva da disponibilidade, execute:

```bash
W9_LOAD_TEST_BASE_URL=http://127.0.0.1:3000 \
W9_LOAD_TEST_CONCURRENCY=10 \
W9_LOAD_TEST_REQUESTS=30 \
node scripts/load-test.mjs
```

Os cenários protegidos devem ser executados somente em homologação, com rotas de leitura ou uma sessão de teste dedicada. Não utilize cookies de produção em ferramentas locais nem eleve a concorrência sem janela operacional aprovada.
