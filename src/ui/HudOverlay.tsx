import React, { useEffect, useState } from 'react';
import type { ControlAction, ControlState, InputManager } from '../input/InputManager';
import type { GameEngine, HudSnapshot } from '../game/GameEngine';
import type { HapticButtonKind } from '../effects/Haptics';
import { formatTimeEnglish } from '../storage/bestTimeStorage';
import { BrakePedalArt, GasPedalArt, LeanControlArt } from './GameControlsArtwork';
import {
  FinishFlagMiniArt,
  HudActionIconArt,
  ProgressRiderMarkerArt,
  TimerStopwatchArt,
} from './GameUiArtwork';

interface HudOverlayProps {
  hud: HudSnapshot;
  inputManager: InputManager;
  engine: GameEngine | null;
  onPause: () => void;
  onRestart: () => void;
  onToggleMute: () => void;
  onToggleHaptics: () => void;
}

function actionToHaptic(action: ControlAction): HapticButtonKind {
  if (action === 'throttle') return 'throttle';
  if (action === 'brake') return 'brake';
  return 'lean';
}

export const HudOverlay: React.FC<HudOverlayProps> = ({
  hud,
  inputManager,
  engine,
  onPause,
  onRestart,
  onToggleMute,
  onToggleHaptics,
}) => {
  const [controlState, setControlState] = useState<ControlState>(() => inputManager.getState());

  useEffect(() => {
    return inputManager.subscribe(setControlState);
  }, [inputManager]);

  const bindTouch = (action: ControlAction) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture is unsupported
      }
      engine?.tapControlHaptic(actionToHaptic(action));
      inputManager.onPointerDown(e.pointerId, action);
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      inputManager.onPointerRelease(e.pointerId);
    },
    onPointerCancel: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      inputManager.onPointerRelease(e.pointerId);
    },
    onLostPointerCapture: (e: React.PointerEvent<HTMLButtonElement>) => {
      inputManager.onPointerRelease(e.pointerId);
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  const progressPct = Math.round(hud.progressRatio * 100);

  return (
    <div className="hud-layer">
      <div>
        <div className="hud-top">
          <div className="hud-metrics game-plaque">
            <div className="timer-box">
              <TimerStopwatchArt />
              <div className="timer-digits">
                <span className="metric-label">زمان</span>
                <span className="metric-value">{formatTimeEnglish(hud.elapsedMs)}</span>
              </div>
            </div>

            <div className="progress-wrap" aria-label="پیشرفت مسیر">
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                <div
                  className="progress-rider-pin"
                  style={{ left: `calc(${Math.max(4, Math.min(96, progressPct))}% - 15px)` }}
                >
                  <ProgressRiderMarkerArt />
                </div>
              </div>
              <FinishFlagMiniArt />
              <span className="progress-pct">{progressPct}%</span>
            </div>
          </div>

          <div className="hud-actions">
            <button
              type="button"
              className={`game-icon-btn ${hud.muted ? 'is-off' : ''}`}
              onClick={onToggleMute}
              aria-label={hud.muted ? 'فعال کردن صدا' : 'قطع صدا'}
              title={hud.muted ? 'فعال کردن صدا' : 'قطع صدا'}
            >
              <HudActionIconArt kind="sound" active={!hud.muted} />
            </button>
            <button
              type="button"
              className={`game-icon-btn ${!hud.hapticsEnabled ? 'is-off' : ''}`}
              onClick={onToggleHaptics}
              aria-label={hud.hapticsEnabled ? 'قطع ویبره' : 'فعال کردن ویبره'}
              title={hud.hapticsEnabled ? 'قطع ویبره' : 'فعال کردن ویبره'}
            >
              <HudActionIconArt kind="haptics" active={hud.hapticsEnabled} />
            </button>
            <button
              type="button"
              className="game-icon-btn"
              onClick={onRestart}
              aria-label="شروع دوباره"
              title="شروع دوباره"
            >
              <HudActionIconArt kind="restart" />
            </button>
            <button
              type="button"
              className="game-icon-btn accent"
              onClick={onPause}
              aria-label="توقف"
              title="توقف"
            >
              <HudActionIconArt kind="pause" />
            </button>
          </div>
        </div>

        {hud.activeHint && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="hint-banner">
              {hud.tutorialVisible ? 'برای شروع گاز بده — ' : ''}
              {hud.activeHint}
            </div>
          </div>
        )}
      </div>

      <div className="controls-row">
        {/* Bottom-left: illustrated lean medallions */}
        <div className="control-cluster">
          <button
            type="button"
            className={`art-ctrl-btn lean ${controlState.leanLeft ? 'pressed' : ''}`}
            aria-label="تمایل به عقب"
            {...bindTouch('leanLeft')}
          >
            <LeanControlArt direction="left" pressed={controlState.leanLeft} />
            <span className="art-ctrl-label">عقب</span>
          </button>

          <button
            type="button"
            className={`art-ctrl-btn lean ${controlState.leanRight ? 'pressed' : ''}`}
            aria-label="تمایل به جلو"
            {...bindTouch('leanRight')}
          >
            <LeanControlArt direction="right" pressed={controlState.leanRight} />
            <span className="art-ctrl-label">جلو</span>
          </button>
        </div>

        {/* Bottom-right: illustrated brake & gas pedals */}
        <div className="control-cluster">
          <button
            type="button"
            className={`art-ctrl-btn brake ${controlState.brake ? 'pressed' : ''}`}
            aria-label="ترمز"
            {...bindTouch('brake')}
          >
            <BrakePedalArt pressed={controlState.brake} />
            <span className="art-ctrl-label">ترمز</span>
          </button>

          <button
            type="button"
            className={`art-ctrl-btn throttle ${controlState.throttle ? 'pressed' : ''}`}
            aria-label="گاز"
            {...bindTouch('throttle')}
          >
            <GasPedalArt pressed={controlState.throttle} />
            <span className="art-ctrl-label">گاز</span>
          </button>
        </div>
      </div>
    </div>
  );
};
