import { describe, expect, it } from 'vitest';
import type { GameState, MatLocation } from '../types';
import { initialState, reducer } from './useGame';

function makeLocation(id: string, lat: number, lng: number): MatLocation {
  return {
    id,
    companyName: `Company ${id}`,
    city: 'City',
    country: 'Country',
    region: 'Europe',
    latitude: lat,
    longitude: lng,
    description: 'Test',
    active: true,
  };
}

const FIVE = [
  makeLocation('a', 50, 15),
  makeLocation('b', 40, -3),
  makeLocation('c', 31, 121),
  makeLocation('d', 42, -88),
  makeLocation('e', 19, -99),
];

function playOneQuestion(state: GameState): GameState {
  let s = reducer(state, { type: 'PLACE_GUESS', guess: { lat: 10, lng: 10 } });
  s = reducer(s, { type: 'SUBMIT_GUESS' });
  return reducer(s, { type: 'NEXT_QUESTION' });
}

describe('game flow reducer', () => {
  it('starts a game in playing state with five locations', () => {
    const s = reducer(initialState, { type: 'START_GAME', locations: FIVE, difficulty: 'normal' });
    expect(s.gameStatus).toBe('playing');
    expect(s.selectedLocations).toHaveLength(5);
    expect(s.totalScoreKm).toBe(0);
  });

  it('ignores submissions without a guess (FR-06)', () => {
    const s = reducer(initialState, { type: 'START_GAME', locations: FIVE, difficulty: 'normal' });
    expect(reducer(s, { type: 'SUBMIT_GUESS' })).toBe(s);
  });

  it('locks the guess after submission (spec §3.4)', () => {
    let s = reducer(initialState, { type: 'START_GAME', locations: FIVE, difficulty: 'normal' });
    s = reducer(s, { type: 'PLACE_GUESS', guess: { lat: 10, lng: 10 } });
    s = reducer(s, { type: 'SUBMIT_GUESS' });
    const after = reducer(s, { type: 'PLACE_GUESS', guess: { lat: 20, lng: 20 } });
    expect(after.answers[0].guessedLatitude).toBe(10);
    expect(after).toBe(s);
  });

  it('accumulates the running total score (FR-10)', () => {
    let s = reducer(initialState, { type: 'START_GAME', locations: FIVE, difficulty: 'normal' });
    s = reducer(s, { type: 'PLACE_GUESS', guess: { lat: 50, lng: 15 } });
    s = reducer(s, { type: 'SUBMIT_GUESS' });
    expect(s.answers[0].distanceKm).toBe(0); // exact hit on location "a"
    expect(s.totalScoreKm).toBe(0);
  });

  it('completes after exactly five questions (FR-12)', () => {
    let s = reducer(initialState, { type: 'START_GAME', locations: FIVE, difficulty: 'normal' });
    for (let q = 0; q < 5; q++) {
      expect(s.gameStatus).toBe('playing');
      s = playOneQuestion(s);
    }
    expect(s.gameStatus).toBe('completed');
    expect(s.answers).toHaveLength(5);
  });

  it('resets cleanly for replay (FR-14)', () => {
    let s = reducer(initialState, { type: 'START_GAME', locations: FIVE, difficulty: 'normal' });
    s = playOneQuestion(s);
    const reset = reducer(s, { type: 'RESET' });
    expect(reset.gameStatus).toBe('not_started');
    expect(reset.answers).toHaveLength(0);
    expect(reset.totalScoreKm).toBe(0);
  });
});
