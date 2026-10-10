# Issue 11 Capability Authorization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans and TDD task-by-task.

**Goal:** Centralizar autorização server-side por capabilities, preservar permissões atuais e modularizar os routers progressivamente sem alterar os namespaces públicos.

**Architecture:** Criar um kernel puro de capabilities que mantém papéis de organização e campanha independentes. Sobre ele, criar contexto de autorização carregado do banco e um procedure builder tRPC para rotas com `campaignId`. Migrar os domínios já extraídos primeiro; `campaign.ts` e `campaignDb.ts` serão reduzidos em etapas posteriores, nunca por reescrita total.

**Tech Stack:** TypeScript, tRPC 11, Zod, Vitest, Drizzle/MySQL.

**Spec:** GitHub issue #11.

## Global Constraints

- Nenhuma permissão atual pode ser ampliada.
- Papéis de organização (`admin`, `manager`, `operator`, `viewer`) e campanha (`admin`, `coordinator`, `partner`) não são equivalentes.
- `partner` continua restrito aos próprios registros onde ownership se aplica.
- IDs, papéis e ownership vindos do frontend nunca são fonte de autorização.
- Namespaces públicos tRPC permanecem estáveis.
- Migração por domínio com regressão negativa antes de remover helpers legados.

## Review Focus

- Usuário sem vínculo deve receber `FORBIDDEN`.
- Organização `admin` não pode elevar um `partner` a gestor da campanha.
- `partner` só acessa registro próprio quando a rota usa ownership.
- Entidade de outra campanha nunca pode ser autorizada pelo ID recebido.
- `coordinator` mantém gestão operacional sem herdar `team.manage`.

---

### Task 1: Kernel de capabilities e contexto server-side

**Files:**
- Create: `server/campaignAuthorization.ts`
- Test: `server/campaignAuthorization.test.ts`

**Produces:** `CampaignCapability`, `OrganizationCapability`, `buildCampaignAuthorization`, `requireCampaignAuthorization`, `requireCampaignCapability`, `requireOrganizationCapability`, `assertOwnedCampaignRecord`, `campaignCapabilityProcedure`.

- [ ] Escrever testes RED para papéis de organização/campanha, sem vínculo, ownership e procedure builder.
- [ ] Implementar a matriz mínima que preserve as regras existentes.
- [ ] Rodar testes focados e typecheck.

### Task 2: Migrar módulos já extraídos

**Files:**
- Modify: `server/routers/criticalWrites.ts`
- Modify: `server/routers/publicProtection.ts`
- Modify: `server/routers/ai.ts`
- Test: regressões existentes + novos casos negativos quando necessário.

- [ ] Substituir `requireAccess`/`requireCapability` locais pelo kernel central.
- [ ] Preservar ownership de `partner` e contratos públicos.
- [ ] Rodar testes focados e suíte completa.

### Task 3: Organização e documentação de papéis

**Files:**
- Modify: `server/routers/organization.ts`
- Create: `docs/AUTORIZACAO_CAPABILITIES.md`
- Test: `server/organizationAuthorization.test.ts` ou regressão equivalente.

- [ ] Migrar administração de organização para capabilities próprias.
- [ ] Documentar que papel de organização não eleva papel de campanha.
- [ ] Rodar testes negativos e typecheck.

### Task 4: Migração progressiva do monólito

**Files:**
- Progressively modify/split: `server/routers/campaign.ts`, `server/campaignDb.ts`, `server/routers/index.ts`.

- [ ] Extrair um domínio por PR, preservando nomes tRPC.
- [ ] Antes de cada extração, escrever regressão negativa para permissões/tenant.
- [ ] Remover helpers locais apenas quando não houver callers naquele domínio.
- [ ] Fechar #11 somente quando todas as rotas protegidas usarem capability central ou exceção explicitamente documentada.
