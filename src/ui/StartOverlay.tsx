import React, { useEffect, useRef, useState } from 'react';
import { formatTimeEnglish } from '../storage/bestTimeStorage';
import { HudActionIconArt, TimerStopwatchArt } from './GameUiArtwork';
import { HomeRiderArt } from './HomeRiderArt';

interface StartOverlayProps {
  bestTimeMs: number | null;
  tutorialDone: boolean;
  onStart: () => void;
  onTutorial: () => void;
  onOpenSettings: () => void;
}

const MenuRiderIcon: React.FC = () => (
  <svg viewBox="0 0 100 72" aria-hidden="true">
    <circle cx="22" cy="54" r="14" /><circle cx="78" cy="54" r="14" />
    <path d="M22 54 42 30 68 35 78 54M42 30 29 22M60 22 71 25 78 54M38 47 60 43" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="47" cy="12" r="9" /><path d="m46 24-9 11 15 5 8-10 9 1" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
  </svg>
);

export const StartOverlay: React.FC<StartOverlayProps> = ({
  bestTimeMs, tutorialDone, onStart, onTutorial, onOpenSettings,
}) => {
  const [recordsOpen, setRecordsOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const current = dialog.current;
    if (!current) return;
    if (recordsOpen) {
      if (!current.open) current.showModal();
    } else current.close();
  }, [recordsOpen]);
  const homeAsset = (name: string) => new URL(`./assets/art/home/${name}.webp`, document.baseURI).href;
  return (
    <section className="home-screen" aria-label="صفحه اصلی کویرسوار" dir="rtl">
      <img className="home-environment" src={homeAsset('desert')} alt="" draggable={false} />
      <div className="home-brand">
        <h1 className="home-title"><img src={homeAsset('logo')} alt="کویرسوار" draggable={false} /></h1>
        <p>موتورسواری در کویر ایران</p>
      </div>

      <div className="home-route-plaque" aria-label="مسیر اول، کویر مرکزی">
        <span className="home-route-number">مسیر اول</span>
        <strong>کویر مرکزی</strong>
        <span className="home-route-line"><i />تپه‌ها و پل‌های کویری<i /></span>
      </div>

      <div className="home-rider"><HomeRiderArt /></div>
      <div className="home-rider-shadow" aria-hidden="true" />

      <nav className="home-menu" aria-label="منوی اصلی">
        <button type="button" className="home-tile home-tutorial" onClick={onTutorial}>
          <span className="home-tile-art"><MenuRiderIcon /><span className="home-learn-mark">؟</span></span>
          <span className="home-tile-label">آموزش رانندگی</span>
          {tutorialDone && <span className="home-completed" aria-label="آموزش تکمیل شده">✓</span>}
        </button>
        <button type="button" className="home-tile home-play" onClick={onStart}>
          <span className="home-tile-art"><MenuRiderIcon /><svg className="home-play-arrow" viewBox="0 0 48 56" aria-hidden="true"><path d="M6 3 45 28 6 53Z" /></svg></span>
          <span className="home-tile-label">{tutorialDone ? 'شروع مسابقه' : 'شروع بازی'}</span>
        </button>
        <button type="button" className="home-tile home-records" onClick={() => setRecordsOpen(true)}>
          <svg viewBox="0 0 72 72" className="home-trophy" aria-hidden="true"><path d="M21 10h30l-3 26Q36 51 24 36Z" /><path d="M21 15H12v9q0 13 13 13M51 15h9v9q0 13-13 13M36 44v14M24 61h24" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" /><path d="m36 16 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z" fill="#fff3d4" /></svg>
          <span className="home-tile-label">رکورد من</span>
        </button>
        <button type="button" className="home-tile home-settings" onClick={onOpenSettings} aria-label="تنظیمات">
          <HudActionIconArt kind="settings" /><span className="home-tile-label">تنظیمات</span>
        </button>
      </nav>
      <p className="home-footnote">{tutorialDone ? 'مسیر آماده‌ست؛ گاز بده!' : 'اولین‌بار؟ با آموزش کوتاه شروع کن.'}</p>

      <dialog ref={dialog} className="home-record-dialog game-dialog-frame" onKeyDown={e => {
        e.stopPropagation();
        if (e.key === 'Escape') { e.preventDefault(); setRecordsOpen(false); }
      }} onCancel={e => { e.preventDefault(); setRecordsOpen(false); }} aria-labelledby="home-record-title">
        <TimerStopwatchArt />
        <h2 id="home-record-title">رکورد من</h2>
        {bestTimeMs === null ? <><strong className="home-no-record">اولین رکوردت را ثبت کن</strong><p>مسیر کویر مرکزی را کامل کن تا بهترین زمانت اینجا بماند.</p></> : <><p>بهترین زمان مسیر کویر مرکزی</p><strong className="home-record-time" dir="ltr">{formatTimeEnglish(bestTimeMs)}</strong></>}
        <div className="btn-row"><button className="game-action-btn primary" onClick={() => { setRecordsOpen(false); onStart(); }}>شروع بازی</button><button className="game-action-btn secondary" onClick={() => setRecordsOpen(false)}>بازگشت</button></div>
      </dialog>
    </section>
  );
};
