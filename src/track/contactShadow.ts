import { Graphics } from 'pixi.js';
import { PHYSICS_CONFIG } from '../config/physicsConfig';
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

/** Pre-built layered elliptical ground contact shadow (zero blur filters, zero per-frame allocations). */
export class ContactShadowSprite {
  public readonly graphic = new Graphics();

  constructor() {
    this.graphic.label = 'motorcycle:contact-shadow';
    // Soft feathered appearance built from 3 static concentric translucent ovals
    this.graphic.ellipse(0, 0, 46, 8.2).fill({ color: 0x26170d, alpha: 0.24 });
    this.graphic.ellipse(0, 0, 35, 5.4).fill({ color: 0x1a0f08, alpha: 0.42 });
    this.graphic.ellipse(0, 0, 22, 3.0).fill({ color: 0x120a05, alpha: 0.6 });
    this.graphic.visible = false;
  }

  public update(track: TrackDefinition, bikeX: number, bikeY: number, chassisAngle: number): void {
    const state = computeContactShadow(track, bikeX, bikeY, chassisAngle);
    if (!state.visible) {
      this.graphic.visible = false;
      return;
    }
    const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;
    this.graphic.visible = true;
    this.graphic.position.set(state.worldX * ppm, -state.worldY * ppm);
    this.graphic.rotation = -state.slopeRad;
    this.graphic.scale.set(state.scaleX, state.scaleY);
    this.graphic.alpha = state.alpha;
  }

  public reset(): void {
    this.graphic.visible = false;
  }
}
