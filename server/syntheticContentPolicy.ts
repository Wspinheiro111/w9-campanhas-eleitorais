const HOUR_MS = 60 * 60 * 1000;

export type SyntheticElectionWindowInput = {
  isSynthetic: boolean;
  usesCandidateOrPublicPerson: boolean;
  electionEndsAt: Date | null | undefined;
  electionTimeZone: string | null | undefined;
  now?: Date;
};

export type SyntheticElectionWindow = {
  applies: boolean;
  configured: boolean;
  withinRestrictedWindow: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
};

export function isValidIanaTimeZone(value: string | null | undefined) {
  if (!value?.trim()) return false;
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone: value }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

/**
 * Calcula somente a janela temporal objetiva prevista para novo conteúdo
 * sintético que use imagem, voz ou manifestação de candidata(o) ou pessoa
 * pública. A data/hora do término do pleito é um instante absoluto persistido
 * no servidor; o timezone IANA é exigido como parte explícita da configuração.
 */
export function calculateSyntheticElectionWindow(input: SyntheticElectionWindowInput): SyntheticElectionWindow {
  if (!input.isSynthetic || !input.usesCandidateOrPublicPerson) {
    return { applies: false, configured: true, withinRestrictedWindow: false, startsAt: null, endsAt: null };
  }

  if (!input.electionEndsAt || Number.isNaN(input.electionEndsAt.getTime()) || !isValidIanaTimeZone(input.electionTimeZone)) {
    return { applies: true, configured: false, withinRestrictedWindow: false, startsAt: null, endsAt: null };
  }

  const startsAt = new Date(input.electionEndsAt.getTime() - 72 * HOUR_MS);
  const endsAt = new Date(input.electionEndsAt.getTime() + 24 * HOUR_MS);
  const now = input.now ?? new Date();
  const withinRestrictedWindow = now.getTime() >= startsAt.getTime() && now.getTime() <= endsAt.getTime();

  return { applies: true, configured: true, withinRestrictedWindow, startsAt, endsAt };
}
