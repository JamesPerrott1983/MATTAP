/**
 * "Where's Matty"-style share text:
 *
 *   MAT Global Challenge #12 2026-07-31
 *   3,284 km · 🌍
 *   🟩🟩🟨⬛🟩
 *   https://…/MATTAP/
 */
import type { Answer } from '../types';

/** One square per question: green = close, yellow = decent, black = far. */
export function squareFor(distanceKm: number): string {
  if (distanceKm <= 250) return '🟩';
  if (distanceKm <= 1000) return '🟨';
  return '⬛';
}

export function buildShareText(options: {
  gameNo: number;
  date: string; // e.g. "2026-07-31"
  answers: Answer[];
  totalKm: number;
  url: string;
}): string {
  const { gameNo, date, answers, totalKm, url } = options;
  const squares = answers.map((a) => squareFor(a.distanceKm)).join('');
  const km = Math.round(totalKm).toLocaleString('en-GB');
  return `MAT Global Challenge #${gameNo} ${date}\n${km} km · 🌍\n${squares}\n${url}`;
}
