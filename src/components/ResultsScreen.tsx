import { useEffect, useState } from 'react';
import type { Answer, MatLocation } from '../types';
import { formatDistanceKm } from '../game/distance';
import { accuracyRating, averageErrorKm, bestAnswer, worstAnswer } from '../game/scoring';
import { countdownLabel, msUntilNextGame } from '../game/daily';
import { buildShareText, squareFor } from '../game/share';
import PrimaryButton from './PrimaryButton';

interface ResultsScreenProps {
  answers: Answer[];
  locations: MatLocation[];
  totalScoreKm: number;
  gameNo: number;
  dateLabel: string;
  isNewBest: boolean;
}

/**
 * Daily results: final score, share, countdown to the next game, and a
 * review of each location so players learn more about every MAT site.
 */
export default function ResultsScreen({
  answers,
  locations,
  totalScoreKm,
  gameNo,
  dateLabel,
  isNewBest,
}: ResultsScreenProps) {
  const locationById = new Map(locations.map((l) => [l.id, l]));
  const best = bestAnswer(answers);
  const worst = worstAnswer(answers);
  const average = averageErrorKm(answers);

  const [openId, setOpenId] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(() => countdownLabel(msUntilNextGame(new Date())));

  /* Tick the "unlocks in…" countdown once a minute. */
  useEffect(() => {
    const id = window.setInterval(
      () => setCountdown(countdownLabel(msUntilNextGame(new Date()))),
      30_000,
    );
    return () => window.clearInterval(id);
  }, []);

  const share = async () => {
    const text = buildShareText({
      gameNo,
      date: dateLabel,
      answers,
      totalKm: totalScoreKm,
      url: window.location.origin + window.location.pathname,
    });
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        setShareFeedback('Copied to clipboard!');
        window.setTimeout(() => setShareFeedback(null), 2500);
      }
    } catch {
      // Share cancelled — nothing to do.
    }
  };

  return (
    <div className="overlay overlay--results">
      <div className="results">
        <h1 className="results__heading">Game Complete</h1>
        <p className="results__gameno">
          #{gameNo} · {dateLabel}
        </p>
        {isNewBest && <p className="results__newbest">🏆 New best score!</p>}

        <p className="results__scorelabel">Your total score</p>
        <p className="results__score">{Math.round(totalScoreKm).toLocaleString('en-GB')} km</p>
        <p className="results__squares" aria-hidden="true">
          {answers.map((a) => squareFor(a.distanceKm)).join('')}
        </p>
        <p className="results__rating">{accuracyRating(totalScoreKm)}</p>
        <p className="results__average">
          Average error: {Math.round(average).toLocaleString('en-GB')} km per location
        </p>

        <div className="results__buttons">
          <PrimaryButton onClick={share}>Share Your Score</PrimaryButton>
          {shareFeedback && (
            <p className="results__sharefeedback" role="status">
              {shareFeedback}
            </p>
          )}
        </div>

        <p className="results__tomorrow">
          New game tomorrow!
          <br />
          Unlocks in {countdown}
        </p>

        <h2 className="results__reviewheading">Today's locations</h2>
        <ul className="results__list">
          {answers.map((a) => {
            const loc = locationById.get(a.locationId);
            if (!loc) return null;
            const flag = a === best ? ' 🎯' : a === worst ? ' 🌍' : '';
            const open = openId === loc.id;
            return (
              <li key={a.locationId} className="results__item results__item--review">
                <button
                  type="button"
                  className="results__item-toggle"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : loc.id)}
                >
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
                  <span className="results__item-chevron" aria-hidden="true">
                    {open ? '▲' : '▼'}
                  </span>
                </button>

                {open && (
                  <div className="results__review">
                    <p>{loc.review ?? loc.description}</p>
                    {loc.review && <p>{loc.description}</p>}
                    {loc.facts?.map((fact) => (
                      <p key={fact} className="results__fact">
                        ℹ️ {fact}
                      </p>
                    ))}
                    <dl className="sheet__meta">
                      {loc.facilityType && (
                        <div>
                          <dt>Facility</dt>
                          <dd>{loc.facilityType}</dd>
                        </div>
                      )}
                      {loc.products && loc.products.length > 0 && (
                        <div>
                          <dt>Products</dt>
                          <dd>{loc.products.join(', ')}</dd>
                        </div>
                      )}
                      {loc.founded && (
                        <div>
                          <dt>Founded</dt>
                          <dd>{loc.founded}</dd>
                        </div>
                      )}
                      {loc.employees && (
                        <div>
                          <dt>Employees</dt>
                          <dd>{loc.employees}</dd>
                        </div>
                      )}
                      {loc.turnover && (
                        <div>
                          <dt>Turnover</dt>
                          <dd>{loc.turnover}</dd>
                        </div>
                      )}
                      {loc.website && (
                        <div>
                          <dt>Website</dt>
                          <dd>
                            <a href={loc.website} target="_blank" rel="noreferrer">
                              {loc.website.replace(/^https?:\/\//, '')}
                            </a>
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <p className="results__legend">🎯 best guess &nbsp; 🌍 worst guess &nbsp; · tap a location to learn more</p>
      </div>
    </div>
  );
}
