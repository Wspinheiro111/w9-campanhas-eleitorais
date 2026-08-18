import { describe, expect, it } from "vitest";
import { canAccessOwnedRecord, canManageCampaign, canManageTeam } from "./campaignPolicy";

describe("políticas de acesso da campanha", () => {
  it("permite gestão tática apenas para administrador e coordenador", () => {
    expect(canManageCampaign("admin")).toBe(true);
    expect(canManageCampaign("coordinator")).toBe(true);
    expect(canManageCampaign("partner")).toBe(false);
  });

  it("reserva a gestão da equipe ao administrador", () => {
    expect(canManageTeam("admin")).toBe(true);
    expect(canManageTeam("coordinator")).toBe(false);
    expect(canManageTeam("partner")).toBe(false);
  });

  it("restringe parceiros aos registros de sua própria responsabilidade", () => {
    expect(canAccessOwnedRecord("partner", 12, 12)).toBe(true);
    expect(canAccessOwnedRecord("partner", 15, 12)).toBe(false);
    expect(canAccessOwnedRecord("partner", null, 12)).toBe(false);
    expect(canAccessOwnedRecord("coordinator", 15, 12)).toBe(true);
    expect(canAccessOwnedRecord("admin", null, 12)).toBe(true);
  });
});
