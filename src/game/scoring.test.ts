import { describe, expect, it } from 'vitest';
import type { Answer } from '../types';
import {
  accuracyRating,
  averageErrorKm,
  bestAnswer,
  proximityMessage,
  totalScoreKm,
  worstAnswer,
} from './scoring';

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

const ANSWERS = [answer(100, 1), answer(250, 2), answer(30, 3), answer(1200, 4), answer(704, 5)];

describe('totalScoreKm', () => {
  it('sums all five distances', () => {
    expect(totalScoreKm(ANSWERS)).toBe(2284);
  });

  it('returns 0 for no answers', () => {
    expect(totalScoreKm([])).toBe(0);
  });
});

describe('averageErrorKm', () => {
  it('averages across answers', () => {
    expect(averageErrorKm(ANSWERS)).toBeCloseTo(456.8);
  });

  it('returns 0 for no answers (no division by zero)', () => {
    expect(averageErrorKm([])).toBe(0);
  });
});

describe('best/worst answers', () => {
  it('identifies best and worst', () => {
    expect(bestAnswer(ANSWERS)?.distanceKm).toBe(30);
    expect(worstAnswer(ANSWERS)?.distanceKm).toBe(1200);
  });

  it('returns null on empty input', () => {
    expect(bestAnswer([])).toBeNull();
    expect(worstAnswer([])).toBeNull();
  });
});

describe('proximityMessage (spec §3.4 bands)', () => {
  it.each([
    [10, 'Outstanding!'],
    [24.9, 'Outstanding!'],
    [25, 'Excellent!'],
    [100, 'Excellent!'],
    [101, 'Good guess!'],
    [500, 'Good guess!'],
    [501, 'Not bad!'],
    [1500, 'Not bad!'],
    [1501, 'A long way off!'],
  ])('%d km → %s', (km, expected) => {
    expect(proximityMessage(km)).toBe(expected);
  });
});

describe('accuracyRating (spec §3.5 bands)', () => {
  it.each([
    [0, 'Global MAT Expert'],
    [250, 'Global MAT Expert'],
    [251, 'MAT Geography Master'],
    [1000, 'MAT Geography Master'],
    [1001, 'Global Explorer'],
    [3000, 'Global Explorer'],
    [3001, 'World Traveller'],
    [7500, 'World Traveller'],
    [7501, 'Geography Apprentice'],
  ])('%d km → %s', (km, expected) => {
    expect(accuracyRating(km)).toBe(expected);
  });
});
