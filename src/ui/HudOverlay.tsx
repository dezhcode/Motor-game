import { SkinButton } from "./BitmapSurface";
import { ControlCopy } from "./ControlContents";
import { PaintedDashboard } from "./PaintedDashboard";
import React, { useEffect, useState } from "react";
import type { GameEngine, HudSnapshot } from "../game/GameEngine";
import type { HapticButtonKind } from "../effects/Haptics";
import { resolveDrivePlacement } from "../input/controlLayout";
import type { ResolvedControlLayout } from "../input/controlLayout";
import type {
  ControlAction,
  ControlState,
  InputManager,
} from "../input/InputManager";
import { formatTimeEnglish } from "../storage/bestTimeStorage";
import { BrakePedalArt, GasPedalArt } from "./GameControlsArtwork";
import {
  FinishFlagMiniArt,
  HudActionIconArt,
  ProgressRiderMarkerArt,
  TimerStopwatchArt,
} from "./GameUiArtwork";

interface HudOverlayProps {
  hud: HudSnapshot;
  inputManager: InputManager;
  engine: GameEngine | null;
  resolvedLayout: ResolvedControlLayout;
  onPause: () => void;
  onRestart: () => void;
  onToggleMute: () => void;
  onToggleHaptics: () => void;
  onSkipTutorial: () => void;
}

function actionToHaptic(action: ControlAction): HapticButtonKind {
  if (action === "throttle") return "throttle";
  if (action === "brake") return "brake";
  return "lean";
}

export const HudOverlay: React.FC<HudOverlayProps> = ({
  hud,
  inputManager,
  engine,
  resolvedLayout,
  onPause,
  onRestart,
  onToggleMute,
  onToggleHaptics,
  onSkipTutorial,
}) => {
  const [controlState, setControlState] = useState<ControlState>(() =>
    inputManager.getState(),
  );

  useEffect(() => {
    const unsubscribe = inputManager.subscribe(setControlState);
    return () => {
      unsubscribe();
      inputManager.clearAll();
    };
  }, [inputManager]);

  const bindTouch = (action: ControlAction) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Global window pointerup/pointercancel fallbacks handle release if unsupported
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

  const placement = resolveDrivePlacement(resolvedLayout);
  const isTutorial = hud.mode === "tutorial";
  const tutorialState = hud.tutorialState;
  const highlights = tutorialState?.highlightControls ?? [];
  const isHighlighted = (action: ControlAction) =>
    isTutorial && highlights.includes(action);

  const progressPct = Math.round(hud.progressRatio * 100);
  const bannerText =
    isTutorial && tutorialState
      ? (tutorialState.feedbackFa ?? tutorialState.instructionFa)
      : hud.activeHint;
  const bannerIsFeedback = Boolean(isTutorial && tutorialState?.feedbackFa);

  return (
    <div className="hud-layer painted-hud">
      <PaintedDashboard hud={hud} engine={engine} />
      <div>
        <div className="hud-top">
          {isTutorial && tutorialState ? (
            <div className="hud-metrics game-plaque tutorial-plaque">
              <div className="tutorial-badge-title">آموزش عملی</div>
              <div className="tutorial-steps-pills" aria-label="پیشرفت آموزش">
                {Array.from({ length: tutorialState.totalSteps }).map(
                  (_, idx) => {
                    const done = idx < tutorialState.stepIndex;
                    const active = idx === tutorialState.stepIndex;
                    return (
                      <span
                        key={idx}
                        className={`tutorial-step-dot ${done ? "is-done" : active ? "is-active" : ""}`}
                      />
                    );
                  },
                )}
                <span className="tutorial-step-counter">
                  بخش {tutorialState.stepIndex + 1} از{" "}
                  {tutorialState.totalSteps}
                </span>
              </div>
            </div>
          ) : (
            <div className="hud-metrics game-plaque">
              <div className="timer-box">
                <TimerStopwatchArt />
                <div className="timer-digits">
                  <span className="metric-label">زمان</span>
                  <span className="metric-value">
                    {formatTimeEnglish(hud.elapsedMs)}
                  </span>
                </div>
              </div>

              <div className="progress-wrap" aria-label="پیشرفت مسیر">
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${progressPct}%` }}
                  />
                  <div
                    className="progress-rider-pin"
                    style={{
                      left: `calc(${Math.max(4, Math.min(96, progressPct))}% - 15px)`,
                    }}
                  >
                    <ProgressRiderMarkerArt />
                  </div>
                </div>
                <FinishFlagMiniArt />
                <span className="progress-pct">{progressPct}%</span>
              </div>
            </div>
          )}

          <div className="hud-actions">
            {isTutorial && (
              <SkinButton
                type="button"
                className="skip-tutorial-btn"
                onClick={onSkipTutorial}
              >
                <ControlCopy>رد کردن آموزش</ControlCopy>
              </SkinButton>
            )}
            <SkinButton
              type="button"
              className={`game-icon-btn ${hud.muted ? "is-off" : ""}`}
              onClick={onToggleMute}
              aria-label={hud.muted ? "فعال کردن صدا" : "قطع صدا"}
              title={hud.muted ? "فعال کردن صدا" : "قطع صدا"}
            >
              <HudActionIconArt kind="sound" active={!hud.muted} />
            </SkinButton>
            <SkinButton
              type="button"
              className={`game-icon-btn ${!hud.hapticsEnabled ? "is-off" : ""}`}
              onClick={onToggleHaptics}
              aria-label={hud.hapticsEnabled ? "قطع ویبره" : "فعال کردن ویبره"}
              title={hud.hapticsEnabled ? "قطع ویبره" : "فعال کردن ویبره"}
            >
              <HudActionIconArt kind="haptics" active={hud.hapticsEnabled} />
            </SkinButton>
            <SkinButton
              type="button"
              className="game-icon-btn"
              onClick={onRestart}
              aria-label={isTutorial ? "تکرار این بخش" : "شروع دوباره"}
              title={isTutorial ? "تکرار این بخش" : "شروع دوباره"}
            >
              <HudActionIconArt kind="restart" />
            </SkinButton>
            <SkinButton
              type="button"
              className="game-icon-btn accent"
              onClick={onPause}
              aria-label="توقف"
              title="توقف"
            >
              <HudActionIconArt kind="pause" />
            </SkinButton>
          </div>
        </div>

        {bannerText && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div
              className={`hint-banner ${bannerIsFeedback ? "is-feedback" : ""}`}
            >
              {!isTutorial && hud.tutorialVisible ? "برای شروع گاز بده — " : ""}
              {bannerText}
            </div>
          </div>
        )}
      </div>

      <div
        className="controls-row drive-controls"
        style={{
          width: `${placement.width}px`,
          paddingLeft: 0,
          paddingRight: 0,
          paddingBottom: `${resolvedLayout.effectiveEdgeY}px`,
        }}
      >
        {/* Left pedal: brake also lowers the front. */}
        <div
          className="control-cluster"
          style={{ gap: `${resolvedLayout.clusterGap}px` }}
        >
          <button
            type="button"
            className={`art-ctrl-btn brake ${controlState.brake ? "pressed" : ""} ${
              isHighlighted("brake") ? "is-tutorial-target" : ""
            }`}
            style={{
              width: `${Math.max(resolvedLayout.touchMinSize, resolvedLayout.brakeWidth)}px`,
              height: `${Math.max(resolvedLayout.touchMinSize, resolvedLayout.brakeHeight)}px`,
            }}
            aria-pressed={controlState.brake}
            aria-label="ترمز"
            {...bindTouch("brake")}
          >
            <div
              className="art-ctrl-visual"
              style={{
                width: `${resolvedLayout.brakeWidth}px`,
                height: `${resolvedLayout.brakeHeight}px`,
                opacity: resolvedLayout.buttonOpacity,
              }}
            >
              <BrakePedalArt pressed={controlState.brake} />
              <span className="art-ctrl-label">ترمز</span>
            </div>
          </button>
        </div>

        {/* Right pedal: gas also raises the front. */}
        <div
          className="control-cluster"
          style={{ gap: `${resolvedLayout.clusterGap}px` }}
        >
          <button
            type="button"
            className={`art-ctrl-btn throttle ${controlState.throttle ? "pressed" : ""} ${
              isHighlighted("throttle") ? "is-tutorial-target" : ""
            }`}
            style={{
              width: `${Math.max(resolvedLayout.touchMinSize, resolvedLayout.throttleWidth)}px`,
              height: `${Math.max(resolvedLayout.touchMinSize, resolvedLayout.throttleHeight)}px`,
            }}
            aria-pressed={controlState.throttle}
            aria-label="گاز"
            {...bindTouch("throttle")}
          >
            <div
              className="art-ctrl-visual"
              style={{
                width: `${resolvedLayout.throttleWidth}px`,
                height: `${resolvedLayout.throttleHeight}px`,
                opacity: resolvedLayout.buttonOpacity,
              }}
            >
              <GasPedalArt pressed={controlState.throttle} />
              <span className="art-ctrl-label">گاز</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
