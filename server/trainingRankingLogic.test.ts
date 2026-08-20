import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.getDb }));

import { getVolunteerTrainingTeamRanking } from "./campaignDb";

describe("getVolunteerTrainingTeamRanking", () => {
  beforeEach(() => vi.clearAllMocks());

  it("conta somente voluntários com certificado emitido no mês e deduplica versões do mesmo participante", async () => {
    const resultSets = [
      [{ id: 10, name: "Equipe Norte", workRegion: "Norte", active: true }, { id: 11, name: "Equipe Sul", workRegion: "Sul", active: true }],
      [{ id: 1, coordinatorMemberId: 10, status: "active" }, { id: 2, coordinatorMemberId: 10, status: "active" }, { id: 3, coordinatorMemberId: 11, status: "active" }],
      [{ volunteerId: 1 }, { volunteerId: 1 }, { volunteerId: 3 }],
      [{ coordinatorMemberId: 10, targetCompletions: 2 }, { coordinatorMemberId: 11, targetCompletions: 1 }],
    ];
    const db = { select: vi.fn(() => ({ from: () => ({ where: async () => resultSets.shift() ?? [] }) })) };
    mocks.getDb.mockResolvedValue(db);

    const ranking = await getVolunteerTrainingTeamRanking(1, "2026-08");

    expect(ranking).toEqual([
      expect.objectContaining({ coordinatorMemberId: 11, assignedVolunteers: 1, completedTrainingsThisMonth: 1, targetCompletions: 1, goalProgress: 100 }),
      expect.objectContaining({ coordinatorMemberId: 10, assignedVolunteers: 2, completedTrainingsThisMonth: 1, targetCompletions: 2, goalProgress: 50 }),
    ]);
    expect(db.select).toHaveBeenCalledTimes(4);
  });
});
