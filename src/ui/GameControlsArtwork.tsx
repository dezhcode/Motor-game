import React from 'react';

export const GasPedalArt: React.FC<{ pressed: boolean }> = ({ pressed }) => (
  <svg viewBox="0 0 112 124" className="pedal-art-svg" aria-hidden="true">
    <defs>
      <linearGradient id="gasBaseGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#283642" />
        <stop offset="100%" stopColor="#121a21" />
      </linearGradient>
      <linearGradient id="gasPlateIdle" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#28d1c2" />
        <stop offset="55%" stopColor="#129d92" />
        <stop offset="100%" stopColor="#0b6e67" />
      </linearGradient>
      <linearGradient id="gasPlatePress" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ffe066" />
        <stop offset="55%" stopColor="#f5b82e" />
        <stop offset="100%" stopColor="#d97b1c" />
      </linearGradient>
      <linearGradient id="steelGloss" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#d9e6eb" />
        <stop offset="50%" stopColor="#94a8b3" />
        <stop offset="100%" stopColor="#60737e" />
      </linearGradient>
    </defs>

    {/* Floor shadow skirt */}
    <ellipse
      cx="56"
      cy="110"
      rx={pressed ? 39 : 43}
      ry={pressed ? 7 : 10}
      fill="rgba(7, 12, 18, 0.55)"
    />

    {/* Mounting steel base bracket + pivot hinge */}
    <rect x="20" y="90" width="72" height="20" rx="7" fill="url(#gasBaseGrad)" stroke="#141e26" strokeWidth="3" />
    <circle cx="30" cy="100" r="3.2" fill="#8ea1ac" stroke="#141e26" strokeWidth="1.5" />
    <circle cx="82" cy="100" r="3.2" fill="#8ea1ac" stroke="#141e26" strokeWidth="1.5" />

    {/* Mechanical coil spring under pedal */}
    <path
      d={
        pressed
          ? 'M45 91 L67 91 M44 87 L68 87'
          : 'M44 90 L68 86 L44 82 L68 78 L44 74 L68 70'
      }
      fill="none"
      stroke="#b4c6cf"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* Pedal assembly: drops & tilts forward when pressed */}
    <g transform={pressed ? 'translate(0, 10) scale(1, 0.94)' : 'translate(0, 0)'}>
      {/* Support rod */}
      <rect x="46" y="70" width="20" height="24" rx="4" fill="url(#steelGloss)" stroke="#141e26" strokeWidth="2.8" />

      {/* 3D pedal thickness skirt */}
      <path
        d="M27 22 Q29 12 40 12 L72 12 Q83 12 85 22 L91 80 Q91 90 80 90 L32 90 Q21 90 21 80 Z"
        fill="#0d151c"
        transform="translate(0, 5)"
      />

      {/* Main anodized racing pedal plate */}
      <path
        d="M27 22 Q29 12 40 12 L72 12 Q83 12 85 22 L91 80 Q91 90 80 90 L32 90 Q21 90 21 80 Z"
        fill={pressed ? 'url(#gasPlatePress)' : 'url(#gasPlateIdle)'}
        stroke="#141e26"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />

      {/* Inner brushed bezel */}
      <path
        d="M32 24 Q33 17 41 17 L71 17 Q79 17 80 24 L85 77 Q85 84 77 84 L35 84 Q27 84 27 77 Z"
        fill="none"
        stroke={pressed ? '#fff4be' : '#7ef3e6'}
        strokeWidth="2"
        opacity="0.7"
      />

      {/* Anti-slip rubber grip ribs */}
      {[34, 46, 58, 70].map((y, idx) => (
        <g key={y}>
          <rect
            x={33 - idx * 1.1}
            y={y}
            width={46 + idx * 2.2}
            height="7"
            rx="3.5"
            fill={pressed ? '#30220d' : '#16242c'}
            stroke="#0e161c"
            strokeWidth="1.4"
          />
          <rect
            x={36 - idx * 1.1}
            y={y + 1.4}
            width={40 + idx * 2.2}
            height="1.6"
            rx="0.8"
            fill={pressed ? '#ffb732' : '#3d5664'}
          />
        </g>
      ))}

      {/* Top glowing indicator + throttle chevrons */}
      <rect
        x="40"
        y="21"
        width="32"
        height="7"
        rx="3.5"
        fill={pressed ? '#fff7d1' : '#a8fff4'}
        stroke="#141e26"
        strokeWidth="1.4"
      />
      {pressed && (
        <path
          d="M46 10 L56 3 L66 10 M49 16 L56 10 L63 16"
          fill="none"
          stroke="#ffe266"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </g>
  </svg>
);

export const BrakePedalArt: React.FC<{ pressed: boolean }> = ({ pressed }) => (
  <svg viewBox="0 0 112 112" className="pedal-art-svg" aria-hidden="true">
    <defs>
      <linearGradient id="brakePlateIdle" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#eb7d44" />
        <stop offset="55%" stopColor="#c45028" />
        <stop offset="100%" stopColor="#8b2f16" />
      </linearGradient>
      <linearGradient id="brakePlatePress" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ff6347" />
        <stop offset="55%" stopColor="#e62e1b" />
        <stop offset="100%" stopColor="#99150e" />
      </linearGradient>
    </defs>

    {/* Floor shadow */}
    <ellipse
      cx="56"
      cy="99"
      rx={pressed ? 40 : 44}
      ry={pressed ? 6.5 : 9}
      fill="rgba(7, 12, 18, 0.55)"
    />

    {/* Hydraulic caliper mounting base */}
    <rect x="22" y="79" width="68" height="19" rx="6" fill="#1b252e" stroke="#141e26" strokeWidth="3" />
    <rect x="44" y="64" width="24" height="19" rx="3" fill="#9fb2bc" stroke="#141e26" strokeWidth="2.6" />

    {/* Pedal body */}
    <g transform={pressed ? 'translate(0, 8) scale(1, 0.94)' : 'translate(0, 0)'}>
      {/* 3D bevel drop */}
      <rect x="15" y="25" width="82" height="54" rx="13" fill="#10171d" />

      {/* Main wide brake pedal face */}
      <rect
        x="15"
        y="20"
        width="82"
        height="54"
        rx="13"
        fill={pressed ? 'url(#brakePlatePress)' : 'url(#brakePlateIdle)'}
        stroke="#141e26"
        strokeWidth="3.2"
      />

      {/* Specular rim highlight */}
      <rect
        x="20"
        y="24"
        width="72"
        height="45"
        rx="9"
        fill="none"
        stroke={pressed ? '#ffd4c4' : '#ffcaa8'}
        strokeWidth="2"
        opacity="0.65"
      />

      {/* Disc brake rotor badge on pedal */}
      <circle cx="56" cy="47" r="16" fill="#222e38" stroke="#141e26" strokeWidth="2.5" />
      <circle
        cx="56"
        cy="47"
        r="11.5"
        fill={pressed ? '#ff4a38' : '#718592'}
        stroke="#141e26"
        strokeWidth="2"
      />
      <rect x="51" y="42" width="10" height="10" rx="2" fill="#fff3d4" stroke="#141e26" strokeWidth="1.6" />

      {/* Slotted tread grips left & right */}
      {[33, 45, 57].map((y) => (
        <g key={y}>
          <rect x="23" y={y} width="12" height="5.5" rx="2.5" fill="#1a222a" />
          <rect x="77" y={y} width="12" height="5.5" rx="2.5" fill="#1a222a" />
        </g>
      ))}
    </g>
  </svg>
);

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
