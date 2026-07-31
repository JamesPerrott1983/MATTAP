import { useState } from 'react';
import type { Difficulty } from '../types';
import PrimaryButton from './PrimaryButton';

interface StartScreenProps {
  bestScoreKm: number | null;
  initialDifficulty: Difficulty;
  onStart: (difficulty: Difficulty) => void;
}

const DIFFICULTIES: { value: Difficulty; label: string; hint: string }[] = [
  { value: 'easy', label: 'Easy', hint: 'Country shown' },
  { value: 'normal', label: 'Normal', hint: 'Region only' },
  { value: 'hard', label: 'Hard', hint: 'Minimal clues' },
];

export default function StartScreen({ bestScoreKm, initialDifficulty, onStart }: StartScreenProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="overlay overlay--start">
      <div className="start">
        <p className="start__brand">MAT Holdings</p>
        <h1 className="start__title">MAT Global Challenge</h1>
        <p className="start__tagline">
          Explore MAT Holdings around the world. Read the company clues, tap the globe and see how
          close you can get.
        </p>

        <div className="start__difficulty" role="radiogroup" aria-label="Difficulty">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              type="button"
              role="radio"
              aria-checked={difficulty === d.value}
              className={`chip ${difficulty === d.value ? 'chip--active' : ''}`}
              onClick={() => setDifficulty(d.value)}
            >
              <span className="chip__label">{d.label}</span>
              <span className="chip__hint">{d.hint}</span>
            </button>
          ))}
        </div>

        <PrimaryButton onClick={() => onStart(difficulty)}>Start Game</PrimaryButton>
        <PrimaryButton variant="secondary" onClick={() => setShowHelp((s) => !s)}>
          How to Play
        </PrimaryButton>

        {showHelp && (
          <div className="start__help">
            <p>
              Each game gives you five MAT Holdings companies. Read the clues, tap the globe where
              you think each one is, then submit your guess. Your score is the total distance in
              kilometres between your guesses and the real locations — the lower, the better.
            </p>
          </div>
        )}

        {bestScoreKm !== null && (
          <p className="start__best">
            🏆 Best score: {bestScoreKm.toLocaleString('en-GB')} km
          </p>
        )}
      </div>
    </div>
  );
}
