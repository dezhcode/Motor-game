import { Container, Graphics } from 'pixi.js';
import { DESERT_PALETTE } from '../config/palette';
import { PHYSICS_CONFIG } from '../config/physicsConfig';

type ParticleKind = 'dust' | 'billow' | 'clod' | 'exhaust';

interface DustParticle {
  graphic: Graphics;
  kind: ParticleKind;
  worldX: number;
  worldY: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  baseScale: number;
  baseAlpha: number;
  gravityScale: number;
  spinSpeed: number;
}

export interface RollingDustParams {
  dt: number;
  rearGrounded: boolean;
  frontGrounded: boolean;
  rearX: number;
  rearY: number;
  frontX: number;
  frontY: number;
  speedX: number;
  throttle: boolean;
  brake: boolean;
  leanInput: -1 | 0 | 1;
}

export class DustSystem {
  public readonly container = new Container();
  private readonly pool: DustParticle[] = [];
  private spawnCooldown = 0;
  private skidCooldown = 0;
  private turnCooldown = 0;

  constructor(maxParticles = 64) {
    for (let i = 0; i < maxParticles; i++) {
      const kind: ParticleKind =
        i % 5 === 0
          ? 'clod'
          : i % 8 === 0
            ? 'exhaust'
            : i % 3 === 0
              ? 'billow'
              : 'dust';
      const g = new Graphics();

      if (kind === 'clod') {
        g.poly([-3.2, -1.8, 2.4, -2.8, 3.6, 1.5, -1.5, 3.0], true);
        g.fill({ color: DESERT_PALETTE.sandCrust, alpha: 0.9 });
      } else if (kind === 'exhaust') {
        g.circle(0, 0, 5.5);
        g.fill({ color: 0xeee5d3, alpha: 0.45 });
      } else if (kind === 'billow') {
        g.circle(0, 0, 11.5);
        g.fill({ color: 0xe3bd85, alpha: 0.5 });
      } else {
        g.circle(0, 0, 7.2);
        g.fill({ color: DESERT_PALETTE.dustParticle, alpha: 0.65 });
      }

      g.visible = false;
      this.container.addChild(g);
      this.pool.push({
        graphic: g,
        kind,
        worldX: 0,
        worldY: 0,
        vx: 0,
        vy: 0,
        age: 1,
        life: 1,
        baseScale: 1,
        baseAlpha: 0.45,
        gravityScale: kind === 'clod' ? 1.0 : -0.15,
        spinSpeed: kind === 'clod' ? (i % 2 === 0 ? 7.5 : -7.5) : 0,
      });
    }
  }

  private acquireSlot(preferredKind: ParticleKind): DustParticle | undefined {
    return (
      this.pool.find((p) => !p.graphic.visible && p.kind === preferredKind) ??
      this.pool.find((p) => !p.graphic.visible)
    );
  }

  public emitWheelDust(worldX: number, worldY: number, bikeVx: number, burstCount = 1, includeBillow = true): void {
    for (let n = 0; n < burstCount; n++) {
      const wantKind: ParticleKind =
        n % 3 === 1 && burstCount >= 2 ? 'clod' : includeBillow && n % 3 === 0 ? 'billow' : 'dust';
      const slot = this.acquireSlot(wantKind);
      if (!slot) return;

      slot.worldX = worldX + (Math.random() - 0.5) * 0.24;
      slot.worldY = worldY + Math.random() * 0.12;
      const backwardSign = -Math.sign(bikeVx || 1);
      if (slot.kind === 'clod') {
        slot.vx = backwardSign * (2.0 + Math.random() * 2.8);
        slot.vy = 1.8 + Math.random() * 2.4;
        slot.life = 0.28 + Math.random() * 0.18;
        slot.baseScale = 0.7 + Math.random() * 0.55;
        slot.baseAlpha = 0.78;
        slot.gravityScale = 1.0;
      } else if (slot.kind === 'billow') {
        slot.vx = backwardSign * (0.65 + Math.random() * 1.15);
        slot.vy = 0.55 + Math.random() * 0.95;
        slot.life = 0.48 + Math.random() * 0.28;
        slot.baseScale = 0.65 + Math.random() * 0.55;
        slot.baseAlpha = 0.44;
        slot.gravityScale = -0.18;
      } else {
        slot.vx = backwardSign * (0.9 + Math.random() * 1.6);
        slot.vy = 0.65 + Math.random() * 1.25;
        slot.life = 0.36 + Math.random() * 0.24;
        slot.baseScale = 0.6 + Math.random() * 0.55;
        slot.baseAlpha = 0.42;
        slot.gravityScale = -0.14;
      }
      slot.age = 0;
      slot.graphic.rotation = Math.random() * Math.PI * 2;
      slot.graphic.visible = true;
    }
  }

  public emitLandingSplash(
    rearX: number,
    rearY: number,
    frontX: number,
    frontY: number,
    bikeVx: number,
    strength: number
  ): void {
    const clamped = Math.min(4, Math.max(1, Math.round(strength * 0.55)));
    this.emitWheelDust(rearX, rearY, bikeVx, clamped + 2, true);
    this.emitWheelDust(frontX, frontY, -bikeVx * 0.4, clamped + 2, true);
  }

  public emitObstacleBurst(worldX: number, worldY: number, bikeVx: number, strength: number): void {
    const count = Math.min(6, Math.max(3, Math.round(strength * 5)));
    this.emitWheelDust(worldX, worldY + 0.15, bikeVx * 0.6, count, true);
  }

  public emitExhaustPuff(worldX: number, worldY: number, bikeVx: number): void {
    for (let n = 0; n < 2; n++) {
      const slot = this.acquireSlot('exhaust');
      if (!slot) return;
      slot.worldX = worldX + (Math.random() - 0.5) * 0.08;
      slot.worldY = worldY + (Math.random() - 0.5) * 0.06;
      slot.vx = bikeVx * 0.25 - 1.6 - Math.random() * 1.1;
      slot.vy = 0.45 + Math.random() * 0.55;
      slot.age = 0;
      slot.life = 0.24 + Math.random() * 0.12;
      slot.baseScale = 0.45 + Math.random() * 0.35;
      slot.baseAlpha = 0.34;
      slot.gravityScale = -0.2;
      slot.graphic.visible = true;
    }
  }

  public maybeEmitRollingDust(params: RollingDustParams): void {
    const {
      dt,
      rearGrounded,
      frontGrounded,
      rearX,
      rearY,
      frontX,
      frontY,
      speedX,
      throttle,
      brake,
      leanInput,
    } = params;

    this.spawnCooldown -= dt;
    this.skidCooldown -= dt;
    this.turnCooldown -= dt;

    if (!rearGrounded && !frontGrounded) return;

    // 1. Brake / skid spray from grounded tires
    if (brake && Math.abs(speedX) > 1.8 && this.skidCooldown <= 0) {
      if (rearGrounded) this.emitWheelDust(rearX, rearY, speedX, 2, true);
      if (frontGrounded) this.emitWheelDust(frontX, frontY, speedX, 2, true);
      this.skidCooldown = 0.045;
      return;
    }

    // 2. Sharp weight-shift / turn carving dust clouds on grounded tires
    if (leanInput !== 0 && Math.abs(speedX) > 1.6 && this.turnCooldown <= 0) {
      if (rearGrounded) this.emitWheelDust(rearX, rearY, speedX, 2, true);
      if (frontGrounded) this.emitWheelDust(frontX, frontY, speedX, 2, true);
      this.turnCooldown = 0.055;
    }

    // 3. Acceleration roost & rolling desert sand trail behind rear tire
    if (!rearGrounded || this.spawnCooldown > 0) return;
    if (Math.abs(speedX) < 1.5 && !throttle) return;
    const burst = throttle ? 3 : 1;
    this.emitWheelDust(rearX, rearY, speedX, burst, throttle);
    this.spawnCooldown = throttle ? 0.045 : 0.11;
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
      p.vy -= 7.8 * p.gravityScale * dt;

      const t = p.age / p.life;
      p.graphic.position.set(p.worldX * ppm, -p.worldY * ppm);
      if (p.spinSpeed !== 0) {
        p.graphic.rotation += p.spinSpeed * dt;
      }
      const scale =
        p.kind === 'clod'
          ? p.baseScale * (1 - t * 0.4)
          : p.kind === 'billow'
            ? p.baseScale * (0.75 + t * 1.85)
            : p.baseScale * (0.7 + t * 1.45);
      p.graphic.scale.set(scale);
      p.graphic.alpha = (1 - t) * p.baseAlpha;
    }
  }

  public reset(): void {
    this.spawnCooldown = 0;
    this.skidCooldown = 0;
    this.turnCooldown = 0;
    for (const p of this.pool) {
      p.graphic.visible = false;
    }
  }
}
