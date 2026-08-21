# Auditoria de Isolamento Multi-Organização

**Data da verificação:** 21 de agosto de 2026  
**Escopo:** Esquema MySQL/TiDB, consistência de dados, camada de acesso e testes de isolamento.

## Resultado

> **Conclusão:** o isolamento operacional por organização está implementado nas tabelas e rotas analisadas. Não foram encontrados registros cuja campanha pertença a uma organização diferente daquela gravada no registro operacional.

| Verificação | Resultado | Evidência |
|---|---:|---|
| Tabelas operacionais com `organizationId` | 45 de 45 | Inventário de `information_schema.columns` |
| Tabelas globais/internas sem escopo organizacional | 3 | `users`, `organizations` e `__drizzle_migrations` |
| Divergências entre `campaignId` e `organizationId` | 0 | Auditoria dinâmica de todas as tabelas com ambos os campos |
| Testes de isolamento e política de campanha | 15 aprovados | `tenantIsolation.test.ts` e `campaignPolicy.test.ts` |

## Cadeia de isolamento

Cada tabela operacional armazena `organizationId` diretamente. As entidades vinculadas à campanha também carregam `campaignId`, e a campanha é vinculada a uma organização. As rotas validam o acesso através de uma associação ativa em `organization_members` antes de consultar ou alterar dados da campanha.

## Exceções justificadas

As tabelas `users` e `organizations` são entidades globais de identidade e cadastro, portanto não devem conter `organizationId`. A tabela `__drizzle_migrations` é infraestrutura de migração. A telemetria `route_performance_events` pode registrar eventos técnicos sem organização em rotas públicas; as consultas do painel técnico filtram explicitamente o `organizationId`, de modo que esses eventos sem escopo não são exibidos a uma organização.

## Observações de desempenho

As tabelas `campaign_surveys` e `survey_responses` possuem `organizationId` obrigatório, ainda que seus índices de consulta principais sejam compostos por `campaignId`. Isso não altera o isolamento, pois a campanha é validada pela organização na camada de acesso; índices adicionais por organização podem ser incluídos futuramente caso a volumetria de pesquisas cresça.
