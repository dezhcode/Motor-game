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

export class DesertAudio {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private muted = false;

  public unlock(): void {
    if (this.muted) return;
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
      if (!this.engineOsc && this.ctx) {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = 54;
        filter.type = 'lowpass';
        filter.frequency.value = 240;
        gain.gain.value = 0.0;
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        this.engineOsc = osc;
        this.engineGain = gain;
      }
    } catch {
      // Audio unavailable
    }
  }

  public updateEngine(throttle: boolean, speedMetersPerSec: number, active: boolean): void {
    if (!this.ctx || !this.engineOsc || !this.engineGain) return;
    if (this.muted || !active || this.ctx.state !== 'running') {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      return;
    }
    const clampedSpeed = Math.min(18, Math.abs(speedMetersPerSec));
    const targetFreq = throttle ? 72 + clampedSpeed * 5.8 : 48 + clampedSpeed * 2.8;
    const targetGain = throttle ? 0.045 : 0.018;
    this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.08);
    this.engineGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.06);
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
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
    }
    if (this.ctx && this.ctx.state === 'running') {
      void this.ctx.suspend();
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.pause();
  }

  public destroy(): void {
    try {
      this.engineOsc?.stop();
      void this.ctx?.close();
    } catch {
      // Ignore cleanup errors
    }
    this.engineOsc = null;
    this.engineGain = null;
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
