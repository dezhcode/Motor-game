import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameEngine, type HudSnapshot } from './game/GameEngine';
import { readViewportMetrics, resolveControlLayout, type ViewportMetrics } from './input/controlLayout';
import { InputManager } from './input/InputManager';
import {
  isNativeAndroid,
  isPortraitViewport,
  registerMobileLifecycleBridge,
  requestLandscapeAndFullscreenIfSupported,
} from './platform/mobileBridge';
import { loadBestTimeMs } from './storage/bestTimeStorage';
import {
  isTutorialFinishedOrSkipped,
  loadGameSettings,
  loadTutorialProgress,
  resetControlLayoutOnly,
  type GameSettings,
} from './storage/settingsStorage';
import { HudOverlay } from './ui/HudOverlay';
import {
  CrashOverlay,
  FinishOverlay,
  PauseOverlay,
  RotatePromptOverlay,
  TutorialCompletedOverlay,
  TutorialFailedOverlay,
} from './ui/Overlays';
import { SettingsModal } from './ui/SettingsModal';
import { StartOverlay } from './ui/StartOverlay';
import { LoadingScreen } from './ui/LoadingScreen';

export const App: React.FC = () => {
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const inputManager = useMemo(() => new InputManager(), []);
  const engineRef = useRef<GameEngine | null>(null);
  const [artworkState, setArtworkState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [artworkProgress, setArtworkProgress] = useState(0);
  const [showLoading, setShowLoading] = useState(true);
  const [loadingPreview] = useState(() => new URLSearchParams(window.location.search).get('loading') === 'preview');
  const dismissLoading = useCallback(() => setShowLoading(false), []);

  const [settings, setSettings] = useState<GameSettings>(() => loadGameSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsOpenRef = useRef(false);
  settingsOpenRef.current = settingsOpen;

  const [viewport, setViewport] = useState<ViewportMetrics>(() => readViewportMetrics());
  const resolvedLayout = useMemo(
    () => resolveControlLayout(settings.controls, viewport),
    [settings.controls, viewport]
  );

  const [isPortrait, setIsPortrait] = useState<boolean>(() =>
    isNativeAndroid() ? false : isPortraitViewport()
  );

  const [hud, setHud] = useState<HudSnapshot>(() => {
    const initialSettings = loadGameSettings();
    const initialTutorial = loadTutorialProgress();
    return {
      mode: 'race',
      phase: 'start',
      elapsedMs: 0,
      bestTimeMs: loadBestTimeMs(),
      isNewRecord: false,
      progressRatio: 0,
      crashReason: null,
      activeHint: null,
      tutorialVisible: false,
      tutorialDone: isTutorialFinishedOrSkipped(initialTutorial),
      tutorialState: null,
      hasPausedRaceProgress: false,
      muted: !initialSettings.soundEnabled,
      hapticsEnabled: initialSettings.hapticsEnabled,
      speedKmh: 0, distanceM: 0, coins: 0, fuelRatio: 1,
    };
  });

  useEffect(() => {
    let active = true;
    const startedAt = performance.now();
    let readyTimer: ReturnType<typeof setTimeout> | undefined;
    const engine = new GameEngine(inputManager, setHud, (synced) => {
      if (active) setSettings(synced);
    });
    engineRef.current = engine;

    if (canvasHostRef.current) {
      void engine
        .mount(canvasHostRef.current, ratio => { if (active) setArtworkProgress(ratio * 0.95); })
        .then(() => {
          if (active) {
            setArtworkProgress(1);
            readyTimer = setTimeout(() => { if (active) setArtworkState('ready'); }, Math.max(0, 2000 - (performance.now() - startedAt)));
            setViewport(readViewportMetrics());
          }
        })
        .catch((error: unknown) => {
          console.error('Unable to load game artwork', error);
          if (active) setArtworkState('failed');
        });
    }

    const handleOrientationCheck = () => {
      setViewport(readViewportMetrics());
      if (isNativeAndroid()) {
        setIsPortrait(false);
        engine.handleResize();
        return;
      }
      const portrait = isPortraitViewport();
      setIsPortrait(portrait);
      if (portrait) {
        engine.pauseForPortraitOrBackground();
      } else {
        engine.handleResize();
      }
    };

    window.addEventListener('resize', handleOrientationCheck);
    window.addEventListener('orientationchange', handleOrientationCheck);

    const unregisterBridge = registerMobileLifecycleBridge({
      onBackPressed: () => {
        if (settingsOpenRef.current) {
          setSettingsOpen(false);
          return;
        }
        engine.pause();
      },
      onBackgroundPause: () => {
        engine.pauseForPortraitOrBackground();
      },
    });

    return () => {
      active = false;
      clearTimeout(readyTimer);
      window.removeEventListener('resize', handleOrientationCheck);
      window.removeEventListener('orientationchange', handleOrientationCheck);
      unregisterBridge();
      engine.destroy();
      inputManager.destroy();
      engineRef.current = null;
    };
  }, [inputManager]);

  const handleStart = () => {
    void requestLandscapeAndFullscreenIfSupported();
    engineRef.current?.startGame();
  };

  const handleRestart = () => {
    engineRef.current?.restartRun();
  };

  const handlePause = () => {
    engineRef.current?.pause();
  };

  const handleResume = () => {
    void requestLandscapeAndFullscreenIfSupported();
    engineRef.current?.resume();
  };

  const handleToggleMute = () => {
    engineRef.current?.toggleMute();
  };

  const handleToggleHaptics = () => {
    engineRef.current?.toggleHaptics();
  };

  const handleOpenSettings = () => {
    if (hud.phase === 'playing') {
      engineRef.current?.pause();
    }
    setViewport(readViewportMetrics());
    setSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setSettingsOpen(false);
  };

  const handleUpdateSettings = (next: GameSettings) => {
    setSettings(next);
    engineRef.current?.applySettings(next);
  };

  const handleResetLayout = () => {
    const reset = resetControlLayoutOnly(settings);
    setSettings(reset);
    engineRef.current?.applySettings(reset, { silent: true });
  };

  const handleReplayTutorial = () => {
    setSettingsOpen(false);
    void requestLandscapeAndFullscreenIfSupported();
    engineRef.current?.startTutorial();
  };

  const handleSkipTutorial = () => {
    void requestLandscapeAndFullscreenIfSupported();
    engineRef.current?.skipTutorial(true);
  };

  return (
    <main className="game-shell">
      <div className="game-stage" inert={showLoading} aria-hidden={showLoading}>
      <div ref={canvasHostRef} className="canvas-host" />

      {hud.phase === 'playing' && !settingsOpen && (
        <HudOverlay
          hud={hud}
          inputManager={inputManager}
          engine={engineRef.current}
          resolvedLayout={resolvedLayout}
          onPause={handlePause}
          onRestart={handleRestart}
          onToggleMute={handleToggleMute}
          onToggleHaptics={handleToggleHaptics}
          onSkipTutorial={handleSkipTutorial}
        />
      )}

      {hud.phase === 'start' && !settingsOpen && (
        <StartOverlay
          bestTimeMs={hud.bestTimeMs}
          tutorialDone={hud.tutorialDone}
          onStart={handleStart}
          onOpenSettings={handleOpenSettings}
          onTutorial={handleReplayTutorial}
        />
      )}

      {hud.phase === 'paused' && !settingsOpen && (
        <PauseOverlay
          mode={hud.mode}
          elapsedMs={hud.elapsedMs}
          tutorialState={hud.tutorialState}
          onResume={handleResume}
          onRestart={handleRestart}
          onOpenSettings={handleOpenSettings}
          onSkipTutorial={handleSkipTutorial}
          onExitToMenu={() => engineRef.current?.exitToStartMenu()}
        />
      )}

      {hud.phase === 'crashed' && !settingsOpen && (
        <CrashOverlay
          reason={hud.crashReason}
          progressRatio={hud.progressRatio}
          onRetry={handleRestart}
        />
      )}

      {hud.phase === 'tutorial_failed' && hud.tutorialState && !settingsOpen && (
        <TutorialFailedOverlay
          tutorialState={hud.tutorialState}
          onRetryStep={() => engineRef.current?.retryTutorialStep()}
          onSkip={handleSkipTutorial}
        />
      )}

      {hud.phase === 'tutorial_completed' && !settingsOpen && (
        <TutorialCompletedOverlay
          onStartRace={() => {
            void requestLandscapeAndFullscreenIfSupported();
            engineRef.current?.startMainRace();
          }}
          onReplayTutorial={() => engineRef.current?.startTutorial()}
        />
      )}

      {hud.phase === 'finished' && !settingsOpen && (
        <FinishOverlay
          elapsedMs={hud.elapsedMs}
          bestTimeMs={hud.bestTimeMs}
          isNewRecord={hud.isNewRecord}
          onReplay={handleRestart}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          settings={settings}
          resolvedLayout={resolvedLayout}
          viewport={viewport}
          hasPausedRaceProgress={hud.hasPausedRaceProgress}
          onUpdateSettings={handleUpdateSettings}
          onResetLayout={handleResetLayout}
          onReplayTutorial={handleReplayTutorial}
          onClose={handleCloseSettings}
        />
      )}

      {isPortrait && !showLoading && <RotatePromptOverlay />}
      </div>
      {showLoading && <LoadingScreen progress={artworkProgress} state={artworkState} preview={loadingPreview} onContinue={dismissLoading} />}
    </main>
  );
};

export default App;
