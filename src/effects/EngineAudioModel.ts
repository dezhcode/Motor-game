export const ENGINE_AUDIO_PATH =
  './assets/aistudio/mixkit-motocross-motorcycle-engine-2727_ee435ad5.wav';

export const GEAR_SHIFT_AUDIO_PATH =
  './assets/aistudio/mixkit-motorcycle-changing-gears-2730_67245b56.wav';

/**
 * Verified single-pitch, dip-free segments from mixkit-motocross-motorcycle-engine-2727_ee435ad5.wav (19.806s):
 * - mid:   6.05s .. 7.12s (steady single-gear motocross pull, f0 ~84Hz, RMS ~0.37, no internal gear shifts)
 * - peak:  9.25s .. 10.65s (sustained full-load peak combustion roar, f0 ~84Hz, RMS ~0.37, no dips)
 * - coast: 14.48s .. 15.88s (trailing off-throttle coasting burble, f0 ~65Hz, RMS ~0.082)
 * - idle:  16.78s .. 17.68s (steady low idle rumble at end of file before 18s+ fadeout, f0 ~50Hz, RMS ~0.067)
 */
export const ENGINE_AUDIO_SEGMENTS = {
  midStartSec: 6.05,
  midEndSec: 7.12,
  peakStartSec: 9.25,
  peakEndSec: 10.65,
  coastStartSec: 14.48,
  coastEndSec: 15.88,
  idleStartSec: 16.78,
  idleEndSec: 17.68,
  loopCrossfadeSec: 0.08,
} as const;

/**
 * Short ~230ms exhaust bark transients extracted from the 3 hits in mixkit-motorcycle-changing-gears-2730_67245b56.wav,
 * used strictly as subtle pitch-matched gear-shift / throttle-chop exhaust pops.
 */
export const SHIFT_BARK_SEGMENTS: ReadonlyArray<{ startSec: number; endSec: number }> = [
  { startSec: 0.095, endSec: 0.315 },
  { startSec: 1.28, endSec: 1.50 },
  { startSec: 2.35, endSec: 2.57 },
];

export const MAX_TRANSMISSION_GEAR = 4;

interface GearBand {
  minSpeed: number;
  maxSpeed: number;
  upshiftSpeed: number;
  downshiftSpeed: number;
  rpmCeiling: number;
  pitchBias: number;
}

const GEAR_BANDS: Readonly<Record<1 | 2 | 3 | 4, GearBand>> = {
  1: { minSpeed: 0.0, maxSpeed: 5.8, upshiftSpeed: 5.2, downshiftSpeed: -1, rpmCeiling: 0.86, pitchBias: 0.88 },
  2: { minSpeed: 3.4, maxSpeed: 10.2, upshiftSpeed: 9.5, downshiftSpeed: 3.0, rpmCeiling: 0.91, pitchBias: 0.97 },
  3: { minSpeed: 6.8, maxSpeed: 14.2, upshiftSpeed: 13.4, downshiftSpeed: 6.1, rpmCeiling: 0.96, pitchBias: 1.05 },
  4: { minSpeed: 9.8, maxSpeed: 16.8, upshiftSpeed: Infinity, downshiftSpeed: 8.8, rpmCeiling: 1.0, pitchBias: 1.14 },
};

export interface EngineAudioState {
  gear: 1 | 2 | 3 | 4;
  gearAgeSec: number;
  rpm: number;
  throttleLoad: number;
  brakeAmount: number;
  masterLevel: number;
  shiftDipTimer: number;
  shiftCooldownSec: number;
  hasBeenGrounded: boolean;
  readyForAirLaunch: boolean;
  rearGroundedStreakSec: number;
  airTimeSec: number;
  airLaunchCooldownSec: number;
  wasThrottling: boolean;
  barkVariationIndex: number;
}

export interface EngineMixOutput {
  gear: 1 | 2 | 3 | 4;
  rpm: number;
  idleGain: number;
  coastGain: number;
  midGain: number;
  peakGain: number;
  idleRate: number;
  coastRate: number;
  midRate: number;
  peakRate: number;
  filterHz: number;
  masterGain: number;
  sandGain: number;
  sandFilterHz: number;
  windGain: number;
  windFilterHz: number;
  justShiftedUp: boolean;
  justChokedExhaustPop: boolean;
  barkVariationIndex: number;
  airLaunchStrength: number;
}

export function createInitialEngineAudioState(): EngineAudioState {
  return {
    gear: 1,
    gearAgeSec: 0,
    rpm: 0.08,
    throttleLoad: 0,
    brakeAmount: 0,
    masterLevel: 0,
    shiftDipTimer: 0,
    shiftCooldownSec: 0,
    hasBeenGrounded: false,
    readyForAirLaunch: false,
    rearGroundedStreakSec: 0,
    airTimeSec: 0,
    airLaunchCooldownSec: 0,
    wasThrottling: false,
    barkVariationIndex: 0,
  };
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * clamp01(t);
}

function smoothstep01(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / Math.max(1e-5, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function stepEngineAudioMix(
  state: EngineAudioState,
  throttle: boolean,
  brake: boolean,
  speedMetersPerSec: number,
  active: boolean,
  dt: number,
  rearGrounded = true,
  frontGrounded = true,
  verticalVelY = 0,
  carvingOnSand = false
): EngineMixOutput {
  const safeDt = Math.min(0.1, Math.max(0.001, dt));
  const absSpeed = Math.abs(speedMetersPerSec);
  const speedNorm = clamp01(absSpeed / 14.5);
  const grounded = rearGrounded || frontGrounded;
  const forwardBraking = brake && speedMetersPerSec > 0.35;
  const reverseCreep = brake && !forwardBraking;
  const throttling = throttle && !brake;

  state.shiftDipTimer = Math.max(0, state.shiftDipTimer - safeDt);
  state.shiftCooldownSec = Math.max(0, state.shiftCooldownSec - safeDt);
  state.airLaunchCooldownSec = Math.max(0, state.airLaunchCooldownSec - safeDt);

  // Track grounded & real airborne liftoff transitions
  if (active && grounded) {
    state.hasBeenGrounded = true;
  }

  let airLaunchStrength = 0;
  if (!active || grounded) {
    if (rearGrounded) {
      state.rearGroundedStreakSec += safeDt;
      if (state.rearGroundedStreakSec >= 0.08) {
        state.readyForAirLaunch = true;
      }
    }
    state.airTimeSec = 0;
  } else {
    state.rearGroundedStreakSec = 0;
    state.airTimeSec += safeDt;
    if (
      state.hasBeenGrounded &&
      state.readyForAirLaunch &&
      state.airTimeSec >= 0.055 &&
      state.airLaunchCooldownSec <= 0 &&
      absSpeed > 2.4
    ) {
      airLaunchStrength = clamp01((absSpeed - 2.0) / 10 + Math.max(0, verticalVelY) / 7);
      state.readyForAirLaunch = false;
      state.airLaunchCooldownSec = 0.55;
    }
  }

  // Smooth throttle load & brake intensity
  const targetLoad = active && throttling ? 1 : 0;
  const loadRate = throttling ? 1.85 : 3.8;
  state.throttleLoad += (targetLoad - state.throttleLoad) * (1 - Math.exp(-loadRate * safeDt));

  const targetBrake = active && forwardBraking ? 1 : 0;
  const brakeRate = forwardBraking ? 9.5 : 5.5;
  state.brakeAmount += (targetBrake - state.brakeAmount) * (1 - Math.exp(-brakeRate * safeDt));

  // Sequential 4-speed gearbox with realistic minimum gear hold & clutch-cut timing
  let justShiftedUp = false;
  let barkVariationIndex = state.barkVariationIndex;
  state.gearAgeSec += safeDt;

  if (!active) {
    state.gear = 1;
    state.gearAgeSec = 0;
  } else {
    const band = GEAR_BANDS[state.gear];
    if (
      throttling &&
      grounded &&
      state.gear < MAX_TRANSMISSION_GEAR &&
      state.gearAgeSec >= 0.78 &&
      state.shiftCooldownSec <= 0 &&
      absSpeed >= band.upshiftSpeed &&
      state.rpm >= 0.76
    ) {
      state.gear = (state.gear + 1) as 1 | 2 | 3 | 4;
      state.gearAgeSec = 0;
      state.shiftDipTimer = 0.14;
      state.shiftCooldownSec = 0.85;
      // Authentic RPM drop on upshift so the next gear pulls cleanly through its band
      state.rpm = Math.max(0.46, state.rpm - 0.34);
      justShiftedUp = true;
      barkVariationIndex = state.barkVariationIndex;
      state.barkVariationIndex = (state.barkVariationIndex + 1) % SHIFT_BARK_SEGMENTS.length;
    } else if (state.gear > 1 && absSpeed <= band.downshiftSpeed && state.gearAgeSec >= 0.25) {
      state.gear = (state.gear - 1) as 1 | 2 | 3 | 4;
      state.gearAgeSec = 0;
    }
  }

  // Subtle exhaust pop when chopping throttle abruptly from high RPM
  const justChokedExhaustPop =
    active && state.wasThrottling && !throttling && !forwardBraking && state.rpm > 0.72 && !justShiftedUp;
  if (justChokedExhaustPop) {
    barkVariationIndex = state.barkVariationIndex;
    state.barkVariationIndex = (state.barkVariationIndex + 1) % SHIFT_BARK_SEGMENTS.length;
  }
  state.wasThrottling = active && throttling;

  const activeBand = GEAR_BANDS[state.gear];
  const gearProgress = clamp01(
    (absSpeed - activeBand.minSpeed) / Math.max(0.5, activeBand.maxSpeed - activeBand.minSpeed)
  );

  // Target RPM inside the active gear
  let targetRpm: number;
  let rpmResponseRate: number;

  if (!active) {
    targetRpm = 0.06;
    rpmResponseRate = 4.5;
  } else if (forwardBraking) {
    targetRpm = 0.05 + speedNorm * 0.14;
    rpmResponseRate = 5.4;
  } else if (reverseCreep) {
    targetRpm = 0.25 + speedNorm * 0.1;
    rpmResponseRate = 4.0;
  } else if (throttling) {
    // Free-wheel flare when rear wheel unloads in mid-air; steady realistic pull on ground
    const airFlare = rearGrounded ? 0 : 0.11;
    const basePull = 0.32 + gearProgress * 0.5 + state.throttleLoad * 0.18 + airFlare;
    targetRpm = Math.min(activeBand.rpmCeiling, clamp01(basePull));
    rpmResponseRate = targetRpm > state.rpm ? (rearGrounded ? 2.15 : 5.4) : 2.0;
  } else {
    targetRpm = 0.07 + gearProgress * 0.16 + speedNorm * 0.08;
    rpmResponseRate = 2.4;
  }

  state.rpm += (targetRpm - state.rpm) * (1 - Math.exp(-rpmResponseRate * safeDt));

  const targetMaster = active ? 1 : 0;
  const masterRate = active ? 8.5 : 12.0;
  state.masterLevel += (targetMaster - state.masterLevel) * (1 - Math.exp(-masterRate * safeDt));

  const rpm = clamp01(state.rpm);
  const driveBlend = clamp01(state.throttleLoad * (1 - state.brakeAmount));
  const shiftDipFactor = state.shiftDipTimer > 0 ? 0.64 : 1.0;

  // 4-layer continuous blend: idle tail -> coast tail -> mid pull -> top-gear peak roar
  const movingCoastBlend = smoothstep01(1.2, 5.5, absSpeed);
  const tailWeight = 1 - smoothstep01(0.16, 0.56, rpm);
  const idleGain = tailWeight * (1 - movingCoastBlend * 0.72) * 1.02;
  const coastGain = tailWeight * movingCoastBlend * 0.96 * (1 - state.brakeAmount * 0.15);

  const midIn = smoothstep01(0.16, 0.44, rpm);
  const midOut = 1 - smoothstep01(0.68, 0.96, rpm) * 0.68;
  const midDriveFactor = reverseCreep ? 0.95 : lerpNum(0.32, 1.0, driveBlend);
  const midGain = 0.5 * midIn * midOut * midDriveFactor;

  const peakIn = smoothstep01(0.5, 0.88, rpm);
  const peakGearBoost = state.gear === MAX_TRANSMISSION_GEAR ? 1.12 : 0.88 + state.gear * 0.05;
  const peakGain = 0.62 * peakIn * lerpNum(0.16, 1.0, driveBlend) * peakGearBoost;

  // Dramatic pitch climb across each gear and highest ceiling in top gear (Gear 4)
  const airPitchBonus = !rearGrounded && throttling ? 0.06 : 0;
  const idleRate = forwardBraking
    ? lerpNum(0.92, 0.78, state.brakeAmount)
    : lerpNum(0.88, 1.06, rpm * 0.6 + speedNorm * 0.4);
  const coastRate = forwardBraking
    ? lerpNum(0.9, 0.72, state.brakeAmount)
    : lerpNum(0.86, 1.12, speedNorm * 0.75 + rpm * 0.25);
  const midRate = lerpNum(0.74, 1.24, rpm) * activeBand.pitchBias + airPitchBonus;
  const peakRate =
    lerpNum(0.86, 1.36, smoothstep01(0.45, 1.0, rpm)) * (0.94 + state.gear * 0.025) +
    airPitchBonus;

  const filterHz = forwardBraking
    ? lerpNum(1450, 920, state.brakeAmount)
    : lerpNum(1450, 9800, smoothstep01(0.1, 0.96, rpm));

  // Sand tire rolling, carving & brake-skid noise layer
  let sandGain = 0;
  let sandFilterHz = 620;
  if (active && grounded && absSpeed > 0.8) {
    if (forwardBraking) {
      sandGain = 0.16 * clamp01(absSpeed / 5.5);
      sandFilterHz = 980;
    } else if (throttling && rearGrounded && absSpeed < 7.5) {
      sandGain = 0.085 * clamp01(absSpeed / 4.5 + 0.25);
      sandFilterHz = 520;
    } else {
      sandGain = 0.042 * smoothstep01(1.5, 12, absSpeed);
      sandFilterHz = lerpNum(480, 820, speedNorm);
    }
    if (carvingOnSand) {
      sandGain = Math.min(0.2, sandGain * 1.45 + 0.03 * clamp01(absSpeed / 6));
      sandFilterHz += 160;
    }
  }

  // Mid-air wind rush layer (replaces artificial takeoff clip with real aerodynamics)
  const airborne = active && !grounded;
  const windGain = airborne
    ? 0.13 * smoothstep01(0.05, 0.35, state.airTimeSec) * clamp01(absSpeed / 10 + 0.2)
    : 0;
  const windFilterHz = lerpNum(340, 780, speedNorm);

  return {
    gear: state.gear,
    rpm,
    idleGain,
    coastGain,
    midGain,
    peakGain,
    idleRate,
    coastRate,
    midRate,
    peakRate,
    filterHz,
    masterGain: 0.58 * state.masterLevel * shiftDipFactor,
    sandGain,
    sandFilterHz,
    windGain,
    windFilterHz,
    justShiftedUp,
    justChokedExhaustPop,
    barkVariationIndex,
    airLaunchStrength,
  };
}
