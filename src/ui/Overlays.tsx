import React from 'react';
import type { CrashReason } from '../physics/PhysicsWorld';
import { formatTimeEnglish } from '../storage/bestTimeStorage';

export const PauseOverlay: React.FC<{
  elapsedMs: number;
  onResume: () => void;
  onRestart: () => void;
}> = ({ elapsedMs, onResume, onRestart }) => {
  return (
    <div className="overlay-backdrop" role="dialog" aria-label="توقف بازی">
      <div className="overlay-card">
        <h2 className="game-title">توقف بازی</h2>
        <p className="game-subtitle">فیزیک و زمان در حالت توقف است</p>

        <div className="stats-row">
          <div className="stat-pill">
            <span className="stat-pill-label">زمان فعلی</span>
            <span className="stat-pill-val">{formatTimeEnglish(elapsedMs)}</span>
          </div>
        </div>

        <div className="btn-row">
          <button type="button" className="primary-btn" onClick={onResume}>
            ادامه
          </button>
          <button type="button" className="secondary-btn" onClick={onRestart}>
            شروع دوباره
          </button>
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
    default:
      return 'تعادل موتور از دست رفت';
  }
}

export const CrashOverlay: React.FC<{
  reason: CrashReason | null;
  progressRatio: number;
  onRetry: () => void;
}> = ({ reason, progressRatio, onRetry }) => {
  return (
    <div className="overlay-backdrop" role="dialog" aria-label="شکست">
      <div className="overlay-card">
        <h2 className="game-title">زمین خوردی!</h2>
        <p className="game-subtitle">{getCrashLabel(reason)}</p>

        <div className="stats-row">
          <div className="stat-pill">
            <span className="stat-pill-label">پیشرفت مسیر</span>
            <span className="stat-pill-val">{Math.round(progressRatio * 100)}%</span>
          </div>
        </div>

        <div className="btn-row">
          <button type="button" className="primary-btn" onClick={onRetry}>
            تلاش دوباره
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
}> = ({ elapsedMs, bestTimeMs, isNewRecord, onReplay }) => {
  return (
    <div className="overlay-backdrop" role="dialog" aria-label="پایان مسیر">
      <div className="overlay-card">
        {isNewRecord && <div className="record-badge">رکورد جدید ثبت شد!</div>}
        <h2 className="game-title">مسیر تمام شد!</h2>
        <p className="game-subtitle">آفرین، با موفقیت از خط پایان کویر گذشتی</p>

        <div className="stats-row">
          <div className="stat-pill">
            <span className="stat-pill-label">زمان این دور</span>
            <span className="stat-pill-val">{formatTimeEnglish(elapsedMs)}</span>
          </div>
          <div className="stat-pill">
            <span className="stat-pill-label">بهترین زمان</span>
            <span className="stat-pill-val">
              {formatTimeEnglish(bestTimeMs ?? elapsedMs)}
            </span>
          </div>
        </div>

        <div className="btn-row">
          <button type="button" className="primary-btn" onClick={onReplay}>
            دوباره بازی کن
          </button>
        </div>
      </div>
    </div>
  );
};

export const RotatePromptOverlay: React.FC = () => {
  return (
    <div className="portrait-lock-overlay" role="alert" aria-live="assertive">
      <svg
        className="rotate-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
        <path d="M2 12a10 10 0 0 1 4-8" />
        <polyline points="2 6 2 12 8 12" />
      </svg>
      <h2 className="portrait-lock-title">برای بازی گوشی را افقی بگیر</h2>
      <p className="portrait-lock-desc">
        کویرسوار مخصوص نمایش افقی طراحی شده است. پس از چرخاندن گوشی، بازی آمادهٔ ادامه خواهد بود.
      </p>
    </div>
  );
};
