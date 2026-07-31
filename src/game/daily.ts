/**
 * Daily-game logic: every calendar day has a fixed set of five locations,
 * derived deterministically from the date — so all players get the same
 * game on the same day, MapTap-style.
 */
import type { MatLocation } from '../types';
import { QUESTIONS_PER_GAME } from './scoring';
import { selectRandomLocations } from './selectLocations';

/** Game #1 launch date (local time). */
export const EPOCH = { year: 2026, month: 7, day: 31 }; // 31 July 2026

/** Key like "2026-07-31" for a given date, in the player's local timezone. */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Sequential daily game number, #1 on the epoch date. */
export function gameNumber(date: Date): number {
  const start = new Date(EPOCH.year, EPOCH.month - 1, EPOCH.day);
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round((today.getTime() - start.getTime()) / 86_400_000);
  return days + 1;
}

/** Small fast seedable PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Numeric seed for a date, e.g. 20260731. */
export function seedFor(date: Date): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

/** The five locations for a given date — deterministic for that date. */
export function dailyLocations(pool: MatLocation[], date: Date): MatLocation[] {
  const rng = mulberry32(seedFor(date));
  return selectRandomLocations(pool, QUESTIONS_PER_GAME, rng);
}

/** Milliseconds until local midnight (when the next game unlocks). */
export function msUntilNextGame(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}

/** "3 hours, 4 mins" style countdown label. */
export function countdownLabel(ms: number): string {
  const totalMins = Math.max(0, Math.ceil(ms / 60_000));
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `${m} min${m === 1 ? '' : 's'}`;
  return `${h} hour${h === 1 ? '' : 's'}, ${m} min${m === 1 ? '' : 's'}`;
}
