import { BIKE_ATTACHMENTS } from '../bike/bikeGeometry';

export const RIDER_BONES = { armUpper: 13, armLower: 14, legUpper: 15, legLower: 17 } as const;

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
  const crouch = Math.max(0, Math.min(2.1, compression * 10));
  const hip = { x: -16 + lean * 3, y: -18 + crouch };
  // Head remains over the real physics helmet collider; lean comes from hips and torso.
  const neck = { x: -7, y: -37 };
  const torsoAngle = Math.atan2(hip.y - neck.y, hip.x - neck.x) - Math.PI / 2;
  const torsoScale = Math.hypot(hip.x - neck.x, hip.y - neck.y) / 22;
  const shoulder = {
    x: neck.x + 3 * Math.cos(torsoAngle) - 4 * torsoScale * Math.sin(torsoAngle),
    y: neck.y + 3 * Math.sin(torsoAngle) + 4 * torsoScale * Math.cos(torsoAngle),
  };
  return { hip, neck, shoulder, ...BIKE_ATTACHMENTS };
}
