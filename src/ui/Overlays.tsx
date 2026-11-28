import React from 'react';
import type { GameMode } from '../game/GameEngine';
import type { CrashReason } from '../physics/PhysicsWorld';
import { formatTimeEnglish } from '../storage/bestTimeStorage';
import type { TutorialSnapshot } from '../tutorial/TutorialController';
import { ActionBtnIconArt, OverlayBadgeArt, TimerStopwatchArt } from './GameUiArtwork';
import { BitmapIcon } from './BitmapArtwork';

export const PauseOverlay: React.FC<{
  mode: GameMode;
  elapsedMs: number;
  tutorialState: TutorialSnapshot | null;
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onSkipTutorial?: () => void;
  onExitToMenu?: () => void;
}> = ({
  mode,
  elapsedMs,
  tutorialState,
  onResume,
  onRestart,
  onOpenSettings,
  onSkipTutorial,
  onExitToMenu,
}) => {
  const isTutorial = mode === 'tutorial';
  return (
    <div className="overlay-backdrop" role="dialog" aria-label={isTutorial ? 'توقف آموزش' : 'توقف بازی'}>
      <div className="overlay-card game-dialog-frame">
        <div className="dialog-rivets" aria-hidden="true">
          <span /><span /><span /><span />
        </div>
        <OverlayBadgeArt kind="pause" />
        <h2 className="game-title">{isTutorial ? 'توقف آموزش' : 'توقف بازی'}</h2>
        <p className="game-subtitle">
          {isTutorial && tutorialState
            ? `آموزش عملی — بخش ${tutorialState.stepIndex + 1} از ${tutorialState.totalSteps}`
            : 'فیزیک و زمان در حالت توقف است'}
        </p>

        {!isTutorial && (
          <div className="stats-row">
            <div className="stat-pill">
              <TimerStopwatchArt />
              <div>
                <span className="stat-pill-label">زمان فعلی</span>
                <span className="stat-pill-val">{formatTimeEnglish(elapsedMs)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="btn-row">
          <button type="button" className="game-action-btn primary" onClick={onResume}>
            <ActionBtnIconArt kind="resume" />
            <span>{isTutorial ? 'ادامه آموزش' : 'ادامه'}</span>
          </button>
          <button type="button" className="game-action-btn secondary" onClick={onRestart}>
            <ActionBtnIconArt kind="replay" />
            <span>{isTutorial ? 'تکرار این بخش' : 'شروع دوباره'}</span>
          </button>
          <button type="button" className="game-action-btn secondary" onClick={onOpenSettings}>
            <ActionBtnIconArt kind="settings" />
            <span>تنظیمات</span>
          </button>
          {isTutorial && onSkipTutorial && (
            <button type="button" className="game-action-btn secondary" onClick={onSkipTutorial}>
              <span>رد کردن آموزش</span>
            </button>
          )}
          {!isTutorial && onExitToMenu && (
            <button type="button" className="game-action-btn secondary" onClick={onExitToMenu}>
              <span>منوی اصلی</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

function getCrashLabel(reason: CrashReason | null): string {
  switch (reason) {
    case 'head_impact':
      return 'برخورد سر راننده با زمین';
    case 'sustained_flip':
      return 'واژگونی ادامه‌دار موتور';
    case 'out_of_bounds':
      return 'سقوط خارج از محدودهٔ مسیر';
    case 'hazard_impact':
      return 'برخورد با چرخ‌ارهٔ دره!';
    default:
      return 'تعادل موتور از دست رفت';
  }
}

export const CrashOverlay: React.FC<{
  reason: CrashReason | null;
  progressRatio: number;
  onRetry: () => void;
  onExitToMenu?: () => void;
}> = ({ reason, progressRatio, onRetry, onExitToMenu }) => {
  const pct = Math.round(progressRatio * 100);
  return (
    <div className="overlay-backdrop" role="dialog" aria-label="شکست">
      <div className="overlay-card game-dialog-frame">
        <div className="dialog-rivets" aria-hidden="true">
          <span /><span /><span /><span />
        </div>
        <OverlayBadgeArt kind="crash" />
        <h2 className="game-title">زمین خوردی!</h2>
        <p className="game-subtitle">{getCrashLabel(reason)}</p>

        <div className="stats-row">
          <div className="stat-pill">
            <div>
              <span className="stat-pill-label">پیشرفت مسیر</span>
              <span className="stat-pill-val">{pct}%</span>
            </div>
          </div>
        </div>

        <div className="btn-row">
          <button type="button" className="game-action-btn primary" onClick={onRetry}>
            <ActionBtnIconArt kind="replay" />
            <span>تلاش دوباره</span>
          </button>
          {onExitToMenu && <button className="game-action-btn secondary" onClick={onExitToMenu}>گاراژ و فروشگاه</button>}
        </div>
      </div>
    </div>
  );
};

export const TutorialFailedOverlay: React.FC<{
  tutorialState: TutorialSnapshot;
  onRetryStep: () => void;
  onSkip: () => void;
}> = ({ tutorialState, onRetryStep, onSkip }) => {
  return (
    <div className="overlay-backdrop" role="dialog" aria-label="تلاش دوباره آموزش">
      <div className="overlay-card game-dialog-frame">
        <div className="dialog-rivets" aria-hidden="true">
          <span /><span /><span /><span />
        </div>
        <OverlayBadgeArt kind="crash" />
        <h2 className="game-title">دوباره امتحان کن</h2>
        <p className="game-subtitle">
          {tutorialState.failReasonFa ?? 'همین بخش را یک بار دیگر انجام بده.'}
        </p>

        <div className="btn-row">
          <button type="button" className="game-action-btn primary" onClick={onRetryStep}>
            <ActionBtnIconArt kind="replay" />
            <span>تلاش دوباره این بخش</span>
          </button>
          <button type="button" className="game-action-btn secondary" onClick={onSkip}>
            <span>رد کردن آموزش</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const TutorialCompletedOverlay: React.FC<{
  onStartRace: () => void;
  onReplayTutorial: () => void;
}> = ({ onStartRace, onReplayTutorial }) => {
  return (
    <div className="overlay-backdrop" role="dialog" aria-label="پایان آموزش">
      <div className="overlay-card game-dialog-frame">
        <div className="dialog-rivets" aria-hidden="true">
          <span /><span /><span /><span />
        </div>
        <OverlayBadgeArt kind="victory" stars={3} />
        <div className="record-badge">آموزش کامل شد!</div>
        <h2 className="game-title">آمادهٔ کویرسوار هستی</h2>
        <p className="game-subtitle">
          گاز، ترمز، تعادل و فرود را با موفقیت تمرین کردی؛ حالا نوبت مسیر اصلی است.
        </p>

        <div className="btn-row">
          <button type="button" className="game-action-btn primary" onClick={onStartRace}>
            <ActionBtnIconArt kind="play" />
            <span>شروع مسابقه</span>
          </button>
          <button type="button" className="game-action-btn secondary" onClick={onReplayTutorial}>
            <ActionBtnIconArt kind="replay" />
            <span>تکرار آموزش</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const FinishOverlay: React.FC<{
  elapsedMs: number;
  bestTimeMs: number | null;
  isNewRecord: boolean;
  onReplay: () => void;
  onExitToMenu?: () => void;
}> = ({ elapsedMs, bestTimeMs, isNewRecord, onReplay, onExitToMenu }) => {
  const stars = elapsedMs <= 24000 ? 3 : elapsedMs <= 32000 ? 2 : 1;
  return (
    <div className="overlay-backdrop" role="dialog" aria-label="پایان مسیر">
      <div className="overlay-card game-dialog-frame">
        <div className="dialog-rivets" aria-hidden="true">
          <span /><span /><span /><span />
        </div>
        <OverlayBadgeArt kind="victory" stars={stars} />
        {isNewRecord && <div className="record-badge">رکورد جدید ثبت شد!</div>}
        <h2 className="game-title">مسیر تمام شد!</h2>
        <p className="game-subtitle">آفرین، با موفقیت از خط پایان کویر گذشتی</p>

        <div className="stats-row">
          <div className="stat-pill">
            <TimerStopwatchArt />
            <div>
              <span className="stat-pill-label">زمان این دور</span>
              <span className="stat-pill-val">{formatTimeEnglish(elapsedMs)}</span>
            </div>
          </div>
          <div className="stat-pill">
            <TimerStopwatchArt />
            <div>
              <span className="stat-pill-label">بهترین زمان</span>
              <span className="stat-pill-val">
                {formatTimeEnglish(bestTimeMs ?? elapsedMs)}
              </span>
            </div>
          </div>
        </div>

        <div className="btn-row">
          <button type="button" className="game-action-btn primary" onClick={onReplay}>
            <ActionBtnIconArt kind="replay" />
            <span>دوباره بازی کن</span>
          </button>
          {onExitToMenu && <button className="game-action-btn secondary" onClick={onExitToMenu}>گاراژ و فروشگاه</button>}
        </div>
      </div>
    </div>
  );
};

export const RotatePromptOverlay: React.FC = () => {
  return (
    <div className="portrait-lock-overlay" role="alert" aria-live="assertive">
      <BitmapIcon kind="rotate" className="rotate-icon"/>
      <h2 className="portrait-lock-title">برای بازی گوشی را افقی بگیر</h2>
      <p className="portrait-lock-desc">
        کویرسوار مخصوص نمایش افقی طراحی شده است. پس از چرخاندن گوشی، بازی آمادهٔ ادامه خواهد بود.
      </p>
    </div>
  );
};
