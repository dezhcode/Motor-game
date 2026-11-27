export const RIDER_BONES = { armUpper: 16, armLower: 18, legUpper: 17, legLower: 19 } as const;

export interface RigPoint { x: number; y: number }

/** Exact two-bone solution; preserve the end attachment while bending the elbow/knee. */
export function solveTwoBone(start: RigPoint, target: RigPoint, upper: number, lower: number, bend: 1 | -1) {
  const dx = target.x - start.x;
  const dy = target.y - start.y;
  const rawDistance = Math.hypot(dx, dy);
  const distance = Math.max(0.0001, Math.min(upper + lower - 0.0001, Math.max(Math.abs(upper - lower) + 0.0001, rawDistance)));
  const ux = rawDistance > 0.0001 ? dx / rawDistance : 1;
  const uy = rawDistance > 0.0001 ? dy / rawDistance : 0;
  const along = (upper * upper - lower * lower + distance * distance) / (2 * distance);
  const across = Math.sqrt(Math.max(0, upper * upper - along * along)) * bend;
  return {
    joint: { x: start.x + ux * along - uy * across, y: start.y + uy * along + ux * across },
    end: { x: start.x + ux * distance, y: start.y + uy * distance },
  };
}

export function riderPose(lean: number, compression: number) {
  const crouch = Math.max(0, Math.min(3, compression * 14));
  const hip = { x: -16 + lean * 4, y: -18 + crouch };
  const neck = { x: hip.x + 9 + lean * 3, y: hip.y - 22 + Math.abs(lean) };
  return {
    hip, neck,
    shoulder: { x: neck.x + 0.5, y: neck.y + 4 },
    nearGrip: { x: 17, y: -35 },
    farGrip: { x: 14, y: -36 },
    nearFoot: { x: -4, y: 2 },
    farFoot: { x: -7, y: 1 },
  };
}
