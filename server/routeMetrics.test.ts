import { describe, expect, it } from "vitest";
import { normalizeTelemetryRoute, summarizePerformanceEvents } from "./routeMetrics";

describe("métricas de rota", () => {
  it("normaliza caminhos HTTP dinâmicos sem registrar chaves ou identificadores", () => {
    expect(normalizeTelemetryRoute("/api/storage/documento-secreto.pdf", false)).toBe("/api/storage/:key");
    expect(normalizeTelemetryRoute("/api/auth/google/callback/42", false)).toBe("/api/auth/google/callback/:id");
    expect(normalizeTelemetryRoute("/api/trpc/campaign.list", true)).toBe("trpc.campaign.list");
  });

  it("agrega volume, média, pico e taxa de erro somente da organização selecionada", () => {
    const metrics = summarizePerformanceEvents([
      { organizationId: 1, route: "campaign.list", method: "GET", statusCode: 200, durationMs: 100 },
      { organizationId: 1, route: "campaign.list", method: "GET", statusCode: 500, durationMs: 300 },
      { organizationId: 1, route: "tasks.create", method: "POST", statusCode: 201, durationMs: 200 },
      { organizationId: 2, route: "campaign.list", method: "GET", statusCode: 200, durationMs: 900 },
    ], 1);
    expect(metrics.summary).toEqual({ requests: 3, averageDurationMs: 200, maxDurationMs: 300, errorCount: 1, errorRate: 33.3 });
    expect(metrics.routes[0]).toMatchObject({ route: "campaign.list", method: "GET", requests: 2, averageDurationMs: 200, maxDurationMs: 300, errorCount: 1, errorRate: 50 });
  });
});
