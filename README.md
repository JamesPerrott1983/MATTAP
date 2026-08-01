# MAT Global Challenge

A mobile-first **daily** location-guessing game about **MAT Holdings** companies around
the world. Every calendar day, all players get the same five MAT locations (chosen
deterministically from the date). Players read the clues, tap a realistic satellite-imagery
3D globe where they think each site is, and score the great-circle distance between their
guess and the real location. **The lower the total, the better.** A new game unlocks at
local midnight, with a Wordle-style emoji share block for comparing scores.

Built with **React + TypeScript + Vite + Globe.gl** (Three.js). No mapping API key is
required: the satellite Earth texture is bundled locally, so the game works fully offline
once loaded.

## Daily game

- The five locations are picked with a seeded RNG from the date (`src/game/daily.ts`),
  so everyone gets the same game on the same day. Game #1 was 1 August 2026.
- The admin can hand-pick the locations for specific days (see "Daily schedule" in the
  admin page; stored in `src/data/schedule.json`). Days without an entry use the
  automatic random selection.
- After finishing, the result is stored locally: reloading shows the results screen with
  a countdown to the next game ("New game tomorrow! Unlocks in 3 hours, 4 mins").
- **Share Your Score** produces a Where's-Matty-style block:

  ```
  MAT Global Challenge #12 2026-07-31
  3,870 km · 🌍
  🟩🟨⬛🟩🟨
  https://…/MATTAP/
  ```

  🟩 within 250 km · 🟨 within 1,000 km · ⬛ further (per question).
- The results screen also includes a review of each location — tap one to read the full
  story, facts, products and website (edit the "Review" field in the admin page).

## Admin — Location Manager

Open **`/#admin`** (e.g. `https://…/MATTAP/#admin`) and enter the admin password.
The password is not stored in this repository — the game admin holds it. To change it,
edit `ADMIN_PASSWORD_HASH` in `src/components/AdminPage.tsx`; generate a new hash with:

```bash
node -e "console.log(require('crypto').createHash('sha256').update('YOUR-NEW-PASSWORD').digest('hex'))"
```

In the admin page you can add, edit, deactivate and delete locations (coordinates,
descriptions, clues, review text, facts, products, photos…) and hand-pick the five
locations for specific days ("Daily schedule"). Exports: **Export locations.json** →
replace `src/data/locations.json`; **Export schedule.json** → replace
`src/data/schedule.json`; push to publish.

**Important — how publishing works.** This is a static site with no server, so admin
edits are saved in *your browser only* (they take effect immediately for you, which is
also great for previewing). To publish for every player, click **Export locations.json**,
replace `src/data/locations.json` in the project with the downloaded file, then commit
and push — the GitHub Action redeploys automatically. The password gate deters casual
visitors, but anything shipped to a public static site is ultimately inspectable — don't
put confidential data in the game.

## Quick start

```bash
npm install
npm run dev      # local dev server (open the printed URL on your phone or desktop)
```

Production build and preview:

```bash
npm run build    # outputs a static site to dist/
npm run preview  # serve the production build locally
```

Unit tests:

```bash
npm test         # vitest run (distance, scoring, selection, game-flow tests)
```

## Deployment

`npm run build` produces a fully static `dist/` folder — deploy it to any static host
(Azure Static Web Apps, Netlify, Vercel, GitHub Pages, an internal IIS/nginx server, …).
No environment variables or backend are required.

### GitHub Pages (included)

This repo ships with `.github/workflows/deploy.yml`, which builds, tests and publishes
the game automatically on every push to `main`. To go live:

1. Create a new GitHub repository and push this project to it:
   ```bash
   git init
   git add .
   git commit -m "MAT Global Challenge"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. In the repo on github.com: **Settings → Pages → Build and deployment → Source →
   "GitHub Actions"**.
3. Wait for the "Deploy to GitHub Pages" action to finish (Actions tab). Your game is
   then live at `https://<your-username>.github.io/<repo-name>/` — open it on any phone.

The workflow sets `BASE_PATH` automatically so assets resolve under the repo sub-path.
If the repo is **private**, note that GitHub Pages sites are public on Free plans;
private Pages require GitHub Enterprise. For an internal-only deployment, use an
internal web server or Azure Static Web Apps with access restrictions instead.

### Single-file build (no hosting at all)

`npx vite build --config vite.singlefile.config.ts` produces `dist-single/index.html` —
one self-contained file that runs from a double-click or an email attachment. Handy for
quick sharing, but a proper URL (GitHub Pages) is better for phones.

If you later switch the globe to **Mapbox GL JS**, put the token in an env file rather
than source code (NFR-06):

```bash
# .env.local
VITE_MAPBOX_TOKEN=pk.your-restricted-public-token
```

and read it via `import.meta.env.VITE_MAPBOX_TOKEN`. Use a restricted public token limited
to your authorised domains.

## Project structure

```
src/
├── main.tsx                 # entry point
├── App.tsx                  # top-level orchestration (screens + globe)
├── index.css                # global styles (mobile-first, safe areas, reduced motion)
├── types.ts                 # shared TypeScript interfaces
├── data/
│   ├── locations.json       # MAT company/facility records (edit me!)
│   └── land-110m.json       # bundled world land topology (no network needed)
├── game/                    # pure game logic — no React UI in here
│   ├── distance.ts          # Haversine great-circle distance + formatting
│   ├── scoring.ts           # totals, averages, rating bands, messages
│   ├── selectLocations.ts   # unique random selection + coordinate validation
│   ├── storage.ts           # localStorage persistence (best score, difficulty)
│   ├── useGame.ts           # game state reducer + React hook
│   └── *.test.ts            # unit tests
└── components/
    ├── GlobeMap.tsx         # isolated globe wrapper (swappable per spec §5.3)
    ├── StartScreen.tsx
    ├── CompanyClueCard.tsx  # bottom-sheet clue card + submit
    ├── AnswerPanel.tsx      # per-question result reveal
    ├── ResultsScreen.tsx    # final score, rating, summary, replay/share
    ├── ProgressIndicator.tsx
    ├── PrimaryButton.tsx
    └── ErrorMessage.tsx
```

Game logic is completely separated from UI components, and company data is completely
separated from application logic — swap `GlobeMap.tsx` for a flat-map implementation
without touching the game rules.

## Maintaining company data

All locations live in `src/data/locations.json`. Required fields per record: `id`,
`companyName`, `city`, `country`, `region`, `latitude`, `longitude`, `description`,
`active`. Optional fields (`turnover`, `employees`, `products`, `clue`, `facts`,
`founded`, `facilityType`, …) are only rendered when present — missing data never shows
an empty label.

Set `"active": false` to remove a site from the rotation without deleting it. The game
needs **at least 5 active records** or it shows a configuration error instead of starting.

> **Data accuracy note:** the bundled records were compiled from MAT Holdings' public
> websites (matholdingsinc.com, matfoundrygroup.com, fomar.com.pl). Coordinates are
> city-level approximations, not plant addresses. Per-site turnover and employee figures
> were **not** publicly verifiable and are deliberately omitted rather than invented —
> add real values to `locations.json` when you have them. Group-level figures quoted in
> descriptions (e.g. "40 factories", "13,000+ employees", "$1.9 billion global sales")
> come from MAT's own site and should be re-checked periodically.

## Difficulty modes (spec §9)

- **Easy** — shows country, region, products and the clue.
- **Normal** (default) — region and products, but no country.
- **Hard** — company name hidden, products only, no clue.

## Notable implementation details

- **Scoring** uses the Haversine formula (`src/game/distance.ts`); totals keep full
  precision internally and round only for display. Guesses under 1 km show
  "Less than 1 km".
- **Edge cases** covered by tests: date-line crossings, extreme latitudes, near-identical
  points, submit-without-guess, duplicate-location prevention, insufficient data.
- **Accessibility**: distinct marker shapes (crosshair vs. teardrop pin) with text labels,
  not colour alone; ARIA labels and live regions; ≥44 px touch targets;
  `prefers-reduced-motion` disables auto-rotation and animations.
- **iPhone support**: `viewport-fit=cover` plus `env(safe-area-inset-*)` padding, `100dvh`
  layout, bottom-sheet UI to maximise globe visibility.
- **Persistence**: best/last score and difficulty in `localStorage`, wrapped in try/catch
  so private browsing still works.
- **Future leaderboard**: game results are held in a serialisable `answers` array — post it
  to a backend (Supabase/Firebase/internal API) at game completion when needed.
