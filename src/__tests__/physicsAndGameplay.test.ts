import { describe, expect, it } from 'vitest';
import { PHYSICS_CONFIG } from '../config/physicsConfig';
import { DESERT_TRACK } from '../track/desertTrackData';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { InputManager, type ControlState } from '../input/InputManager';

const IDLE: ControlState = {
  throttle: false,
  brake: false,
  leanLeft: false,
  leanRight: false,
  anyActive: false,
};

const THROTTLE: ControlState = {
  ...IDLE,
  throttle: true,
  anyActive: true,
};

const BRAKE: ControlState = {
  ...IDLE,
  brake: true,
  anyActive: true,
};

const LEAN_LEFT: ControlState = {
  ...IDLE,
  leanLeft: true,
  anyActive: true,
};

describe('PhysicsWorld - KavirSavar', () => {
  it('accelerates smoothly with throttle and decelerates with brake', () => {
    const world = new PhysicsWorld(DESERT_TRACK, PHYSICS_CONFIG);

    // Let bike settle on starting flat
    for (let i = 0; i < 30; i++) {
      world.step(1 / 60, IDLE, true);
    }

    // Apply throttle for 2 seconds
    let snap = world.step(1 / 60, THROTTLE, true);
    for (let i = 0; i < 120; i++) {
      snap = world.step(1 / 60, THROTTLE, true);
    }

    expect(snap.crashedReason).toBeNull();
    expect(snap.chassis.x).toBeGreaterThan(DESERT_TRACK.startX + 6);
    expect(snap.chassisVelX).toBeGreaterThan(6);
    const peakSpeed = snap.chassisVelX;

    // Apply brake for 1 second
    for (let i = 0; i < 60; i++) {
      snap = world.step(1 / 60, BRAKE, true);
    }
    expect(snap.chassisVelX).toBeLessThan(peakSpeed * 0.5);
  });

  it('activates suspension compression and clears jumps cleanly on the handcrafted track', () => {
    const world = new PhysicsWorld(DESERT_TRACK, PHYSICS_CONFIG);

    let maxAirborneSteps = 0;
    let currentAirborneSteps = 0;
    let sawLandingFeedback = false;
    let sawSuspensionFlex = false;
    let finished = false;
    let crashed: string | null = null;
    let simSeconds = 0;

    // Simulate riding the track with simple upright balance stabilization (like a skilled player)
    const maxSteps = 60 * 55;
    for (let step = 0; step < maxSteps; step++) {
      simSeconds += 1 / 60;
      const snapPrev = world.step(0, IDLE, false);
      const angle = snapPrev.chassis.angle;
      const airborne = !snapPrev.rearGrounded && !snapPrev.frontGrounded;

      if (airborne) {
        currentAirborneSteps++;
        if (currentAirborneSteps > maxAirborneSteps) maxAirborneSteps = currentAirborneSteps;
      } else {
        currentAirborneSteps = 0;
      }

      if (
        Math.abs(snapPrev.suspensionCompressionRear) > 0.015 ||
        Math.abs(snapPrev.suspensionCompressionFront) > 0.015
      ) {
        sawSuspensionFlex = true;
      }

      const controls: ControlState = {
        throttle: true,
        brake: false,
        leanLeft: angle < -0.14,
        leanRight: angle > 0.12,
        anyActive: true,
      };

      const snap = world.step(1 / 60, controls, true);
      if (snap.justLandedStrength > 0) {
        sawLandingFeedback = true;
      }
      if (snap.crashedReason) {
        crashed = snap.crashedReason;
        break;
      }
      if (snap.finished) {
        finished = true;
        break;
      }
    }

    expect(crashed).toBeNull();
    expect(finished).toBe(true);
    expect(simSeconds).toBeGreaterThanOrEqual(22);
    expect(simSeconds).toBeLessThanOrEqual(60);
    expect(maxAirborneSteps).toBeGreaterThan(15);
    expect(sawLandingFeedback).toBe(true);
    expect(sawSuspensionFlex).toBe(true);
  });

  it('detects sustained upside-down flip or head crash and resets cleanly across multiple restarts', () => {
    const world = new PhysicsWorld(DESERT_TRACK, PHYSICS_CONFIG);

    let crashReason: string | null = null;
    // Combine throttle + backward lean to force a wheelie flip onto the helmet / upside down
    for (let i = 0; i < 60 * 5; i++) {
      const snap = world.step(1 / 60, { ...LEAN_LEFT, throttle: true }, true);
      if (snap.crashedReason) {
        crashReason = snap.crashedReason;
        break;
      }
    }
    expect(crashReason).not.toBeNull();

    // Repeated restarts restore exact initial state with no residual velocity or crash flag
    for (let r = 0; r < 3; r++) {
      world.reset();
      const resetSnap = world.step(1 / 60, IDLE, true);
      expect(resetSnap.crashedReason).toBeNull();
      expect(resetSnap.finished).toBe(false);
      expect(Math.abs(resetSnap.chassis.x - DESERT_TRACK.startX)).toBeLessThan(0.1);
      expect(Math.abs(resetSnap.chassisVelX)).toBeLessThan(0.2);
    }
  });

  it('clamps huge background delta spikes to maxFrameDt', () => {
    const world = new PhysicsWorld(DESERT_TRACK, PHYSICS_CONFIG);
    const snap = world.step(10.0, THROTTLE, true);
    expect(snap.chassis.x).toBeLessThan(DESERT_TRACK.startX + 1.5);
  });
});

describe('InputManager - multi-touch pointerId isolation', () => {
  it('handles simultaneous multi-touch pointers and clears cleanly on lock/cancel', () => {
    const input = new InputManager();

    input.onPointerDown(101, 'throttle');
    input.onPointerDown(202, 'leanLeft');
    let st = input.getState();
    expect(st.throttle).toBe(true);
    expect(st.leanLeft).toBe(true);
    expect(st.brake).toBe(false);

    // Releasing one finger leaves the other intact
    input.onPointerRelease(101);
    st = input.getState();
    expect(st.throttle).toBe(false);
    expect(st.leanLeft).toBe(true);

    // Locking inputs (pause) clears everything
    input.setLocked(true);
    st = input.getState();
    expect(st.anyActive).toBe(false);

    input.setLocked(false);
    st = input.getState();
    expect(st.anyActive).toBe(false);
    input.destroy();
  });
});
