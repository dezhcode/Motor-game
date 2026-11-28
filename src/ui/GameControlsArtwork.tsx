import React from 'react';
import { paintedUrl } from '../artwork/paintedManifest';

const PedalState: React.FC<{ kind: 'gas' | 'brake'; pressed: boolean; visible: boolean }> = ({ kind, pressed, visible }) => {
  const url = paintedUrl(`${kind}_${pressed ? 'pressed' : 'normal'}`);
  return <img className={visible ? undefined : 'hidden-state'} src={url} alt="" draggable={false} />;
};
const PaintedPedal: React.FC<{ kind: 'gas' | 'brake'; pressed: boolean }> = ({ kind, pressed }) => (
  <span className={`painted-pedal ${kind}`} aria-hidden="true">
    <PedalState kind={kind} pressed={false} visible={!pressed} />
    <PedalState kind={kind} pressed visible={pressed} />
  </span>
);
export const GasPedalArt = React.memo(({ pressed }: {pressed:boolean}) => <PaintedPedal kind="gas" pressed={pressed} />);
export const BrakePedalArt = React.memo(({ pressed }: {pressed:boolean}) => <PaintedPedal kind="brake" pressed={pressed} />);
