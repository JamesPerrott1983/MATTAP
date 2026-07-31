import { QUESTIONS_PER_GAME } from '../game/scoring';

interface ProgressIndicatorProps {
  current: number; // 1-based question number
  totalScoreKm: number;
}

export default function ProgressIndicator({ current, totalScoreKm }: ProgressIndicatorProps) {
  return (
    <div className="progress" aria-label={`Location ${current} of ${QUESTIONS_PER_GAME}`}>
      <div className="progress__dots" aria-hidden="true">
        {Array.from({ length: QUESTIONS_PER_GAME }, (_, i) => (
          <span
            key={i}
            className={`progress__dot ${i < current ? 'progress__dot--active' : ''}`}
          />
        ))}
      </div>
      <span className="progress__text">
        Location {current} of {QUESTIONS_PER_GAME}
      </span>
      <span className="progress__score">{Math.round(totalScoreKm).toLocaleString('en-GB')} km</span>
    </div>
  );
}
