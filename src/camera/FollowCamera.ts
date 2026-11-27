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
  private smoothVx = 0;
  private smoothVy = 0;
  private dynamicZoom = 1;
  private viewportWidth = 1280;
  private viewportHeight = 720;
  private landingPulse = 0;
  private landingPulseX = 0;

  public setViewport(width: number, height: number): void {
    this.viewportWidth = Math.max(320, width);
    this.viewportHeight = Math.max(200, height);
  }

  public reset(targetX: number, targetY: number): void {
    this.lookAheadX = 4.8;
    this.smoothVx = 0;
    this.smoothVy = 0;
    this.dynamicZoom = 1;
    this.camX = targetX + this.lookAheadX;
    this.camY = targetY + 1.3;
    this.landingPulse = 0;
    this.landingPulseX = 0;
  }

  public triggerLandingFeedback(strength: number): void {
    const clamped = Math.min(10, Math.max(0, strength));
    this.landingPulse = Math.max(this.landingPulse, Math.min(0.17, clamped * 0.022));
    this.landingPulseX = Math.max(this.landingPulseX, Math.min(0.05, clamped * 0.006));
  }

  public update(
    targetX: number,
    targetY: number,
    vx: number,
    dt: number,
    vy = 0,
    grounded = true
  ): CameraTransform {
    const safeDt = Math.min(0.05, Math.max(0.001, dt));

    // Filter tiny suspension/tire jitter at standstill so camera stays rock-steady when stopped
    const cleanVx = Math.abs(vx) < 0.18 ? 0 : vx;
    const cleanVy = Math.abs(vy) < 0.22 ? 0 : vy;
    this.smoothVx += (cleanVx - this.smoothVx) * (1 - Math.exp(-5.0 * safeDt));
    this.smoothVy += (cleanVy - this.smoothVy) * (1 - Math.exp(-4.5 * safeDt));

    // Gently widen FOV at high speed or when descending through air so upcoming landing zones remain visible
    const speedFactor = Math.min(1, Math.max(0, (Math.abs(this.smoothVx) - 5.0) / 11.5));
    const descentFactor = !grounded && this.smoothVy < -1.5 ? Math.min(1, (-this.smoothVy - 1.5) / 8.0) : 0;
    const targetZoom = 1 - Math.min(0.12, speedFactor * 0.085 + descentFactor * 0.045);
    this.dynamicZoom += (targetZoom - this.dynamicZoom) * (1 - Math.exp(-2.6 * safeDt));

    const refScale = Math.min(this.viewportHeight / 720, this.viewportWidth / 1120);
    const scale = Math.max(0.45, refScale) * 1.45 * this.dynamicZoom * (PHYSICS_CONFIG.world.pixelsPerMeter / 44);

    // Keep rider comfortably in the left-center of any landscape screen while maximizing forward sightline
    const maxLookAhead = (this.viewportWidth * 0.245) / (PHYSICS_CONFIG.world.pixelsPerMeter * scale);
    const desiredLookAhead = Math.min(
      maxLookAhead,
      4.5 + Math.max(0, Math.min(6.2, this.smoothVx * 0.44))
    );
    const lookAlpha = 1 - Math.exp(-2.8 * safeDt);
    this.lookAheadX += (desiredLookAhead - this.lookAheadX) * lookAlpha;

    // Look down slightly on fast descents to frame landing ramps without dipping on flat rest
    const verticalLook = !grounded
      ? Math.max(-0.95, Math.min(0.35, this.smoothVy * 0.075))
      : Math.max(-0.35, Math.min(0.35, this.smoothVy * 0.04));

    const desiredX = targetX + this.lookAheadX;
    const desiredY = targetY + 1.35 + verticalLook;

    const alphaX = 1 - Math.exp(-6.8 * safeDt);
    const alphaY = 1 - Math.exp(-3.6 * safeDt);

    this.camX += (desiredX - this.camX) * alphaX;
    this.camY += (desiredY - this.camY) * alphaY;

    if (this.landingPulse > 0.001 || this.landingPulseX > 0.001) {
      const decay = Math.exp(-16 * safeDt);
      this.landingPulse *= decay;
      this.landingPulseX *= decay;
    } else {
      this.landingPulse = 0;
      this.landingPulseX = 0;
    }

    return {
      worldX: this.camX - this.landingPulseX,
      worldY: this.camY - this.landingPulse,
      scale,
      viewportWidth: this.viewportWidth,
      viewportHeight: this.viewportHeight,
    };
  }
}
