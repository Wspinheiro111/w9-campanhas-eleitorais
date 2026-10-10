# Autorização por capabilities

## Princípio

O W9 mantém dois níveis de autorização independentes:

- **Organização:** `admin`, `manager`, `operator`, `viewer`.
- **Campanha:** `admin`, `coordinator`, `partner`.

Um papel de organização **não eleva** automaticamente o papel de campanha. Exemplo: um usuário `admin` da organização que seja `partner` na campanha continua com as restrições de `partner` dentro daquela campanha.

Toda decisão server-side deve partir de `getOrganizationMembership(...)` ou `getCampaignAccess(...)`. IDs, papéis e ownership enviados pelo frontend não são fonte de autorização.

## Capabilities de organização

| Papel | Capabilities principais |
|---|---|
| `admin` | leitura, gestão, alteração de papéis, convites, auditoria, desempenho |
| `manager` | leitura, gestão, convites, auditoria, desempenho |
| `operator` | leitura |
| `viewer` | leitura |

A alteração de papéis permanece exclusiva de `admin`.

## Capabilities de campanha

| Papel | Capabilities principais |
|---|---|
| `admin` | leitura, gestão, equipe, todos os registros, finanças, compliance, storage, conteúdo, consentimento, campo, voluntários |
| `coordinator` | leitura, gestão operacional, todos os registros, finanças, compliance, storage, conteúdo, consentimento, campo, voluntários; **sem `team.manage`** |
| `partner` | leitura da campanha, próprios registros, importação operacional, leitura de storage, consentimento dos próprios registros e campo |

`partner` não recebe `campaign.manage`, `team.manage`, `records.read_all`, `finance.manage`, `compliance.review`, `storage.write`, `content.manage` nem `consent.manage`.

## Ownership

Rotas que operam sobre entidade pertencente a um integrante devem carregar a entidade no servidor e chamar `assertOwnedCampaignRecord(...)`. Para `partner`, o `recordOwnerMemberId` deve coincidir com o `currentMemberId` resolvido pelo servidor. `admin` e `coordinator` não sofrem essa restrição quando a regra anterior já permitia acesso global.

## Procedure builders

- `campaignCapabilityProcedure(capability)` é usado quando o input contém `campaignId`.
- `organizationCapabilityProcedure(capability)` é usado quando o input contém `organizationId`.

Os builders resolvem o vínculo no servidor antes de executar a lógica de domínio e adicionam `campaignAuthorization` ou `organizationAuthorization` ao contexto tRPC.

Rotas cujo escopo é descoberto a partir de outra entidade (por exemplo `voterId`, `consentId` ou `contentId`) devem carregar a entidade, obter o `campaignId` real no servidor e então usar `requireCampaignAuthorization(...)` + `requireCampaignCapability(...)`/`assertOwnedCampaignRecord(...)`.

## Migração progressiva

A issue #11 é intencionalmente incremental. A primeira etapa cria o kernel e migra módulos já separados do monólito. `server/routers/campaign.ts` e `server/campaignDb.ts` devem ser divididos por domínio em PRs pequenos, mantendo os namespaces tRPC existentes e os testes negativos de isolamento.
