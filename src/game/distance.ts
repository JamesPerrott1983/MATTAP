/** Great-circle distance between two coordinates using the Haversine formula. */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const earthRadiusKm = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const latitude1 = toRadians(lat1);
  const latitude2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

/** Rounded distance for display; internal calculations keep full precision. */
export function roundKm(distanceKm: number): number {
  return Math.round(distanceKm);
}

/** Display string, handling the sub-kilometre edge case from the spec. */
export function formatDistanceKm(distanceKm: number): string {
  if (distanceKm < 1) return 'Less than 1 km';
  return `${roundKm(distanceKm).toLocaleString('en-GB')} km`;
}
