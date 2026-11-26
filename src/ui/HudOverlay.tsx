import React, { useEffect, useState } from 'react';
import type { ControlAction, ControlState, InputManager } from '../input/InputManager';
import type { HudSnapshot } from '../game/GameEngine';
import { formatTimeEnglish } from '../storage/bestTimeStorage';

interface HudOverlayProps {
  hud: HudSnapshot;
  inputManager: InputManager;
  onPause: () => void;
  onRestart: () => void;
  onToggleMute: () => void;
}

export const HudOverlay: React.FC<HudOverlayProps> = ({
  hud,
  inputManager,
  onPause,
  onRestart,
  onToggleMute,
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
          <div className="hud-metrics">
            <div className="timer-box">
              <span className="metric-label">زمان</span>
              <span className="metric-value">{formatTimeEnglish(hud.elapsedMs)}</span>
            </div>

            <div className="progress-wrap" aria-label="پیشرفت مسیر">
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
              <span className="progress-pct">{progressPct}%</span>
            </div>
          </div>

          <div className="hud-actions">
            <button
              type="button"
              className="icon-btn"
              onClick={onToggleMute}
              aria-label={hud.muted ? 'فعال کردن صدا' : 'قطع صدا'}
            >
              {hud.muted ? 'بی‌صدا' : 'صدا'}
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={onRestart}
              aria-label="شروع دوباره"
            >
              شروع دوباره
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={onPause}
              aria-label="توقف"
            >
              توقف
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
        {/* Bottom-left: balance forward & back */}
        <div className="control-cluster">
          <button
            type="button"
            className={`touch-btn ${controlState.leanLeft ? 'active' : ''}`}
            aria-label="تمایل به عقب"
            {...bindTouch('leanLeft')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19a7 7 0 1 1 5-11.9" />
              <polyline points="8 7 12 3 12 8" />
            </svg>
            <span>عقب</span>
          </button>

          <button
            type="button"
            className={`touch-btn ${controlState.leanRight ? 'active' : ''}`}
            aria-label="تمایل به جلو"
            {...bindTouch('leanRight')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19a7 7 0 1 0-5-11.9" />
              <polyline points="16 7 12 3 12 8" />
            </svg>
            <span>جلو</span>
          </button>
        </div>

        {/* Bottom-right: brake & throttle */}
        <div className="control-cluster">
          <button
            type="button"
            className={`touch-btn brake ${controlState.brake ? 'active' : ''}`}
            aria-label="ترمز"
            {...bindTouch('brake')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="6" width="12" height="12" rx="2.5" />
            </svg>
            <span>ترمز</span>
          </button>

          <button
            type="button"
            className={`touch-btn throttle ${controlState.throttle ? 'active' : ''}`}
            aria-label="گاز"
            {...bindTouch('throttle')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 15 12 9 18 15" />
              <line x1="12" y1="9" x2="12" y2="20" />
            </svg>
            <span>گاز</span>
          </button>
        </div>
      </div>
    </div>
  );
};
