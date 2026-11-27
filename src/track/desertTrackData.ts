export interface TrackPoint {
  x: number;
  y: number;
}

export interface TrackZoneHint {
  id: 'throttle' | 'balance' | 'jump1' | 'jump2';
  startX: number;
  endX: number;
  labelFa: string;
}

export interface TrackDefinition {
  points: TrackPoint[];
  startX: number;
  startY: number;
  finishX: number;
  minX: number;
  maxX: number;
  hints: TrackZoneHint[];
}

interface ControlNode {
  x: number;
  y: number;
  linear?: boolean;
}

function smoothSegment(a: ControlNode, b: ControlNode, stepMeters = 1.25): TrackPoint[] {
  const dx = b.x - a.x;
  const count = Math.max(1, Math.round(dx / stepMeters));
  const out: TrackPoint[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const smoothT = 0.5 - 0.5 * Math.cos(Math.PI * t);
    out.push({
      x: a.x + dx * t,
      y: a.y + (b.y - a.y) * smoothT,
    });
  }
  return out;
}

function kickerSegment(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  stepMeters = 0.8
): TrackPoint[] {
  const dx = endX - startX;
  const dy = endY - startY;
  const count = Math.max(2, Math.round(dx / stepMeters));
  const out: TrackPoint[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / count;
    // Quadratic curve produces a smooth concave takeoff lip with nonzero exit slope
    out.push({
      x: startX + dx * t,
      y: startY + dy * (t * t),
    });
  }
  return out;
}

function buildHandcraftedDesertTrack(): TrackDefinition {
  // Hand-crafted 30-60s single stage in meters (Y-up coordinate system).
  const controlNodes: ControlNode[] = [
    // Backstop + smooth starting straight
    { x: -12, y: 8.0, linear: true },
    { x: -8, y: 0.2, linear: true },
    { x: -4, y: 0.0 },
    { x: 24, y: 0.0 },

    // Gentle desert bumps (whoops)
    { x: 30, y: 0.0 },
    { x: 36, y: 0.9 },
    { x: 42, y: 0.2 },
    { x: 48, y: 1.15 },
    { x: 54, y: 0.25 },
    { x: 61, y: 1.35 },
    { x: 68, y: 0.4 },
    { x: 76, y: 0.4 },

    // Steady uphill climb & scenic ridge
    { x: 96, y: 4.8 },
    { x: 112, y: 6.8 },
    { x: 122, y: 6.8 },

    // Smooth downhill run building speed into Ramp 1
    { x: 145, y: 2.0 },
    { x: 160, y: 2.0 },
  ];

  const points: TrackPoint[] = [];

  for (let i = 0; i < controlNodes.length - 1; i++) {
    const a = controlNodes[i];
    const b = controlNodes[i + 1];
    if (a.linear) {
      points.push({ x: a.x, y: a.y });
    } else {
      const step = Math.abs(b.y - a.y) > 0.5 ? 1.0 : 2.0;
      points.push(...smoothSegment(a, b, step));
    }
  }

  // Ramp 1: curved kicker (160..172) -> short 5.5m sand dip -> wide sloped landing (177.5..204)
  points.push(...kickerSegment(160, 2.0, 172, 4.9, 0.8));
  points.push({ x: 172, y: 4.9 });
  points.push({ x: 173.4, y: 2.1 });
  points.push({ x: 176.2, y: 2.1 });
  points.push({ x: 177.8, y: 3.9 });
  points.push(...smoothSegment({ x: 177.8, y: 3.9 }, { x: 204, y: 1.8 }, 1.2));

  // Rhythm rollers toward Jump 2
  const midNodes: ControlNode[] = [
    { x: 204, y: 1.8 },
    { x: 218, y: 1.8 },
    { x: 226, y: 3.0 },
    { x: 234, y: 2.0 },
    { x: 248, y: 2.0 },
  ];
  for (let i = 0; i < midNodes.length - 1; i++) {
    points.push(...smoothSegment(midNodes[i], midNodes[i + 1], 1.1));
  }

  // Ramp 2: slightly steeper/longer kicker (248..262) -> 7.2m gap -> wide landing deck (269.2..298)
  points.push(...kickerSegment(248, 2.0, 262, 5.7, 0.8));
  points.push({ x: 262, y: 5.7 });
  points.push({ x: 263.6, y: 1.5 });
  points.push({ x: 267.6, y: 1.5 });
  points.push({ x: 269.4, y: 4.2 });
  points.push(...smoothSegment({ x: 269.4, y: 4.2 }, { x: 298, y: 1.4 }, 1.2));

  // Final desert sprint & finish straight
  const endNodes: ControlNode[] = [
    { x: 298, y: 1.4 },
    { x: 312, y: 2.2 },
    { x: 324, y: 1.2 },
    { x: 360, y: 1.2 },
    { x: 368, y: 8.5 },
  ];
  for (let i = 0; i < endNodes.length - 1; i++) {
    const a = endNodes[i];
    const b = endNodes[i + 1];
    if (a.x === 360) {
      points.push({ x: a.x, y: a.y });
    } else {
      points.push(...smoothSegment(a, b, 1.4));
    }
  }
  points.push({ x: 368, y: 8.5 });

  return {
    points,
    startX: 4,
    startY: 0.72, // Start with both tires at the surface, instead of visibly hovering before gas.
    finishX: 336,
    minX: -12,
    maxX: 368,
    hints: [
      {
        id: 'throttle',
        startX: 0,
        endX: 14,
        labelFa: 'گاز بده و سرعت بگیر',
      },
      {
        id: 'balance',
        startX: 15,
        endX: 32,
        labelFa: 'با چپ و راست تعادل موتور را نگه دار',
      },
      {
        id: 'jump1',
        startX: 156,
        endX: 173,
        labelFa: 'پرش اول — فرود صاف',
      },
      {
        id: 'jump2',
        startX: 244,
        endX: 263,
        labelFa: 'پرش دوم — سرعت و تعادل!',
      },
    ],
  };
}

export const DESERT_TRACK: TrackDefinition = buildHandcraftedDesertTrack();

export function sampleTrackHeight(track: TrackDefinition, x: number): number {
  const pts = track.points;
  if (x <= pts[0].x) return pts[0].y;
  if (x >= pts[pts.length - 1].x) return pts[pts.length - 1].y;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    if (x >= p0.x && x <= p1.x) {
      const span = p1.x - p0.x;
      if (span <= 0.0001) return p0.y;
      const t = (x - p0.x) / span;
      return p0.y + (p1.y - p0.y) * t;
    }
  }
  return 0;
}
