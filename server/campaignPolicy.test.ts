import { describe, expect, it } from "vitest";
import { canAccessOwnedRecord, canManageCampaign, canManageTeam, resolveCampaignRole } from "./campaignPolicy";

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

describe("resolveCampaignRole", () => {
  it("não promove membro da organização sem vínculo da campanha para admin", () => {
    expect(resolveCampaignRole({ memberRole: null, campaignOwnerId: 10, userId: 20 })).toBeNull();
  });

  it("mantém admin para o verdadeiro owner quando não há campaignMember", () => {
    expect(resolveCampaignRole({ memberRole: null, campaignOwnerId: 10, userId: 10 })).toBe("admin");
  });

  it("preserva o papel explícito do campaignMember", () => {
    expect(resolveCampaignRole({ memberRole: "partner", campaignOwnerId: 10, userId: 20 })).toBe("partner");
  });
});
