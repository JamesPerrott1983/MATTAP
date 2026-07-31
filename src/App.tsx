import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import rawLocations from './data/locations.json';
import type { LatLng, MatLocation } from './types';
import { useGame } from './game/useGame';
import { hasValidCoordinates } from './game/selectLocations';
import { QUESTIONS_PER_GAME } from './game/scoring';
import { loadPrefs, savePrefs } from './game/storage';
import GlobeMap, { altitudeForDistance, midpoint, type GlobeView } from './components/GlobeMap';
import StartScreen from './components/StartScreen';
import ResultsScreen from './components/ResultsScreen';
import CompanyClueCard from './components/CompanyClueCard';
import AnswerPanel from './components/AnswerPanel';
import ProgressIndicator from './components/ProgressIndicator';
import ErrorMessage from './components/ErrorMessage';

/** Data is validated once at module scope — invalid records are dropped
 *  rather than crashing the game (NFR-05). */
const LOCATIONS: MatLocation[] = (rawLocations as MatLocation[]).filter(hasValidCoordinates);

export default function App() {
  const game = useGame(LOCATIONS);
  const { state, currentLocation, lastAnswer } = game;

  const [prefs, setPrefs] = useState(loadPrefs);
  const [isNewBest, setIsNewBest] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [view, setView] = useState<GlobeView | null>(null);
  const viewSeq = useRef(0);

  const pushView = useCallback((v: Omit<GlobeView, 'key'>) => {
    viewSeq.current += 1;
    setView({ ...v, key: `v${viewSeq.current}` });
  }, []);

  /* Record the score exactly once when a game completes. */
  const recordedFor = useRef(-1);
  useEffect(() => {
    if (state.gameStatus === 'completed' && recordedFor.current !== state.answers.length) {
      recordedFor.current = state.answers.length;
      const { prefs: nextPrefs, isNewBest: newBest } = game.finishGame();
      setPrefs(nextPrefs);
      setIsNewBest(newBest);
    }
  }, [state.gameStatus, state.answers.length, game]);

  const handleStart = useCallback(
    (difficulty: (typeof prefs)['difficulty']) => {
      try {
        setPrefs(savePrefs({ difficulty }));
        setIsNewBest(false);
        recordedFor.current = -1;
        game.startGame(difficulty);
        pushView({ lat: 25, lng: 5, altitude: 2.2, transitionMs: 900 });
      } catch (err) {
        setFatalError(err instanceof Error ? err.message : 'Failed to start the game.');
      }
    },
    [game, pushView],
  );

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

  const handleReplay = useCallback(() => {
    game.reset();
  }, [game]);

  /* NFR-05: not enough data is a configuration error, shown clearly. */
  const configError = useMemo(() => {
    const active = LOCATIONS.filter((l) => l.active);
    if (active.length < QUESTIONS_PER_GAME) {
      return `The game needs at least ${QUESTIONS_PER_GAME} active locations but only ${active.length} are configured. Please check the location data.`;
    }
    return null;
  }, []);

  if (configError) return <ErrorMessage title="Configuration error" message={configError} />;
  if (fatalError) return <ErrorMessage message={fatalError} />;

  const playing = state.gameStatus === 'playing';
  const revealed = state.gameStatus === 'answer_revealed';

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
        <span className="header__brand">
          <span className="header__logo" aria-hidden="true">
            MAT
          </span>
          Global Challenge
        </span>
        {(playing || revealed) && (
          <ProgressIndicator
            current={state.currentQuestionIndex + 1}
            totalScoreKm={state.totalScoreKm}
          />
        )}
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

        {state.gameStatus === 'not_started' && (
          <StartScreen
            bestScoreKm={prefs.bestScoreKm}
            initialDifficulty={prefs.difficulty}
            onStart={handleStart}
          />
        )}

        {playing && currentLocation && (
          <CompanyClueCard
            location={currentLocation}
            difficulty={state.difficulty}
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

        {state.gameStatus === 'completed' && (
          <ResultsScreen
            answers={state.answers}
            locations={state.selectedLocations}
            totalScoreKm={state.totalScoreKm}
            isNewBest={isNewBest}
            onReplay={handleReplay}
          />
        )}
      </main>
    </div>
  );
}
