import React from 'react';
import { formatTimeEnglish } from '../storage/bestTimeStorage';

interface StartOverlayProps {
  bestTimeMs: number | null;
  onStart: () => void;
}

export const StartOverlay: React.FC<StartOverlayProps> = ({ bestTimeMs, onStart }) => {
  return (
    <div className="overlay-backdrop" role="dialog" aria-label="شروع بازی کویرسوار">
      <div className="overlay-card">
        <h1 className="game-title">کویرسوار</h1>
        <p className="game-subtitle">مسیر اول — تپه‌های کویر مرکزی</p>

        <div className="tutorial-grid">
          <div className="tutorial-item">
            <strong>گاز و ترمز (پایین راست)</strong>
            <span>برای شتاب‌گیری دکمهٔ گاز و برای کنترل سرعت ترمز را نگه دار (صفحه‌کلید: W / S)</span>
          </div>
          <div className="tutorial-item">
            <strong>تعادل موتور (پایین چپ)</strong>
            <span>در پرش‌ها و سربالایی با چپ و راست تعادل موتور را تنظیم کن (صفحه‌کلید: A / D)</span>
          </div>
        </div>

        {bestTimeMs !== null && (
          <div className="stats-row">
            <div className="stat-pill">
              <span className="stat-pill-label">بهترین زمان</span>
              <span className="stat-pill-val">{formatTimeEnglish(bestTimeMs)}</span>
            </div>
          </div>
        )}

        <div className="btn-row">
          <button
            type="button"
            className="primary-btn"
            onClick={onStart}
          >
            شروع بازی
          </button>
        </div>
      </div>
    </div>
  );
};
