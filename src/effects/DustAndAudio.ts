import { Container, Graphics } from 'pixi.js';
import { DESERT_PALETTE } from '../config/palette';
import { PHYSICS_CONFIG } from '../config/physicsConfig';

interface DustParticle {
  graphic: Graphics;
  worldX: number;
  worldY: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  baseScale: number;
}

export const ENGINE_AUDIO_PATH =
  './assets/aistudio/mixkit-motocross-motorcycle-engine-2727_ee435ad5.wav';

export const GEAR_SHIFT_AUDIO_PATH =
  './assets/aistudio/mixkit-motorcycle-changing-gears-2730_67245b56.wav';

/**
 * Verified from RIFF waveform analysis of mixkit-motocross-motorcycle-engine-2727_ee435ad5.wav (19.806s):
 * - 2.980s .. 5.769s: aggressive mid-rev throttle climb / pull (RMS ~0.36)
 * - 8.576s .. 11.779s: sustained high-RPM peak motocross roar (RMS ~0.38)
 * - 14.324s .. 17.757s: trailing coast & low idle tail before final 18s+ fadeout (RMS ~0.078)
 */
export const ENGINE_AUDIO_SEGMENTS = {
  midStartSec: 2.979524,
  midEndSec: 5.769433,
  peakStartSec: 8.576349,
  peakEndSec: 11.778934,
  tailStartSec: 14.323673,
  tailEndSec: 17.756735,
  loopCrossfadeSec: 0.085,
} as const;

/**
 * Verified from RIFF waveform analysis of mixkit-motorcycle-changing-gears-2730_67245b56.wav (3.513s):
 * Contains 3 distinct gear-change rev bursts separated by low decay troughs:
 * - Variation 0: 0.095s .. 1.275s
 * - Variation 1: 1.275s .. 2.345s
 * - Variation 2: 2.345s .. 3.420s
 */
export const GEAR_SHIFT_SEGMENTS: ReadonlyArray<{ startSec: number; endSec: number }> = [
  { startSec: 0.095, endSec: 1.275 },
  { startSec: 1.275, endSec: 2.345 },
  { startSec: 2.345, endSec: 3.420 },
];

export interface AirborneGearShiftState {
  hasBeenGrounded: boolean;
  readyForNext: boolean;
  rearGroundedStreakSec: number;
  rearAirStreakSec: number;
  cooldownSec: number;
  nextVariationIndex: number;
  isAirborneTriggerWindow: boolean;
}

export function createInitialAirborneGearShiftState(): AirborneGearShiftState {
  return {
    hasBeenGrounded: false,
    readyForNext: false,
    rearGroundedStreakSec: 0,
    rearAirStreakSec: 0,
    cooldownSec: 0,
    nextVariationIndex: 0,
    isAirborneTriggerWindow: false,
  };
}

/**
 * Detects when the bike goes into the air with the rear wheel lifted off the ground,
 * suppressing spawn settle and 1-2 frame polygon seam chatter.
 * Returns the variation index (0..2) when triggered, or null otherwise.
 */
export function stepAirborneGearShift(
  state: AirborneGearShiftState,
  rearGrounded: boolean,
  frontGrounded: boolean,
  speedMetersPerSec: number,
  active: boolean,
  dt: number
): number | null {
  const safeDt = Math.min(0.1, Math.max(0.001, dt));
  state.cooldownSec = Math.max(0, state.cooldownSec - safeDt);

  if (!active) {
    state.rearAirStreakSec = 0;
    state.isAirborneTriggerWindow = false;
    return null;
  }

  if (rearGrounded || frontGrounded) {
    state.hasBeenGrounded = true;
  }

  if (rearGrounded) {
    state.rearGroundedStreakSec += safeDt;
    state.rearAirStreakSec = 0;
    state.isAirborneTriggerWindow = false;
    if (state.rearGroundedStreakSec >= 0.08) {
      state.readyForNext = true;
    }
    return null;
  }

  // Rear wheel is off the ground
  state.rearGroundedStreakSec = 0;
  state.rearAirStreakSec += safeDt;

  const bikeInAir = !rearGrounded && !frontGrounded;
  const sustainedRearLift = state.rearAirStreakSec >= (bikeInAir ? 0.06 : 0.14);
  state.isAirborneTriggerWindow = bikeInAir || state.rearAirStreakSec >= 0.14;

  if (
    state.hasBeenGrounded &&
    state.readyForNext &&
    sustainedRearLift &&
    state.cooldownSec <= 0 &&
    Math.abs(speedMetersPerSec) > 1.8
  ) {
    const chosen = state.nextVariationIndex % GEAR_SHIFT_SEGMENTS.length;
    state.nextVariationIndex = (chosen + 1) % GEAR_SHIFT_SEGMENTS.length;
    state.readyForNext = false;
    state.cooldownSec = 0.5;
    return chosen;
  }

  return null;
}

export interface EngineAudioState {
  rpm: number;
  throttleHold: number;
  brakeAmount: number;
  masterLevel: number;
}

export interface EngineMixOutput {
  tailGain: number;
  midGain: number;
  peakGain: number;
  tailRate: number;
  midRate: number;
  peakRate: number;
  filterHz: number;
  masterGain: number;
}

export function createInitialEngineAudioState(): EngineAudioState {
  return {
    rpm: 0.06,
    throttleHold: 0,
    brakeAmount: 0,
    masterLevel: 0,
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
  grounded = true
): EngineMixOutput {
  const safeDt = Math.min(0.1, Math.max(0.001, dt));
  const absSpeed = Math.abs(speedMetersPerSec);
  const speedNorm = clamp01(absSpeed / 13.5);
  const forwardBraking = brake && speedMetersPerSec > 0.35;
  const reverseCreep = brake && !forwardBraking;
  const throttling = throttle && !brake;

  // Throttle hold builds over ~0.85s so sustained gas reaches full peak roar
  const targetHold = throttling ? 1 : 0;
  const holdRate = throttling ? 1.45 : 3.4;
  state.throttleHold += (targetHold - state.throttleHold) * (1 - Math.exp(-holdRate * safeDt));

  const targetBrake = forwardBraking ? 1 : 0;
  const brakeRate = forwardBraking ? 9.0 : 5.5;
  state.brakeAmount += (targetBrake - state.brakeAmount) * (1 - Math.exp(-brakeRate * safeDt));

  let targetRpm: number;
  let rpmResponseRate: number;

  if (!active) {
    targetRpm = 0.05;
    rpmResponseRate = 4.0;
  } else if (forwardBraking) {
    // Active braking drags engine RPM rapidly down toward idle/deceleration
    targetRpm = 0.03 + speedNorm * 0.09;
    rpmResponseRate = 5.2;
  } else if (reverseCreep) {
    // Gentle reverse gear pull when stopped & holding brake
    targetRpm = 0.24 + speedNorm * 0.12;
    rpmResponseRate = 3.8;
  } else if (throttling) {
    // Free-rev slightly higher when airborne on throttle; build with speed & sustained gas on ground
    const airBonus = grounded ? 0 : 0.16;
    targetRpm = clamp01(
      0.46 + state.throttleHold * 0.24 + speedNorm * 0.34 + airBonus
    );
    rpmResponseRate = targetRpm > state.rpm ? 3.2 : 1.8;
  } else {
    // No throttle: settle smoothly down into the trailing/idle tail section
    targetRpm = 0.05 + speedNorm * 0.14;
    rpmResponseRate = 2.5;
  }

  state.rpm += (targetRpm - state.rpm) * (1 - Math.exp(-rpmResponseRate * safeDt));

  const targetMaster = active ? 1 : 0;
  const masterRate = active ? 8.0 : 12.0;
  state.masterLevel += (targetMaster - state.masterLevel) * (1 - Math.exp(-masterRate * safeDt));

  const rpm = clamp01(state.rpm);
  const driveBlend = clamp01(state.throttleHold * (1 - state.brakeAmount));

  // Layer gains (compensated so ~0.078 RMS tail blends naturally with ~0.37 RMS mid/peak)
  const tailFadeOut = 1 - smoothstep01(0.14, 0.56, rpm);
  const tailCoastHold = 1 - smoothstep01(0.28, 0.68, rpm);
  const tailBaseGain = lerpNum(0.98 * tailCoastHold, 0.92 * tailFadeOut, driveBlend);
  const brakeDamp = 1 - state.brakeAmount * 0.22;
  const tailGain = tailBaseGain * brakeDamp;

  const midIn = smoothstep01(0.16, 0.44, rpm);
  const midOut = 1 - smoothstep01(0.66, 0.96, rpm) * 0.62;
  const reverseOrDrive = reverseCreep ? 1 : lerpNum(0.45, 1, driveBlend);
  const midGain = 0.5 * midIn * midOut * reverseOrDrive;

  const peakIn = smoothstep01(0.52, 0.88, rpm);
  const peakGain = 0.62 * peakIn * lerpNum(0.25, 1, driveBlend);

  // Pitch / playbackRate modulation
  const tailRate = forwardBraking
    ? lerpNum(0.86, 0.76, state.brakeAmount)
    : lerpNum(0.92, 1.07, speedNorm * 0.7 + rpm * 0.3);
  const midRate = lerpNum(0.85, 1.14, smoothstep01(0.15, 0.85, rpm));
  const peakRate = lerpNum(0.9, 1.16, smoothstep01(0.5, 1.0, rpm));

  // Tone shaping: warm idle, biting braking low-pass, wide open peak roar
  const filterHz = forwardBraking
    ? lerpNum(1450, 980, state.brakeAmount)
    : lerpNum(1750, 9200, smoothstep01(0.12, 0.95, rpm));

  return {
    tailGain,
    midGain,
    peakGain,
    tailRate,
    midRate,
    peakRate,
    filterHz,
    masterGain: 0.58 * state.masterLevel,
  };
}

function decodeRiffPcmFallback(ctx: AudioContext, arrayBuffer: ArrayBuffer): AudioBuffer {
  const view = new DataView(arrayBuffer);
  if (view.byteLength < 44) {
    throw new Error('Invalid WAV size');
  }
  let pos = 12;
  let channels = 2;
  let sampleRate = 44100;
  let bitsPerSample = 16;
  let realFormat = 1;
  let dataOffset = 0;
  let dataSize = 0;

  while (pos + 8 <= view.byteLength) {
    const id = String.fromCharCode(
      view.getUint8(pos),
      view.getUint8(pos + 1),
      view.getUint8(pos + 2),
      view.getUint8(pos + 3)
    );
    const size = view.getUint32(pos + 4, true);
    const chunkStart = pos + 8;

    if (id === 'fmt ' && size >= 16) {
      const fmtTag = view.getUint16(chunkStart, true);
      channels = view.getUint16(chunkStart + 2, true);
      sampleRate = view.getUint32(chunkStart + 4, true);
      bitsPerSample = view.getUint16(chunkStart + 14, true);
      realFormat =
        fmtTag === 0xfffe && size >= 26 ? view.getUint16(chunkStart + 24, true) : fmtTag;
    } else if (id === 'data') {
      dataOffset = chunkStart;
      dataSize = Math.min(size, view.byteLength - chunkStart);
      break;
    }
    pos = chunkStart + size + (size % 2);
  }

  if (!dataOffset || !dataSize) {
    throw new Error('Missing WAV data chunk');
  }

  const bytesPerSample = Math.max(1, bitsPerSample >> 3);
  const frameStride = channels * bytesPerSample;
  const frameCount = Math.floor(dataSize / frameStride);
  const out = ctx.createBuffer(channels, frameCount, sampleRate);
  const channelData = Array.from({ length: channels }, (_, c) => out.getChannelData(c));
  const bytes = new Uint8Array(arrayBuffer);

  for (let i = 0; i < frameCount; i++) {
    const frameOff = dataOffset + i * frameStride;
    for (let c = 0; c < channels; c++) {
      const off = frameOff + c * bytesPerSample;
      let sample = 0;
      if (realFormat === 1 && bitsPerSample === 24) {
        let v = bytes[off] | (bytes[off + 1] << 8) | (bytes[off + 2] << 16);
        if (v & 0x800000) v |= ~0xffffff;
        sample = v / 8388608;
      } else if (realFormat === 1 && bitsPerSample === 16) {
        sample = view.getInt16(off, true) / 32768;
      } else if (realFormat === 1 && bitsPerSample === 32) {
        sample = view.getInt32(off, true) / 2147483648;
      } else if (realFormat === 3 && bitsPerSample === 32) {
        sample = view.getFloat32(off, true);
      }
      channelData[c][i] = sample;
    }
  }
  return out;
}

function buildSeamlessLoopBuffer(
  ctx: AudioContext,
  source: AudioBuffer,
  startSec: number,
  endSec: number,
  crossfadeSec: number
): AudioBuffer {
  const sr = source.sampleRate;
  const startIdx = Math.max(0, Math.min(source.length - 1, Math.floor(startSec * sr)));
  const endIdx = Math.max(startIdx + 64, Math.min(source.length, Math.floor(endSec * sr)));
  const rawLen = endIdx - startIdx;
  const fadeLen = Math.min(Math.floor(crossfadeSec * sr), Math.floor(rawLen / 4));
  const outLen = Math.max(32, rawLen - fadeLen);

  const out = ctx.createBuffer(source.numberOfChannels, outLen, sr);
  for (let ch = 0; ch < source.numberOfChannels; ch++) {
    const src = source.getChannelData(ch);
    const dst = out.getChannelData(ch);

    for (let k = 0; k < fadeLen; k++) {
      const t = (k + 0.5) / fadeLen;
      const fadeIn = Math.sin(t * Math.PI * 0.5);
      const fadeOut = Math.cos(t * Math.PI * 0.5);
      dst[k] = src[endIdx - fadeLen + k] * fadeOut + src[startIdx + k] * fadeIn;
    }
    for (let i = fadeLen; i < outLen; i++) {
      dst[i] = src[startIdx + i];
    }
  }
  return out;
}

function buildOneShotSliceBuffer(
  ctx: AudioContext,
  source: AudioBuffer,
  startSec: number,
  endSec: number,
  fadeInSec = 0.012,
  fadeOutSec = 0.065
): AudioBuffer {
  const sr = source.sampleRate;
  const startIdx = Math.max(0, Math.min(source.length - 1, Math.floor(startSec * sr)));
  const endIdx = Math.max(startIdx + 64, Math.min(source.length, Math.floor(endSec * sr)));
  const outLen = endIdx - startIdx;
  const fadeInSamples = Math.min(Math.floor(fadeInSec * sr), Math.floor(outLen / 4));
  const fadeOutSamples = Math.min(Math.floor(fadeOutSec * sr), Math.floor(outLen / 3));

  const out = ctx.createBuffer(source.numberOfChannels, outLen, sr);
  for (let ch = 0; ch < source.numberOfChannels; ch++) {
    const src = source.getChannelData(ch);
    const dst = out.getChannelData(ch);
    for (let i = 0; i < outLen; i++) {
      let env = 1;
      if (i < fadeInSamples) {
        env *= (i + 1) / fadeInSamples;
      }
      if (i >= outLen - fadeOutSamples) {
        env *= (outLen - i) / fadeOutSamples;
      }
      dst[i] = src[startIdx + i] * env;
    }
  }
  return out;
}

export class DesertAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterFilter: BiquadFilterNode | null = null;

  private tailGain: GainNode | null = null;
  private midGain: GainNode | null = null;
  private peakGain: GainNode | null = null;

  private tailSource: AudioBufferSourceNode | null = null;
  private midSource: AudioBufferSourceNode | null = null;
  private peakSource: AudioBufferSourceNode | null = null;

  private tailBuffer: AudioBuffer | null = null;
  private midBuffer: AudioBuffer | null = null;
  private peakBuffer: AudioBuffer | null = null;

  private gearShiftBuffers: AudioBuffer[] = [];
  private gearShiftGain: GainNode | null = null;
  private activeGearShiftSource: AudioBufferSourceNode | null = null;

  private loadPromise: Promise<void> | null = null;
  private engineState: EngineAudioState = createInitialEngineAudioState();
  private airShiftState: AirborneGearShiftState = createInitialAirborneGearShiftState();
  private muted = false;
  private destroyed = false;

  public unlock(): void {
    if (this.muted || this.destroyed) return;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      this.ensureEngineBus();
      void this.ensureLoadedAndStarted();
    } catch {
      // Audio unavailable
    }
  }

  private ensureEngineBus(): void {
    if (!this.ctx || this.masterGain) return;
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -10;
    compressor.knee.value = 12;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.12;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1800;
    filter.Q.value = 0.7;

    const master = this.ctx.createGain();
    master.gain.value = 0;

    const tailGain = this.ctx.createGain();
    tailGain.gain.value = 0;

    const midGain = this.ctx.createGain();
    midGain.gain.value = 0;

    const peakGain = this.ctx.createGain();
    peakGain.gain.value = 0;

    const gearShiftGain = this.ctx.createGain();
    gearShiftGain.gain.value = 0.56;

    tailGain.connect(filter);
    midGain.connect(filter);
    peakGain.connect(filter);
    filter.connect(master);
    master.connect(compressor);
    gearShiftGain.connect(compressor);
    compressor.connect(this.ctx.destination);

    this.masterFilter = filter;
    this.masterGain = master;
    this.tailGain = tailGain;
    this.midGain = midGain;
    this.peakGain = peakGain;
    this.gearShiftGain = gearShiftGain;
  }

  private async decodeWavUrl(ctx: AudioContext, url: string): Promise<AudioBuffer | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const rawBuffer = await response.arrayBuffer();
      if (this.destroyed) return null;
      try {
        return await ctx.decodeAudioData(rawBuffer.slice(0));
      } catch {
        return decodeRiffPcmFallback(ctx, rawBuffer);
      }
    } catch {
      return null;
    }
  }

  private async ensureLoadedAndStarted(): Promise<void> {
    const ctx = this.ctx;
    if (!ctx || this.destroyed) return;

    if (!this.tailBuffer || this.gearShiftBuffers.length === 0) {
      if (!this.loadPromise) {
        this.loadPromise = (async () => {
          const [engineDecoded, gearDecoded] = await Promise.all([
            this.decodeWavUrl(ctx, ENGINE_AUDIO_PATH),
            this.decodeWavUrl(ctx, GEAR_SHIFT_AUDIO_PATH),
          ]);
          if (this.destroyed || !this.ctx) return;

          if (engineDecoded && !this.tailBuffer) {
            const seg = ENGINE_AUDIO_SEGMENTS;
            this.tailBuffer = buildSeamlessLoopBuffer(
              this.ctx,
              engineDecoded,
              seg.tailStartSec,
              seg.tailEndSec,
              seg.loopCrossfadeSec
            );
            this.midBuffer = buildSeamlessLoopBuffer(
              this.ctx,
              engineDecoded,
              seg.midStartSec,
              seg.midEndSec,
              seg.loopCrossfadeSec
            );
            this.peakBuffer = buildSeamlessLoopBuffer(
              this.ctx,
              engineDecoded,
              seg.peakStartSec,
              seg.peakEndSec,
              seg.loopCrossfadeSec
            );
          }

          if (gearDecoded && this.gearShiftBuffers.length === 0) {
            this.gearShiftBuffers = GEAR_SHIFT_SEGMENTS.map((seg) =>
              buildOneShotSliceBuffer(this.ctx!, gearDecoded, seg.startSec, seg.endSec)
            );
          }
        })();
      }
      await this.loadPromise;
    }

    if (!this.destroyed && this.ctx && this.tailBuffer && !this.tailSource) {
      this.startLoopSources();
    }
  }

  private startLoopSources(): void {
    if (
      !this.ctx ||
      !this.tailBuffer ||
      !this.midBuffer ||
      !this.peakBuffer ||
      !this.tailGain ||
      !this.midGain ||
      !this.peakGain ||
      this.tailSource
    ) {
      return;
    }

    const createLoop = (buffer: AudioBuffer, dest: GainNode): AudioBufferSourceNode => {
      const src = this.ctx!.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      src.connect(dest);
      src.start();
      return src;
    };

    this.tailSource = createLoop(this.tailBuffer, this.tailGain);
    this.midSource = createLoop(this.midBuffer, this.midGain);
    this.peakSource = createLoop(this.peakBuffer, this.peakGain);
  }

  public resetEngineState(): void {
    this.engineState = createInitialEngineAudioState();
    this.airShiftState = createInitialAirborneGearShiftState();
    this.stopGearShiftSound();
  }

  private stopGearShiftSound(): void {
    if (this.activeGearShiftSource) {
      try {
        this.activeGearShiftSource.stop();
      } catch {
        // Ignore already stopped source
      }
      this.activeGearShiftSource = null;
    }
  }

  private playGearShiftVariation(variationIndex: number): void {
    if (
      this.muted ||
      this.destroyed ||
      !this.ctx ||
      this.ctx.state !== 'running' ||
      !this.gearShiftGain ||
      this.gearShiftBuffers.length === 0
    ) {
      return;
    }
    const buffer = this.gearShiftBuffers[variationIndex % this.gearShiftBuffers.length];
    if (!buffer) return;

    this.stopGearShiftSound();
    try {
      const now = this.ctx.currentTime;
      this.gearShiftGain.gain.cancelScheduledValues(now);
      this.gearShiftGain.gain.setValueAtTime(0.62, now);

      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(this.gearShiftGain);
      src.onended = () => {
        if (this.activeGearShiftSource === src) {
          this.activeGearShiftSource = null;
        }
      };
      src.start(now);
      this.activeGearShiftSource = src;
    } catch {
      // Ignore playback error
    }
  }

  public updateEngine(
    throttle: boolean,
    brake: boolean,
    speedMetersPerSec: number,
    active: boolean,
    dt = 1 / 60,
    rearGrounded = true,
    frontGrounded = true
  ): void {
    const grounded = rearGrounded || frontGrounded;
    const mix = stepEngineAudioMix(
      this.engineState,
      throttle,
      brake,
      speedMetersPerSec,
      active && !this.muted,
      dt,
      grounded
    );

    const triggeredVariation = stepAirborneGearShift(
      this.airShiftState,
      rearGrounded,
      frontGrounded,
      speedMetersPerSec,
      active && !this.muted,
      dt
    );

    if (!this.ctx || !this.masterGain || !this.masterFilter) return;
    const now = this.ctx.currentTime;

    if (this.muted || !active || this.ctx.state !== 'running') {
      this.masterGain.gain.setTargetAtTime(0, now, 0.04);
      if (this.gearShiftGain) {
        this.gearShiftGain.gain.setTargetAtTime(0, now, 0.03);
      }
      return;
    }

    if (this.tailBuffer && !this.tailSource) {
      this.startLoopSources();
    }

    if (triggeredVariation !== null) {
      this.playGearShiftVariation(triggeredVariation);
    } else if (this.gearShiftGain && this.activeGearShiftSource) {
      // Smoothly fade out the airborne effect shortly after landing back on the ground
      const targetAirGain = rearGrounded && frontGrounded ? 0.0 : 0.62;
      const tau = rearGrounded && frontGrounded ? 0.09 : 0.03;
      this.gearShiftGain.gain.setTargetAtTime(targetAirGain, now, tau);
    }

    this.masterGain.gain.setTargetAtTime(mix.masterGain, now, 0.035);
    this.masterFilter.frequency.setTargetAtTime(mix.filterHz, now, 0.05);

    this.tailGain?.gain.setTargetAtTime(mix.tailGain, now, 0.045);
    this.midGain?.gain.setTargetAtTime(mix.midGain, now, 0.045);
    this.peakGain?.gain.setTargetAtTime(mix.peakGain, now, 0.045);

    this.tailSource?.playbackRate.setTargetAtTime(mix.tailRate, now, 0.05);
    this.midSource?.playbackRate.setTargetAtTime(mix.midRate, now, 0.05);
    this.peakSource?.playbackRate.setTargetAtTime(mix.peakRate, now, 0.05);
  }

  public playLandingThud(intensity: number): void {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(115, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.12);
      const vol = Math.min(0.11, 0.03 + intensity * 0.012);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    } catch {
      // Ignore audio errors
    }
  }

  public playFinishChime(): void {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
    try {
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime + idx * 0.09;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.26);
      });
    } catch {
      // Ignore audio errors
    }
  }

  public pause(): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
    }
    if (this.gearShiftGain && this.ctx) {
      this.gearShiftGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
    }
    this.stopGearShiftSound();
    if (this.ctx && this.ctx.state === 'running') {
      void this.ctx.suspend();
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.pause();
  }

  public destroy(): void {
    this.destroyed = true;
    try {
      this.tailSource?.stop();
      this.midSource?.stop();
      this.peakSource?.stop();
      this.stopGearShiftSound();
      void this.ctx?.close();
    } catch {
      // Ignore cleanup errors
    }
    this.tailSource = null;
    this.midSource = null;
    this.peakSource = null;
    this.tailGain = null;
    this.midGain = null;
    this.peakGain = null;
    this.gearShiftGain = null;
    this.masterFilter = null;
    this.masterGain = null;
    this.tailBuffer = null;
    this.midBuffer = null;
    this.peakBuffer = null;
    this.gearShiftBuffers = [];
    this.ctx = null;
  }
}

export class DustSystem {
  public readonly container = new Container();
  private readonly pool: DustParticle[] = [];
  private spawnCooldown = 0;

  constructor(maxParticles = 28) {
    for (let i = 0; i < maxParticles; i++) {
      const g = new Graphics();
      g.circle(0, 0, 7);
      g.fill({ color: DESERT_PALETTE.dustParticle, alpha: 0.65 });
      g.visible = false;
      this.container.addChild(g);
      this.pool.push({
        graphic: g,
        worldX: 0,
        worldY: 0,
        vx: 0,
        vy: 0,
        age: 1,
        life: 1,
        baseScale: 1,
      });
    }
  }

  public emitWheelDust(worldX: number, worldY: number, bikeVx: number, burstCount = 1): void {
    for (let n = 0; n < burstCount; n++) {
      const slot = this.pool.find((p) => !p.graphic.visible);
      if (!slot) return;
      slot.worldX = worldX + (Math.random() - 0.5) * 0.22;
      slot.worldY = worldY + Math.random() * 0.12;
      slot.vx = -Math.sign(bikeVx || 1) * (1.1 + Math.random() * 1.6);
      slot.vy = 0.65 + Math.random() * 1.25;
      slot.age = 0;
      slot.life = 0.34 + Math.random() * 0.22;
      slot.baseScale = 0.55 + Math.random() * 0.55;
      slot.graphic.visible = true;
    }
  }

  public maybeEmitRollingDust(
    dt: number,
    grounded: boolean,
    worldX: number,
    worldY: number,
    speed: number,
    throttle: boolean
  ): void {
    this.spawnCooldown -= dt;
    if (!grounded || this.spawnCooldown > 0) return;
    if (Math.abs(speed) < 2.2 && !throttle) return;
    this.emitWheelDust(worldX, worldY, speed, throttle ? 2 : 1);
    this.spawnCooldown = throttle ? 0.065 : 0.11;
  }

  public update(dt: number): void {
    const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;
    for (const p of this.pool) {
      if (!p.graphic.visible) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.graphic.visible = false;
        continue;
      }
      p.worldX += p.vx * dt;
      p.worldY += p.vy * dt;
      p.vy -= 1.2 * dt;

      const t = p.age / p.life;
      p.graphic.position.set(p.worldX * ppm, -p.worldY * ppm);
      const scale = p.baseScale * (0.7 + t * 1.35);
      p.graphic.scale.set(scale);
      p.graphic.alpha = (1 - t) * 0.42;
    }
  }

  public reset(): void {
    this.spawnCooldown = 0;
    for (const p of this.pool) {
      p.graphic.visible = false;
    }
  }
}
