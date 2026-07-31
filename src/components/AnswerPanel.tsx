import type { Answer, MatLocation } from '../types';
import { formatDistanceKm } from '../game/distance';
import { proximityMessage, QUESTIONS_PER_GAME } from '../game/scoring';
import PrimaryButton from './PrimaryButton';

interface AnswerPanelProps {
  location: MatLocation;
  answer: Answer;
  totalScoreKm: number;
  onNext: () => void;
}

/** Bottom sheet shown after a guess is submitted (spec §3.4). */
export default function AnswerPanel({ location, answer, totalScoreKm, onNext }: AnswerPanelProps) {
  const isLast = answer.questionNumber >= QUESTIONS_PER_GAME;

  return (
    <section className="sheet sheet--answer" aria-label="Result">
      <div className="sheet__body">
        <p className="answer__headline" role="status">
          <strong>{proximityMessage(answer.distanceKm)}</strong> Your guess was{' '}
          {formatDistanceKm(answer.distanceKm)} away.
        </p>

        <h2 className="sheet__title">{location.companyName}</h2>
        <p className="answer__place">
          📍 {location.city}, {location.country}
        </p>
        <p className="sheet__description">{location.description}</p>

        {location.facts && location.facts.length > 0 && (
          <p className="sheet__clue">{location.facts[0]}</p>
        )}

        <p className="answer__running">
          Running total: <strong>{Math.round(totalScoreKm).toLocaleString('en-GB')} km</strong>
        </p>
      </div>
      <div className="sheet__footer">
        <PrimaryButton onClick={onNext}>{isLast ? 'View Results' : 'Next Location'}</PrimaryButton>
      </div>
    </section>
  );
}
