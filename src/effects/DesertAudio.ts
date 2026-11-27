import {
  createInitialEngineAudioState,
  ENGINE_AUDIO_PATH,
  ENGINE_AUDIO_SEGMENTS,
  GEAR_SHIFT_AUDIO_PATH,
  SHIFT_BARK_SEGMENTS,
  stepEngineAudioMix,
  type EngineAudioState,
} from './EngineAudioModel';

function decodeRiffPcmFallback(ctx: AudioContext, arrayBuffer: ArrayBuffer): AudioBuffer {
  const view = new DataView(arrayBuffer);
  if (view.byteLength < 44) throw new Error('Invalid WAV size');
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

  if (!dataOffset || !dataSize) throw new Error('Missing WAV data chunk');

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
  fadeInSec = 0.01,
  fadeOutSec = 0.055
): AudioBuffer {
  const sr = source.sampleRate;
  const startIdx = Math.max(0, Math.min(source.length - 1, Math.floor(startSec * sr)));
  const endIdx = Math.max(startIdx + 64, Math.min(source.length, Math.floor(endSec * sr)));
  const outLen = endIdx - startIdx;
  const fadeInSamples = Math.min(Math.floor(fadeInSec * sr), Math.floor(outLen / 4));
  const fadeOutSamples = Math.min(Math.floor(fadeOutSec * sr), Math.floor(outLen / 2));

  const out = ctx.createBuffer(source.numberOfChannels, outLen, sr);
  for (let ch = 0; ch < source.numberOfChannels; ch++) {
    const src = source.getChannelData(ch);
    const dst = out.getChannelData(ch);
    for (let i = 0; i < outLen; i++) {
      let env = 1;
      if (i < fadeInSamples) env *= (i + 1) / fadeInSamples;
      if (i >= outLen - fadeOutSamples) env *= (outLen - i) / fadeOutSamples;
      dst[i] = src[startIdx + i] * env;
    }
  }
  return out;
}

function buildWarmNoiseBuffer(ctx: AudioContext, durationSec = 2.0): AudioBuffer {
  const frames = Math.floor(ctx.sampleRate * durationSec);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < frames; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + white * 0.099046;
    b1 = 0.963 * b1 + white * 0.2965164;
    b2 = 0.57 * b2 + white * 1.0526913;
    data[i] = Math.max(-1, Math.min(1, (b0 + b1 + b2 + white * 0.1848) * 0.14));
  }
  return buffer;
}

export interface EngineUpdateFeedback {
  justShiftedUp: boolean;
  gear: 1 | 2 | 3 | 4;
}

export class DesertAudio {
  private ctx: AudioContext | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private masterFilter: BiquadFilterNode | null = null;

  private idleGain: GainNode | null = null;
  private coastGain: GainNode | null = null;
  private midGain: GainNode | null = null;
  private peakGain: GainNode | null = null;

  private idleSource: AudioBufferSourceNode | null = null;
  private coastSource: AudioBufferSourceNode | null = null;
  private midSource: AudioBufferSourceNode | null = null;
  private peakSource: AudioBufferSourceNode | null = null;

  private idleBuffer: AudioBuffer | null = null;
  private coastBuffer: AudioBuffer | null = null;
  private midBuffer: AudioBuffer | null = null;
  private peakBuffer: AudioBuffer | null = null;

  private barkBuffers: AudioBuffer[] = [];
  private noiseBuffer: AudioBuffer | null = null;
  private sandSource: AudioBufferSourceNode | null = null;
  private sandFilter: BiquadFilterNode | null = null;
  private sandGain: GainNode | null = null;
  private windSource: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;

  private loadPromise: Promise<void> | null = null;
  private engineState: EngineAudioState = createInitialEngineAudioState();
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
      this.ensureAudioGraph();
      void this.ensureLoadedAndStarted();
    } catch {
      // Audio unavailable
    }
  }

  private ensureAudioGraph(): void {
    if (!this.ctx || this.masterGain) return;

    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -10;
    compressor.knee.value = 12;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.12;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1600;
    filter.Q.value = 0.75;

    const master = this.ctx.createGain();
    master.gain.value = 0;

    const idleGain = this.ctx.createGain();
    const coastGain = this.ctx.createGain();
    const midGain = this.ctx.createGain();
    const peakGain = this.ctx.createGain();
    idleGain.gain.value = 0;
    coastGain.gain.value = 0;
    midGain.gain.value = 0;
    peakGain.gain.value = 0;

    idleGain.connect(filter);
    coastGain.connect(filter);
    midGain.connect(filter);
    peakGain.connect(filter);
    filter.connect(master);
    master.connect(compressor);

    // Terrain sand rolling & airborne wind noise buses
    this.noiseBuffer = buildWarmNoiseBuffer(this.ctx, 2.0);

    const sandFilter = this.ctx.createBiquadFilter();
    sandFilter.type = 'bandpass';
    sandFilter.frequency.value = 620;
    sandFilter.Q.value = 0.9;
    const sandGain = this.ctx.createGain();
    sandGain.gain.value = 0;
    sandFilter.connect(sandGain);
    sandGain.connect(compressor);

    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 440;
    windFilter.Q.value = 0.65;
    const windGain = this.ctx.createGain();
    windGain.gain.value = 0;
    windFilter.connect(windGain);
    windGain.connect(compressor);

    compressor.connect(this.ctx.destination);

    this.compressor = compressor;
    this.masterFilter = filter;
    this.masterGain = master;
    this.idleGain = idleGain;
    this.coastGain = coastGain;
    this.midGain = midGain;
    this.peakGain = peakGain;
    this.sandFilter = sandFilter;
    this.sandGain = sandGain;
    this.windFilter = windFilter;
    this.windGain = windGain;
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

    if (!this.idleBuffer) {
      if (!this.loadPromise) {
        this.loadPromise = (async () => {
          const [engineDecoded, gearDecoded] = await Promise.all([
            this.decodeWavUrl(ctx, ENGINE_AUDIO_PATH),
            this.decodeWavUrl(ctx, GEAR_SHIFT_AUDIO_PATH),
          ]);
          if (this.destroyed || !this.ctx) return;

          if (engineDecoded && !this.idleBuffer) {
            const seg = ENGINE_AUDIO_SEGMENTS;
            this.idleBuffer = buildSeamlessLoopBuffer(
              this.ctx,
              engineDecoded,
              seg.idleStartSec,
              seg.idleEndSec,
              seg.loopCrossfadeSec
            );
            this.coastBuffer = buildSeamlessLoopBuffer(
              this.ctx,
              engineDecoded,
              seg.coastStartSec,
              seg.coastEndSec,
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

          if (gearDecoded && this.barkBuffers.length === 0) {
            this.barkBuffers = SHIFT_BARK_SEGMENTS.map((seg) =>
              buildOneShotSliceBuffer(this.ctx!, gearDecoded, seg.startSec, seg.endSec)
            );
          }
        })();
      }
      await this.loadPromise;
    }

    if (!this.destroyed && this.ctx && this.idleBuffer && !this.idleSource) {
      this.startLoopSources();
    }
  }

  private startLoopSources(): void {
    if (
      !this.ctx ||
      !this.idleBuffer ||
      !this.coastBuffer ||
      !this.midBuffer ||
      !this.peakBuffer ||
      !this.idleGain ||
      !this.coastGain ||
      !this.midGain ||
      !this.peakGain ||
      this.idleSource
    ) {
      return;
    }

    const createLoop = (buffer: AudioBuffer, dest: AudioNode): AudioBufferSourceNode => {
      const src = this.ctx!.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      src.connect(dest);
      src.start();
      return src;
    };

    this.idleSource = createLoop(this.idleBuffer, this.idleGain);
    this.coastSource = createLoop(this.coastBuffer, this.coastGain);
    this.midSource = createLoop(this.midBuffer, this.midGain);
    this.peakSource = createLoop(this.peakBuffer, this.peakGain);

    if (this.noiseBuffer && this.sandFilter && this.windFilter && !this.sandSource) {
      this.sandSource = createLoop(this.noiseBuffer, this.sandFilter);
      this.windSource = createLoop(this.noiseBuffer, this.windFilter);
    }
  }

  private playSubtleExhaustBark(variationIndex: number, gainAmount: number, rate: number): void {
    if (
      this.muted ||
      this.destroyed ||
      !this.ctx ||
      this.ctx.state !== 'running' ||
      !this.compressor ||
      this.barkBuffers.length === 0
    ) {
      return;
    }
    const buf = this.barkBuffers[variationIndex % this.barkBuffers.length];
    if (!buf) return;

    try {
      const now = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = rate;

      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 680;
      bp.Q.value = 0.85;

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(gainAmount, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + buf.duration / rate);

      src.connect(bp);
      bp.connect(g);
      g.connect(this.compressor);
      src.start(now);
    } catch {
      // Ignore bark error
    }
  }

  private playAirLaunchWhoosh(strength: number): void {
    if (
      this.muted ||
      this.destroyed ||
      !this.ctx ||
      this.ctx.state !== 'running' ||
      !this.compressor ||
      !this.noiseBuffer
    ) {
      return;
    }
    try {
      const now = this.ctx.currentTime;
      // Soft air-whoosh + subtle spring top-out tap (no artificial phantom engine rev!)
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(220, now);
      filter.frequency.exponentialRampToValueAtTime(520, now + 0.16);
      filter.Q.value = 1.1;

      const gain = this.ctx.createGain();
      const peak = 0.06 + strength * 0.08;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(peak, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.compressor);
      src.start(now);
      src.stop(now + 0.24);
    } catch {
      // Ignore launch SFX error
    }
  }

  public resetEngineState(): void {
    this.engineState = createInitialEngineAudioState();
  }

  public updateEngine(
    throttle: boolean,
    brake: boolean,
    speedMetersPerSec: number,
    active: boolean,
    dt = 1 / 60,
    rearGrounded = true,
    frontGrounded = true,
    verticalVelY = 0
  ): EngineUpdateFeedback {
    const mix = stepEngineAudioMix(
      this.engineState,
      throttle,
      brake,
      speedMetersPerSec,
      active && !this.muted,
      dt,
      rearGrounded,
      frontGrounded,
      verticalVelY
    );

    if (!this.ctx || !this.masterGain || !this.masterFilter) {
      return { justShiftedUp: mix.justShiftedUp, gear: mix.gear };
    }
    const now = this.ctx.currentTime;

    if (this.muted || !active || this.ctx.state !== 'running') {
      this.masterGain.gain.setTargetAtTime(0, now, 0.04);
      this.sandGain?.gain.setTargetAtTime(0, now, 0.03);
      this.windGain?.gain.setTargetAtTime(0, now, 0.03);
      return { justShiftedUp: false, gear: mix.gear };
    }

    if (this.idleBuffer && !this.idleSource) {
      this.startLoopSources();
    }

    if (mix.justShiftedUp) {
      this.playSubtleExhaustBark(mix.barkVariationIndex, 0.15, 0.9 + mix.gear * 0.06);
    } else if (mix.justChokedExhaustPop) {
      this.playSubtleExhaustBark(mix.barkVariationIndex, 0.11, 0.84);
    }

    if (mix.airLaunchStrength > 0) {
      this.playAirLaunchWhoosh(mix.airLaunchStrength);
    }

    this.masterGain.gain.setTargetAtTime(mix.masterGain, now, 0.03);
    this.masterFilter.frequency.setTargetAtTime(mix.filterHz, now, 0.045);

    this.idleGain?.gain.setTargetAtTime(mix.idleGain, now, 0.05);
    this.coastGain?.gain.setTargetAtTime(mix.coastGain, now, 0.05);
    this.midGain?.gain.setTargetAtTime(mix.midGain, now, 0.04);
    this.peakGain?.gain.setTargetAtTime(mix.peakGain, now, 0.04);

    this.idleSource?.playbackRate.setTargetAtTime(mix.idleRate, now, 0.05);
    this.coastSource?.playbackRate.setTargetAtTime(mix.coastRate, now, 0.05);
    this.midSource?.playbackRate.setTargetAtTime(mix.midRate, now, 0.04);
    this.peakSource?.playbackRate.setTargetAtTime(mix.peakRate, now, 0.04);

    this.sandGain?.gain.setTargetAtTime(mix.sandGain, now, 0.04);
    this.sandFilter?.frequency.setTargetAtTime(mix.sandFilterHz, now, 0.05);

    this.windGain?.gain.setTargetAtTime(mix.windGain, now, 0.06);
    this.windFilter?.frequency.setTargetAtTime(mix.windFilterHz, now, 0.08);

    return { justShiftedUp: mix.justShiftedUp, gear: mix.gear };
  }

  public playLandingThud(intensity: number): void {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
    try {
      const now = this.ctx.currentTime;
      const dest = this.compressor ?? this.ctx.destination;
      const norm = Math.min(1.5, Math.max(0.3, intensity / 7));

      // Layer 1: deep suspension compression thump
      const thumpOsc = this.ctx.createOscillator();
      const thumpGain = this.ctx.createGain();
      thumpOsc.type = 'triangle';
      thumpOsc.frequency.setValueAtTime(112, now);
      thumpOsc.frequency.exponentialRampToValueAtTime(34, now + 0.14);
      thumpGain.gain.setValueAtTime(0.06 + norm * 0.08, now);
      thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      thumpOsc.connect(thumpGain);
      thumpGain.connect(dest);
      thumpOsc.start(now);
      thumpOsc.stop(now + 0.17);

      // Layer 2: short fork/chain mechanical clack
      const clackOsc = this.ctx.createOscillator();
      const clackGain = this.ctx.createGain();
      clackOsc.type = 'sine';
      clackOsc.frequency.setValueAtTime(240, now);
      clackOsc.frequency.exponentialRampToValueAtTime(92, now + 0.045);
      clackGain.gain.setValueAtTime(0.025 + norm * 0.03, now);
      clackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      clackOsc.connect(clackGain);
      clackGain.connect(dest);
      clackOsc.start(now);
      clackOsc.stop(now + 0.055);

      // Layer 3: desert sand tire splash burst
      if (this.noiseBuffer) {
        const splashSrc = this.ctx.createBufferSource();
        splashSrc.buffer = this.noiseBuffer;
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(460, now);
        bp.Q.value = 0.85;
        const splashGain = this.ctx.createGain();
        splashGain.gain.setValueAtTime(0.05 + norm * 0.09, now);
        splashGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        splashSrc.connect(bp);
        bp.connect(splashGain);
        splashGain.connect(dest);
        splashSrc.start(now);
        splashSrc.stop(now + 0.16);
      }
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
    const now = this.ctx?.currentTime ?? 0;
    this.masterGain?.gain.setTargetAtTime(0, now, 0.02);
    this.sandGain?.gain.setTargetAtTime(0, now, 0.02);
    this.windGain?.gain.setTargetAtTime(0, now, 0.02);
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
      this.idleSource?.stop();
      this.coastSource?.stop();
      this.midSource?.stop();
      this.peakSource?.stop();
      this.sandSource?.stop();
      this.windSource?.stop();
      void this.ctx?.close();
    } catch {
      // Ignore cleanup errors
    }
    this.idleSource = null;
    this.coastSource = null;
    this.midSource = null;
    this.peakSource = null;
    this.sandSource = null;
    this.windSource = null;
    this.idleGain = null;
    this.coastGain = null;
    this.midGain = null;
    this.peakGain = null;
    this.sandGain = null;
    this.sandFilter = null;
    this.windGain = null;
    this.windFilter = null;
    this.compressor = null;
    this.masterFilter = null;
    this.masterGain = null;
    this.idleBuffer = null;
    this.coastBuffer = null;
    this.midBuffer = null;
    this.peakBuffer = null;
    this.barkBuffers = [];
    this.noiseBuffer = null;
    this.ctx = null;
  }
}
