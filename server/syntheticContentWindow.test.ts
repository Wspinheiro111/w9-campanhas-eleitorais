import { describe, expect, it } from "vitest";
import { assessSyntheticContentWindow } from "./syntheticContentWindow";

const electionEndsAt = new Date("2026-10-04T17:00:00.000Z");

describe("janela temporal de conteúdo sintético", () => {
  it("não se aplica quando o conteúdo não usa imagem, voz ou manifestação da candidatura/pessoa pública", () => {
    expect(assessSyntheticContentWindow({
      usesCandidateOrPublicPerson: false,
      electionEndsAt: null,
      now: new Date("2026-10-04T16:00:00.000Z"),
    })).toEqual({ status: "not_applicable" });
  });

  it("mantém registro legado sem classificação em estado desconhecido", () => {
    expect(assessSyntheticContentWindow({
      usesCandidateOrPublicPerson: null,
      electionEndsAt,
      now: new Date("2026-10-04T16:00:00.000Z"),
    })).toEqual({ status: "unknown", reason: "applicability_missing" });
  });

  it("não inventa janela quando a data de término do pleito não está configurada", () => {
    expect(assessSyntheticContentWindow({
      usesCandidateOrPublicPerson: true,
      electionEndsAt: null,
      now: new Date("2026-10-04T16:00:00.000Z"),
    })).toEqual({ status: "unknown", reason: "election_end_missing" });
  });

  it("considera restrito exatamente 72 horas antes do término do pleito", () => {
    const result = assessSyntheticContentWindow({
      usesCandidateOrPublicPerson: true,
      electionEndsAt,
      now: new Date("2026-10-01T17:00:00.000Z"),
    });
    expect(result.status).toBe("restricted");
  });

  it("considera restrito durante as 72 horas anteriores", () => {
    const result = assessSyntheticContentWindow({
      usesCandidateOrPublicPerson: true,
      electionEndsAt,
      now: new Date("2026-10-03T12:00:00.000Z"),
    });
    expect(result.status).toBe("restricted");
  });

  it("considera restrito no instante do término do pleito", () => {
    const result = assessSyntheticContentWindow({
      usesCandidateOrPublicPerson: true,
      electionEndsAt,
      now: electionEndsAt,
    });
    expect(result.status).toBe("restricted");
  });

  it("considera restrito exatamente 24 horas depois do término do pleito", () => {
    const result = assessSyntheticContentWindow({
      usesCandidateOrPublicPerson: true,
      electionEndsAt,
      now: new Date("2026-10-05T17:00:00.000Z"),
    });
    expect(result.status).toBe("restricted");
  });

  it("fica fora da janela logo após as 24 horas posteriores", () => {
    const result = assessSyntheticContentWindow({
      usesCandidateOrPublicPerson: true,
      electionEndsAt,
      now: new Date("2026-10-05T17:00:00.001Z"),
    });
    expect(result.status).toBe("outside");
  });

  it("fica fora da janela antes das 72 horas anteriores", () => {
    const result = assessSyntheticContentWindow({
      usesCandidateOrPublicPerson: true,
      electionEndsAt,
      now: new Date("2026-10-01T16:59:59.999Z"),
    });
    expect(result.status).toBe("outside");
  });
});
