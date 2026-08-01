import { useMemo, useState, type FormEvent } from 'react';
import type { MatLocation } from '../types';
import {
  bundledLocations,
  clearOverrides,
  effectiveSchedule,
  exportJson,
  exportScheduleJson,
  loadOverrides,
  saveOverrides,
  saveScheduleOverrides,
} from '../data/locationsStore';
import type { Schedule } from '../game/daily';
import { dayKey } from '../game/daily';
import { QUESTIONS_PER_GAME } from '../game/scoring';
import { hasValidCoordinates } from '../game/selectLocations';
import PrimaryButton from './PrimaryButton';

/**
 * SHA-256 hash of the admin password (the password itself is NOT stored in
 * this repository — the game admin holds it).
 * To change it, run:
 *   node -e "console.log(require('crypto').createHash('sha256').update('YOUR-NEW-PASSWORD').digest('hex'))"
 * and paste the output here.
 *
 * NOTE: this is a static site, so this gate deters casual visitors — it is
 * not bank-grade security. Do not put confidential data in the game.
 */
const ADMIN_PASSWORD_HASH = '33be8cfc3707f14b0759770039847d49707c2823077345b6f7b1ec18c1cec7e3';
const AUTH_KEY = 'mat-admin-authed';

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function emptyLocation(): MatLocation {
  return {
    id: '',
    companyName: '',
    city: '',
    country: '',
    region: 'Europe',
    latitude: 0,
    longitude: 0,
    description: '',
    active: true,
  };
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(AUTH_KEY) === '1');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [locations, setLocations] = useState<MatLocation[]>(
    () => loadOverrides() ?? bundledLocations(),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MatLocation | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  /* Daily schedule (specific days → hand-picked locations) */
  const [schedule, setSchedule] = useState<Schedule>(() => effectiveSchedule());
  const [planDate, setPlanDate] = useState(() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return dayKey(t);
  });
  const [planIds, setPlanIds] = useState<string[]>(Array(QUESTIONS_PER_GAME).fill(''));

  const usingOverrides = useMemo(() => loadOverrides() !== null, [locations]);

  /* ---------------- authentication ---------------- */

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    const hash = await sha256Hex(password);
    if (hash === ADMIN_PASSWORD_HASH) {
      sessionStorage.setItem(AUTH_KEY, '1');
      setAuthed(true);
      setAuthError(null);
    } else {
      setAuthError('Incorrect password.');
    }
  };

  if (!authed) {
    return (
      <div className="overlay overlay--results">
        <div className="admin admin--login">
          <h1>Location Manager</h1>
          <p className="admin__note">Enter the admin password to manage the daily locations.</p>
          <form onSubmit={handleLogin} className="admin__loginform">
            <input
              type="password"
              className="admin__input"
              placeholder="Password"
              value={password}
              autoFocus
              onChange={(e) => setPassword(e.target.value)}
              aria-label="Admin password"
            />
            <PrimaryButton type="submit">Sign In</PrimaryButton>
          </form>
          {authError && (
            <p className="admin__error" role="alert">
              {authError}
            </p>
          )}
          <a className="admin__backlink" href="#" onClick={() => (window.location.hash = '')}>
            ← Back to the game
          </a>
        </div>
      </div>
    );
  }

  /* ---------------- editing ---------------- */

  const startEdit = (loc: MatLocation) => {
    setSelectedId(loc.id);
    setDraft({ ...loc });
    setMessage(null);
  };

  const startAdd = () => {
    setSelectedId(null);
    setDraft(emptyLocation());
    setMessage(null);
  };

  const updateDraft = (patch: Partial<MatLocation>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
  };

  const saveDraft = () => {
    if (!draft) return;
    const id = draft.id || slugify(draft.companyName);
    const record: MatLocation = { ...draft, id };
    if (!record.companyName || !record.city || !record.country) {
      setMessage('Company name, city and country are required.');
      return;
    }
    if (!hasValidCoordinates(record)) {
      setMessage('Latitude must be -90…90 and longitude -180…180.');
      return;
    }
    if (!selectedId && locations.some((l) => l.id === id)) {
      setMessage(`A location with id "${id}" already exists.`);
      return;
    }
    const next = selectedId
      ? locations.map((l) => (l.id === selectedId ? record : l))
      : [...locations, record];
    setLocations(next);
    saveOverrides(next);
    setDraft(null);
    setSelectedId(null);
    setMessage('Saved to this browser. Use Export to publish for everyone.');
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    const next = locations.filter((l) => l.id !== selectedId);
    setLocations(next);
    saveOverrides(next);
    setDraft(null);
    setSelectedId(null);
    setMessage('Deleted (in this browser). Use Export to publish for everyone.');
  };

  const doExport = () => {
    const blob = new Blob([exportJson(locations)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'locations.json';
    a.click();
    URL.revokeObjectURL(url);
    setMessage(
      'Downloaded locations.json — replace src/data/locations.json in the project and push to GitHub to update the live game.',
    );
  };

  const doReset = () => {
    clearOverrides();
    setLocations(bundledLocations());
    setDraft(null);
    setSelectedId(null);
    setMessage('Local changes discarded — back to the published data.');
  };

  /* ---------------- schedule handlers ---------------- */

  const savePlan = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(planDate)) {
      setMessage('Pick a valid date for the schedule entry.');
      return;
    }
    const ids = planIds.filter(Boolean);
    if (new Set(ids).size !== QUESTIONS_PER_GAME) {
      setMessage(`Pick ${QUESTIONS_PER_GAME} different locations for ${planDate}.`);
      return;
    }
    const next = { ...schedule, [planDate]: ids };
    setSchedule(next);
    saveScheduleOverrides(next);
    setPlanIds(Array(QUESTIONS_PER_GAME).fill(''));
    setMessage(
      `Scheduled ${planDate} (in this browser). Use "Export schedule.json" to publish for everyone.`,
    );
  };

  const deletePlan = (date: string) => {
    const next = { ...schedule };
    delete next[date];
    setSchedule(next);
    saveScheduleOverrides(next);
    setMessage(`${date} unscheduled — that day falls back to the random daily pick.`);
  };

  const editPlan = (date: string) => {
    setPlanDate(date);
    const ids = schedule[date] ?? [];
    setPlanIds(Array.from({ length: QUESTIONS_PER_GAME }, (_, i) => ids[i] ?? ''));
  };

  const doExportSchedule = () => {
    const blob = new Blob([exportScheduleJson(schedule)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schedule.json';
    a.click();
    URL.revokeObjectURL(url);
    setMessage(
      'Downloaded schedule.json — replace src/data/schedule.json in the project and push to GitHub to publish it.',
    );
  };

  const activeCount = locations.filter((l) => l.active).length;

  return (
    <div className="admin-page">
      <header className="admin__header">
        <h1>Location Manager</h1>
        <a className="admin__backlink" href="#" onClick={() => (window.location.hash = '')}>
          ← Back to the game
        </a>
      </header>

      <p className="admin__note">
        {locations.length} locations ({activeCount} active — at least 5 required).{' '}
        {usingOverrides
          ? 'Showing your local edits; Export and push to GitHub to publish them for everyone.'
          : 'Showing the published data.'}
      </p>

      <div className="admin__actions">
        <PrimaryButton onClick={startAdd}>+ Add Location</PrimaryButton>
        <PrimaryButton variant="secondary" onClick={doExport}>
          Export locations.json
        </PrimaryButton>
        <PrimaryButton variant="secondary" onClick={doReset}>
          Discard local changes
        </PrimaryButton>
      </div>

      {message && (
        <p className="admin__message" role="status">
          {message}
        </p>
      )}

      <section className="admin__schedule">
        <h2>Daily schedule</h2>
        <p className="admin__note">
          Pick the five locations for specific days. Days without an entry use the automatic
          random selection, as normal.
        </p>

        <div className="admin__plan">
          <label className="admin__block">
            Date
            <input
              type="date"
              className="admin__input"
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value)}
            />
          </label>
          <div className="admin__plan-slots">
            {planIds.map((id, i) => (
              <label key={i} className="admin__block">
                Location {i + 1}
                <select
                  className="admin__input"
                  value={id}
                  onChange={(e) =>
                    setPlanIds((prev) => prev.map((p, j) => (j === i ? e.target.value : p)))
                  }
                >
                  <option value="">— choose —</option>
                  {locations
                    .filter((l) => l.active)
                    .map((l) => (
                      <option key={l.id} value={l.id} disabled={planIds.includes(l.id) && id !== l.id}>
                        {l.companyName} ({l.city})
                      </option>
                    ))}
                </select>
              </label>
            ))}
          </div>
          <div className="admin__actions">
            <PrimaryButton onClick={savePlan}>Save Day</PrimaryButton>
            <PrimaryButton variant="secondary" onClick={doExportSchedule}>
              Export schedule.json
            </PrimaryButton>
          </div>
        </div>

        {Object.keys(schedule).length > 0 && (
          <ul className="admin__schedulelist">
            {Object.entries(schedule)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, ids]) => (
                <li key={date} className="admin__scheduleitem">
                  <div className="admin__scheduleinfo">
                    <strong>{date}</strong>
                    <span>
                      {ids
                        .map((id) => locations.find((l) => l.id === id)?.companyName ?? `⚠ ${id}`)
                        .join(' · ')}
                    </span>
                  </div>
                  <div className="admin__schedulebtns">
                    <button type="button" className="admin__minibtn" onClick={() => editPlan(date)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="admin__minibtn admin__minibtn--danger"
                      onClick={() => deletePlan(date)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </section>

      {draft && (
        <div className="admin__form">
          <h2>{selectedId ? `Edit: ${draft.companyName}` : 'New location'}</h2>

          <div className="admin__grid">
            <label>
              Company name*
              <input
                className="admin__input"
                value={draft.companyName}
                onChange={(e) => updateDraft({ companyName: e.target.value })}
              />
            </label>
            <label>
              Facility name
              <input
                className="admin__input"
                value={draft.facilityName ?? ''}
                onChange={(e) => updateDraft({ facilityName: e.target.value || undefined })}
              />
            </label>
            <label>
              City*
              <input
                className="admin__input"
                value={draft.city}
                onChange={(e) => updateDraft({ city: e.target.value })}
              />
            </label>
            <label>
              Country*
              <input
                className="admin__input"
                value={draft.country}
                onChange={(e) => updateDraft({ country: e.target.value })}
              />
            </label>
            <label>
              Region
              <select
                className="admin__input"
                value={draft.region}
                onChange={(e) => updateDraft({ region: e.target.value })}
              >
                <option>Europe</option>
                <option>North America</option>
                <option>South America</option>
                <option>Asia</option>
                <option>Africa</option>
                <option>Oceania</option>
              </select>
            </label>
            <label>
              Facility type
              <input
                className="admin__input"
                value={draft.facilityType ?? ''}
                onChange={(e) => updateDraft({ facilityType: e.target.value || undefined })}
              />
            </label>
            <label>
              Latitude* (-90…90)
              <input
                className="admin__input"
                type="number"
                step="0.0001"
                value={draft.latitude}
                onChange={(e) => updateDraft({ latitude: Number(e.target.value) })}
              />
            </label>
            <label>
              Longitude* (-180…180)
              <input
                className="admin__input"
                type="number"
                step="0.0001"
                value={draft.longitude}
                onChange={(e) => updateDraft({ longitude: Number(e.target.value) })}
              />
            </label>
            <label>
              Employees
              <input
                className="admin__input"
                value={draft.employees ?? ''}
                onChange={(e) => updateDraft({ employees: e.target.value || undefined })}
              />
            </label>
            <label>
              Turnover
              <input
                className="admin__input"
                value={draft.turnover ?? ''}
                onChange={(e) => updateDraft({ turnover: e.target.value || undefined })}
              />
            </label>
            <label>
              Founded
              <input
                className="admin__input"
                value={draft.founded ?? ''}
                onChange={(e) => updateDraft({ founded: e.target.value || undefined })}
              />
            </label>
            <label>
              Website
              <input
                className="admin__input"
                value={draft.website ?? ''}
                onChange={(e) => updateDraft({ website: e.target.value || undefined })}
              />
            </label>
            <label>
              Image URL (photo shown in the results review)
              <input
                className="admin__input"
                placeholder="https://… or /images/site.jpg"
                value={draft.image ?? ''}
                onChange={(e) => updateDraft({ image: e.target.value || undefined })}
              />
            </label>
          </div>

          <label className="admin__block">
            Description* (shown before the guess)
            <textarea
              className="admin__input"
              rows={3}
              value={draft.description}
              onChange={(e) => updateDraft({ description: e.target.value })}
            />
          </label>

          <label className="admin__block">
            Clue (shown before the guess)
            <input
              className="admin__input"
              value={draft.clue ?? ''}
              onChange={(e) => updateDraft({ clue: e.target.value || undefined })}
            />
          </label>

          <label className="admin__block">
            Review (shown on the results screen — tell players more about this location)
            <textarea
              className="admin__input"
              rows={4}
              value={draft.review ?? ''}
              onChange={(e) => updateDraft({ review: e.target.value || undefined })}
            />
          </label>

          <label className="admin__block">
            Facts (one per line, shown in the review)
            <textarea
              className="admin__input"
              rows={3}
              value={(draft.facts ?? []).join('\n')}
              onChange={(e) =>
                updateDraft({
                  facts: e.target.value
                    .split('\n')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>

          <label className="admin__block">
            Products (comma separated)
            <input
              className="admin__input"
              value={(draft.products ?? []).join(', ')}
              onChange={(e) =>
                updateDraft({
                  products: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>

          <label className="admin__check">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => updateDraft({ active: e.target.checked })}
            />
            Active (included in the daily rotation)
          </label>

          <div className="admin__actions">
            <PrimaryButton onClick={saveDraft}>Save</PrimaryButton>
            <PrimaryButton variant="secondary" onClick={() => setDraft(null)}>
              Cancel
            </PrimaryButton>
            {selectedId && (
              <PrimaryButton variant="secondary" onClick={deleteSelected}>
                Delete
              </PrimaryButton>
            )}
          </div>
        </div>
      )}

      <ul className="admin__list">
        {locations.map((loc) => (
          <li key={loc.id}>
            <button type="button" className="admin__row" onClick={() => startEdit(loc)}>
              <span className="admin__row-name">
                {loc.active ? '🟢' : '⚫'} {loc.companyName}
              </span>
              <span className="admin__row-place">
                {loc.city}, {loc.country} · {loc.latitude.toFixed(3)}, {loc.longitude.toFixed(3)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
