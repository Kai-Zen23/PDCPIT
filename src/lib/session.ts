const KEY = "cardclash21.session";

export type Session = {
  matchId: string;
  playerId: string;
  playerName: string;
};

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (!parsed.matchId || !parsed.playerId || !parsed.playerName) return null;
    return parsed as Session;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
}

