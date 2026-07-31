import { describe, expect, it } from 'vitest';
import type { Answer } from '../types';
import { buildShareText, squareFor } from './share';

function answer(distanceKm: number, questionNumber: number): Answer {
  return {
    locationId: `loc-${questionNumber}`,
    guessedLatitude: 0,
    guessedLongitude: 0,
    correctLatitude: 0,
    correctLongitude: 0,
    distanceKm,
    questionNumber,
  };
}

describe('squareFor', () => {
  it('maps distances to squares', () => {
    expect(squareFor(0)).toBe('🟩');
    expect(squareFor(250)).toBe('🟩');
    expect(squareFor(251)).toBe('🟨');
    expect(squareFor(1000)).toBe('🟨');
    expect(squareFor(1001)).toBe('⬛');
  });
});

describe('buildShareText', () => {
  it('builds the Where\'s-Matty-style block', () => {
    const text = buildShareText({
      gameNo: 12,
      date: '2026-07-31',
      answers: [answer(50, 1), answer(400, 2), answer(2400, 3), answer(120, 4), answer(900, 5)],
      totalKm: 3870,
      url: 'https://jamesperrott1983.github.io/MATTAP/',
    });
    expect(text).toBe(
      'MAT Global Challenge #12 2026-07-31\n' +
        '3,870 km · 🌍\n' +
        '🟩🟨⬛🟩🟨\n' +
        'https://jamesperrott1983.github.io/MATTAP/',
    );
  });
});
