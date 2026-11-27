import type { BodyPose } from '../physics/PhysicsWorld';

/** Convert physical centers into the rotating chassis' display coordinates. */
export function wheelToChassisPixels(wheel: BodyPose, chassis: BodyPose, ppm: number) {
  const dx = wheel.x - chassis.x;
  const dy = wheel.y - chassis.y;
  const cos = Math.cos(chassis.angle);
  const sin = Math.sin(chassis.angle);
  return { x: (dx * cos + dy * sin) * ppm, y: (dx * sin - dy * cos) * ppm };
}
