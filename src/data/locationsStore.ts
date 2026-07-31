/**
 * Location data access with admin overrides.
 *
 * The bundled locations.json is the source of truth shipped with the app.
 * The admin page can add/edit/deactivate locations; those changes are kept
 * in localStorage as an override set (this browser only — the site is
 * static). "Export" downloads the merged list as locations.json, which can
 * be committed to the repository to update the game for every player.
 */
import bundled from './locations.json';
import type { MatLocation } from '../types';
import { hasValidCoordinates } from '../game/selectLocations';

const OVERRIDE_KEY = 'mat-global-challenge-locations';

export function bundledLocations(): MatLocation[] {
  return (bundled as MatLocation[]).filter(hasValidCoordinates);
}

/** The full location list the admin has saved locally, or null if none. */
export function loadOverrides(): MatLocation[] | null {
  try {
    const raw = window.localStorage.getItem(OVERRIDE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MatLocation[];
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveOverrides(locations: MatLocation[]): boolean {
  try {
    window.localStorage.setItem(OVERRIDE_KEY, JSON.stringify(locations));
    return true;
  } catch {
    return false;
  }
}

export function clearOverrides(): void {
  try {
    window.localStorage.removeItem(OVERRIDE_KEY);
  } catch {
    // ignore
  }
}

/** What the game actually plays with: admin overrides if present, else bundled. */
export function effectiveLocations(): MatLocation[] {
  const overrides = loadOverrides();
  if (overrides && overrides.length > 0) {
    return overrides.filter(hasValidCoordinates);
  }
  return bundledLocations();
}

/** Pretty JSON for export / committing back to src/data/locations.json. */
export function exportJson(locations: MatLocation[]): string {
  return JSON.stringify(locations, null, 2) + '\n';
}
