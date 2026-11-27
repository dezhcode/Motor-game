import { BIKE_ATTACHMENTS } from '../bike/bikeGeometry';

export const RIDER_BONES = {
  armUpper: 13,
  armLower: 14,
  legUpper: 15,
  legLower: 17,
  torso: 21.5,
} as const;

export interface RigPoint {
  x: number;
  y: number;
}

export interface RiderPoseDynamics {
  /** Longitudinal load: +1 = accelerating/leaning into pull, -1 = braking/bracing */
  surge?: number;
}

const MAX_ARM_REACH = RIDER_BONES.armUpper + RIDER_BONES.armLower - 1.0; // 26.0px (strictly < 27)
const MIN_ARM_REACH = Math.abs(RIDER_BONES.armUpper - RIDER_BONES.armLower) + 5.0; // 6.0px

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function dist(a: RigPoint, b: RigPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Exact two-bone solution; preserve the end attachment while bending the elbow/knee. */
export function solveTwoBone(start: RigPoint, target: RigPoint, upper: number, lower: number, bend: 1 | -1) {
  const dx = target.x - start.x;
  const dy = target.y - start.y;
  const rawDistance = Math.hypot(dx, dy);
  const distance = Math.max(
    0.0001,
    Math.min(upper + lower - 0.0001, Math.max(Math.abs(upper - lower) + 0.0001, rawDistance))
  );
  const ux = rawDistance > 0.0001 ? dx / rawDistance : 1;
  const uy = rawDistance > 0.0001 ? dy / rawDistance : 0;
  const along = (upper * upper - lower * lower + distance * distance) / (2 * distance);
  const across = Math.sqrt(Math.max(0, upper * upper - along * along)) * bend;
  return {
    joint: { x: start.x + ux * along - uy * across, y: start.y + uy * along + ux * across },
    end: { x: start.x + ux * distance, y: start.y + uy * distance },
  };
}

function shoulderFromHipAndTilt(hip: RigPoint, tiltRad: number): { neck: RigPoint; shoulder: RigPoint } {
  const sinT = Math.sin(tiltRad);
  const cosT = Math.cos(tiltRad);
  const neck: RigPoint = {
    x: hip.x + sinT * RIDER_BONES.torso,
    y: hip.y - cosT * RIDER_BONES.torso,
  };
  // Shoulder sits rigidly at 4.0px down the torso from neck and 2.5px forward of spine centerline
  const shoulder: RigPoint = {
    x: neck.x - sinT * 4.0 + cosT * 2.5,
    y: neck.y + cosT * 4.0 + sinT * 2.5,
  };
  return { neck, shoulder };
}

function shoulderReachValid(shoulder: RigPoint): boolean {
  for (const grip of [BIKE_ATTACHMENTS.nearGrip, BIKE_ATTACHMENTS.farGrip]) {
    const d = dist(shoulder, grip);
    if (d > MAX_ARM_REACH || d < MIN_ARM_REACH) return false;
  }
  return true;
}

export function riderPose(lean: number, compression: number, dynamics?: RiderPoseDynamics) {
  const clampedLean = clamp(lean, -1, 1);
  const surge = clamp(dynamics?.surge ?? 0, -1, 1);
  const crouch = clamp(compression * 10.5, 0, 2.5);

  // Saddle-anchored hip shifts subtly with rider lean, accel/brake surge, and suspension crouch
  const hip: RigPoint = {
    x: clamp(-15.2 + clampedLean * 2.5 - surge * 1.1, -18.4, -11.8),
    y: clamp(-18.4 + crouch + Math.abs(clampedLean) * 0.4, -18.8, -15.4),
  };

  // Torso tilts rigidly with fixed length RIDER_BONES.torso (no scale stretching)
  let tiltRad = clamp(0.41 + clampedLean * 0.19 + crouch * 0.03 + surge * 0.06, 0.16, 0.72);
  let { neck, shoulder } = shoulderFromHipAndTilt(hip, tiltRad);

  // Enforce natural arm reach so gloves remain locked to handlebars without elbow inversion
  if (!shoulderReachValid(shoulder)) {
    const step = 0.025;
    for (let i = 1; i <= 18; i++) {
      const forwardTilt = clamp(tiltRad + i * step, 0.16, 0.88);
      const candidate = shoulderFromHipAndTilt(hip, forwardTilt);
      if (shoulderReachValid(candidate.shoulder)) {
        tiltRad = forwardTilt;
        neck = candidate.neck;
        shoulder = candidate.shoulder;
        break;
      }
      const backTilt = clamp(tiltRad - i * step, 0.12, 0.88);
      const backCandidate = shoulderFromHipAndTilt(hip, backTilt);
      if (shoulderReachValid(backCandidate.shoulder)) {
        tiltRad = backTilt;
        neck = backCandidate.neck;
        shoulder = backCandidate.shoulder;
        break;
      }
    }
  }

  return {
    hip,
    neck,
    shoulder,
    torsoTilt: tiltRad,
    ...BIKE_ATTACHMENTS,
  };
}
