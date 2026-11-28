import { describe, expect, it } from 'vitest';
import type { ControlState } from '../input/InputManager';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import type { TrackDefinition } from '../track/desertTrackData';
import { VEHICLE_IDS, vehiclePhysics } from '../vehicles/vehicleCatalog';

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

  it('compresses and recovers both axles after landing without bottoming the body', () => {
    const config = vehiclePhysics(vehicle);
    const world = new PhysicsWorld({ ...flat, startY: 2.8 }, config);
    let peakRear = 0;
    let peakFront = 0;
    let snap = world.step(0, coast, true);
    for (let frame = 0; frame < 180; frame++) {
      snap = world.step(dt, coast, true);
      peakRear = Math.max(peakRear, snap.suspensionCompressionRear);
      peakFront = Math.max(peakFront, snap.suspensionCompressionFront);
      expect(snap.chassisGrounded).toBe(false);
    }
    for (const peak of [peakRear, peakFront]) {
      expect(peak).toBeGreaterThan(.15);
      expect(peak).toBeLessThan(config.suspension.maxCompression + .04);
    }
    expect(snap.suspensionCompressionRear).toBeLessThan(peakRear * .45);
    expect(snap.suspensionCompressionFront).toBeLessThan(peakFront * .45);
    expect(Math.abs(snap.chassisVelY)).toBeLessThan(.08);
  });
});
