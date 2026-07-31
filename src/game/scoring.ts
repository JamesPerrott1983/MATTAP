import type { Answer } from '../types';

export const QUESTIONS_PER_GAME = 5;

export function totalScoreKm(answers: Answer[]): number {
  return answers.reduce((sum, a) => sum + a.distanceKm, 0);
}

export function averageErrorKm(answers: Answer[]): number {
  if (answers.length === 0) return 0;
  return totalScoreKm(answers) / answers.length;
}

export function bestAnswer(answers: Answer[]): Answer | null {
  if (answers.length === 0) return null;
  return answers.reduce((best, a) => (a.distanceKm < best.distanceKm ? a : best));
}

export function worstAnswer(answers: Answer[]): Answer | null {
  if (answers.length === 0) return null;
  return answers.reduce((worst, a) => (a.distanceKm > worst.distanceKm ? a : worst));
}

/** Per-question encouragement message, per spec section 3.4. */
export function proximityMessage(distanceKm: number): string {
  if (distanceKm < 25) return 'Outstanding!';
  if (distanceKm <= 100) return 'Excellent!';
  if (distanceKm <= 500) return 'Good guess!';
  if (distanceKm <= 1500) return 'Not bad!';
  return 'A long way off!';
}

/** Final-score rating bands, per spec section 3.5 (total score in km). */
export function accuracyRating(totalKm: number): string {
  if (totalKm <= 250) return 'Global MAT Expert';
  if (totalKm <= 1000) return 'MAT Geography Master';
  if (totalKm <= 3000) return 'Global Explorer';
  if (totalKm <= 7500) return 'World Traveller';
  return 'Geography Apprentice';
}
