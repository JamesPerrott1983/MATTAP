import { describe, expect, it } from 'vitest';
import { calculateDistanceKm, formatDistanceKm, roundKm } from './distance';

describe('calculateDistanceKm', () => {
  it('returns 0 for identical points', () => {
    expect(calculateDistanceKm(50.2104, 15.8252, 50.2104, 15.8252)).toBe(0);
  });

  it('matches the known London → Paris distance (~344 km)', () => {
    const d = calculateDistanceKm(51.5074, -0.1278, 48.8566, 2.3522);
    expect(d).toBeGreaterThan(330);
    expect(d).toBeLessThan(355);
  });

  it('matches the known New York → Los Angeles distance (~3,936 km)', () => {
    const d = calculateDistanceKm(40.7128, -74.006, 34.0522, -118.2437);
    expect(d).toBeGreaterThan(3900);
    expect(d).toBeLessThan(3970);
  });

  it('handles antipodal points (~half Earth circumference)', () => {
    const d = calculateDistanceKm(0, 0, 0, 180);
    expect(d).toBeCloseTo(Math.PI * 6371, 0);
  });

  it('handles points across the international date line', () => {
    // ~1° apart across the antimeridian at the equator ≈ 111 km, not ~39,800 km.
    const d = calculateDistanceKm(0, 179.5, 0, -179.5);
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(125);
  });

  it('handles extreme latitudes (north pole to Hradec Králové)', () => {
    const d = calculateDistanceKm(90, 0, 50.2104, 15.8252);
    expect(d).toBeGreaterThan(4300);
    expect(d).toBeLessThan(4500);
  });

  it('is symmetric', () => {
    const a = calculateDistanceKm(42.1784, -87.9979, 38.914, 121.6147);
    const b = calculateDistanceKm(38.914, 121.6147, 42.1784, -87.9979);
    expect(a).toBeCloseTo(b, 9);
  });
});

describe('roundKm', () => {
  it('rounds to the nearest whole kilometre', () => {
    expect(roundKm(841.5)).toBe(842);
    expect(roundKm(841.4)).toBe(841);
  });
});

describe('formatDistanceKm', () => {
  it('shows the sub-kilometre message per spec §21', () => {
    expect(formatDistanceKm(0.4)).toBe('Less than 1 km');
  });

  it('formats thousands with separators', () => {
    expect(formatDistanceKm(3284.4)).toBe('3,284 km');
  });
});
