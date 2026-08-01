import { describe, expect, it } from 'vitest';
import type { MatLocation } from '../types';
import { countdownLabel, dailyLocations, dayKey, gameNumber, mulberry32, seedFor } from './daily';

function makeLocation(id: string): MatLocation {
  return {
    id,
    companyName: id,
    city: 'City',
    country: 'Country',
    region: 'Europe',
    latitude: 50,
    longitude: 15,
    description: 'Test',
    active: true,
  };
}

const POOL = Array.from({ length: 20 }, (_, i) => makeLocation(`loc-${i}`));

describe('dayKey / gameNumber', () => {
  it('formats the local date', () => {
    expect(dayKey(new Date(2026, 6, 31))).toBe('2026-07-31');
  });

  it('is #1 on launch day (1 Aug 2026) and increments daily', () => {
    expect(gameNumber(new Date(2026, 7, 1))).toBe(1);
    expect(gameNumber(new Date(2026, 7, 2))).toBe(2);
    expect(gameNumber(new Date(2026, 7, 31))).toBe(31);
  });
});

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(seedFor(new Date(2026, 6, 31)));
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('dailyLocations', () => {
  it('gives the same five locations for the same date (every player)', () => {
    const d = new Date(2026, 6, 31);
    const a = dailyLocations(POOL, d).map((l) => l.id);
    const b = dailyLocations(POOL, d).map((l) => l.id);
    expect(a).toEqual(b);
    expect(a).toHaveLength(5);
  });

  it('gives a different selection on (almost all) other days', () => {
    const base = dailyLocations(POOL, new Date(2026, 6, 31)).map((l) => l.id).join(',');
    let different = 0;
    for (let offset = 1; offset <= 10; offset++) {
      const other = dailyLocations(POOL, new Date(2026, 6, 31 + offset)).map((l) => l.id).join(',');
      if (other !== base) different++;
    }
    expect(different).toBeGreaterThanOrEqual(9);
  });

  it('never repeats a location within one day', () => {
    for (let offset = 0; offset < 30; offset++) {
      const picked = dailyLocations(POOL, new Date(2026, 6, 31 + offset));
      expect(new Set(picked.map((l) => l.id)).size).toBe(5);
    }
  });
});

describe('dailyLocations with a schedule', () => {
  const d = new Date(2026, 7, 1); // dayKey 2026-08-01

  it('uses the hand-picked locations, in order, for a scheduled day', () => {
    const schedule = { '2026-08-01': ['loc-7', 'loc-2', 'loc-19', 'loc-0', 'loc-11'] };
    const picked = dailyLocations(POOL, d, schedule).map((l) => l.id);
    expect(picked).toEqual(['loc-7', 'loc-2', 'loc-19', 'loc-0', 'loc-11']);
  });

  it('falls back to the random pick when the plan references missing locations', () => {
    const schedule = { '2026-08-01': ['ghost-1', 'ghost-2', 'ghost-3', 'ghost-4', 'ghost-5'] };
    const picked = dailyLocations(POOL, d, schedule);
    expect(picked).toHaveLength(5);
    expect(picked.map((l) => l.id)).toEqual(dailyLocations(POOL, d).map((l) => l.id));
  });

  it('ignores the schedule for other days', () => {
    const schedule = { '2026-08-02': ['loc-1', 'loc-2', 'loc-3', 'loc-4', 'loc-5'] };
    const picked = dailyLocations(POOL, d, schedule).map((l) => l.id);
    expect(picked).toEqual(dailyLocations(POOL, d).map((l) => l.id));
  });
});

describe('countdownLabel', () => {
  it('formats hours and minutes', () => {
    expect(countdownLabel(3 * 3_600_000 + 4 * 60_000)).toBe('3 hours, 4 mins');
    expect(countdownLabel(60_000)).toBe('1 min');
    expect(countdownLabel(3_600_000)).toBe('1 hour, 0 mins');
  });
});
