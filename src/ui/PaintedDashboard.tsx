import React, { useEffect, useRef } from 'react';
import type { GameEngine, HudSnapshot } from '../game/GameEngine';
import { paintedUrl } from '../artwork/paintedManifest';
import { formatTimeEnglish } from '../storage/bestTimeStorage';

function Dial({ kind, value }: { kind: 'speed' | 'fuel'; value: number }) {
  const rotation = kind === 'speed' ? -30 + Math.min(1, value / 100) * 240 : 45 + value * 90;
  return <div className={`painted-dial ${kind}`} role="img" aria-label={kind === 'speed' ? `سرعت ${Math.round(value)} کیلومتر بر ساعت` : `بنزین ${Math.round(value*100)} درصد`}>
    <img className="dial-face" src={paintedUrl(kind === 'speed' ? 'speedFace' : 'fuelFace')} alt="" />
    <img className="dial-needle" src={paintedUrl('needle')} style={{ transform: `translateY(-50%) rotate(${rotation}deg)` }} alt="" />
    {kind === 'speed' && <span className="dial-speed" dir="ltr">{Math.round(value)}</span>}
  </div>;
}
export const PaintedDashboard: React.FC<{ hud: HudSnapshot; engine: GameEngine | null }> = ({ hud, engine }) => {
  const countersRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const counters = countersRef.current;
    const shell = counters?.closest('.game-shell');
    if (!counters || !shell || !engine) return;
    const measure = () => {
      const host = shell.getBoundingClientRect();
      const center = (kind: 'coin' | 'fuel') => {
        const rect = counters.querySelector(`[data-pickup-target="${kind}"]`)!.getBoundingClientRect();
        return {x:rect.left + rect.width / 2 - host.left,y:rect.top + rect.height / 2 - host.top,size:rect.height};
      };
      engine.setPickupTargets({coin:center('coin'),fuel:center('fuel')});
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(counters); observer.observe(shell);
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, [engine]);
  return <>
  <div ref={countersRef} className="painted-counters" dir="ltr">
    <div className="painted-counter" aria-label={`سکه ${hud.coins}`}>
      <span className="pickup-hud-icon" data-pickup-target="coin"><img key={hud.coinPulse} className={hud.coinPulse ? 'pickup-arrival coin' : ''} src={paintedUrl('coin')} alt=""/></span>
      <strong>{hud.coins}</strong>
    </div>
    <div className="painted-counter painted-fuel-counter" aria-label={`بنزین ${Math.round(hud.fuelRatio*100)} درصد`}>
      <span className="pickup-hud-icon" data-pickup-target="fuel"><img key={hud.fuelPulse} className={hud.fuelPulse ? 'pickup-arrival fuel' : ''} src={paintedUrl('fuel')} alt=""/></span>
      <strong>{Math.round(hud.fuelRatio*100)}%</strong>
    </div>
    <div className="painted-counter" aria-label={`مسافت ${Math.floor(hud.distanceM)} متر`}><span aria-hidden="true">⌖</span><strong>{Math.floor(hud.distanceM)} m</strong></div>
  </div>
  <div className="painted-dashboard">
    <span className="painted-timer" dir="ltr">◴ {formatTimeEnglish(hud.elapsedMs)}</span>
    <Dial kind="speed" value={hud.speedKmh}/><Dial kind="fuel" value={hud.fuelRatio}/>
    {hud.fuelRatio < .18 && <span className="fuel-warning">بنزین کم است</span>}
  </div>
  </>;
};
