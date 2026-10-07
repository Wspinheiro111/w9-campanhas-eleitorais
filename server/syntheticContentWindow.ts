const PRE_ELECTION_WINDOW_MS = 72 * 60 * 60 * 1000;
const POST_ELECTION_WINDOW_MS = 24 * 60 * 60 * 1000;

export type SyntheticContentWindowAssessment =
  | { status: "not_applicable" }
  | { status: "unknown"; reason: "election_end_missing" }
  | { status: "restricted"; startsAt: Date; endsAt: Date }
  | { status: "outside"; startsAt: Date; endsAt: Date };

export function assessSyntheticContentWindow(input: {
  usesCandidateOrPublicPerson: boolean;
  electionEndsAt: Date | null;
  now?: Date;
}): SyntheticContentWindowAssessment {
  if (!input.usesCandidateOrPublicPerson) {
    return { status: "not_applicable" };
  }

  if (!input.electionEndsAt) {
    return { status: "unknown", reason: "election_end_missing" };
  }

  const now = input.now ?? new Date();
  const startsAt = new Date(input.electionEndsAt.getTime() - PRE_ELECTION_WINDOW_MS);
  const endsAt = new Date(input.electionEndsAt.getTime() + POST_ELECTION_WINDOW_MS);
  const timestamp = now.getTime();

  if (timestamp >= startsAt.getTime() && timestamp <= endsAt.getTime()) {
    return { status: "restricted", startsAt, endsAt };
  }

  return { status: "outside", startsAt, endsAt };
}
