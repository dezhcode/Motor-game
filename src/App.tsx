import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GameEngine, type HudSnapshot } from './game/GameEngine';
import { InputManager } from './input/InputManager';
import {
  isNativeAndroid,
  isPortraitViewport,
  registerMobileLifecycleBridge,
  requestLandscapeAndFullscreenIfSupported,
} from './platform/mobileBridge';
import { loadBestTimeMs } from './storage/bestTimeStorage';
import { HudOverlay } from './ui/HudOverlay';
import {
  CrashOverlay,
  FinishOverlay,
  PauseOverlay,
  RotatePromptOverlay,
} from './ui/Overlays';
import { StartOverlay } from './ui/StartOverlay';

export const App: React.FC = () => {
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const inputManager = useMemo(() => new InputManager(), []);
  const engineRef = useRef<GameEngine | null>(null);
  const [artworkState, setArtworkState] = useState<'loading' | 'ready' | 'failed'>('loading');

  const [isPortrait, setIsPortrait] = useState<boolean>(() =>
    isNativeAndroid() ? false : isPortraitViewport()
  );

  const [hud, setHud] = useState<HudSnapshot>(() => ({
    phase: 'start',
    elapsedMs: 0,
    bestTimeMs: loadBestTimeMs(),
    isNewRecord: false,
    progressRatio: 0,
    crashReason: null,
    activeHint: null,
    tutorialVisible: false,
    muted: false,
    hapticsEnabled: true,
  }));

  useEffect(() => {
    let active = true;
    const engine = new GameEngine(inputManager, setHud);
    engineRef.current = engine;

    if (canvasHostRef.current) {
      void engine.mount(canvasHostRef.current).then(() => {
        if (active) setArtworkState('ready');
      }).catch((error: unknown) => {
        console.error('Unable to load game artwork', error);
        if (active) setArtworkState('failed');
      });
    }

    const handleOrientationCheck = () => {
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
        engine.pause();
      },
      onBackgroundPause: () => {
        engine.pauseForPortraitOrBackground();
      },
    });

    return () => {
      active = false;
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

  return (
    <main className="game-shell">
      <div ref={canvasHostRef} className="canvas-host" />

      {hud.phase === 'playing' && (
        <HudOverlay
          hud={hud}
          inputManager={inputManager}
          engine={engineRef.current}
          onPause={handlePause}
          onRestart={handleRestart}
          onToggleMute={handleToggleMute}
          onToggleHaptics={handleToggleHaptics}
        />
      )}

      {hud.phase === 'start' && (
        <StartOverlay bestTimeMs={hud.bestTimeMs} onStart={handleStart} />
      )}

      {hud.phase === 'paused' && (
        <PauseOverlay
          elapsedMs={hud.elapsedMs}
          onResume={handleResume}
          onRestart={handleRestart}
        />
      )}

      {hud.phase === 'crashed' && (
        <CrashOverlay
          reason={hud.crashReason}
          progressRatio={hud.progressRatio}
          onRetry={handleRestart}
        />
      )}

      {hud.phase === 'finished' && (
        <FinishOverlay
          elapsedMs={hud.elapsedMs}
          bestTimeMs={hud.bestTimeMs}
          isNewRecord={hud.isNewRecord}
          onReplay={handleRestart}
        />
      )}

      {isPortrait && <RotatePromptOverlay />}
      {artworkState !== 'ready' && (
        <div className="artwork-loading" role="status" aria-live="polite">
          <span className="artwork-loading-mark" aria-hidden="true">✦</span>
          <p>{artworkState === 'failed' ? 'بارگذاری تصاویر انجام نشد' : 'آماده‌سازی سفر…'}</p>
          {artworkState === 'failed' && (
            <button type="button" className="game-action-btn primary" onClick={() => window.location.reload()}>تلاش دوباره</button>
          )}
        </div>
      )}
    </main>
  );
};

export default App;
