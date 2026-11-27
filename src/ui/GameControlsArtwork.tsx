import React from 'react';
import { paintedUrl } from '../artwork/paintedManifest';

const PaintedPedal: React.FC<{ kind: 'gas' | 'brake'; pressed: boolean }> = ({ kind, pressed }) => (
  <span className="painted-pedal" aria-hidden="true">
    <img src={paintedUrl(`${kind}_normal`)} className={pressed ? 'hidden-state' : ''} alt="" draggable={false} />
    <img src={paintedUrl(`${kind}_pressed`)} className={pressed ? '' : 'hidden-state'} alt="" draggable={false} />
  </span>
);
export const GasPedalArt: React.FC<{ pressed: boolean }> = ({ pressed }) => <PaintedPedal kind="gas" pressed={pressed} />;
export const BrakePedalArt: React.FC<{ pressed: boolean }> = ({ pressed }) => <PaintedPedal kind="brake" pressed={pressed} />;

export const LeanControlArt: React.FC<{ direction: 'left' | 'right'; pressed: boolean }> = ({
  direction,
  pressed,
}) => {
  const isLeft = direction === 'left';
  return (
    <svg viewBox="0 0 112 112" className="lean-art-svg" aria-hidden="true">
      <defs>
        <linearGradient id={`leanRim-${direction}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={pressed ? '#ffd95e' : '#7b8f9b'} />
          <stop offset="50%" stopColor={pressed ? '#eba025' : '#41515c'} />
          <stop offset="100%" stopColor={pressed ? '#b56a12' : '#1e272e'} />
        </linearGradient>
        <radialGradient id={`leanCore-${direction}-${pressed ? 'on' : 'off'}`} cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor={pressed ? '#4a3a18' : '#2a3c48'} />
          <stop offset="100%" stopColor={pressed ? '#241a0a' : '#141e26'} />
        </radialGradient>
      </defs>

      {/* Bottom shadow */}
      <ellipse
        cx="56"
        cy="101"
        rx={pressed ? 38 : 42}
        ry={pressed ? 5.5 : 8}
        fill="rgba(7, 12, 18, 0.55)"
      />

      <g transform={pressed ? 'translate(0, 5)' : 'translate(0, 0)'}>
        {/* Outer 3D metallic skirt */}
        <circle cx="56" cy="57" r="44" fill="#0d141a" />
        {/* Bevelled outer ring */}
        <circle
          cx="56"
          cy="52"
          r="44"
          fill={`url(#leanRim-${direction})`}
          stroke="#141e26"
          strokeWidth="3.2"
        />
        {/* Recessed carbon-slate interior */}
        <circle
          cx="56"
          cy="52"
          r="35"
          fill={`url(#leanCore-${direction}-${pressed ? 'on' : 'off'})`}
          stroke="#141e26"
          strokeWidth="2.4"
        />

        {/* Corner bezel bolts */}
        {[30, 82].map((bx) =>
          [26, 78].map((by) => (
            <circle key={`${bx}-${by}`} cx={bx} cy={by} r="2.2" fill="#d9e6eb" stroke="#141e26" strokeWidth="1.2" />
          ))
        )}

        {/* Curved rotation arrow */}
        {isLeft ? (
          <g>
            <path
              d="M78 44 A24 24 0 0 0 36 36"
              fill="none"
              stroke={pressed ? '#ffe169' : '#29d4c4'}
              strokeWidth="5"
              strokeLinecap="round"
            />
            <polygon
              points="31,42 35,28 45,39"
              fill={pressed ? '#ffe169' : '#29d4c4'}
              stroke="#141e26"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </g>
        ) : (
          <g>
            <path
              d="M34 44 A24 24 0 0 1 76 36"
              fill="none"
              stroke={pressed ? '#ffe169' : '#29d4c4'}
              strokeWidth="5"
              strokeLinecap="round"
            />
            <polygon
              points="81,42 77,28 67,39"
              fill={pressed ? '#ffe169' : '#29d4c4'}
              stroke="#141e26"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </g>
        )}

        {/* Tilted motocross bike icon (wheelie for left, endo/nose-down for right) */}
        <g transform={isLeft ? 'translate(56, 61) rotate(-22)' : 'translate(56, 61) rotate(22)'}>
          <circle cx="-13" cy="6" r="6.5" fill="#18222a" stroke="#fff3d4" strokeWidth="2.2" />
          <circle cx="13" cy="6" r="6.5" fill="#18222a" stroke="#fff3d4" strokeWidth="2.2" />
          <path
            d="M-13 6 L-3 -3 L9 -3 L13 6 M-3 -3 L-8 -9 M7 -8 L13 6"
            fill="none"
            stroke={pressed ? '#ffd95e' : '#fff3d4'}
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="-1" cy="-12" r="4" fill={pressed ? '#ffd95e' : '#29d4c4'} stroke="#141e26" strokeWidth="1.5" />
        </g>

        {/* Glass dome gloss highlight */}
        <path
          d="M30 40 Q56 22 82 40 Q56 32 30 40 Z"
          fill="rgba(255, 255, 255, 0.22)"
        />
      </g>
    </svg>
  );
};
