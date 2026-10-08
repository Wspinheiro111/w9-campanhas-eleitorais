import { describe, expect, it } from "vitest";
import { calculateSyntheticElectionWindow } from "./syntheticContentPolicy";

const electionEndsAt = new Date("2026-10-04T20:00:00.000Z");
const base = {
  isSynthetic: true,
  usesCandidateOrPublicPerson: true,
  electionEndsAt,
  electionTimeZone: "America/Sao_Paulo",
};

describe("calculateSyntheticElectionWindow", () => {
  it("não aplica a janela a conteúdo não sintético", () => {
    expect(calculateSyntheticElectionWindow({ ...base, isSynthetic: false, now: electionEndsAt })).toMatchObject({ applies: false, configured: true, withinRestrictedWindow: false });
  });

  it("não aplica a janela quando a peça sintética não usa candidata(o) ou pessoa pública", () => {
    expect(calculateSyntheticElectionWindow({ ...base, usesCandidateOrPublicPerson: false, now: electionEndsAt })).toMatchObject({ applies: false, configured: true, withinRestrictedWindow: false });
  });

  it("fica fail-closed quando término do pleito não está configurado", () => {
    expect(calculateSyntheticElectionWindow({ ...base, electionEndsAt: null, now: electionEndsAt })).toMatchObject({ applies: true, configured: false, withinRestrictedWindow: false });
  });

  it("fica fail-closed quando timezone não está configurado ou é inválido", () => {
    expect(calculateSyntheticElectionWindow({ ...base, electionTimeZone: null, now: electionEndsAt }).configured).toBe(false);
    expect(calculateSyntheticElectionWindow({ ...base, electionTimeZone: "Mars/Olympus", now: electionEndsAt }).configured).toBe(false);
  });

  it("inclui exatamente 72 horas antes do término do pleito", () => {
    const now = new Date(electionEndsAt.getTime() - 72 * 60 * 60 * 1000);
    expect(calculateSyntheticElectionWindow({ ...base, now }).withinRestrictedWindow).toBe(true);
  });

  it("não inclui instante anterior às 72 horas", () => {
    const now = new Date(electionEndsAt.getTime() - 72 * 60 * 60 * 1000 - 1);
    expect(calculateSyntheticElectionWindow({ ...base, now }).withinRestrictedWindow).toBe(false);
  });

  it("inclui instante dentro das 72 horas anteriores", () => {
    const now = new Date(electionEndsAt.getTime() - 12 * 60 * 60 * 1000);
    expect(calculateSyntheticElectionWindow({ ...base, now }).withinRestrictedWindow).toBe(true);
  });

  it("inclui exatamente o término do pleito", () => {
    expect(calculateSyntheticElectionWindow({ ...base, now: electionEndsAt }).withinRestrictedWindow).toBe(true);
  });

  it("inclui instante dentro das 24 horas posteriores", () => {
    const now = new Date(electionEndsAt.getTime() + 23 * 60 * 60 * 1000);
    expect(calculateSyntheticElectionWindow({ ...base, now }).withinRestrictedWindow).toBe(true);
  });

  it("inclui exatamente 24 horas depois e libera após esse limite", () => {
    const exactly24h = new Date(electionEndsAt.getTime() + 24 * 60 * 60 * 1000);
    const after24h = new Date(exactly24h.getTime() + 1);
    expect(calculateSyntheticElectionWindow({ ...base, now: exactly24h }).withinRestrictedWindow).toBe(true);
    expect(calculateSyntheticElectionWindow({ ...base, now: after24h }).withinRestrictedWindow).toBe(false);
  });
});
