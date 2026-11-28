import { describe, expect, it } from 'vitest';
import type { ControlState } from '../input/InputManager';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import type { TrackDefinition } from '../track/desertTrackData';
import { isCar, VEHICLE_IDS, vehiclePhysics } from '../vehicles/vehicleCatalog';

const flat: TrackDefinition = {
  points: [{ x: -20, y: 0 }, { x: 360, y: 0 }],
  startX: 4, startY: .72, finishX: 342, minX: -20, maxX: 360, hints: [],
};
const bridge: TrackDefinition = {
  ...flat, roadFeatures: [{ kind: 'bridge', startX: -20, endX: 360 }],
};
const coast: ControlState = {
  throttle: false, brake: false, leanLeft: false, leanRight: false, anyActive: false,
};
const gas: ControlState = { ...coast, throttle: true, anyActive: true };
const dt = 1 / 60;

function measureLaunch(world: PhysicsWorld) {
  for (let frame = 0; frame < 90; frame++) world.step(dt, coast, true);
  let breakaway = 0;
  let sustained = 0;
  for (let frame = 0; frame < 180; frame++) {
    const snap = world.step(dt, gas, true);
    if (frame < 36) breakaway = Math.max(breakaway, snap.rearSlipMps);
    if (frame >= 60) sustained = Math.max(sustained, snap.rearSlipMps);
    if (!snap.rearGrounded) expect(snap.rearSlipMps).toBe(0);
  }
  return { breakaway, sustained };
}

describe.each(VEHICLE_IDS)('%s desert handling', vehicle => {
  it('allows a brief, limited spin on loose sand and grips a wooden deck', () => {
    const config = vehiclePhysics(vehicle);
    const sand = measureLaunch(new PhysicsWorld(flat, config));
    const wood = measureLaunch(new PhysicsWorld(bridge, config));
    expect(sand.breakaway).toBeGreaterThan(.45);
    expect(sand.breakaway).toBeLessThan(2);
    expect(sand.sustained).toBeLessThan(.35);
    expect(wood.breakaway).toBeLessThan(.15);
  });

  it('compresses the sprung axles and keeps the motorcycle rear hub fixed on landing', () => {
    const config = vehiclePhysics(vehicle);
    const car = isCar(vehicle);
    const world = new PhysicsWorld({ ...flat, startY: 2.8 }, config);
    let peakRear = 0;
    let peakFront = 0;
    let rotatedRear = false;
    let firstContact: number | undefined;
    let snap = world.step(0, coast, true);
    for (let frame = 0; frame < 180; frame++) {
      snap = world.step(dt, coast, true);
      peakRear = Math.max(peakRear, snap.suspensionCompressionRear);
      peakFront = Math.max(peakFront, snap.suspensionCompressionFront);
      if (snap.rearGrounded || snap.frontGrounded) firstContact ??= frame;
      expect(snap.chassisGrounded).toBe(false);
      if (!car) {
        const cos = Math.cos(snap.chassis.angle);
        const sin = Math.sin(snap.chassis.angle);
        const localOffset = ({ x, y }: { x: number; y: number }) => {
          const dx = x - snap.chassis.x, dy = y - snap.chassis.y;
          return { x: dx * cos + dy * sin, y: dy * cos - dx * sin };
        };
        const rear = localOffset(snap.rearWheel);
        const rearError = Math.hypot(rear.x - config.wheels.rearOffsetX, rear.y - config.wheels.rearOffsetY);
        const front = localOffset(snap.frontWheel);
        const axis = config.suspension.frontAxis!;
        const dx = front.x - config.wheels.frontOffsetX;
        const dy = front.y - config.wheels.frontOffsetY;
        // The impact substep can momentarily displace wheels before the joint solver recovers.
        const landing = firstContact !== undefined && frame - firstContact < 8;
        expect(rearError).toBeLessThan(landing ? .065 : .005);
        expect(Math.abs(dx * axis.y - dy * axis.x)).toBeLessThan(landing ? .018 : .005);
        rotatedRear ||= Math.abs(snap.rearWheel.angle - snap.chassis.angle) > .025;
      }
    }
    for (const peak of car ? [peakRear, peakFront] : [peakFront]) {
      expect(peak).toBeGreaterThan(.15);
      expect(peak).toBeLessThan(config.suspension.maxCompression + .04);
    }
    if (car) {
      expect(snap.suspensionCompressionRear).toBeLessThan(peakRear * .45);
    } else {
      expect(peakRear).toBe(0);
      expect(rotatedRear).toBe(true);
    }
    expect(snap.suspensionCompressionFront).toBeLessThan(peakFront * .45);
    expect(Math.abs(snap.chassisVelY)).toBeLessThan(.08);
  });
});
