import { useState } from 'react';
import type { MatLocation } from '../types';
import PrimaryButton from './PrimaryButton';

interface CompanyClueCardProps {
  location: MatLocation;
  hasGuess: boolean;
  onSubmit: () => void;
}

/**
 * Bottom-sheet clue card. Collapsible so the globe stays visible (spec §6.1).
 * Optional fields render only when data exists — never an empty label (§8.2).
 */
export default function CompanyClueCard({ location, hasGuess, onSubmit }: CompanyClueCardProps) {
  const [collapsed, setCollapsed] = useState(false);

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
          <h2 className="sheet__title">{location.companyName}</h2>
          <p className="sheet__description">{location.description}</p>

          <dl className="sheet__meta">
            <div>
              <dt>Region</dt>
              <dd>{location.region}</dd>
            </div>
            <div>
              <dt>Country</dt>
              <dd>{location.country}</dd>
            </div>
            {location.products && location.products.length > 0 && (
              <div>
                <dt>Products</dt>
                <dd>{location.products.join(', ')}</dd>
              </div>
            )}
            {location.employees && (
              <div>
                <dt>Employees</dt>
                <dd>{location.employees}</dd>
              </div>
            )}
            {location.turnover && (
              <div>
                <dt>Turnover</dt>
                <dd>{location.turnover}</dd>
              </div>
            )}
          </dl>

          {location.clue && <p className="sheet__clue">💡 {location.clue}</p>}
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
