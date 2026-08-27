import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { callDataApi } from "../server/_core/dataApi.ts";

const currentDir = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(currentDir, "../docs/similarweb_audit_2026-08-27.json");
const domain = "w9campanhaseleitorais.com.br";

const calls = {
  visits_global_six_months: ["Similarweb/get_visits_total", {
    pathParams: { domain },
    query: { country: "world", granularity: "monthly", main_domain_only: "true", start_date: "2026-02", end_date: "2026-07" },
  }],
  bounce_global_six_months: ["Similarweb/get_bounce_rate", {
    pathParams: { domain },
    query: { country: "world", granularity: "monthly", main_domain_only: "true", start_date: "2026-02", end_date: "2026-07" },
  }],
  unique_visitors_six_months: ["Similarweb/get_unique_visit", {
    pathParams: { domain },
    query: { main_domain_only: "true", start_date: "2026-02", end_date: "2026-07" },
  }],
  global_rank_six_months: ["Similarweb/get_global_rank", {
    pathParams: { domain },
    query: { main_domain_only: "true", start_date: "2026-02", end_date: "2026-07" },
  }],
  countries_recent: ["Similarweb/get_total_traffic_by_country", {
    pathParams: { domain },
    query: { main_domain_only: "true", limit: "10", start_date: "2026-05", end_date: "2026-07" },
  }],
  desktop_channels_recent: ["Similarweb/get_traffic_sources_desktop", {
    pathParams: { domain },
    query: { country: "world", granularity: "monthly", main_domain_only: "true", start_date: "2026-05", end_date: "2026-07" },
  }],
  mobile_channels_recent: ["Similarweb/get_traffic_sources_mobile", {
    pathParams: { domain },
    query: { country: "world", granularity: "monthly", main_domain_only: "true", start_date: "2026-05", end_date: "2026-07" },
  }],
};

const entries = await Promise.all(Object.entries(calls).map(async ([name, [apiId, options]]) => {
  try {
    const value = await callDataApi(apiId, options);
    return [name, { status: "ok", value }];
  } catch (error) {
    return [name, { status: "unavailable", error: error instanceof Error ? error.message : String(error) }];
  }
}));

await writeFile(outputPath, JSON.stringify({
  source: "Similarweb via Manus Data API",
  domain,
  retrieved_at_utc: new Date().toISOString(),
  metric_periods: { six_months: "2026-02 to 2026-07", recent_three_months: "2026-05 to 2026-07" },
  results: Object.fromEntries(entries),
}, null, 2));
