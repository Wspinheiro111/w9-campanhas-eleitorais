/**
 * Cenários de carga seguros para execução em ambiente controlado.
 * Não cria nem altera dados. Cenários protegidos exigem um cookie de sessão
 * explicitamente fornecido pelo operador, nunca uma credencial no código.
 */
const baseUrl = (process.env.W9_LOAD_TEST_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const concurrent = Number(process.env.W9_LOAD_TEST_CONCURRENCY ?? 10);
const requestsPerScenario = Number(process.env.W9_LOAD_TEST_REQUESTS ?? 30);
const sessionCookie = process.env.W9_LOAD_TEST_SESSION_COOKIE;

if (!Number.isInteger(concurrent) || concurrent < 1 || concurrent > 50) throw new Error("W9_LOAD_TEST_CONCURRENCY deve estar entre 1 e 50.");
if (!Number.isInteger(requestsPerScenario) || requestsPerScenario < 1 || requestsPerScenario > 300) throw new Error("W9_LOAD_TEST_REQUESTS deve estar entre 1 e 300.");

const scenarios = [
  { name: "Disponibilidade", path: "/api/health", protected: false },
  { name: "CRM", path: process.env.W9_LOAD_TEST_CRM_PATH, protected: true },
  { name: "Relatórios", path: process.env.W9_LOAD_TEST_REPORTS_PATH, protected: true },
  { name: "Sincronização offline", path: process.env.W9_LOAD_TEST_OFFLINE_PATH, protected: true },
];

async function runScenario(scenario) {
  if (!scenario.path) return { scenario: scenario.name, status: "não executado", reason: "rota controlada não configurada" };
  if (scenario.protected && !sessionCookie) return { scenario: scenario.name, status: "não executado", reason: "cookie de sessão controlado não configurado" };

  const startedAt = performance.now();
  const durations = [];
  let succeeded = 0;
  let failed = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < requestsPerScenario) {
      cursor += 1;
      const requestStartedAt = performance.now();
      try {
        const response = await fetch(`${baseUrl}${scenario.path}`, {
          headers: sessionCookie ? { Cookie: sessionCookie } : {},
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        succeeded += 1;
      } catch {
        failed += 1;
      } finally {
        durations.push(performance.now() - requestStartedAt);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrent, requestsPerScenario) }, worker));
  durations.sort((a, b) => a - b);
  const percentile = (ratio) => durations[Math.min(durations.length - 1, Math.floor(durations.length * ratio))] ?? 0;
  return {
    scenario: scenario.name,
    status: failed === 0 ? "aprovado" : "atenção",
    requests: requestsPerScenario,
    succeeded,
    failed,
    throughputPerSecond: Number((requestsPerScenario / ((performance.now() - startedAt) / 1000)).toFixed(2)),
    latencyMs: { p50: Number(percentile(0.5).toFixed(1)), p95: Number(percentile(0.95).toFixed(1)), max: Number((durations.at(-1) ?? 0).toFixed(1)) },
  };
}

const results = [];
for (const scenario of scenarios) results.push(await runScenario(scenario));
console.log(JSON.stringify({ baseUrl, concurrent, requestsPerScenario, results }, null, 2));
