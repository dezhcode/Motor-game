import type { BodyPose } from '../physics/PhysicsWorld';

/** Convert physical centers into the rotating chassis' display coordinates. */
export function wheelToChassisPixels(wheel: BodyPose, chassis: BodyPose, ppm: number) {
  const dx = wheel.x - chassis.x;
  const dy = wheel.y - chassis.y;
  const cos = Math.cos(chassis.angle);
  const sin = Math.sin(chassis.angle);
  return { x: (dx * cos + dy * sin) * ppm, y: (dx * sin - dy * cos) * ppm };
}

/** Mirrored copies share identical edge pixels in either scroll direction. */
export function panoramaTile(index: number, offset: number, width: number) {
  const mirrored = ((index % 2) + 2) % 2 === 1;
  return { x: index * width - offset + (mirrored ? width : 0), mirrored };
}
