import { useCallback, useMemo, useReducer } from 'react';
import type { Answer, Difficulty, GameState, LatLng, MatLocation } from '../types';
import { calculateDistanceKm } from './distance';
import { QUESTIONS_PER_GAME } from './scoring';
import { recordScore } from './storage';

export type GameAction =
  | { type: 'START_GAME'; locations: MatLocation[]; difficulty: Difficulty }
  | { type: 'PLACE_GUESS'; guess: LatLng }
  | { type: 'SUBMIT_GUESS' }
  | { type: 'NEXT_QUESTION' }
  | { type: 'RESET' };

export const initialState: GameState = {
  gameStatus: 'not_started',
  selectedLocations: [],
  currentQuestionIndex: 0,
  currentGuess: null,
  answers: [],
  totalScoreKm: 0,
  difficulty: 'normal',
};

export function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME':
      return {
        ...initialState,
        gameStatus: 'playing',
        selectedLocations: action.locations,
        difficulty: action.difficulty,
      };

    case 'PLACE_GUESS':
      // Guesses can only be placed/moved while a question is open (FR-05).
      if (state.gameStatus !== 'playing') return state;
      return { ...state, currentGuess: action.guess };

    case 'SUBMIT_GUESS': {
      // Locked after submission (FR-06 guard: no guess -> no-op).
      if (state.gameStatus !== 'playing' || !state.currentGuess) return state;
      const location = state.selectedLocations[state.currentQuestionIndex];
      const distanceKm = calculateDistanceKm(
        state.currentGuess.lat,
        state.currentGuess.lng,
        location.latitude,
        location.longitude,
      );
      const answer: Answer = {
        locationId: location.id,
        guessedLatitude: state.currentGuess.lat,
        guessedLongitude: state.currentGuess.lng,
        correctLatitude: location.latitude,
        correctLongitude: location.longitude,
        distanceKm,
        questionNumber: state.currentQuestionIndex + 1,
      };
      return {
        ...state,
        gameStatus: 'answer_revealed',
        answers: [...state.answers, answer],
        totalScoreKm: state.totalScoreKm + distanceKm,
      };
    }

    case 'NEXT_QUESTION': {
      if (state.gameStatus !== 'answer_revealed') return state;
      const isLast = state.answers.length >= QUESTIONS_PER_GAME;
      if (isLast) {
        return { ...state, gameStatus: 'completed', currentGuess: null };
      }
      return {
        ...state,
        gameStatus: 'playing',
        currentQuestionIndex: state.currentQuestionIndex + 1,
        currentGuess: null,
      };
    }

    case 'RESET':
      return { ...initialState };

    default:
      return state;
  }
}

/** All game behaviour lives here, fully separated from the UI components. */
export function useGame() {
  const [state, dispatch] = useReducer(reducer, initialState);

  /** Start a game with an explicit set of locations (e.g. today's daily five). */
  const startGame = useCallback((locations: MatLocation[], difficulty: Difficulty = 'easy') => {
    dispatch({ type: 'START_GAME', locations, difficulty });
  }, []);

  const placeGuess = useCallback((guess: LatLng) => {
    dispatch({ type: 'PLACE_GUESS', guess });
  }, []);

  const submitGuess = useCallback(() => dispatch({ type: 'SUBMIT_GUESS' }), []);

  const nextQuestion = useCallback(() => dispatch({ type: 'NEXT_QUESTION' }), []);

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  const finishGame = useCallback(() => recordScore(state.totalScoreKm), [state.totalScoreKm]);

  const currentLocation: MatLocation | null =
    state.gameStatus === 'not_started' || state.selectedLocations.length === 0
      ? null
      : state.selectedLocations[state.currentQuestionIndex] ?? null;

  const lastAnswer: Answer | null =
    state.answers.length > 0 ? state.answers[state.answers.length - 1] : null;

  return useMemo(
    () => ({
      state,
      currentLocation,
      lastAnswer,
      startGame,
      placeGuess,
      submitGuess,
      nextQuestion,
      reset,
      finishGame,
    }),
    [state, currentLocation, lastAnswer, startGame, placeGuess, submitGuess, nextQuestion, reset, finishGame],
  );
}
