import type { MatLocation } from '../types';

/**
 * Pick `count` unique active locations in random order.
 * Uses a Fisher–Yates shuffle over the active pool; an injectable RNG keeps
 * this deterministic in tests.
 * Throws when there are not enough active locations (NFR-05).
 */
export function selectRandomLocations(
  pool: MatLocation[],
  count: number,
  random: () => number = Math.random,
): MatLocation[] {
  const active = pool.filter((l) => l.active);
  if (active.length < count) {
    throw new Error(
      `Not enough active locations: need ${count}, found ${active.length}. Check the location data configuration.`,
    );
  }
  const shuffled = [...active];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

/** Validate a location record has usable coordinates (NFR-05). */
export function hasValidCoordinates(location: MatLocation): boolean {
  const { latitude, longitude } = location;
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}
