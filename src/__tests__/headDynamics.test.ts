import { describe, expect, it } from 'vitest';
import { HeadDynamics, HEAD_LIMIT, type HeadTelemetry } from '../bike/HeadDynamics';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { DESERT_TRACK } from '../track/desertTrackData';
const rest: HeadTelemetry = { velocityX: 0, velocityY: 0, pitch: 0, angularVelocity: 0, grounded: true, landing: 0, obstacleHit: 0 };
const peak = (strength: number, fps = 60) => {
  const head = new HeadDynamics();
  head.update(rest, 1 / fps);
  let max = 0;
  for (let i = 0; i < fps * 5; i++) {
    max = Math.max(max, Math.abs(head.update({ ...rest, landing: i === 0 ? strength : 0 }, 1 / fps)));
  }
  return { max, head };
};
describe('Reactive head', () => {
  it('stays still at rest and freezes exactly during pause', () => {
    const h = new HeadDynamics();
    for (let i = 0; i < 600; i++) expect(h.update(rest, 1 / 60)).toBe(0);
    h.update({ ...rest, landing: 8 }, 1 / 60);
    const before = h.angle;
    for (let i = 0; i < 60; i++) expect(h.update(rest, 0)).toBe(before);
    h.reset();
    expect(h.update({ ...rest, velocityX: 18 }, 1 / 60)).toBe(0);
  });
  it('responds to measured acceleration and braking with opposite signs', () => {
    const h = new HeadDynamics();
    h.update(rest, 1 / 60);
    for (let i = 1; i <= 60; i++) h.update({ ...rest, velocityX: i / 10 }, 1 / 60);
    expect(h.angle).toBeLessThan(-0.01);
    for (let i = 59; i >= 0; i--) h.update({ ...rest, velocityX: i / 10 }, 1 / 60);
    expect(h.angle).toBeGreaterThan(0.01);
  });
  it('counter-rotates on uphill and downhill and returns smoothly after impacts', () => {
    for (const pitch of [-0.5, 0.5]) {
      const h = new HeadDynamics();
      for (let i = 0; i < 120; i++) h.update({ ...rest, pitch }, 1 / 60);
      expect(Math.sign(h.angle)).toBe(Math.sign(pitch));
    }
    const small = peak(3), medium = peak(6), hard = peak(10);
    expect(small.max).toBeGreaterThan(0.004);
    expect(medium.max).toBeGreaterThan(small.max * 1.5);
    expect(hard.max).toBeGreaterThan(medium.max * 1.4);
    expect(Math.abs(hard.head.angle)).toBeLessThan(0.00001);
  });
  it('keeps the same impact response across 30/60/120 Hz and bounds extreme inputs', () => {
    const peaks = [30, 60, 120].map(fps => peak(8, fps).max);
    expect(Math.max(...peaks) / Math.min(...peaks)).toBeLessThan(1.06);
    const h = new HeadDynamics();
    for (let i = 0; i < 100; i++) {
      const angle = h.update({ ...rest, landing: 1000, angularVelocity: 100, velocityX: i % 2 ? 1000 : -1000 }, 10);
      expect(Number.isFinite(angle)).toBe(true);
      expect(Math.abs(angle)).toBeLessThanOrEqual(HEAD_LIMIT);
    }
    expect(Number.isFinite(h.update({ ...rest, velocityX: NaN }, 1 / 60))).toBe(true);
  });
  it('reacts to throttle-driven telemetry from the real Planck world', () => {
    const world = new PhysicsWorld(DESERT_TRACK), head = new HeadDynamics();
    let max = 0;
    for (let i = 0; i < 180; i++) {
      const s = world.step(1 / 60, { throttle: i > 30, brake: false, leanLeft: false, leanRight: false, anyActive: i > 30 }, true);
      const a = head.update({ velocityX: s.chassisVelX, velocityY: s.chassisVelY, pitch: s.chassis.angle, angularVelocity: s.chassisAngularVelocity,
        grounded: s.rearGrounded || s.frontGrounded, landing: s.justLandedStrength, obstacleHit: s.justHitObstacleStrength }, 1 / 60);
      expect(Number.isFinite(a)).toBe(true);
      max = Math.max(max, Math.abs(a));
    }
    expect(max).toBeGreaterThan(0.005);
  });
});
