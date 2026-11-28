import React from 'react';
import { paintedUrl, type PaintedArtKey } from '../artwork/paintedManifest';

const art = {
  handlebar: { brake: ['motoBrake', 'motoBrakePressed'], gas: ['motoThrottle', 'motoThrottlePressed'] },
  pedal: { brake: ['brake_normal', 'brake_pressed'], gas: ['gas_normal', 'gas_pressed'] },
} as const satisfies Record<'handlebar' | 'pedal', Record<'gas' | 'brake', readonly PaintedArtKey[]>>;

export const DriveControlArt = React.memo(({ kind, pressed, motorcycle }: {
  kind: 'gas' | 'brake'; pressed: boolean; motorcycle: boolean;
}) => {
  const shape = motorcycle ? 'handlebar' : 'pedal';
  const [normal, active] = art[shape][kind];
  return (
    <span className={`painted-drive-control painted-${shape} ${kind}`} aria-hidden="true">
      <img className={pressed ? 'hidden-state' : undefined} src={paintedUrl(normal)} alt="" draggable={false} />
      <img className={pressed ? undefined : 'hidden-state'} src={paintedUrl(active)} alt="" draggable={false} />
    </span>
  );
});
