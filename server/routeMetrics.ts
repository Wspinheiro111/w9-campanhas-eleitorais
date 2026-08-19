export type PerformanceEvent = {
  organizationId: number | null;
  route: string;
  method: string;
  statusCode: number;
  durationMs: number;
};

export function normalizeTelemetryRoute(path: string, isTrpc: boolean) {
  const rawRoute = isTrpc ? path.replace(/^\/api\/trpc\/?/, "trpc.") || "trpc.batch" : path;
  return rawRoute
    .replace(/\/api\/storage\/[^/]+/g, "/api/storage/:key")
    .replace(/\/[0-9]+(?=\/|$)/g, "/:id");
}

export function summarizePerformanceEvents(events: PerformanceEvent[], organizationId: number) {
  const scoped = events.filter(event => event.organizationId === organizationId);
  const summarize = (items: PerformanceEvent[]) => {
    const requests = items.length;
    const errorCount = items.filter(item => item.statusCode >= 400).length;
    const durations = items.map(item => item.durationMs);
    return {
      requests,
      averageDurationMs: requests ? Math.round(durations.reduce((sum, value) => sum + value, 0) / requests) : 0,
      maxDurationMs: requests ? Math.max(...durations) : 0,
      errorCount,
      errorRate: requests ? Number(((errorCount / requests) * 100).toFixed(1)) : 0,
    };
  };
  const grouped = new Map<string, PerformanceEvent[]>();
  scoped.forEach(event => { const key = `${event.method} ${event.route}`; grouped.set(key, [...(grouped.get(key) ?? []), event]); });
  return { summary: summarize(scoped), routes: Array.from(grouped.values()).map(items => ({ route: items[0].route, method: items[0].method, ...summarize(items) })).sort((a, b) => b.requests - a.requests) };
}
