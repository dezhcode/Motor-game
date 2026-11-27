import React from 'react';

export const TimerStopwatchArt: React.FC = () => (
  <svg viewBox="0 0 40 40" className="hud-badge-svg" aria-hidden="true">
    <rect x="16" y="3" width="8" height="4.5" rx="1.5" fill="#e89b3c" stroke="#141e26" strokeWidth="1.8" />
    <circle cx="20" cy="22" r="14" fill="#2c3a44" stroke="#141e26" strokeWidth="2.4" />
    <circle cx="20" cy="22" r="11" fill="#fff3d4" stroke="#141e26" strokeWidth="1.6" />
    <path d="M20 22 L20 14 M20 22 L26 24" stroke="#141e26" strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="20" cy="22" r="2.2" fill="#e8612c" />
  </svg>
);

export const ProgressRiderMarkerArt: React.FC = () => (
  <svg viewBox="0 0 36 28" className="progress-rider-svg" aria-hidden="true">
    <circle cx="8" cy="21" r="5" fill="#18222a" stroke="#fff3d4" strokeWidth="1.8" />
    <circle cx="28" cy="21" r="5" fill="#18222a" stroke="#fff3d4" strokeWidth="1.8" />
    <path d="M8 21 L16 14 L25 14 L28 21 M16 14 L12 10 L21 9" fill="none" stroke="#14a89d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="17" cy="5.5" r="3.6" fill="#ffd95e" stroke="#141e26" strokeWidth="1.5" />
  </svg>
);

export const FinishFlagMiniArt: React.FC = () => (
  <svg viewBox="0 0 28 28" className="progress-flag-svg" aria-hidden="true">
    <rect x="4" y="3" width="3" height="22" rx="1.5" fill="#d9e6eb" stroke="#141e26" strokeWidth="1.4" />
    <rect x="7" y="4" width="16" height="11" rx="2" fill="#141e26" stroke="#141e26" strokeWidth="1.4" />
    <rect x="8" y="5" width="4.5" height="4.5" fill="#fff3d4" />
    <rect x="17" y="5" width="4.5" height="4.5" fill="#fff3d4" />
    <rect x="12.5" y="9.5" width="4.5" height="4.5" fill="#fff3d4" />
  </svg>
);

export type HudActionKind = 'sound' | 'haptics' | 'restart' | 'pause';

export const HudActionIconArt: React.FC<{
  kind: HudActionKind;
  active?: boolean;
}> = ({ kind, active = true }) => {
  switch (kind) {
    case 'sound':
      return (
        <svg viewBox="0 0 36 36" className="hud-action-svg" aria-hidden="true">
          <path
            d="M7 14 L13 14 L20 8 L20 28 L13 22 L7 22 Z"
            fill={active ? '#fff3d4' : '#7f919c'}
            stroke="#141e26"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          {active ? (
            <path
              d="M24 13 Q28 18 24 23 M27.5 10 Q33 18 27.5 26"
              fill="none"
              stroke="#ffd95e"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          ) : (
            <path d="M24 13 L31 23 M31 13 L24 23" stroke="#ff6b52" strokeWidth="2.8" strokeLinecap="round" />
          )}
        </svg>
      );
    case 'haptics':
      return (
        <svg viewBox="0 0 36 36" className="hud-action-svg" aria-hidden="true">
          <rect
            x="12"
            y="7"
            width="12"
            height="22"
            rx="3"
            fill={active ? '#29d4c4' : '#6f808a'}
            stroke="#141e26"
            strokeWidth="2.2"
          />
          <rect x="14.5" y="10.5" width="7" height="12" rx="1" fill="#141e26" />
          <circle cx="18" cy="25.5" r="1.2" fill="#fff3d4" />
          {active ? (
            <>
              <path d="M8 12 Q5 18 8 24 M28 12 Q31 18 28 24" fill="none" stroke="#ffd95e" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M4.5 15 Q2.5 18 4.5 21 M31.5 15 Q33.5 18 31.5 21" fill="none" stroke="#ffd95e" strokeWidth="2" strokeLinecap="round" />
            </>
          ) : (
            <path d="M7 9 L29 27" stroke="#ff6b52" strokeWidth="2.8" strokeLinecap="round" />
          )}
        </svg>
      );
    case 'restart':
      return (
        <svg viewBox="0 0 36 36" className="hud-action-svg" aria-hidden="true">
          <path
            d="M26 15 A9 9 0 1 0 25.5 23"
            fill="none"
            stroke="#fff3d4"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <polygon
            points="29,9 29,18 20,16"
            fill="#ffd95e"
            stroke="#141e26"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'pause':
      return (
        <svg viewBox="0 0 36 36" className="hud-action-svg" aria-hidden="true">
          <rect x="10" y="8" width="5.5" height="20" rx="2" fill="#fff3d4" stroke="#141e26" strokeWidth="2" />
          <rect x="20.5" y="8" width="5.5" height="20" rx="2" fill="#fff3d4" stroke="#141e26" strokeWidth="2" />
        </svg>
      );
  }
};

export const KavirLogoCrestArt: React.FC = () => (
  <svg viewBox="0 0 240 88" className="logo-crest-svg" aria-hidden="true">
    <defs>
      <linearGradient id="sunCrest" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffe77a" />
        <stop offset="100%" stopColor="#e88d2c" />
      </linearGradient>
      <linearGradient id="ribbonCrest" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#0e7b74" />
        <stop offset="50%" stopColor="#1bc4b6" />
        <stop offset="100%" stopColor="#0e7b74" />
      </linearGradient>
    </defs>

    {/* Desert sun halo */}
    <circle cx="120" cy="40" r="34" fill="url(#sunCrest)" stroke="#141e26" strokeWidth="3.2" />
    <path d="M90 50 Q120 34 150 50 L144 62 L96 62 Z" fill="#b86b35" stroke="#141e26" strokeWidth="2.2" />

    {/* Jumping rider silhouette */}
    <g transform="translate(120, 34) rotate(-18)">
      <circle cx="-16" cy="10" r="8" fill="#18222a" stroke="#fff3d4" strokeWidth="2.4" />
      <circle cx="16" cy="10" r="8" fill="#18222a" stroke="#fff3d4" strokeWidth="2.4" />
      <path d="M-16 10 L-4 -1 L11 -1 L16 10 M-5 -1 L-12 -10 M8 -9 L16 10" fill="none" stroke="#fff3d4" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M-9 -3 L10 -6 L16 -2 L-2 2 Z" fill="#14a89d" stroke="#141e26" strokeWidth="1.6" />
      <circle cx="0" cy="-14" r="5.2" fill="#ffd95e" stroke="#141e26" strokeWidth="1.8" />
    </g>

    {/* Winged ribbon plaque */}
    <path
      d="M20 58 L44 50 L196 50 L220 58 L208 77 L32 77 Z"
      fill="url(#ribbonCrest)"
      stroke="#141e26"
      strokeWidth="3.2"
      strokeLinejoin="round"
    />
    <path d="M44 54 L196 54" stroke="#8df7ed" strokeWidth="2" opacity="0.7" />
    <circle cx="38" cy="63" r="2.6" fill="#ffd95e" stroke="#141e26" strokeWidth="1.2" />
    <circle cx="202" cy="63" r="2.6" fill="#ffd95e" stroke="#141e26" strokeWidth="1.2" />
  </svg>
);

export const OverlayBadgeArt: React.FC<{
  kind: 'pause' | 'crash' | 'victory';
  stars?: number;
}> = ({ kind, stars = 3 }) => {
  if (kind === 'pause') {
    return (
      <svg viewBox="0 0 88 88" className="overlay-badge-svg" aria-hidden="true">
        <circle cx="44" cy="44" r="36" fill="#2c3a44" stroke="#141e26" strokeWidth="3.5" />
        <circle cx="44" cy="44" r="28" fill="#1a242c" stroke="#475c6a" strokeWidth="2.2" />
        <rect x="30" y="26" width="10" height="36" rx="4" fill="#ffd95e" stroke="#141e26" strokeWidth="2.6" />
        <rect x="48" y="26" width="10" height="36" rx="4" fill="#ffd95e" stroke="#141e26" strokeWidth="2.6" />
      </svg>
    );
  }
  if (kind === 'crash') {
    return (
      <svg viewBox="0 0 96 84" className="overlay-badge-svg" aria-hidden="true">
        <polygon
          points="48,6 90,74 6,74"
          fill="#f25738"
          stroke="#141e26"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <polygon points="48,17 79,67 17,67" fill="#ffd95e" stroke="#141e26" strokeWidth="2.2" strokeLinejoin="round" />
        <rect x="44" y="30" width="8" height="20" rx="3" fill="#141e26" />
        <circle cx="48" cy="58" r="4.4" fill="#141e26" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 180 92" className="overlay-badge-svg victory" aria-hidden="true">
      {/* Trophy cup */}
      <path d="M68 18 L112 18 L106 50 Q90 64 74 50 Z" fill="#ffd95e" stroke="#141e26" strokeWidth="3.2" strokeLinejoin="round" />
      <path d="M68 23 Q54 24 56 38 Q58 46 72 44" fill="none" stroke="#e89b3c" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M112 23 Q126 24 124 38 Q122 46 108 44" fill="none" stroke="#e89b3c" strokeWidth="4.5" strokeLinecap="round" />
      <rect x="85" y="55" width="10" height="16" fill="#e89b3c" stroke="#141e26" strokeWidth="2.4" />
      <rect x="72" y="70" width="36" height="10" rx="3" fill="#2c3a44" stroke="#141e26" strokeWidth="2.6" />

      {/* 3 Stars */}
      {[
        { cx: 34, cy: 48, active: stars >= 1 },
        { cx: 90, cy: 33, active: stars >= 2 },
        { cx: 146, cy: 48, active: stars >= 3 },
      ].map((s, idx) => (
        <polygon
          key={idx}
          points={`${s.cx},${s.cy - 13} ${s.cx + 4},${s.cy - 4} ${s.cx + 13},${s.cy - 3} ${s.cx + 6},${s.cy + 4} ${s.cx + 8},${s.cy + 13} ${s.cx},${s.cy + 8} ${s.cx - 8},${s.cy + 13} ${s.cx - 6},${s.cy + 4} ${s.cx - 13},${s.cy - 3} ${s.cx - 4},${s.cy - 4}`}
          fill={s.active ? '#ffe77a' : '#3a4954'}
          stroke="#141e26"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
};

export const ActionBtnIconArt: React.FC<{ kind: 'play' | 'replay' | 'resume' }> = ({ kind }) => {
  if (kind === 'replay') {
    return (
      <svg viewBox="0 0 28 28" className="btn-icon-svg" aria-hidden="true">
        <path d="M21 11 A7.5 7.5 0 1 0 20.5 19" fill="none" stroke="#fff3d4" strokeWidth="3" strokeLinecap="round" />
        <polygon points="24,6 24,14 16,12" fill="#ffd95e" stroke="#141e26" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 28 28" className="btn-icon-svg" aria-hidden="true">
      <polygon points="8,5 23,14 8,23" fill="#fff3d4" stroke="#141e26" strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
};
