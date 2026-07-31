import { useState } from 'react';
import type { Difficulty, MatLocation } from '../types';
import PrimaryButton from './PrimaryButton';

interface CompanyClueCardProps {
  location: MatLocation;
  difficulty: Difficulty;
  hasGuess: boolean;
  onSubmit: () => void;
}

interface VisibleFields {
  name: boolean;
  country: boolean;
  region: boolean;
  products: boolean;
  employees: boolean;
  turnover: boolean;
  clue: boolean;
}

/** Which clue fields are revealed before the guess, per difficulty (spec §9). */
function fieldsFor(difficulty: Difficulty): VisibleFields {
  switch (difficulty) {
    case 'easy':
      return { name: true, country: true, region: true, products: true, employees: true, turnover: true, clue: true };
    case 'hard':
      return { name: false, country: false, region: false, products: true, employees: false, turnover: false, clue: false };
    case 'normal':
    default:
      return { name: true, country: false, region: true, products: true, employees: true, turnover: true, clue: false };
  }
}

/**
 * Bottom-sheet clue card. Collapsible so the globe stays visible (spec §6.1).
 * Optional fields render only when data exists — never an empty label (§8.2).
 */
export default function CompanyClueCard({
  location,
  difficulty,
  hasGuess,
  onSubmit,
}: CompanyClueCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const show = fieldsFor(difficulty);

  return (
    <section className={`sheet ${collapsed ? 'sheet--collapsed' : ''}`} aria-label="Company clue">
      <button
        type="button"
        className="sheet__handle"
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expand company clue' : 'Collapse company clue'}
        onClick={() => setCollapsed((c) => !c)}
      >
        <span className="sheet__grip" aria-hidden="true" />
      </button>

      {!collapsed && (
        <div className="sheet__body">
          <h2 className="sheet__title">
            {show.name ? location.companyName : 'Mystery MAT company'}
          </h2>
          <p className="sheet__description">{location.description}</p>

          <dl className="sheet__meta">
            {show.region && (
              <div>
                <dt>Region</dt>
                <dd>{location.region}</dd>
              </div>
            )}
            {show.country && (
              <div>
                <dt>Country</dt>
                <dd>{location.country}</dd>
              </div>
            )}
            {show.products && location.products && location.products.length > 0 && (
              <div>
                <dt>Products</dt>
                <dd>{location.products.join(', ')}</dd>
              </div>
            )}
            {show.employees && location.employees && (
              <div>
                <dt>Employees</dt>
                <dd>{location.employees}</dd>
              </div>
            )}
            {show.turnover && location.turnover && (
              <div>
                <dt>Turnover</dt>
                <dd>{location.turnover}</dd>
              </div>
            )}
          </dl>

          {show.clue && location.clue && <p className="sheet__clue">💡 {location.clue}</p>}
        </div>
      )}

      <div className="sheet__footer">
        <p className="sheet__hint" aria-live="polite">
          {hasGuess
            ? 'You can move your marker before submitting.'
            : 'Tap the globe to place your guess.'}
        </p>
        <PrimaryButton onClick={onSubmit} disabled={!hasGuess}>
          Submit Guess
        </PrimaryButton>
      </div>
    </section>
  );
}
