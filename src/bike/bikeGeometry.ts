export interface BikePoint { x: number; y: number }
/** Single source of truth for mechanical bearings and the rider's contact points (chassis pixels). */
export const BIKE_ATTACHMENTS = {
  rearPivot: { x: -13, y: 0 },
  steeringHead: { x: 21, y: -23 },
  shockTop: { x: -18, y: -14 },
  driveSprocket: { x: -8, y: -1 },
  nearGrip: { x: 18, y: -31 },
  farGrip: { x: 15, y: -32 },
  nearFoot: { x: -6, y: 2 },
  farFoot: { x: -8, y: 1 },
  helmetCenter: { x: -3.52, y: -45.76 },
} as const;

export function along(a: BikePoint, b: BikePoint, fraction: number): BikePoint {
  return { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction };
}

/** Exact external tangents: both runs touch both chain sprockets even as suspension moves. */
export function chainOutline(rear: BikePoint, drive = BIKE_ATTACHMENTS.driveSprocket): BikePoint[] {
  const radiusRear = 4.6, radiusDrive = 2.3;
  const direction = Math.atan2(drive.y - rear.y, drive.x - rear.x);
  const distance = Math.hypot(drive.x - rear.x, drive.y - rear.y);
  const tangent = Math.acos(Math.min(1, (radiusRear - radiusDrive) / Math.max(distance, 0.001)));
  const points: BikePoint[] = [];
  for (let i = 0; i <= 12; i++) {
    const a = direction + tangent + (Math.PI * 2 - 2 * tangent) * i / 12;
    points.push({ x: rear.x + Math.cos(a) * radiusRear, y: rear.y + Math.sin(a) * radiusRear });
  }
  for (let i = 0; i <= 10; i++) {
    const a = direction - tangent + 2 * tangent * i / 10;
    points.push({ x: drive.x + Math.cos(a) * radiusDrive, y: drive.y + Math.sin(a) * radiusDrive });
  }
  return points;
}
