import { SkinButton } from "./BitmapSurface";
import { ControlCopy } from "./ControlContents";
import React, { useState } from "react";
import type {
  ResolvedControlLayout,
  ViewportMetrics,
} from "../input/controlLayout";
import {
  CONTROL_LIMITS,
  DEFAULT_CONTROL_LAYOUT,
  type GameSettings,
} from "../storage/settingsStorage";
import { BrakePedalArt, GasPedalArt } from "./GameControlsArtwork";
import { HudActionIconArt } from "./GameUiArtwork";
import { BitmapIcon } from "./BitmapArtwork";

interface SettingsModalProps {
  settings: GameSettings;
  resolvedLayout: ResolvedControlLayout;
  viewport: ViewportMetrics;
  hasPausedRaceProgress: boolean;
  onUpdateSettings: (next: GameSettings) => void;
  onResetLayout: () => void;
  onReplayTutorial: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  resolvedLayout,
  viewport,
  hasPausedRaceProgress,
  onUpdateSettings,
  onResetLayout,
  onReplayTutorial,
  onClose,
}) => {
  const [confirmTutorialReset, setConfirmTutorialReset] = useState(false);

  const scalePct = Math.round(resolvedLayout.effectiveScale * 100);
  const requestedScalePct = Math.round(settings.controls.buttonScale * 100);
  const opacityPct = Math.round(settings.controls.buttonOpacity * 100);
  const effectiveEdge = Math.round(
    Math.min(resolvedLayout.effectiveEdgeX, resolvedLayout.effectiveEdgeY),
  );

  // Compute proportional preview coordinates inside a crisp landscape preview canvas
  const previewRatio = Math.max(
    1.35,
    Math.min(2.35, viewport.width / Math.max(1, viewport.height)),
  );
  const previewScaleFactor = Math.min(
    0.32,
    260 / Math.max(320, viewport.width),
  );

  const previewBrakeW = Math.max(
    19,
    Math.round(resolvedLayout.brakeWidth * previewScaleFactor),
  );
  const previewBrakeH = Math.max(
    20,
    Math.round(resolvedLayout.brakeHeight * previewScaleFactor),
  );
  const previewGasW = Math.max(
    21,
    Math.round(resolvedLayout.throttleWidth * previewScaleFactor),
  );
  const previewGasH = Math.max(
    23,
    Math.round(resolvedLayout.throttleHeight * previewScaleFactor),
  );
  const previewGap = Math.max(
    3,
    Math.round(resolvedLayout.clusterGap * previewScaleFactor),
  );
  const previewPadX = Math.max(
    4,
    Math.round(
      (Math.max(viewport.safeLeft, viewport.safeRight) * 0.35 +
        resolvedLayout.effectiveEdgeX) *
        previewScaleFactor,
    ),
  );
  const previewPadY = Math.max(
    4,
    Math.round(
      (viewport.safeBottom * 0.35 + resolvedLayout.effectiveEdgeY) *
        previewScaleFactor,
    ),
  );

  const isDefaultLayout =
    Math.abs(
      settings.controls.buttonScale - DEFAULT_CONTROL_LAYOUT.buttonScale,
    ) < 0.01 &&
    settings.controls.edgeMarginPx === DEFAULT_CONTROL_LAYOUT.edgeMarginPx &&
    Math.abs(
      settings.controls.buttonOpacity - DEFAULT_CONTROL_LAYOUT.buttonOpacity,
    ) < 0.01;

  const handleTutorialClick = () => {
    if (hasPausedRaceProgress && !confirmTutorialReset) {
      setConfirmTutorialReset(true);
      return;
    }
    setConfirmTutorialReset(false);
    onReplayTutorial();
  };

  return (
    <div
      className="overlay-backdrop settings-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="تنظیمات بازی"
    >
      <div className="overlay-card game-dialog-frame settings-dialog">
        <div className="dialog-rivets" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>

        <div className="settings-header">
          <div className="settings-title-wrap">
            <HudActionIconArt kind="settings" />
            <div>
              <h2 className="game-title settings-title">
                تنظیمات کنترل و بازی
              </h2>
              <p className="game-subtitle settings-subtitle">
                تغییرات چیدمان فوراً روی پیش‌نمایش و دکمه‌ها اعمال و ذخیره
                می‌شوند
              </p>
            </div>
          </div>
          <SkinButton
            type="button"
            className="game-icon-btn settings-close-icon"
            onClick={onClose}
            aria-label="بستن تنظیمات"
            title="بستن"
          >
            <BitmapIcon kind="close" />
          </SkinButton>
        </div>

        <div className="settings-body">
          {/* Right column in RTL: Audio/Haptic toggles & layout sliders */}
          <div className="settings-controls-col">
            <div className="settings-toggles-row">
              <SkinButton
                type="button"
                className={`setting-toggle-card ${settings.soundEnabled ? "is-on" : "is-off"}`}
                onClick={() =>
                  onUpdateSettings({
                    ...settings,
                    soundEnabled: !settings.soundEnabled,
                  })
                }
                aria-pressed={settings.soundEnabled}
              >
                <HudActionIconArt kind="sound" active={settings.soundEnabled} />
                <div className="setting-toggle-text">
                  <strong>صدای بازی</strong>
                  <span>{settings.soundEnabled ? "روشن" : "خاموش"}</span>
                </div>
              </SkinButton>

              <SkinButton
                type="button"
                className={`setting-toggle-card ${settings.hapticsEnabled ? "is-on" : "is-off"}`}
                onClick={() =>
                  onUpdateSettings({
                    ...settings,
                    hapticsEnabled: !settings.hapticsEnabled,
                  })
                }
                aria-pressed={settings.hapticsEnabled}
              >
                <HudActionIconArt
                  kind="haptics"
                  active={settings.hapticsEnabled}
                />
                <div className="setting-toggle-text">
                  <strong>لرزش (ویبره)</strong>
                  <span>{settings.hapticsEnabled ? "روشن" : "خاموش"}</span>
                </div>
              </SkinButton>
            </div>

            <div className="setting-slider-card">
              <div className="setting-slider-head">
                <label htmlFor="ctrl-scale-range">
                  اندازهٔ دکمه‌های رانندگی
                </label>
                <span className="setting-val-pill">
                  {scalePct}%
                  {scalePct !== requestedScalePct
                    ? ` (محدود از ${requestedScalePct}%)`
                    : ""}
                </span>
              </div>
              <input
                id="ctrl-scale-range"
                type="range"
                className="game-range"
                min={CONTROL_LIMITS.buttonScale.min}
                max={CONTROL_LIMITS.buttonScale.max}
                step={CONTROL_LIMITS.buttonScale.step}
                value={settings.controls.buttonScale}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    controls: {
                      ...settings.controls,
                      buttonScale: Number(e.target.value),
                    },
                  })
                }
              />
            </div>

            <div className="setting-slider-card">
              <div className="setting-slider-head">
                <label htmlFor="ctrl-edge-range">
                  فاصلهٔ پدال‌ها از نشانگرها
                </label>
                <span className="setting-val-pill">
                  {effectiveEdge} px
                  {effectiveEdge < settings.controls.edgeMarginPx
                    ? ` (محدود از ${settings.controls.edgeMarginPx})`
                    : ""}
                </span>
              </div>
              <input
                id="ctrl-edge-range"
                type="range"
                className="game-range"
                min={CONTROL_LIMITS.edgeMarginPx.min}
                max={CONTROL_LIMITS.edgeMarginPx.max}
                step={CONTROL_LIMITS.edgeMarginPx.step}
                value={settings.controls.edgeMarginPx}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    controls: {
                      ...settings.controls,
                      edgeMarginPx: Number(e.target.value),
                    },
                  })
                }
              />
            </div>

            <div className="setting-slider-card">
              <div className="setting-slider-head">
                <label htmlFor="ctrl-opacity-range">شفافیت ظاهر دکمه‌ها</label>
                <span className="setting-val-pill">{opacityPct}%</span>
              </div>
              <input
                id="ctrl-opacity-range"
                type="range"
                className="game-range"
                min={CONTROL_LIMITS.buttonOpacity.min}
                max={CONTROL_LIMITS.buttonOpacity.max}
                step={CONTROL_LIMITS.buttonOpacity.step}
                value={settings.controls.buttonOpacity}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    controls: {
                      ...settings.controls,
                      buttonOpacity: Number(e.target.value),
                    },
                  })
                }
              />
              <span className="setting-hint-note">
                شفافیت فقط ظاهر دکمه‌ها را تغییر می‌دهد و ناحیهٔ لمس همیشه فعال
                می‌ماند.
              </span>
            </div>
          </div>

          {/* Left column in RTL: Instant landscape layout preview + quick actions */}
          <div className="settings-preview-col">
            <div className="preview-box-label">پیش‌نمایش زندهٔ چیدمان افقی</div>
            <div
              className="layout-preview-stage"
              style={{ aspectRatio: `${previewRatio.toFixed(2)} / 1` }}
              aria-label="پیش‌نمایش چیدمان دکمه‌های لمسی"
            >
              <div className="preview-sky-band" />
              <div className="preview-dune-band" />
              <div className="preview-top-hud">
                <span className="preview-pill" />
                <span className="preview-dots" />
              </div>

              <div className="preview-center-corridor" aria-hidden="true">
                <span className="preview-bike-dot" />
                <span className="preview-corridor-label">مسیر دید رانندگی</span>
              </div>

              <div
                className="preview-controls-row"
                style={{
                  paddingLeft: `${previewPadX}px`,
                  paddingRight: `${previewPadX}px`,
                  paddingBottom: `${previewPadY}px`,
                }}
              >
                <div
                  className="preview-cluster"
                  style={{
                    gap: `${previewGap}px`,
                    opacity: resolvedLayout.buttonOpacity,
                  }}
                >
                  <div
                    style={{
                      width: `${previewBrakeW}px`,
                      height: `${previewBrakeH}px`,
                    }}
                  >
                    <BrakePedalArt pressed={false} />
                  </div>
                </div>

                <div
                  className="preview-cluster"
                  style={{
                    gap: `${previewGap}px`,
                    opacity: resolvedLayout.buttonOpacity,
                  }}
                >
                  <div
                    style={{
                      width: `${previewGasW}px`,
                      height: `${previewGasH}px`,
                    }}
                  >
                    <GasPedalArt pressed={false} />
                  </div>
                </div>
              </div>
            </div>

            {resolvedLayout.wasClampedForScreen && (
              <div className="preview-clamp-note">
                به‌دلیل اندازهٔ نمایشگر فعلی، فاصله یا بزرگی دکمه در محدودهٔ امن
                مهار شده است.
              </div>
            )}

            {confirmTutorialReset && (
              <div className="tutorial-confirm-box" role="alert">
                <p>
                  شروع آموزش، پیشرفت مسابقهٔ متوقف‌شدهٔ فعلی را پاک می‌کند. ادامه
                  می‌دهی؟
                </p>
                <div className="tutorial-confirm-actions">
                  <SkinButton
                    type="button"
                    className="game-action-btn primary compact-btn"
                    onClick={onReplayTutorial}
                  >
                    <ControlCopy>بله، شروع آموزش</ControlCopy>
                  </SkinButton>
                  <SkinButton
                    type="button"
                    className="game-action-btn secondary compact-btn"
                    onClick={() => setConfirmTutorialReset(false)}
                  >
                    <ControlCopy>انصراف</ControlCopy>
                  </SkinButton>
                </div>
              </div>
            )}

            <div className="settings-actions-stack">
              <SkinButton
                type="button"
                className="game-action-btn secondary compact-btn"
                onClick={onResetLayout}
                disabled={isDefaultLayout}
              >
                <ControlCopy>بازگرداندن چیدمان پیش‌فرض</ControlCopy>
              </SkinButton>

              <SkinButton
                type="button"
                className="game-action-btn secondary compact-btn"
                onClick={handleTutorialClick}
              >
                <ControlCopy>اجرای دوبارهٔ آموزش</ControlCopy>
              </SkinButton>

              <SkinButton
                type="button"
                className="game-action-btn primary compact-btn"
                onClick={onClose}
              >
                <ControlCopy>بستن</ControlCopy>
              </SkinButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
