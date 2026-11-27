import React from 'react';
import { formatTimeEnglish } from '../storage/bestTimeStorage';
import { BrakePedalArt, GasPedalArt, LeanControlArt } from './GameControlsArtwork';
import { ActionBtnIconArt, KavirLogoCrestArt, TimerStopwatchArt } from './GameUiArtwork';

interface StartOverlayProps {
  bestTimeMs: number | null;
  tutorialDone: boolean;
  onStart: () => void;
  onOpenSettings: () => void;
}

export const StartOverlay: React.FC<StartOverlayProps> = ({
  bestTimeMs,
  tutorialDone,
  onStart,
  onOpenSettings,
}) => {
  return (
    <div className="overlay-backdrop" role="dialog" aria-label="شروع بازی کویرسوار">
      <div className="overlay-card game-dialog-frame">
        <div className="dialog-rivets" aria-hidden="true">
          <span /><span /><span /><span />
        </div>

        <KavirLogoCrestArt />
        <h1 className="game-title">کویرسوار</h1>
        <p className="game-subtitle">
          {tutorialDone
            ? 'مسیر اول — تپه‌ها و پل‌های کویر مرکزی'
            : 'آموزش کوتاه عملی + مسیر کویر مرکزی'}
        </p>

        <div className="tutorial-grid">
          <div className="tutorial-item illustrated">
            <div className="tutorial-preview">
              <GasPedalArt pressed={false} />
              <BrakePedalArt pressed={false} />
            </div>
            <div>
              <strong>گاز و ترمز (پایین راست)</strong>
              <span>برای شتاب‌گیری پدال گاز و برای کنترل سرعت ترمز را نگه دار (W / S)</span>
            </div>
          </div>

          <div className="tutorial-item illustrated">
            <div className="tutorial-preview">
              <LeanControlArt direction="left" pressed={false} />
              <LeanControlArt direction="right" pressed={false} />
            </div>
            <div>
              <strong>تعادل موتور (پایین چپ)</strong>
              <span>در پرش‌ها و سربالایی با چپ و راست تعادل موتور را نگه دار (A / D)</span>
            </div>
          </div>
        </div>

        {bestTimeMs !== null && (
          <div className="stats-row">
            <div className="stat-pill">
              <TimerStopwatchArt />
              <div>
                <span className="stat-pill-label">بهترین زمان ثبت‌شده</span>
                <span className="stat-pill-val">{formatTimeEnglish(bestTimeMs)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="btn-row">
          <button
            type="button"
            className="game-action-btn primary"
            onClick={onStart}
          >
            <ActionBtnIconArt kind="play" />
            <span>{tutorialDone ? 'شروع مسابقه' : 'شروع بازی'}</span>
          </button>

          <button
            type="button"
            className="game-action-btn secondary"
            onClick={onOpenSettings}
          >
            <ActionBtnIconArt kind="settings" />
            <span>تنظیمات</span>
          </button>
        </div>
      </div>
    </div>
  );
};
