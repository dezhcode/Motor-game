import React from 'react';
import { paintedUrl } from '../artwork/paintedManifest';

const PEDAL_FRAME = { brake: { width: 349, height: 600 }, gas: { width: 360, height: 600 } } as const;

/** The shaft continues the exact source-image row, including its outline and metal bevels. */
const PedalState: React.FC<{ kind: 'gas' | 'brake'; pressed: boolean; visible: boolean }> = ({ kind, pressed, visible }) => {
  const frame = PEDAL_FRAME[kind];
  const url = paintedUrl(`${kind}_${pressed ? 'pressed' : 'normal'}`);
  return <span className={`pedal-state ${visible ? '' : 'hidden-state'}`}>
    <svg className="pedal-stem" viewBox={`0 540 ${frame.width} 1`} preserveAspectRatio="none" aria-hidden="true">
      <image href={url} width={frame.width} height={frame.height} />
    </svg>
    <img src={url} alt="" draggable={false} />
  </span>;
};
const PaintedPedal: React.FC<{ kind: 'gas' | 'brake'; pressed: boolean }> = ({ kind, pressed }) => (
  <span className={`painted-pedal ${kind}`} aria-hidden="true">
    <PedalState kind={kind} pressed={false} visible={!pressed} />
    <PedalState kind={kind} pressed visible={pressed} />
  </span>
);
export const GasPedalArt: React.FC<{ pressed: boolean }> = ({ pressed }) => <PaintedPedal kind="gas" pressed={pressed} />;
export const BrakePedalArt: React.FC<{ pressed: boolean }> = ({ pressed }) => <PaintedPedal kind="brake" pressed={pressed} />;
