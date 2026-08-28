import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./CampaignApplication.tsx", import.meta.url),
  "utf8",
);

describe("registro de rotas operacionais", () => {
  it("mantém Indicadores de eventos associado ao componente correspondente", () => {
    expect(source).toContain('const EventIndicators = lazy(() => import("../pages/EventIndicators"));');
    expect(source).toContain('<Route path="/eventos/indicadores" component={EventIndicators} />');
  });

  it("mantém Prestação de contas associada ao componente financeiro-jurídico", () => {
    expect(source).toContain('const FinanceLegal = lazy(() => import("../pages/FinanceLegal"));');
    expect(source).toContain('<Route path="/prestacao-contas" component={FinanceLegal} />');
  });
});
