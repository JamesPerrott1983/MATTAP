import { useMemo, useState, type FormEvent } from 'react';
import type { MatLocation } from '../types';
import {
  bundledLocations,
  clearOverrides,
  exportJson,
  loadOverrides,
  saveOverrides,
} from '../data/locationsStore';
import { hasValidCoordinates } from '../game/selectLocations';
import PrimaryButton from './PrimaryButton';

/**
 * SHA-256 hash of the admin password.
 * Default password: MATadmin2026
 * To change it, run:
 *   node -e "console.log(require('crypto').createHash('sha256').update('YOUR-NEW-PASSWORD').digest('hex'))"
 * and paste the output here.
 *
 * NOTE: this is a static site, so this gate deters casual visitors — it is
 * not bank-grade security. Do not put confidential data in the game.
 */
const ADMIN_PASSWORD_HASH = '830c29dc1b33305d6e42089e61f891082513157d33e5989544669b9026599e0e';
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
