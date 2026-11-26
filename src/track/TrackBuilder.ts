import { Container, Graphics } from 'pixi.js';
import { DESERT_PALETTE } from '../config/palette';
import { PHYSICS_CONFIG } from '../config/physicsConfig';
import type { TrackDefinition } from './desertTrackData';
import type { CameraTransform } from '../camera/FollowCamera';

export class TrackRenderer {
  public readonly backgroundContainer = new Container();
  public readonly worldContainer = new Container();

  private readonly skyGraphic = new Graphics();
  private readonly farMountains = new Graphics();
  private readonly midKaluts = new Graphics();
  private readonly nearDunes = new Graphics();
  private readonly terrainGraphic = new Graphics();
  private readonly propsGraphic = new Graphics();

  private lastSkyW = 0;
  private lastSkyH = 0;

  constructor(private readonly track: TrackDefinition) {
    this.backgroundContainer.addChild(
      this.skyGraphic,
      this.farMountains,
      this.midKaluts,
      this.nearDunes
    );
    this.worldContainer.addChild(this.terrainGraphic, this.propsGraphic);

    this.buildParallaxLayers();
    this.buildTerrainMesh();
    this.buildMinimalProps();
  }

  private drawSky(width: number, height: number): void {
    if (width === this.lastSkyW && height === this.lastSkyH) return;
    this.lastSkyW = width;
    this.lastSkyH = height;

    this.skyGraphic.clear();
    // Three-band warm desert sky gradient simulation
    this.skyGraphic.rect(0, 0, width, height * 0.45).fill(DESERT_PALETTE.skyTop);
    this.skyGraphic.rect(0, height * 0.35, width, height * 0.35).fill(DESERT_PALETTE.skyMid);
    this.skyGraphic.rect(0, height * 0.62, width, height * 0.45).fill(DESERT_PALETTE.skyHorizon);

    // Bright desert sun on upper-right horizon
    const sunX = width * 0.78;
    const sunY = height * 0.22;
    this.skyGraphic.circle(sunX, sunY, 74).fill({ color: DESERT_PALETTE.sunGlow, alpha: 0.25 });
    this.skyGraphic.circle(sunX, sunY, 46).fill({ color: DESERT_PALETTE.sunGlow, alpha: 0.45 });
    this.skyGraphic.circle(sunX, sunY, 27).fill(DESERT_PALETTE.sunCore);
  }

  private buildParallaxLayers(): void {
    // Layer 1: Distant hazy mountains (repeatable wide strip)
    const span = 3400;
    this.farMountains.clear();
    this.farMountains.moveTo(-400, 900);
    let x = -400;
    const heights = [180, 130, 210, 155, 240, 165, 195, 140, 225, 150];
    let idx = 0;
    while (x <= span) {
      const h = heights[idx % heights.length];
      this.farMountains.lineTo(x, 380 - h);
      x += 260;
      idx++;
    }
    this.farMountains.lineTo(span + 200, 900).closePath();
    this.farMountains.fill({ color: DESERT_PALETTE.mountainsFar, alpha: 0.55 });

    // Layer 2: Lut desert Kaluts (wind-carved flat-topped mesas)
    this.midKaluts.clear();
    const kaluts = [
      { x: -120, w: 220, h: 120 },
      { x: 240, w: 170, h: 95 },
      { x: 560, w: 270, h: 145 },
      { x: 980, w: 190, h: 110 },
      { x: 1320, w: 250, h: 135 },
      { x: 1740, w: 210, h: 115 },
      { x: 2140, w: 290, h: 150 },
      { x: 2560, w: 200, h: 105 },
    ];
    for (const k of kaluts) {
      const base = 470;
      this.midKaluts
        .moveTo(k.x, base)
        .lineTo(k.x + k.w * 0.18, base - k.h)
        .lineTo(k.x + k.w * 0.78, base - k.h * 0.94)
        .lineTo(k.x + k.w, base)
        .closePath()
        .fill(DESERT_PALETTE.kalutsMid);

      // Subtle shadow side on right edge of each kalut
      this.midKaluts
        .moveTo(k.x + k.w * 0.62, base - k.h * 0.96)
        .lineTo(k.x + k.w * 0.78, base - k.h * 0.94)
        .lineTo(k.x + k.w, base)
        .lineTo(k.x + k.w * 0.7, base)
        .closePath()
        .fill({ color: DESERT_PALETTE.kalutsShadow, alpha: 0.65 });
    }
    this.midKaluts.rect(-400, 468, span + 800, 450).fill(DESERT_PALETTE.kalutsMid);

    // Layer 3: Rolling foreground warm sand dunes
    this.nearDunes.clear();
    this.nearDunes.moveTo(-400, 950);
    for (let dx = -400; dx <= span + 400; dx += 80) {
      const duneY = 530 - Math.sin(dx * 0.0042) * 34 - Math.cos(dx * 0.009) * 16;
      this.nearDunes.lineTo(dx, duneY);
    }
    this.nearDunes.lineTo(span + 400, 950).closePath();
    this.nearDunes.fill({ color: DESERT_PALETTE.dunesNear, alpha: 0.9 });
  }

  private buildTerrainMesh(): void {
    const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;
    const pts = this.track.points;
    const bottomY = 1200; // deep below lowest track point in screen coords

    this.terrainGraphic.clear();

    // Base deep sand fill
    this.terrainGraphic.moveTo(pts[0].x * ppm, bottomY);
    for (const p of pts) {
      this.terrainGraphic.lineTo(p.x * ppm, -p.y * ppm);
    }
    this.terrainGraphic.lineTo(pts[pts.length - 1].x * ppm, bottomY).closePath();
    this.terrainGraphic.fill(DESERT_PALETTE.sandFillDeep);

    // Upper sunlit sand band (34px thick along surface)
    this.terrainGraphic.moveTo(pts[0].x * ppm, -pts[0].y * ppm + 38);
    for (const p of pts) {
      this.terrainGraphic.lineTo(p.x * ppm, -p.y * ppm);
    }
    for (let i = pts.length - 1; i >= 0; i--) {
      this.terrainGraphic.lineTo(pts[i].x * ppm, -pts[i].y * ppm + 38);
    }
    this.terrainGraphic.closePath();
    this.terrainGraphic.fill(DESERT_PALETTE.sandFillTop);

    // High-contrast top highlight + dark crust rim so terrain edge is unmistakably readable
    this.terrainGraphic.moveTo(pts[0].x * ppm, -pts[0].y * ppm + 4);
    for (let i = 1; i < pts.length; i++) {
      this.terrainGraphic.lineTo(pts[i].x * ppm, -pts[i].y * ppm + 4);
    }
    this.terrainGraphic.stroke({ width: 5, color: DESERT_PALETTE.sandHighlight, cap: 'round', join: 'round' });

    this.terrainGraphic.moveTo(pts[0].x * ppm, -pts[0].y * ppm);
    for (let i = 1; i < pts.length; i++) {
      this.terrainGraphic.lineTo(pts[i].x * ppm, -pts[i].y * ppm);
    }
    this.terrainGraphic.stroke({ width: 4.5, color: DESERT_PALETTE.sandCrust, cap: 'round', join: 'round' });
  }

  private buildMinimalProps(): void {
    const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;
    this.propsGraphic.clear();

    // Start marker post at x = 0.5
    const sx = 0.5 * ppm;
    const sy = 0;
    this.propsGraphic.rect(sx - 3, sy - 72, 6, 72).fill(DESERT_PALETTE.finishPole);
    this.propsGraphic.roundRect(sx - 2, sy - 70, 32, 18, 4).fill(DESERT_PALETTE.bikeTurquoise);

    // Sparse desert shrubs / rocks placed safely outside jump lips
    const rockXs = [18, 82, 118, 150, 210, 240, 310];
    for (const rx of rockXs) {
      const y = this.lookupY(rx);
      const px = rx * ppm;
      const py = -y * ppm;
      this.propsGraphic
        .ellipse(px, py + 2, 10, 4)
        .fill({ color: DESERT_PALETTE.kalutsShadow, alpha: 0.45 });
    }

    // Finish line arch at finishX
    const fx = this.track.finishX * ppm;
    const fy = -this.lookupY(this.track.finishX) * ppm;

    // Two poles
    this.propsGraphic.rect(fx - 5, fy - 145, 8, 145).fill(DESERT_PALETTE.finishPole);
    this.propsGraphic.rect(fx + 52, fy - 145, 8, 145).fill(DESERT_PALETTE.finishPole);

    // Checkered / turquoise desert finish banner
    this.propsGraphic.roundRect(fx - 10, fy - 150, 74, 34, 6).fill(DESERT_PALETTE.finishBannerPrimary);
    for (let col = 0; col < 5; col++) {
      for (let row = 0; row < 2; row++) {
        if ((col + row) % 2 === 0) {
          this.propsGraphic
            .rect(fx - 4 + col * 12.5, fy - 144 + row * 11, 11, 10)
            .fill(DESERT_PALETTE.finishBannerAccent);
        }
      }
    }
  }

  private lookupY(x: number): number {
    const pts = this.track.points;
    for (let i = 0; i < pts.length - 1; i++) {
      if (x >= pts[i].x && x <= pts[i + 1].x) {
        const t = (x - pts[i].x) / Math.max(0.001, pts[i + 1].x - pts[i].x);
        return pts[i].y + (pts[i + 1].y - pts[i].y) * t;
      }
    }
    return 0;
  }

  public updateParallax(cam: CameraTransform): void {
    this.drawSky(cam.viewportWidth, cam.viewportHeight);

    const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;
    const camPxX = cam.worldX * ppm;
    const camPxY = -cam.worldY * ppm;

    const baseScale = cam.scale;
    const groundBaselineY = cam.viewportHeight * 0.72;

    this.farMountains.scale.set(baseScale);
    this.farMountains.position.set(
      ((-camPxX * 0.08) % (2600 * baseScale)) - 100,
      groundBaselineY - 460 * baseScale - camPxY * 0.04
    );

    this.midKaluts.scale.set(baseScale);
    this.midKaluts.position.set(
      ((-camPxX * 0.22) % (2800 * baseScale)) - 100,
      groundBaselineY - 455 * baseScale - camPxY * 0.1
    );

    this.nearDunes.scale.set(baseScale);
    this.nearDunes.position.set(
      ((-camPxX * 0.42) % (2600 * baseScale)) - 100,
      groundBaselineY - 510 * baseScale - camPxY * 0.18
    );
  }
}
