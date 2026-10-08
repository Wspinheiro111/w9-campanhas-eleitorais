# Mandatory CI Quality Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Criar CI reprodutível e obrigatório para TypeScript, testes determinísticos, build, dependências, migrations, segredos e SAST sem usar recursos de produção.

**Architecture:** Um único workflow `ci.yml` expõe checks independentes e paralelos. Testes usam apenas fixtures locais; migrations rodam contra MySQL efêmero; TruffleHog examina o intervalo de commits; CodeQL analisa JavaScript/TypeScript com permissões restritas ao job.

**Tech Stack:** GitHub Actions, pnpm 10.4.1, Node 22, Vitest, TypeScript, Vite/esbuild, Drizzle Kit, MySQL 8.4, TruffleHog 3.99.0, CodeQL Action v4.

**Spec:** GitHub issue #5.

## Global Constraints

- Não fazer deploy nem auto-merge.
- Não usar `DATABASE_URL` de produção.
- Não imprimir segredos ou dados pessoais.
- `permissions:` explícitas e mínimas por job.
- Timeout em todos os jobs e `cancel-in-progress` por PR/branch.
- Health checks que exigem credenciais externas não pertencem ao gate determinístico.

## Review Focus

- Pull request sem segredos deve ser escaneado apenas no intervalo base→head, evitando falso positivo de histórico antigo.
- Migration deve começar em banco vazio e aplicar todas as migrations versionadas.
- Testes determinísticos devem manter os health checks externos fora do gate sem esconder testes funcionais.
- Audit de dependências deve ter severidade explícita e falhar no threshold configurado.
- CodeQL deve ter `security-events: write` somente no próprio job.

---

### Task 1: Script de testes determinísticos

**Files:**
- Modify: `package.json`

**Produces:** `pnpm test:ci` executa Vitest excluindo apenas health checks dependentes de credenciais externas.

- [ ] Adicionar `test:ci` com as exclusões conhecidas de Google OAuth, OpenRouter, Gemini e GA remoto.
- [ ] Executar o comando em runner limpo com Flask instalado e fixture sintática de GA.

### Task 2: Workflow de CI permanente

**Files:**
- Create: `.github/workflows/ci.yml`

**Produces:** checks independentes `typecheck`, `tests`, `build`, `dependencies`, `migrations`, `secrets`, `codeql`.

- [ ] Configurar `pull_request` e `push` para `main`/branch de implantação do CI, concurrency e permissões mínimas.
- [ ] Criar jobs Node 22/pnpm com `--frozen-lockfile`.
- [ ] Rodar TypeScript, testes determinísticos e build em checks separados.
- [ ] Rodar `pnpm audit --prod --audit-level high` em job próprio.
- [ ] Aplicar migrations completas em MySQL 8.4 efêmero e executar `drizzle-kit migrate` duas vezes para detectar problemas de reaplicação.
- [ ] Escanear commits do PR/push com TruffleHog 3.99.0 em modo verified.
- [ ] Rodar CodeQL JavaScript/TypeScript com action v4 e permissão `security-events: write` somente nesse job.

### Task 3: Provar os gates e documentar proteção

**Files:**
- Create: `docs/CI.md`

- [ ] Observar uma execução real do workflow na branch e corrigir somente causas reproduzíveis.
- [ ] Criar uma falha controlada temporária em branch/commit para demonstrar que os checks bloqueiam e removê-la antes do PR final.
- [ ] Registrar em `docs/CI.md` os nomes exatos dos checks que a ruleset da `main` deve exigir.
- [ ] Confirmar que o diff final não contém probes temporários, credenciais ou workflows de teste descartáveis.
