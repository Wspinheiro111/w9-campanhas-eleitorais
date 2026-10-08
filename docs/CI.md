# CI do W9 Campanhas Eleitorais

O workflow permanente fica em `.github/workflows/ci.yml` e roda em pull requests e pushes para `main`. A branch `ci/**` também é executada para permitir validar alterações do próprio pipeline antes de integrar.

## Checks obrigatórios

A ruleset/proteção da `main` deve exigir exatamente estes checks antes de merge:

- `typecheck`
- `tests`
- `build`
- `dependencies`
- `migrations`
- `secrets`
- `codeql`

Também deve bloquear force-push e exigir que a branch esteja atualizada com a base antes do merge, conforme a política operacional do repositório.

## O que cada check faz

- `typecheck`: `pnpm check` com TypeScript sem emissão.
- `tests`: `pnpm test:ci`, que executa a suíte determinística. Health checks que exigem credenciais/serviços externos (`googleCredentials`, `openrouter.health`, `geminiApi`, `analytics.ga`) ficam fora deste gate; Flask é instalado no runner porque testes locais de deduplicação dependem dele.
- `build`: `pnpm build`.
- `dependencies`: `pnpm audit --audit-level high`; vulnerabilidade `high` ou `critical` torna o check vermelho.
- `migrations`: sobe MySQL 8.4 descartável, aplica todas as migrations versionadas e roda o migrator novamente para garantir que o histórico aplicado não seja reaplicado. Nunca usa banco de produção.
- `secrets`: recusa arquivos `.env*` de runtime rastreados e usa TruffleHog 3.99.0 para segredos verificados no intervalo de commits do push/PR.
- `codeql`: executa CodeQL para JavaScript/TypeScript. Somente este job recebe `security-events: write`.

## Segredos e dados de teste

O CI não deve receber `DATABASE_URL`, tokens de IA, credenciais OAuth, chaves de storage nem outras credenciais de produção. Valores usados no MySQL e em fixtures são exclusivos do runner efêmero e não concedem acesso externo.

## Health checks externos

Os quatro testes excluídos de `test:ci` são health checks de integrações reais e não são testes funcionais determinísticos. Eles devem ser executados separadamente em ambiente autorizado quando houver credenciais de teste próprias; sua ausência não pode tornar o CI principal instável.

## Alterações do próprio pipeline

Mudanças em `.github/workflows/ci.yml` devem ser feitas em branch `ci/**`, observar todos os checks e remover qualquer probe/falha controlada antes do PR final. Nenhum probe temporário deve entrar em `main`.
