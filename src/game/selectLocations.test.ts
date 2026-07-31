import { describe, expect, it } from 'vitest';
import type { MatLocation } from '../types';
import { hasValidCoordinates, selectRandomLocations } from './selectLocations';
import locations from '../data/locations.json';

function makeLocation(id: string, active = true): MatLocation {
  return {
    id,
    companyName: id,
    city: 'City',
    country: 'Country',
    region: 'Europe',
    latitude: 50,
    longitude: 15,
    description: 'Test location',
    active,
  };
}

describe('selectRandomLocations', () => {
  const pool = Array.from({ length: 10 }, (_, i) => makeLocation(`loc-${i}`));

  it('returns the requested number of locations', () => {
    expect(selectRandomLocations(pool, 5)).toHaveLength(5);
  });

  it('never returns duplicates (FR-15)', () => {
    for (let run = 0; run < 50; run++) {
      const picked = selectRandomLocations(pool, 5);
      const ids = new Set(picked.map((l) => l.id));
      expect(ids.size).toBe(5);
    }
  });

  it('only ever selects active locations', () => {
    const mixed = [
      ...Array.from({ length: 5 }, (_, i) => makeLocation(`on-${i}`, true)),
      ...Array.from({ length: 5 }, (_, i) => makeLocation(`off-${i}`, false)),
    ];
    for (let run = 0; run < 20; run++) {
      const picked = selectRandomLocations(mixed, 5);
      expect(picked.every((l) => l.active)).toBe(true);
    }
  });

  it('throws a clear error when not enough active locations exist (NFR-05)', () => {
    const tiny = [makeLocation('a'), makeLocation('b'), makeLocation('c', false)];
    expect(() => selectRandomLocations(tiny, 5)).toThrow(/Not enough active locations/);
  });

  it('is deterministic with an injected RNG', () => {
    let seed = 42;
    const rng = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    let seed2 = 42;
    const rng2 = () => {
      seed2 = (seed2 * 16807) % 2147483647;
      return seed2 / 2147483647;
    };
    const a = selectRandomLocations(pool, 5, rng).map((l) => l.id);
    const b = selectRandomLocations(pool, 5, rng2).map((l) => l.id);
    expect(a).toEqual(b);
  });
});

describe('hasValidCoordinates', () => {
  it('accepts valid coordinates', () => {
    expect(hasValidCoordinates(makeLocation('ok'))).toBe(true);
  });

  it('rejects out-of-range or non-finite coordinates', () => {
    expect(hasValidCoordinates({ ...makeLocation('bad'), latitude: 95 })).toBe(false);
    expect(hasValidCoordinates({ ...makeLocation('bad'), longitude: -190 })).toBe(false);
    expect(hasValidCoordinates({ ...makeLocation('bad'), latitude: NaN })).toBe(false);
  });
});

describe('bundled location data', () => {
  const data = locations as MatLocation[];

  it('contains at least 5 active locations with valid coordinates', () => {
    const usable = data.filter((l) => l.active && hasValidCoordinates(l));
    expect(usable.length).toBeGreaterThanOrEqual(5);
  });

  it('has unique ids', () => {
    const ids = new Set(data.map((l) => l.id));
    expect(ids.size).toBe(data.length);
  });

  it('has all required fields on every record (spec §8.1)', () => {
    for (const l of data) {
      expect(l.id).toBeTruthy();
      expect(l.companyName).toBeTruthy();
      expect(l.city).toBeTruthy();
      expect(l.country).toBeTruthy();
      expect(l.region).toBeTruthy();
      expect(l.description).toBeTruthy();
      expect(typeof l.latitude).toBe('number');
      expect(typeof l.longitude).toBe('number');
      expect(typeof l.active).toBe('boolean');
    }
  });
});
