import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DailyResult, LatLng } from './types';
import { useGame } from './game/useGame';
import { QUESTIONS_PER_GAME } from './game/scoring';
import { loadDailyResult, loadPrefs, saveDailyResult } from './game/storage';
import { dailyLocations, dayKey, gameNumber } from './game/daily';
import { effectiveLocations } from './data/locationsStore';
import GlobeMap, { altitudeForDistance, midpoint, type GlobeView } from './components/GlobeMap';
import StartScreen from './components/StartScreen';
import ResultsScreen from './components/ResultsScreen';
import CompanyClueCard from './components/CompanyClueCard';
import AnswerPanel from './components/AnswerPanel';
import ProgressIndicator from './components/ProgressIndicator';
import ErrorMessage from './components/ErrorMessage';
import AdminPage from './components/AdminPage';
import matLogoSmall from './assets/mat-logo-small.png';

export default function App() {
  /* ---------------- routing (#admin) ---------------- */
  const [route, setRoute] = useState(() => window.location.hash);
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  /* ---------------- daily game identity ---------------- */
  const today = useMemo(() => new Date(), []);
  const todayKey = dayKey(today);
  const gameNo = gameNumber(today);

  const locations = useMemo(() => effectiveLocations(), []);

  const game = useGame();
  const { state, currentLocation, lastAnswer } = game;

  const [prefs, setPrefs] = useState(loadPrefs);
  const [isNewBest, setIsNewBest] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [storedResult, setStoredResult] = useState<DailyResult | null>(() =>
    loadDailyResult(todayKey),
  );
  const [view, setView] = useState<GlobeView | null>(null);
  const viewSeq = useRef(0);

  const pushView = useCallback((v: Omit<GlobeView, 'key'>) => {
    viewSeq.current += 1;
    setView({ ...v, key: `v${viewSeq.current}` });
  }, []);

  /* Record the score once when today's game completes. */
  const recorded = useRef(false);
  useEffect(() => {
    if (state.gameStatus === 'completed' && !recorded.current) {
      recorded.current = true;
      const { prefs: nextPrefs, isNewBest: newBest } = game.finishGame();
      setPrefs(nextPrefs);
      setIsNewBest(newBest);
      const result: DailyResult = {
        dayKey: todayKey,
        gameNo,
        answers: state.answers,
        totalScoreKm: state.totalScoreKm,
        locationIds: state.selectedLocations.map((l) => l.id),
      };
      saveDailyResult(result);
      setStoredResult(result);
    }
  }, [state, game, todayKey, gameNo]);

  const handleStart = useCallback(() => {
    try {
      game.startGame(dailyLocations(locations, today));
      pushView({ lat: 25, lng: 5, altitude: 2.2, transitionMs: 900 });
    } catch (err) {
      setFatalError(err instanceof Error ? err.message : 'Failed to start the game.');
    }
  }, [game, locations, today, pushView]);

  const handleTap = useCallback(
    (coords: LatLng) => {
      game.placeGuess(coords);
      // Light haptic tick where supported — never required (spec §15).
      if ('vibrate' in navigator) navigator.vibrate?.(8);
    },
    [game],
  );

  const handleSubmit = useCallback(() => {
    if (!state.currentGuess || !currentLocation) return;
    game.submitGuess();
    const correct = { lat: currentLocation.latitude, lng: currentLocation.longitude };
    const mid = midpoint(state.currentGuess, correct);
    // Rough separation estimate is fine here — it only drives camera altitude.
    const kmApart = Math.hypot(
      (state.currentGuess.lat - correct.lat) * 111,
      Math.min(
        Math.abs(state.currentGuess.lng - correct.lng),
        360 - Math.abs(state.currentGuess.lng - correct.lng),
      ) * 78,
    );
    // Fly the camera so both markers are visible (spec §5.2).
    pushView({
      lat: mid.lat,
      lng: mid.lng,
      altitude: altitudeForDistance(kmApart),
      transitionMs: 1200,
    });
  }, [game, state.currentGuess, currentLocation, pushView]);

  const handleNext = useCallback(() => {
    game.nextQuestion();
    // Pull back to a wide view for the next question.
    pushView({
      lat: view?.lat ?? 25,
      lng: view?.lng ?? 5,
      altitude: 2.2,
      transitionMs: 800,
    });
  }, [game, pushView, view]);

  /* NFR-05: not enough data is a configuration error, shown clearly. */
  const configError = useMemo(() => {
    const active = locations.filter((l) => l.active);
    if (active.length < QUESTIONS_PER_GAME) {
      return `The game needs at least ${QUESTIONS_PER_GAME} active locations but only ${active.length} are configured. Please check the location data.`;
    }
    return null;
  }, [locations]);

  /* ---------------- admin route ---------------- */
  if (route === '#admin') return <AdminPage />;

  if (configError) return <ErrorMessage title="Configuration error" message={configError} />;
  if (fatalError) return <ErrorMessage message={fatalError} />;

  const playing = state.gameStatus === 'playing';
  const revealed = state.gameStatus === 'answer_revealed';
  const liveCompleted = state.gameStatus === 'completed';

  /* Already played today (e.g. after a page reload) → show stored results. */
  const showStored = !playing && !revealed && !liveCompleted && storedResult !== null;

  const guessMarker: LatLng | null =
    state.currentGuess ??
    (revealed && lastAnswer
      ? { lat: lastAnswer.guessedLatitude, lng: lastAnswer.guessedLongitude }
      : null);

  const correctMarker =
    revealed && currentLocation
      ? {
          lat: currentLocation.latitude,
          lng: currentLocation.longitude,
          label: currentLocation.city,
        }
      : null;

  return (
    <div className="app">
      <header className="header">
        {playing || revealed ? (
          <ProgressIndicator
            current={state.currentQuestionIndex + 1}
            totalScoreKm={state.totalScoreKm}
          />
        ) : (
          <span />
        )}
        <img src={matLogoSmall} alt="MAT Global Challenge" className="header__logoimg" />
      </header>

      <main className="stage">
        <GlobeMap
          guess={guessMarker}
          correct={correctMarker}
          showArc={revealed}
          interactive={playing}
          autoRotate={state.gameStatus === 'not_started'}
          view={view}
          onTap={handleTap}
        />

        {state.gameStatus === 'not_started' && !showStored && (
          <StartScreen
            gameNo={gameNo}
            dateLabel={todayKey}
            bestScoreKm={prefs.bestScoreKm}
            onStart={handleStart}
          />
        )}

        {playing && currentLocation && (
          <CompanyClueCard
            location={currentLocation}
            hasGuess={state.currentGuess !== null}
            onSubmit={handleSubmit}
          />
        )}

        {revealed && currentLocation && lastAnswer && (
          <AnswerPanel
            location={currentLocation}
            answer={lastAnswer}
            totalScoreKm={state.totalScoreKm}
            onNext={handleNext}
          />
        )}

        {liveCompleted && (
          <ResultsScreen
            answers={state.answers}
            locations={state.selectedLocations}
            totalScoreKm={state.totalScoreKm}
            gameNo={gameNo}
            dateLabel={todayKey}
            isNewBest={isNewBest}
          />
        )}

        {showStored && storedResult && (
          <ResultsScreen
            answers={storedResult.answers}
            locations={locations.filter((l) => storedResult.locationIds.includes(l.id))}
            totalScoreKm={storedResult.totalScoreKm}
            gameNo={storedResult.gameNo}
            dateLabel={storedResult.dayKey}
            isNewBest={false}
          />
        )}
      </main>
    </div>
  );
}
