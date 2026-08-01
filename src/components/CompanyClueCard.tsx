import { useRef, useState, type PointerEvent } from 'react';
import type { MatLocation } from '../types';
import PrimaryButton from './PrimaryButton';

interface CompanyClueCardProps {
  location: MatLocation;
  hasGuess: boolean;
  onSubmit: () => void;
}

/**
 * Bottom-sheet clue card. Swipe it down (or tap the grip) to collapse and
 * see more of the globe; swipe up or tap again to expand (spec §6.1).
 * Optional fields render only when data exists — never an empty label (§8.2).
 */
export default function CompanyClueCard({ location, hasGuess, onSubmit }: CompanyClueCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStart = useRef<number | null>(null);
  const sheetRef = useRef<HTMLElement>(null);

  /* --- swipe gesture on the grip area --- */
  const onPointerDown = (e: PointerEvent) => {
    dragStart.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (dragStart.current === null) return;
    const delta = e.clientY - dragStart.current;
    // Follow the finger a little, only in the direction that makes sense.
    const clamped = collapsed ? Math.max(-60, Math.min(0, delta)) : Math.max(0, Math.min(120, delta));
    setDragY(clamped);
  };

  const endDrag = (e: PointerEvent) => {
    if (dragStart.current === null) return;
    const delta = e.clientY - dragStart.current;
    dragStart.current = null;
    setDragY(0);
    if (delta > 30) setCollapsed(true); // swiped down
    else if (delta < -30) setCollapsed(false); // swiped up
    else setCollapsed((c) => !c); // treat as a tap on the grip
  };

  return (
    <section
      ref={sheetRef}
      className={`sheet ${collapsed ? 'sheet--collapsed' : ''}`}
      style={dragY !== 0 ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined}
      aria-label="Company clue"
    >
      <button
        type="button"
        className="sheet__handle"
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expand company clue' : 'Collapse company clue'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <span className="sheet__grip" aria-hidden="true" />
        {collapsed && <span className="sheet__peek">{location.companyName} — swipe up for clues</span>}
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
        {!collapsed && (
          <p className="sheet__hint" aria-live="polite">
            {hasGuess
              ? 'You can move your marker before submitting.'
              : 'Tap the globe to place your guess.'}
          </p>
        )}
        <PrimaryButton onClick={onSubmit} disabled={!hasGuess}>
          Submit Guess
        </PrimaryButton>
      </div>
    </section>
  );
}
