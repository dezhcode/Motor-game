import React from 'react';
import type { HudSnapshot } from '../game/GameEngine';
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
export const PaintedDashboard: React.FC<{ hud: HudSnapshot }> = ({ hud }) => <>
  <div className="painted-counters" dir="ltr">
    <div className="painted-counter" aria-label={`سکه ${hud.coins}`}><img src={paintedUrl('coin')} alt=""/><strong>{hud.coins}</strong></div>
    <div className="painted-counter" aria-label={`مسافت ${Math.floor(hud.distanceM)} متر`}><span aria-hidden="true">⌖</span><strong>{Math.floor(hud.distanceM)} m</strong></div>
  </div>
  <div className="painted-dashboard">
    <span className="painted-timer" dir="ltr">◴ {formatTimeEnglish(hud.elapsedMs)}</span>
    <Dial kind="speed" value={hud.speedKmh}/><Dial kind="fuel" value={hud.fuelRatio}/>
    {hud.fuelRatio < .18 && <span className="fuel-warning">بنزین کم است</span>}
  </div>
</>;
