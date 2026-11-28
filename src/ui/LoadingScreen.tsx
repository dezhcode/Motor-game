import { useEffect, useState, type CSSProperties } from 'react';
import { useLoadingMotion } from './useLoadingMotion';
import '../styles/loading.css';

const asset = (file: string) => new URL(`./assets/art/${file}`, document.baseURI).href;
const SPLASH_FILES = ['loading/desert-splash.webp', 'loading/kavirsavar-wordmark.webp', 'loading/hero-airborne-v2.webp',
  'loading/progress-frame-v2.webp', 'loading/progress-fill-v2.webp'];
const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  left: `${(i * 37 + 9) % 100}%`, top: `${(i * 19 + 23) % 100}%`,
  '--size': `${2 + i % 4}px`, '--delay': `${-i * 0.61}s`, '--duration': `${5 + i % 7}s`,
} as CSSProperties));

export function LoadingScreen({ progress, state, preview, onContinue }: {
  progress: number; state: 'loading' | 'ready' | 'failed'; preview: boolean; onContinue: () => void;
}) {
  const surfaceRef = useLoadingMotion();
  const [splashProgress, setSplashProgress] = useState(0);
  const [splashFailed, setSplashFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let completed = 0;
    const images = SPLASH_FILES.map(file => {
      const image = new Image();
      image.onload = () => { if (active) setSplashProgress(++completed / SPLASH_FILES.length); };
      image.onerror = () => { if (active) setSplashFailed(true); };
      image.src = asset(file);
      return image;
    });
    return () => { active = false; images.forEach(image => { image.onload = null; image.onerror = null; }); };
  }, []);
  const failed = state === 'failed' || splashFailed;
  const ready = state === 'ready' && splashProgress === 1;
  const percentage = Math.round((progress * 0.9 + splashProgress * 0.1) * 100);
  // Review mode deliberately holds the artwork with no on-screen controls.
  useEffect(() => { if (ready && !preview) onContinue(); }, [ready, preview, onContinue]);

  return (
    <section ref={surfaceRef} className="loading-screen" dir="rtl" aria-label="بارگذاری کویرسوار">
      <div className="loading-world" aria-hidden="true">
        <img className="loading-backdrop" src={asset(SPLASH_FILES[0])} alt="" draggable={false} fetchPriority="high" />
        <div className="loading-sunbeams" />
        <div className="loading-halo" />
        <div className="loading-hero-depth"><div className="loading-hero-float">
          <img className="loading-hero" src={asset(SPLASH_FILES[2])} alt="" draggable={false} fetchPriority="high" />
          <span className="loading-headlight" />
        </div></div>
        <div className="loading-dust"><span /><span /><span /></div>
        <div className="loading-particles">{PARTICLES.map((style, i) => <i key={i} style={style} />)}</div>
        <div className="loading-vignette" />
      </div>
      <div className="loading-brand">
        <h1><img src={asset(SPLASH_FILES[1])} alt="کویرسوار" draggable={false} fetchPriority="high" /></h1>
      </div>
      <div className="loading-bottom">
        <div className="loading-meter" role="progressbar" aria-label="پیشرفت بارگذاری" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
          <img className="loading-meter-frame" src={asset(SPLASH_FILES[3])} alt="" draggable={false} />
          <div className="loading-meter-trough" aria-hidden="true">
            <img className="loading-meter-fill" src={asset(SPLASH_FILES[4])} alt="" draggable={false}
              style={{ clipPath: `inset(0 ${100 - percentage}% 0 0)` }} />
          </div>
        </div>
        {failed && <p className="loading-error" role="alert">بارگذاری انجام نشد؛ اتصال را بررسی کن و صفحه را دوباره باز کن.</p>}
      </div>
    </section>
  );
}
