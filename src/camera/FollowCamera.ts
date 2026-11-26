import { PHYSICS_CONFIG } from '../config/physicsConfig';

export interface CameraTransform {
  worldX: number;
  worldY: number;
  scale: number;
  viewportWidth: number;
  viewportHeight: number;
}

export class FollowCamera {
  private camX = 6;
  private camY = 2.5;
  private lookAheadX = 4.6;
  private viewportWidth = 1280;
  private viewportHeight = 720;
  private landingPulse = 0;

  public setViewport(width: number, height: number): void {
    this.viewportWidth = Math.max(320, width);
    this.viewportHeight = Math.max(200, height);
  }

  public reset(targetX: number, targetY: number): void {
    this.lookAheadX = 4.8;
    this.camX = targetX + this.lookAheadX;
    this.camY = targetY + 1.3;
    this.landingPulse = 0;
  }

  public triggerLandingFeedback(strength: number): void {
    this.landingPulse = Math.max(this.landingPulse, Math.min(0.22, strength * 0.025));
  }

  public update(targetX: number, targetY: number, vx: number, dt: number): CameraTransform {
    const desiredLookAhead = 4.6 + Math.max(0, Math.min(5.2, vx * 0.42));
    const lookAlpha = 1 - Math.exp(-3.2 * dt);
    this.lookAheadX += (desiredLookAhead - this.lookAheadX) * lookAlpha;

    const desiredX = targetX + this.lookAheadX;
    const desiredY = targetY + 1.35;

    const alphaX = 1 - Math.exp(-6.5 * dt);
    // Slower vertical follow avoids tracking wheel suspension chatter
    const alphaY = 1 - Math.exp(-3.4 * dt);

    this.camX += (desiredX - this.camX) * alphaX;
    this.camY += (desiredY - this.camY) * alphaY;

    if (this.landingPulse > 0.001) {
      this.landingPulse *= Math.exp(-12 * dt);
    } else {
      this.landingPulse = 0;
    }

    // Reference 1280x720 landscape scaling: preserves full vertical view on wide phones & scales cleanly
    const refScale = Math.min(this.viewportHeight / 720, this.viewportWidth / 1120);
    const scale = Math.max(0.45, refScale) * (PHYSICS_CONFIG.world.pixelsPerMeter / 44);

    return {
      worldX: this.camX,
      worldY: this.camY - this.landingPulse,
      scale,
      viewportWidth: this.viewportWidth,
      viewportHeight: this.viewportHeight,
    };
  }
}
