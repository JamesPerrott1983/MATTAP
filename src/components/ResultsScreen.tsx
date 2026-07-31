import type { Answer, MatLocation } from '../types';
import { formatDistanceKm } from '../game/distance';
import {
  accuracyRating,
  averageErrorKm,
  bestAnswer,
  worstAnswer,
} from '../game/scoring';
import PrimaryButton from './PrimaryButton';

interface ResultsScreenProps {
  answers: Answer[];
  locations: MatLocation[];
  totalScoreKm: number;
  isNewBest: boolean;
  onReplay: () => void;
}

export default function ResultsScreen({
  answers,
  locations,
  totalScoreKm,
  isNewBest,
  onReplay,
}: ResultsScreenProps) {
  const locationById = new Map(locations.map((l) => [l.id, l]));
  const best = bestAnswer(answers);
  const worst = worstAnswer(answers);
  const average = averageErrorKm(answers);

  const share = async () => {
    const text = `MAT Global Challenge — I scored ${Math.round(totalScoreKm).toLocaleString(
      'en-GB',
    )} km (${accuracyRating(totalScoreKm)})! Can you beat me?`;
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // Share cancelled or unsupported — nothing to do.
    }
  };

  return (
    <div className="overlay overlay--results">
      <div className="results">
        <h1 className="results__heading">Game Complete</h1>
        {isNewBest && <p className="results__newbest">🏆 New best score!</p>}

        <p className="results__scorelabel">Your total score</p>
        <p className="results__score">{Math.round(totalScoreKm).toLocaleString('en-GB')} km</p>
        <p className="results__rating">{accuracyRating(totalScoreKm)}</p>
        <p className="results__average">
          Average error: {Math.round(average).toLocaleString('en-GB')} km per location
        </p>

        <ul className="results__list">
          {answers.map((a) => {
            const loc = locationById.get(a.locationId);
            if (!loc) return null;
            const flag =
              a === best ? ' 🎯' : a === worst ? ' 🌍' : '';
            return (
              <li key={a.locationId} className="results__item">
                <div className="results__item-main">
                  <span className="results__item-name">
                    {a.questionNumber}. {loc.companyName}
                    {flag}
                  </span>
                  <span className="results__item-place">
                    {loc.city}, {loc.country}
                  </span>
                </div>
                <span className="results__item-distance">{formatDistanceKm(a.distanceKm)}</span>
              </li>
            );
          })}
        </ul>
        <p className="results__legend">🎯 best guess &nbsp; 🌍 worst guess</p>

        <div className="results__buttons">
          <PrimaryButton onClick={onReplay}>Play Again</PrimaryButton>
          <PrimaryButton variant="secondary" onClick={share}>
            Share Result
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
