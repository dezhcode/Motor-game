import { Container, Sprite, type Texture } from 'pixi.js';
import { PHYSICS_CONFIG } from '../config/physicsConfig';
import type { PhysicsSnapshot } from '../physics/PhysicsWorld';
import { sampleTrackHeight, type TrackDefinition } from './desertTrackData';

export interface ContactShadowState {
  visible: boolean;
  worldX: number;
  worldY: number;
  slopeRad: number;
  alpha: number;
  scaleX: number;
  scaleY: number;
}

export function sampleTrackSlopeRad(track: TrackDefinition, worldX: number, spanHalf = 0.52): number {
  const yLeft = sampleTrackHeight(track, worldX - spanHalf);
  const yRight = sampleTrackHeight(track, worldX + spanHalf);
  return Math.atan2(yRight - yLeft, spanHalf * 2);
}

/**
 * Pure contact-shadow solver: projects a soft elliptical contact shadow onto valid track surfaces,
 * attenuates smoothly with perpendicular ground clearance, and suppresses over gap pits & sheer drops.
 */
export function computeContactShadow(
  track: TrackDefinition,
  bikeX: number,
  bikeY: number,
  chassisAngle: number
): ContactShadowState {
  const hidden: ContactShadowState = {
    visible: false,
    worldX: bikeX,
    worldY: bikeY,
    slopeRad: 0,
    alpha: 0,
    scaleX: 1,
    scaleY: 1,
  };

  if (bikeX < track.minX + 0.6 || bikeX > track.maxX - 0.6) {
    return hidden;
  }

  const spanHalf = 0.55;
  const yLeft = sampleTrackHeight(track, bikeX - spanHalf);
  const yCenter = sampleTrackHeight(track, bikeX);
  const yRight = sampleTrackHeight(track, bikeX + spanHalf);

  // Suppress shadow when riding over gap pits containing hazard saws
  for (const saw of track.hazardSaws ?? []) {
    if (Math.abs(bikeX - saw.x) < saw.radius * 1.25) {
      return hidden;
    }
  }

  const slopeRad = Math.atan2(yRight - yLeft, spanHalf * 2);
  // Suppress shadow on sheer vertical gap drops or sharp V-crevices
  if (Math.abs(slopeRad) > 0.68) {
    return hidden;
  }
  const curvatureDev = Math.abs(yCenter - 0.5 * (yLeft + yRight));
  if (curvatureDev > 0.48) {
    return hidden;
  }

  // If chassis is somehow below terrain surface, hide shadow
  if (bikeY < yCenter - 0.1) {
    return hidden;
  }

  // Perpendicular tire-to-ground clearance (at rest chassis center is ~0.71m above track along normal)
  const verticalDelta = bikeY - yCenter;
  const perpClearance = Math.max(0, verticalDelta * Math.cos(slopeRad) - 0.70);
  const maxFadeHeight = 4.2;
  if (perpClearance >= maxFadeHeight) {
    return hidden;
  }

  const fade = 1 - perpClearance / maxFadeHeight;
  const tiltFactor = Math.max(0.72, Math.cos(Math.min(1.1, Math.abs(chassisAngle - slopeRad))));
  const alpha = 0.44 * fade * fade * tiltFactor;
  if (alpha <= 0.015) {
    return hidden;
  }

  return {
    visible: true,
    worldX: bikeX,
    worldY: yCenter + 0.015,
    slopeRad,
    alpha,
    scaleX: (1.0 + Math.min(0.24, perpClearance * 0.05)) * (0.94 + 0.06 * tiltFactor),
    scaleY: Math.max(0.55, 1.0 - perpClearance * 0.11),
  };
}

/** One soft painted body shadow and two smaller patches for the tire contact points. */
export class ContactShadowSprite {
  public readonly graphic = new Container({ label: 'motorcycle:contact-shadow' });
  private readonly body = new Sprite({ label: 'shadow:body' });
  private readonly rear = new Sprite({ label: 'shadow:rear-tire' });
  private readonly front = new Sprite({ label: 'shadow:front-tire' });

  constructor() {
    for (const sprite of [this.body, this.rear, this.front]) {
      sprite.anchor.set(.5);
      sprite.alpha = 0;
      this.graphic.addChild(sprite);
    }
  }

  public setTexture(texture: Texture): void {
    this.body.texture = texture;
    this.rear.texture = texture;
    this.front.texture = texture;
  }

  public update(track: TrackDefinition, snap: PhysicsSnapshot, wheelRadius: number, dt: number): void {
    const { chassis, rearWheel, frontWheel, rearGrounded, frontGrounded } = snap;
    const body = computeContactShadow(track, chassis.x, chassis.y, chassis.angle);
    this.body.visible = body.visible;
    if (body.visible) {
      const wheelbase = Math.hypot(frontWheel.x - rearWheel.x, frontWheel.y - rearWheel.y);
      this.place(this.body, body.worldX, body.worldY, body.slopeRad,
        (wheelbase + 2 * wheelRadius) * body.scaleX, .34 * body.scaleY);
      this.body.alpha = body.alpha * .78;
    }

    this.updateTire(this.rear, track, rearWheel, wheelRadius, rearGrounded, dt);
    this.updateTire(this.front, track, frontWheel, wheelRadius, frontGrounded, dt);
  }

  public reset(): void {
    this.body.alpha = this.rear.alpha = this.front.alpha = 0;
  }

  private place(sprite: Sprite, x: number, y: number, slope: number, width: number, height: number): void {
    const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;
    sprite.position.set(x * ppm, -y * ppm);
    sprite.rotation = -slope;
    sprite.width = width * ppm;
    sprite.height = height * ppm;
  }

  private updateTire(sprite: Sprite, track: TrackDefinition, wheel: PhysicsSnapshot['rearWheel'],
    radius: number, grounded: boolean, dt: number): void {
    const slope = sampleTrackSlopeRad(track, wheel.x, radius);
    const x = wheel.x + Math.sin(slope) * radius;
    const y = sampleTrackHeight(track, x);
    const clearance = (wheel.y - y) * Math.cos(slope) - radius;
    const onSurface = grounded && Math.abs(slope) < 1.05 && Math.abs(clearance) < radius * .65;
    const target = onSurface ? .68 : 0;
    sprite.alpha += (target - sprite.alpha) * (1 - Math.exp(-dt * 35));
    sprite.visible = sprite.alpha > .01;
    if (sprite.visible) this.place(sprite, x, y + .01, slope, radius * 2.1, radius * .52);
  }
}
