import { useState } from 'react';
import PrimaryButton from './PrimaryButton';
import matLogo from '../assets/mat-logo-full.png';

interface StartScreenProps {
  gameNo: number;
  dateLabel: string;
  bestScoreKm: number | null;
  onStart: () => void;
}

export default function StartScreen({ gameNo, dateLabel, bestScoreKm, onStart }: StartScreenProps) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="overlay overlay--start">
      <div className="start">
        <img src={matLogo} alt="MAT Global Challenge" className="start__logo" />
        <h1 className="visually-hidden">MAT Global Challenge</h1>
        <p className="start__gameno">
          #{gameNo} · {dateLabel}
        </p>
        <p className="start__tagline">
          Explore MAT Holdings around the world. Read the company clues, tap the globe and see how
          close you can get. Everyone gets the same five locations today — a new game unlocks every
          day.
        </p>

        <PrimaryButton onClick={onStart}>Play Today's Game</PrimaryButton>
        <PrimaryButton variant="secondary" onClick={() => setShowHelp((s) => !s)}>
          How to Play
        </PrimaryButton>

        {showHelp && (
          <div className="start__help">
            <p>
              Today's game gives you five MAT Holdings companies. Read the clues, tap the globe
              where you think each one is, then submit your guess. Your score is the total distance
              in kilometres between your guesses and the real locations — the lower, the better.
              Come back tomorrow for a new set of locations, and share your score with colleagues!
            </p>
          </div>
        )}

        {bestScoreKm !== null && (
          <p className="start__best">🏆 Best score: {bestScoreKm.toLocaleString('en-GB')} km</p>
        )}
      </div>
    </div>
  );
}
