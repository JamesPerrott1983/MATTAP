import type { PersistedPrefs } from '../types';

const STORAGE_KEY = 'mat-global-challenge';

const DEFAULTS: PersistedPrefs = {
  bestScoreKm: null,
  lastScoreKm: null,
  difficulty: 'normal',
  soundEnabled: false,
};

/** localStorage access is wrapped in try/catch — private browsing on iOS
 *  Safari can throw, and the game must still work without persistence. */
export function loadPrefs(): PersistedPrefs {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<PersistedPrefs>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePrefs(update: Partial<PersistedPrefs>): PersistedPrefs {
  const merged = { ...loadPrefs(), ...update };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // Persistence is best-effort only.
  }
  return merged;
}

/** Record a finished game; returns updated prefs and whether it's a new best. */
export function recordScore(scoreKm: number): { prefs: PersistedPrefs; isNewBest: boolean } {
  const prefs = loadPrefs();
  const rounded = Math.round(scoreKm);
  const isNewBest = prefs.bestScoreKm === null || rounded < prefs.bestScoreKm;
  const next = savePrefs({
    lastScoreKm: rounded,
    bestScoreKm: isNewBest ? rounded : prefs.bestScoreKm,
  });
  return { prefs: next, isNewBest };
}
