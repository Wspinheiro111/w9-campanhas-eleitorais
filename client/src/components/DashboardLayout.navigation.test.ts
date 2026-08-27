import { describe, expect, it } from "vitest";
import { menuItems } from "./DashboardLayout";

describe("ordem da navegação lateral", () => {
  it("mantém Segurança e Auditoria nos dois últimos itens", () => {
    expect(menuItems.slice(-2).map(item => item.label)).toEqual(["Segurança", "Auditoria"]);
  });
});
