/** Core shared types for the MAT Global Challenge game. */

export type Difficulty = 'easy' | 'normal' | 'hard';

export type GameStatus =
  | 'not_started'
  | 'playing'
  | 'answer_revealed'
  | 'completed';

export interface MatLocation {
  id: string;
  companyName: string;
  facilityName?: string;
  city: string;
  country: string;
  region: string;
  latitude: number;
  longitude: number;
  description: string;
  /** Optional fields — the UI must only render them when present. */
  products?: string[];
  turnover?: string;
  employees?: string;
  facilityType?: string;
  founded?: string;
  clue?: string;
  facts?: string[];
  /** Longer end-of-game review text shown on the results screen. */
  review?: string;
  website?: string;
  image?: string;
  logo?: string;
  active: boolean;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Answer {
  locationId: string;
  guessedLatitude: number;
  guessedLongitude: number;
  correctLatitude: number;
  correctLongitude: number;
  distanceKm: number;
  questionNumber: number;
}

export interface GameState {
  gameStatus: GameStatus;
  selectedLocations: MatLocation[];
  currentQuestionIndex: number;
  currentGuess: LatLng | null;
  answers: Answer[];
  totalScoreKm: number;
  difficulty: Difficulty;
}

export interface PersistedPrefs {
  bestScoreKm: number | null;
  lastScoreKm: number | null;
  difficulty: Difficulty;
  soundEnabled: boolean;
}

/** A finished daily game, stored so the result survives reloads. */
export interface DailyResult {
  dayKey: string;
  gameNo: number;
  answers: Answer[];
  totalScoreKm: number;
  locationIds: string[];
}
