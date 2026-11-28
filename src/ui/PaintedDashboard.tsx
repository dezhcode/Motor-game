import { BitmapIcon } from './BitmapArtwork';
import React, { useEffect, useRef } from 'react';
import type { GameEngine, HudSnapshot } from '../game/GameEngine';
import { paintedUrl } from '../artwork/paintedManifest';
import { formatTimeEnglish } from '../storage/bestTimeStorage';
import { VehicleGauge } from './VehicleGauge';

export const PaintedDashboard: React.FC<{ hud: HudSnapshot; engine: GameEngine | null; gaugeWidth: number }> = ({ hud, engine, gaugeWidth }) => {
  const countersRef = useRef<HTMLDivElement>(null);
  const remainingMeters = Math.ceil(hud.distanceToFinishM);
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
    {hud.mode === 'race' ? (
      <div className="painted-counter" aria-label={`${remainingMeters} متر تا خط پایان`}>
        <BitmapIcon kind="flag" />
        <strong className="finish-distance-value">{remainingMeters} m</strong>
      </div>
    ) : (
      <div className="painted-counter" aria-label={`مسافت ${Math.floor(hud.distanceM)} متر`}>
        <BitmapIcon kind="distance" />
        <strong>{Math.floor(hud.distanceM)} m</strong>
      </div>
    )}
  </div>
  <span className="painted-timer" dir="ltr"><BitmapIcon kind="time"/> {formatTimeEnglish(hud.elapsedMs)}</span>
  <div className="painted-dashboard" style={{ width: gaugeWidth }}>
    <VehicleGauge vehicle={hud.vehicleId} speed={hud.speedKmh} fuel={hud.fuelRatio} />
    {hud.fuelRatio < .18 && <span className="fuel-warning">بنزین کم است</span>}
  </div>
  </>;
};
