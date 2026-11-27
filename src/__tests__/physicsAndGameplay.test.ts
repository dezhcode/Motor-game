import { describe, expect, it } from 'vitest';
import { PHYSICS_CONFIG, type PhysicsConfig } from '../config/physicsConfig';
import { DESERT_TRACK, type TrackDefinition } from '../track/desertTrackData';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { InputManager, type ControlState } from '../input/InputManager';
import {
  createInitialEngineAudioState,
  DustSystem,
  ENGINE_AUDIO_SEGMENTS,
  MAX_TRANSMISSION_GEAR,
  SHIFT_BARK_SEGMENTS,
  stepEngineAudioMix,
} from '../effects/DustAndAudio';
import { HapticController } from '../effects/Haptics';
import { RIDER_BONES, riderPose } from '../artwork/rigGeometry';
import { computeContactShadow } from '../track/contactShadow';
import { sampleTrackHeight } from '../track/desertTrackData';
import { FollowCamera } from '../camera/FollowCamera';

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

const FLAT_TEST_TRACK: TrackDefinition = {
  points: [
    { x: -20, y: 0 },
    { x: 250, y: 0 },
  ],
  startX: 4,
  startY: 1.1,
  finishX: 220,
  minX: -20,
  maxX: 250,
  hints: [],
};

describe('PhysicsWorld - KavirSavar', () => {
  it('maintains natural chassis ride height and healthy static sag after settling on flat ground', () => {
    const world = new PhysicsWorld(FLAT_TEST_TRACK, PHYSICS_CONFIG);

    // Let bike settle for 4 seconds with no input
    let snap = world.step(1 / 60, IDLE, true);
    for (let i = 0; i < 60 * 4; i++) {
      snap = world.step(1 / 60, IDLE, true);
    }

    // Chassis must sit clearly above wheel axles (not collapsed between wheels)
    expect(snap.chassis.y).toBeGreaterThan(snap.rearWheel.y + 0.22);
    expect(snap.chassis.y).toBeGreaterThan(snap.frontWheel.y + 0.22);
    // Suspension should have slight natural static sag (2cm - 9cm), never bottomed out
    expect(snap.suspensionCompressionRear).toBeGreaterThan(0.015);
    expect(snap.suspensionCompressionRear).toBeLessThan(0.09);
    expect(snap.suspensionCompressionFront).toBeGreaterThan(0.015);
    expect(snap.suspensionCompressionFront).toBeLessThan(0.09);
    // Belly must never touch flat ground at rest
    expect(snap.chassisGrounded).toBe(false);
    expect(snap.crashedReason).toBeNull();
  });

  it('accelerates smoothly with throttle, keeps chassis off ground, and brakes effectively', () => {
    const world = new PhysicsWorld(FLAT_TEST_TRACK, PHYSICS_CONFIG);

    for (let i = 0; i < 60; i++) {
      world.step(1 / 60, IDLE, true);
    }

    let snap = world.step(1 / 60, THROTTLE, true);
    let chassisTouchedGround = false;
    for (let i = 0; i < 120; i++) {
      snap = world.step(1 / 60, THROTTLE, true);
      if (snap.chassisGrounded) chassisTouchedGround = true;
    }

    expect(chassisTouchedGround).toBe(false);
    expect(snap.crashedReason).toBeNull();
    expect(snap.chassis.x).toBeGreaterThan(FLAT_TEST_TRACK.startX + 12);
    expect(snap.chassisVelX).toBeGreaterThan(9);
    const peakSpeed = snap.chassisVelX;

    // Apply brake for 1.2 seconds: must decelerate strongly without interference
    for (let i = 0; i < 72; i++) {
      snap = world.step(1 / 60, BRAKE, true);
      if (snap.chassisGrounded) chassisTouchedGround = true;
    }
    expect(chassisTouchedGround).toBe(false);
    expect(snap.chassisVelX).toBeLessThan(peakSpeed * 0.35);
  });

  it('improves 1s, 2s and 3s acceleration over the previous drive tune without collapsing or flipping', () => {
    const measureAcceleration = (config: PhysicsConfig) => {
      const world = new PhysicsWorld(FLAT_TEST_TRACK, config);
      for (let i = 0; i < 240; i++) {
        world.step(1 / 60, IDLE, true);
      }
      const startX = world.step(0, IDLE, false).chassis.x;
      const samples: Array<{ speed: number; distance: number }> = [];
      for (let step = 1; step <= 180; step++) {
        const snap = world.step(1 / 60, THROTTLE, true);
        expect(snap.crashedReason).toBeNull();
        expect(snap.chassisGrounded).toBe(false);
        expect(Math.abs(snap.chassis.angle)).toBeLessThan(0.35);
        expect(snap.suspensionCompressionRear).toBeLessThan(0.22);
        expect(snap.suspensionCompressionFront).toBeLessThan(0.22);
        if (step % 60 === 0) {
          samples.push({ speed: snap.chassisVelX, distance: snap.chassis.x - startX });
        }
      }
      return samples;
    };

    // The suspension-fix release capped the wheel at 33rad/s with 108Nm available.
    // Compare only the drive tune so both bikes retain the corrected suspension.
    const previousConfig: PhysicsConfig = {
      ...PHYSICS_CONFIG,
      drive: { ...PHYSICS_CONFIG.drive, maxMotorTorque: 108, targetWheelOmega: 33 },
    };
    const previous = measureAcceleration(previousConfig);
    const current = measureAcceleration(PHYSICS_CONFIG);

    expect(current[0].speed).toBeGreaterThan(previous[0].speed * 1.15);
    expect(current[1].speed).toBeGreaterThan(previous[1].speed * 1.2);
    expect(current[1].distance).toBeGreaterThan(previous[1].distance * 1.15);
    expect(current[1].speed).toBeGreaterThan(14);
    expect(current[1].distance).toBeGreaterThan(16);
    expect(current[2].speed).toBeGreaterThan(previous[2].speed * 1.2);
    expect(current[2].speed).toBeGreaterThan(current[1].speed * 0.95);
  });

  it('returns to normal suspension height after a jump and landing without sustained oscillation', () => {
    const dropTrack: TrackDefinition = {
      points: [
        { x: -20, y: 0 },
        { x: 250, y: 0 },
      ],
      startX: 4,
      startY: 3.2, // ~2.5m drop onto flat ground
      finishX: 220,
      minX: -20,
      maxX: 250,
      hints: [],
    };
    const world = new PhysicsWorld(dropTrack, PHYSICS_CONFIG);

    let maxCompressionSeen = 0;
    let landed = false;
    let chassisTouchedGround = false;
    let snap = world.step(1 / 60, IDLE, true);

    for (let i = 0; i < 60 * 3; i++) {
      snap = world.step(1 / 60, IDLE, true);
      if (snap.justLandedStrength > 0) landed = true;
      if (snap.chassisGrounded) chassisTouchedGround = true;
      if (snap.suspensionCompressionRear > maxCompressionSeen) {
        maxCompressionSeen = snap.suspensionCompressionRear;
      }
    }

    expect(landed).toBe(true);
    expect(chassisTouchedGround).toBe(false);
    expect(maxCompressionSeen).toBeGreaterThan(0.08);
    expect(maxCompressionSeen).toBeLessThanOrEqual(PHYSICS_CONFIG.suspension.maxCompression + 0.03);
    // Settled cleanly back near static ride height
    expect(Math.abs(snap.chassisVelY)).toBeLessThan(0.1);
    expect(snap.chassis.y).toBeGreaterThan(snap.rearWheel.y + 0.22);
    expect(snap.suspensionCompressionRear).toBeGreaterThan(0.015);
    expect(snap.suspensionCompressionRear).toBeLessThan(0.09);
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

    const maxSteps = 60 * 60;
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
    expect(simSeconds).toBeGreaterThanOrEqual(18);
    expect(simSeconds).toBeLessThanOrEqual(60);
    expect(maxAirborneSteps).toBeGreaterThan(12);
    expect(sawLandingFeedback).toBe(true);
    expect(sawSuspensionFlex).toBe(true);
  });

  it('detects sustained upside-down flip or head crash and resets cleanly across multiple restarts', () => {
    const world = new PhysicsWorld(DESERT_TRACK, PHYSICS_CONFIG);

    let crashReason: string | null = null;
    for (let i = 0; i < 60 * 5; i++) {
      const snap = world.step(1 / 60, { ...LEAN_LEFT, throttle: true }, true);
      if (snap.crashedReason) {
        crashReason = snap.crashedReason;
        break;
      }
    }
    expect(crashReason).not.toBeNull();

    for (let r = 0; r < 3; r++) {
      world.reset();
      const resetSnap = world.step(1 / 60, IDLE, true);
      expect(resetSnap.crashedReason).toBeNull();
      expect(resetSnap.finished).toBe(false);
      expect(resetSnap.chassisGrounded).toBe(false);
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

    input.onPointerRelease(101);
    st = input.getState();
    expect(st.throttle).toBe(false);
    expect(st.leanLeft).toBe(true);

    input.setLocked(true);
    st = input.getState();
    expect(st.anyActive).toBe(false);

    input.setLocked(false);
    st = input.getState();
    expect(st.anyActive).toBe(false);
    input.destroy();
  });
});

describe('DesertAudio - 4-speed gearbox, soaring throttle peak, brake skid & organic airborne effects', () => {
  it('plays steady idle tail section with no shifts when stopped and off throttle', () => {
    const state = createInitialEngineAudioState();
    let out = stepEngineAudioMix(state, false, false, 0, true, 1 / 60);
    for (let i = 0; i < 60; i++) {
      out = stepEngineAudioMix(state, false, false, 0, true, 1 / 60);
    }

    expect(ENGINE_AUDIO_SEGMENTS.idleStartSec).toBeGreaterThan(16);
    expect(ENGINE_AUDIO_SEGMENTS.idleEndSec).toBeLessThan(18);
    expect(out.gear).toBe(1);
    expect(out.idleGain).toBeGreaterThan(0.9);
    expect(out.midGain).toBe(0);
    expect(out.peakGain).toBe(0);
    expect(out.sandGain).toBe(0);
    expect(out.windGain).toBe(0);
    expect(out.masterGain).toBeGreaterThan(0.5);
  });

  it('shifts sequentially 1->2->3->4 only up to top gear 4 and soars to peak roar without endless shifting', () => {
    const state = createInitialEngineAudioState();
    let shiftCount = 0;
    let out = stepEngineAudioMix(state, true, false, 0.5, true, 1 / 60);

    // Accelerate smoothly from 0 to 17 m/s over 4.2 seconds, then hold top speed for 2 seconds
    for (let i = 0; i < 372; i++) {
      const speed = Math.min(17.0, (i / 252) * 17.0);
      out = stepEngineAudioMix(state, true, false, speed, true, 1 / 60, true, true, 0);
      if (out.justShiftedUp) shiftCount++;
    }

    expect(MAX_TRANSMISSION_GEAR).toBe(4);
    expect(shiftCount).toBe(3); // 1->2, 2->3, 3->4 and STOP
    expect(state.gear).toBe(4);
    expect(out.gear).toBe(4);
    expect(out.rpm).toBeGreaterThan(0.95);
    expect(out.peakGain).toBeGreaterThan(0.6);
    expect(out.peakRate).toBeGreaterThan(1.3);
    expect(out.filterHz).toBeGreaterThan(8500);
    expect(out.idleGain).toBeLessThan(0.01);

    // Release gas while coasting down: settles back smoothly into coast/idle tail
    for (let i = 0; i < 180; i++) {
      const coastSpeed = Math.max(0.2, 14 * (1 - i / 180));
      out = stepEngineAudioMix(state, false, false, coastSpeed, true, 1 / 60, true, true, 0);
    }
    expect(out.idleGain + out.coastGain).toBeGreaterThan(0.85);
    expect(out.peakGain).toBeLessThan(0.02);
  });

  it('drops RPM, lowers tail pitch, and activates sand-skid noise when braking on ground', () => {
    const state = createInitialEngineAudioState();
    for (let i = 0; i < 150; i++) {
      const speed = Math.min(13, (i / 90) * 13);
      stepEngineAudioMix(state, true, false, speed, true, 1 / 60, true, true, 0);
    }
    const peakRpm = state.rpm;

    let out = stepEngineAudioMix(state, false, true, 11, true, 1 / 60, true, true, 0);
    for (let i = 0; i < 45; i++) {
      const brakingSpeed = Math.max(2.5, 11 * (1 - i / 45));
      out = stepEngineAudioMix(state, false, true, brakingSpeed, true, 1 / 60, true, true, 0);
    }

    expect(state.rpm).toBeLessThan(peakRpm * 0.35);
    expect(out.coastRate).toBeLessThan(0.82);
    expect(out.filterHz).toBeLessThan(1200);
    expect(out.sandGain).toBeGreaterThan(0.05);
  });

  it('triggers subtle launch whoosh + wind rush and free-wheel flare in air without phantom shift spam', () => {
    expect(SHIFT_BARK_SEGMENTS.length).toBe(3);
    const state = createInitialEngineAudioState();

    // Grounded run-up first
    for (let i = 0; i < 120; i++) {
      stepEngineAudioMix(state, true, false, Math.min(12, i * 0.12), true, 1 / 60, true, true, 0);
    }

    // Launch off ramp into air
    let launchEvents = 0;
    let shiftEventsInAir = 0;
    let maxWind = 0;
    let out = stepEngineAudioMix(state, true, false, 11, true, 1 / 60, false, false, 4.5);
    for (let i = 0; i < 45; i++) {
      out = stepEngineAudioMix(state, true, false, 11, true, 1 / 60, false, false, 4.5 - i * 0.15);
      if (out.airLaunchStrength > 0) launchEvents++;
      if (out.justShiftedUp) shiftEventsInAir++;
      if (out.windGain > maxWind) maxWind = out.windGain;
    }

    expect(launchEvents).toBe(1);
    expect(shiftEventsInAir).toBe(0);
    expect(maxWind).toBeGreaterThan(0.06);
    expect(out.sandGain).toBe(0);

    // Master fades to zero when paused/inactive
    for (let i = 0; i < 60; i++) {
      out = stepEngineAudioMix(state, false, false, 0, false, 1 / 60);
    }
    expect(out.masterGain).toBeLessThan(0.01);
  });

  it('amplifies desert sand tire friction gain and filter brightness when carving on sand', () => {
    const baseState = createInitialEngineAudioState();
    const carveState = createInitialEngineAudioState();

    const normalMix = stepEngineAudioMix(baseState, true, false, 8.5, true, 1 / 60, true, true, 0, false);
    const carveMix = stepEngineAudioMix(carveState, true, false, 8.5, true, 1 / 60, true, true, 0, true);

    expect(carveMix.sandGain).toBeGreaterThan(normalMix.sandGain);
    expect(carveMix.sandFilterHz).toBeGreaterThan(normalMix.sandFilterHz);
  });
});

describe('Track Obstacles & HapticController', () => {
  it('scatters dynamic props cleanly along the handcrafted track and triggers hazard_impact inside gap saws', () => {
    const world = new PhysicsWorld(DESERT_TRACK, PHYSICS_CONFIG);
    let sawPropMotion = false;
    let sawPropImpact = false;
    const initialSnap = world.step(0, IDLE, false);
    expect(initialSnap.dynamicProps.length).toBeGreaterThanOrEqual(8);
    const firstCrateX = initialSnap.dynamicProps[1].x;

    for (let i = 0; i < 60 * 5; i++) {
      const prev = world.step(0, IDLE, false);
      const controls: ControlState = {
        throttle: true,
        brake: false,
        leanLeft: prev.chassis.angle < -0.14,
        leanRight: prev.chassis.angle > 0.12,
        anyActive: true,
      };
      const snap = world.step(1 / 60, controls, true);
      if (snap.justHitObstacleStrength > 0) sawPropImpact = true;
      if (Math.abs(snap.dynamicProps[1].x - firstCrateX) > 0.4) sawPropMotion = true;
      if (snap.crashedReason) break;
    }
    expect(sawPropImpact).toBe(true);
    expect(sawPropMotion).toBe(true);

    // Direct contact with a gap hazard saw triggers hazard_impact
    const saw = DESERT_TRACK.hazardSaws?.[0];
    expect(saw).toBeDefined();
    if (saw) {
      const sawTrapTrack: TrackDefinition = {
        ...FLAT_TEST_TRACK,
        startX: saw.x,
        startY: saw.y,
        hazardSaws: [saw],
      };
      const sawWorld = new PhysicsWorld(sawTrapTrack, PHYSICS_CONFIG);
      const snap = sawWorld.step(1 / 60, IDLE, false);
      expect(snap.crashedReason).toBe('hazard_impact');
    }
  });

  it('triggers throttled native/web vibration patterns and respects haptics disable', () => {
    const calls: Array<{ ms: number; amp: number }> = [];
    let cancelled = 0;
    (globalThis as unknown as { window?: Record<string, unknown> }).window = {
      KavirHaptics: {
        vibrate: (ms: number, amp: number) => calls.push({ ms, amp }),
        cancel: () => {
          cancelled++;
        },
      },
    };

    try {
      const haptics = new HapticController(true);
      haptics.tapButton('throttle');
      haptics.onUpshift(2);
      haptics.onLanding(6.5);
      haptics.updateRideFeedback({
        nowMs: 500,
        throttle: true,
        brake: false,
        speedX: 12,
        rpm: 0.85,
        grounded: true,
        compressionMax: 0.08,
      });
      expect(calls.length).toBeGreaterThanOrEqual(4);

      const countBeforeDisable = calls.length;
      haptics.setEnabled(false);
      expect(cancelled).toBeGreaterThanOrEqual(1);
      haptics.tapButton('ui');
      haptics.onLanding(8);
      expect(calls.length).toBe(countBeforeDisable);
    } finally {
      delete (globalThis as unknown as { window?: Record<string, unknown> }).window;
    }
  });
});

describe('Stage 1 - Rider Kinematics, Contact Shadow & Camera Sightlines', () => {
  it('maintains fixed torso length and reachable arm/leg IK limits across lean, compression, and surge', () => {
    for (const lean of [-1, -0.5, 0, 0.5, 1]) {
      for (const compression of [0, 0.1, 0.22]) {
        for (const surge of [-1, 0, 1]) {
          const pose = riderPose(lean, compression, { surge });
          const torsoLen = Math.hypot(pose.hip.x - pose.neck.x, pose.hip.y - pose.neck.y);
          expect(torsoLen).toBeCloseTo(RIDER_BONES.torso, 6);

          const nearArmDist = Math.hypot(pose.nearGrip.x - pose.shoulder.x, pose.nearGrip.y - pose.shoulder.y);
          const farArmDist = Math.hypot(pose.farGrip.x - pose.shoulder.x, pose.farGrip.y - pose.shoulder.y);
          expect(nearArmDist).toBeGreaterThanOrEqual(5.5);
          expect(nearArmDist).toBeLessThanOrEqual(RIDER_BONES.armUpper + RIDER_BONES.armLower - 0.5);
          expect(farArmDist).toBeGreaterThanOrEqual(5.5);
          expect(farArmDist).toBeLessThanOrEqual(RIDER_BONES.armUpper + RIDER_BONES.armLower - 0.5);

          const nearLegDist = Math.hypot(pose.nearFoot.x - pose.hip.x, pose.nearFoot.y - pose.hip.y);
          const farLegDist = Math.hypot(pose.farFoot.x - pose.hip.x, pose.farFoot.y - pose.hip.y);
          expect(nearLegDist).toBeGreaterThanOrEqual(7.0);
          expect(nearLegDist).toBeLessThanOrEqual(RIDER_BONES.legUpper + RIDER_BONES.legLower - 0.5);
          expect(farLegDist).toBeGreaterThanOrEqual(7.0);
          expect(farLegDist).toBeLessThanOrEqual(RIDER_BONES.legUpper + RIDER_BONES.legLower - 0.5);
        }
      }
    }
  });

  it('aligns contact shadow with terrain height/slope, attenuates with jump height, and hides over gap pits', () => {
    const flatShadow = computeContactShadow(DESERT_TRACK, DESERT_TRACK.startX, DESERT_TRACK.startY, 0);
    expect(flatShadow.visible).toBe(true);
    expect(Math.abs(flatShadow.slopeRad)).toBeLessThan(0.05);
    expect(flatShadow.alpha).toBeGreaterThan(0.3);

    const uphillX = 92;
    const uphillY = sampleTrackHeight(DESERT_TRACK, uphillX) + 0.72;
    const uphillShadow = computeContactShadow(DESERT_TRACK, uphillX, uphillY, 0.25);
    expect(uphillShadow.visible).toBe(true);
    expect(uphillShadow.slopeRad).toBeGreaterThan(0.15);

    const highShadow = computeContactShadow(DESERT_TRACK, uphillX, uphillY + 2.8, 0);
    expect(highShadow.visible).toBe(true);
    expect(highShadow.alpha).toBeLessThan(uphillShadow.alpha * 0.35);

    const veryHighShadow = computeContactShadow(DESERT_TRACK, uphillX, uphillY + 4.8, 0);
    expect(veryHighShadow.visible).toBe(false);

    const saw = DESERT_TRACK.hazardSaws?.[0];
    expect(saw).toBeDefined();
    if (saw) {
      const gapShadow = computeContactShadow(DESERT_TRACK, saw.x, saw.y + 2.5, 0);
      expect(gapShadow.visible).toBe(false);
    }
  });

  it('expands high-speed/descent camera sightlines smoothly and stays steady at standstill', () => {
    const cam = new FollowCamera();
    cam.setViewport(1280, 720);
    cam.reset(4, 1);

    // Standstill micro-oscillation deadband prevents jitter
    const idleA = cam.update(4, 1, 0.08, 1 / 60, -0.05, true);
    const idleB = cam.update(4, 1, -0.07, 1 / 60, 0.04, true);
    expect(Math.abs(idleB.worldX - idleA.worldX)).toBeLessThan(0.03);

    // High-speed & descent zoom out slightly to show landing zone while keeping bike inside 20%-40% X
    let fastView = idleB;
    for (let i = 0; i < 120; i++) {
      fastView = cam.update(20 + i * 0.25, 4, 15.5, 1 / 60, -4.5, false);
    }
    expect(fastView.scale).toBeLessThan(idleA.scale);
    const bikeScreenX = 1280 / 2 + (20 + 119 * 0.25 - fastView.worldX) * 44 * fastView.scale;
    expect(bikeScreenX).toBeGreaterThan(1280 * 0.2);
    expect(bikeScreenX).toBeLessThan(1280 * 0.4);
  });

  it('emits landing dust only from grounded wheels and keeps airborne wheels dry', () => {
    const dust = new DustSystem(32);
    dust.emitLandingSplash(10, 0, 50, 0, 8, 6.0, true, false);
    dust.update(1 / 60);

    const visibleChildren = dust.container.children.filter((c) => c.visible);
    expect(visibleChildren.length).toBeGreaterThan(0);
    for (const child of visibleChildren) {
      expect(child.position.x).toBeLessThan(25 * 44);
    }
  });
});

