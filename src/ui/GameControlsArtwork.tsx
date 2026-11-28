import React from 'react';
import { paintedUrl } from '../artwork/paintedManifest';

const PaintedPedal: React.FC<{ kind: 'gas' | 'brake'; pressed: boolean }> = ({ kind, pressed }) => (
  <span className={`painted-pedal ${kind}`} aria-hidden="true">
    <span className="pedal-stem" />
    <img src={paintedUrl(`${kind}_normal`)} className={pressed ? 'hidden-state' : ''} alt="" draggable={false} />
    <img src={paintedUrl(`${kind}_pressed`)} className={pressed ? '' : 'hidden-state'} alt="" draggable={false} />
  </span>
);
export const GasPedalArt: React.FC<{ pressed: boolean }> = ({ pressed }) => <PaintedPedal kind="gas" pressed={pressed} />;
export const BrakePedalArt: React.FC<{ pressed: boolean }> = ({ pressed }) => <PaintedPedal kind="brake" pressed={pressed} />;
