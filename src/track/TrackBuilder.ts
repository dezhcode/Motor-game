import { Container, Graphics, Sprite } from 'pixi.js';
import type { GameArtwork } from '../artwork/GameArtwork';
import { ARCHITECTURE, finitePanoramaX, landmarkScreenX } from '../artwork/SceneryPlan';
import { DESERT_PALETTE } from '../config/palette';
import { PHYSICS_CONFIG } from '../config/physicsConfig';
import type { DynamicPropSnapshot } from '../physics/PhysicsWorld';
import type { TrackDefinition } from './desertTrackData';
import type { CameraTransform } from '../camera/FollowCamera';
import { DustStormLayer } from './DustStormLayer';
import { createDynamicPropGraphic, createSawWheelGraphic, drawRoadSign } from './ObstacleGraphics';

const INK = 0x141e26;

/** Detailed flat/cel-shaded desert track, masonry retaining walls, bridges, and interactive obstacles. */
export class TrackRenderer {
  readonly backgroundContainer = new Container();
  readonly worldContainer = new Container();
  private readonly sky = new Graphics();
  private readonly farZagros = new Graphics();
  private readonly mountains = new Graphics();
  private readonly dustStorm = new DustStormLayer(34);
  private readonly duneBase = new Graphics();
  private readonly mesaRidges = new Graphics();
  private readonly geology = new Graphics();
  private readonly nearDunes = new Graphics();
  private readonly buildings = new Container();
  private readonly landmarks: Sprite[] = [];
  private readonly terrainGraphic = new Graphics();
  private readonly scenery = new Container();
  private readonly markers = new Graphics();
  private readonly obstacleLayer = new Container();
  private readonly sawSprites: Array<{ graphic: Graphics; spinSpeed: number }> = [];
  private readonly propSprites = new Map<string, Graphics>();
  private viewportWidth = 0;
  private viewportHeight = 0;

  constructor(private readonly track: TrackDefinition, art: GameArtwork) {
    ARCHITECTURE.forEach((entry) => {
      const sprite = new Sprite(art[entry.key]);
      sprite.label = `landmark:${entry.key}`;
      sprite.anchor.set(0.5, 1);
      this.landmarks.push(sprite);
      this.buildings.addChild(sprite);
    });
    this.backgroundContainer.addChild(
      this.sky,
      this.farZagros,
      this.mountains,
      this.dustStorm.farContainer,
      this.duneBase,
      this.mesaRidges,
      this.geology,
      this.buildings,
      this.nearDunes,
      this.dustStorm.nearContainer
    );
    this.worldContainer.addChild(
      this.scenery,
      this.terrainGraphic,
      this.markers,
      this.obstacleLayer
    );

    this.buildTerrainMesh();
    this.buildRoadFeatures();
    this.buildScenery();
    this.buildMarkers();
    this.buildInteractiveObstacles();

    // Distant Iranian Zagros / Alborz plateau mountain silhouettes (slowest parallax plane)
    const farPeaks = [
      0, 298, 130, 248, 250, 272, 375, 205, 495, 242, 620, 188, 760, 232, 880, 198, 1020, 256,
      1160, 202, 1310, 238, 1460, 186, 1620, 244, 1780, 212, 1940, 252, 2110, 192, 2270, 238,
      2440, 204, 2610, 258, 2790, 210, 2960, 246, 3140, 196, 3328, 258,
    ];
    this.farZagros.poly([0, 720, ...farPeaks, 3328, 720], true).fill(0xc4dce2);
    // Faint sunlit ridge rims along high Zagros peaks
    this.farZagros.moveTo(375, 205).lineTo(420, 222).moveTo(620, 188).lineTo(668, 206)
      .moveTo(1460, 186).lineTo(1512, 205).moveTo(2110, 192).lineTo(2165, 210)
      .stroke({ width: 2.5, color: 0xdfeff2, cap: 'round' });

    // A finite authored mid-mountain ridge silhouette; pan without wrapping or mirroring.
    const ridge = [
      0, 366, 110, 338, 193, 345, 290, 285, 355, 278, 435, 332, 550, 304, 648, 238, 699, 251, 765,
      214, 851, 291, 960, 318, 1090, 270, 1225, 329, 1350, 300, 1460, 248, 1540, 269, 1655, 332,
      1770, 304, 1900, 251, 1980, 282, 2095, 332, 2210, 294, 2330, 245, 2400, 282, 2530, 320, 2640,
      276, 2750, 303, 2850, 249, 2990, 299, 3140, 269, 3328, 340,
    ];
    this.mountains.poly([0, 720, ...ridge, 3328, 720], true).fill(0xb4cbd1);
    const low = [
      0, 434, 170, 385, 265, 402, 390, 355, 530, 389, 660, 339, 780, 371, 900, 397, 1050, 354,
      1220, 397, 1390, 353, 1540, 388, 1700, 343, 1890, 377, 2050, 399, 2190, 349, 2380, 386, 2570,
      343, 2720, 378, 2900, 352, 3090, 391, 3328, 352,
    ];
    this.mountains.poly([0, 720, ...low, 3328, 720], true).fill(0x8eb5c0);

    // Mid-distance central desert sandstone mesas & escarpments
    const mesas = [
      0, 505, 180, 470, 230, 428, 330, 428, 370, 478, 560, 492, 620, 444, 710, 444, 750, 495,
      980, 508, 1060, 436, 1185, 436, 1235, 492, 1480, 504, 1560, 446, 1680, 446, 1730, 498,
      2040, 512, 2140, 438, 2260, 438, 2310, 502, 2680, 488, 2800, 442, 2910, 442, 2965, 496, 3328, 508,
    ];
    this.mesaRidges.poly([0, 720, ...mesas, 3328, 720], true).fill(0xcf9f72);
    this.mesaRidges.moveTo(234, 434).lineTo(326, 434).moveTo(1065, 442).lineTo(1180, 442)
      .moveTo(2145, 444).lineTo(2255, 444).stroke({ width: 2.6, color: 0xe8c08d, cap: 'round' });
    this.geology
      .poly(
        [
          -225, 0, -211, -68, -165, -68, -157, -157, -99, -157, -87, -73, -49, -73, -27, -124, 37,
          -124, 53, -64, 78, -65, 94, -178, 154, -178, 175, -63, 206, -63, 226, 0,
        ],
        true
      )
      .fill(0xc68d5d);
    this.geology
      .moveTo(-157, -140)
      .lineTo(-100, -140)
      .moveTo(99, -158)
      .lineTo(149, -158)
      .moveTo(-211, -42)
      .lineTo(-151, -42)
      .moveTo(70, -35)
      .lineTo(180, -35)
      .stroke({ width: 3, color: 0xdba66b, cap: 'round' });
    this.nearDunes
      .moveTo(-680, 0)
      .bezierCurveTo(-490, -50, -370, -62, -190, -25)
      .bezierCurveTo(-20, 12, 180, -96, 350, -70)
      .bezierCurveTo(480, -64, 600, -13, 720, 0)
      .lineTo(720, 250)
      .lineTo(-680, 250)
      .closePath()
      .fill(0xdfb27c);
    this.nearDunes
      .moveTo(-610, -12)
      .bezierCurveTo(-420, -48, -350, -44, -230, -24)
      .moveTo(130, -61)
      .bezierCurveTo(260, -101, 420, -63, 510, -38)
      .stroke({ width: 3, color: 0xf1cf93, cap: 'round' });
  }

  private buildTerrainMesh(): void {
    const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;
    const pts = this.track.points;

    // Deep earthen bedrock fill underneath constructed masonry courses
    this.terrainGraphic.moveTo(pts[0].x * ppm, 1500);
    for (const p of pts) this.terrainGraphic.lineTo(p.x * ppm, -p.y * ppm);
    this.terrainGraphic.lineTo(pts[pts.length - 1].x * ppm, 1500).closePath().fill(0x6e4a31);

    // Lower compacted desert strata bands
    for (const [top, bottom, color] of [
      [18, 128, 0x875c3e],
      [128, 156, 0x764f35],
    ] as const) {
      this.terrainGraphic.moveTo(pts[0].x * ppm, -pts[0].y * ppm + top);
      for (const p of pts) this.terrainGraphic.lineTo(p.x * ppm, -p.y * ppm + top);
      for (let i = pts.length - 1; i >= 0; i--) {
        this.terrainGraphic.lineTo(pts[i].x * ppm, -pts[i].y * ppm + bottom);
      }
      this.terrainGraphic.closePath().fill(color);
    }

    // Constructed ashlar stone/adobe retaining wall courses (3 staggered rows) along the road contour
    const coursePalette = [0xb68459, 0xa8764c, 0x996840] as const;
    const courseHeight = 28;
    const blockTargetWidth = 52;
    const mortarInk = 0x3b2618;

    for (let row = 0; row < 3; row++) {
      const topY = 20 + row * (courseHeight + 2);
      const botY = topY + courseHeight;
      const stagger = (row % 2) * (blockTargetWidth * 0.5);
      const minPx = pts[0].x * ppm;
      const maxPx = pts[pts.length - 1].x * ppm;

      for (let bx = minPx - stagger; bx < maxPx; bx += blockTargetWidth) {
        const x0 = Math.max(minPx, bx + 1.5);
        const x1 = Math.min(maxPx, bx + blockTargetWidth - 1.5);
        if (x1 - x0 < 10) continue;

        const y0 = -this.lookupY(x0 / ppm) * ppm;
        const y1 = -this.lookupY(x1 / ppm) * ppm;
        const idx = Math.round(bx / blockTargetWidth) + row;
        const shade = idx % 3 === 0 ? 0xc29064 : coursePalette[row];

        this.terrainGraphic
          .poly([x0, y0 + topY, x1, y1 + topY, x1, y1 + botY, x0, y0 + botY], true)
          .fill(shade)
          .stroke({ width: 1.5, color: mortarInk, join: 'round' });

        // Crisp top-edge bevel highlight + occasional subtle weathering crack
        this.terrainGraphic
          .moveTo(x0 + 2, y0 + topY + 2)
          .lineTo(x1 - 2, y1 + topY + 2)
          .stroke({ width: 1.4, color: 0xdfb484, cap: 'round' });
        if (idx % 5 === 0) {
          const mx = (x0 + x1) * 0.52;
          const my = (y0 + y1) * 0.5 + topY + 8;
          this.terrainGraphic
            .moveTo(mx, my)
            .lineTo(mx + 4, my + 7)
            .lineTo(mx + 1, my + 12)
            .stroke({ width: 1.0, color: 0x5c3c24, cap: 'round' });
        }
      }
    }

    // Thick bevelled top road deck (architectural cap)
    this.terrainGraphic.moveTo(pts[0].x * ppm, -pts[0].y * ppm);
    for (const p of pts) this.terrainGraphic.lineTo(p.x * ppm, -p.y * ppm);
    for (let i = pts.length - 1; i >= 0; i--) {
      this.terrainGraphic.lineTo(pts[i].x * ppm, -pts[i].y * ppm + 20);
    }
    this.terrainGraphic
      .closePath()
      .fill(0xd9b88c)
      .stroke({ width: 2.2, color: 0x2d1f15, join: 'round' });

    // Top sunlight bevel & dark underside lip on road cap
    this.terrainGraphic.moveTo(pts[0].x * ppm, -pts[0].y * ppm + 2.8);
    for (let i = 1; i < pts.length; i++) {
      this.terrainGraphic.lineTo(pts[i].x * ppm, -pts[i].y * ppm + 2.8);
    }
    this.terrainGraphic.stroke({ width: 3.2, color: 0xfff0cc, cap: 'round', join: 'round' });

    this.terrainGraphic.moveTo(pts[0].x * ppm, -pts[0].y * ppm + 17.5);
    for (let i = 1; i < pts.length; i++) {
      this.terrainGraphic.lineTo(pts[i].x * ppm, -pts[i].y * ppm + 17.5);
    }
    this.terrainGraphic.stroke({ width: 2.4, color: 0x8b6747, cap: 'round', join: 'round' });

    // Roadway pebble stipple & tire skid lines on top deck
    for (let mx = -4; mx < 355; mx += 3.2) {
      const rx = mx * ppm;
      const ry = -this.lookupY(mx) * ppm;
      this.terrainGraphic.circle(rx, ry + 9.5 + (mx % 2) * 2, 1.5).fill(0xb99164);
      if (Math.floor(mx) % 4 === 0) {
        this.terrainGraphic
          .moveTo(rx - 14, ry + 7)
          .lineTo(rx + 18, -this.lookupY(mx + 0.4) * ppm + 7)
          .stroke({ width: 1.3, color: 0x9c744c, cap: 'round' });
      }
    }

    // Steel trusses and hazard warning stripes on major jump ramps
    const rampRanges = this.track.rampVisualRanges ?? [
      [162, 172],
      [250, 262],
    ];
    for (const [rStart, rEnd] of rampRanges) {
      for (let rx = rStart; rx < rEnd; rx += 1.6) {
        const xA = rx * ppm;
        const yA = -this.lookupY(rx) * ppm;
        const xB = Math.min(rEnd, rx + 0.85) * ppm;
        const yB = -this.lookupY(Math.min(rEnd, rx + 0.85)) * ppm;
        this.terrainGraphic
          .poly([xA, yA + 3, xB, yB + 3, xB, yB + 15, xA, yA + 15], true)
          .fill(0xf2be38)
          .stroke({ width: 1.2, color: 0x1d252c });
      }
      const lipX = rEnd * ppm;
      const lipY = -this.lookupY(rEnd) * ppm;
      const baseX = (rEnd - 3.6) * ppm;
      const baseY = -this.lookupY(rEnd - 3.6) * ppm + 118;
      this.terrainGraphic
        .moveTo(lipX - 4, lipY + 20)
        .lineTo(lipX - 4, lipY + 130)
        .moveTo(lipX - 4, lipY + 28)
        .lineTo(baseX, baseY)
        .moveTo(baseX, lipY + 70)
        .lineTo(lipX - 4, lipY + 115)
        .stroke({ width: 5.5, color: 0x26313a, cap: 'round' });
      this.terrainGraphic
        .moveTo(lipX - 4, lipY + 20)
        .lineTo(lipX - 4, lipY + 130)
        .moveTo(lipX - 4, lipY + 28)
        .lineTo(baseX, baseY)
        .moveTo(baseX, lipY + 70)
        .lineTo(lipX - 4, lipY + 115)
        .stroke({ width: 2.6, color: 0x7b8d95, cap: 'round' });
      // Gusset bolt plate
      this.terrainGraphic.circle(lipX - 4, lipY + 26, 4.5).fill(0xf5c43d).stroke({ width: 1.3, color: INK });
    }
  }

  private buildRoadFeatures(): void {
    const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;
    for (const feat of this.track.roadFeatures ?? []) {
      if (feat.kind === 'bridge') {
        const x0 = feat.startX * ppm;
        // Under-deck longitudinal timber beams & vertical pilings
        for (let bx = feat.startX; bx <= feat.endX; bx += 3.5) {
          const px = bx * ppm;
          const py = -this.lookupY(bx) * ppm;
          this.terrainGraphic.rect(px - 4, py + 16, 8, 92).fill(0x6c4627).stroke({ width: 1.5, color: INK });
          this.terrainGraphic.rect(px - 2, py + 18, 2.5, 88).fill(0x8e5f39);
        }
        // Wooden guard rail posts & cable along far edge
        for (let bx = feat.startX; bx <= feat.endX; bx += 2.2) {
          const px = bx * ppm;
          const py = -this.lookupY(bx) * ppm;
          this.scenery.addChild(
            new Graphics()
              .rect(px - 2.5, py - 24, 5, 25)
              .fill(0x875631)
              .stroke({ width: 1.3, color: INK })
          );
        }
        const rail = new Graphics();
        rail.moveTo(x0, -this.lookupY(feat.startX) * ppm - 18);
        for (let bx = feat.startX + 0.5; bx <= feat.endX; bx += 0.5) {
          rail.lineTo(bx * ppm, -this.lookupY(bx) * ppm - 18);
        }
        rail.stroke({ width: 2.6, color: 0xd9a15d, cap: 'round' });
        this.scenery.addChild(rail);

        // Individual plank decking + iron nail heads along top deck
        for (let bx = feat.startX; bx < feat.endX; bx += 0.65) {
          const px0 = bx * ppm;
          const px1 = Math.min(feat.endX, bx + 0.58) * ppm;
          const py0 = -this.lookupY(bx) * ppm;
          const py1 = -this.lookupY(Math.min(feat.endX, bx + 0.58)) * ppm;
          const plankColor = Math.floor(bx * 2) % 2 === 0 ? 0xc28647 : 0xad7237;
          this.terrainGraphic
            .poly([px0, py0 - 1, px1, py1 - 1, px1, py1 + 14, px0, py0 + 14], true)
            .fill(plankColor)
            .stroke({ width: 1.3, color: 0x3b2210, join: 'round' });
          this.terrainGraphic.circle((px0 + px1) * 0.5, (py0 + py1) * 0.5 + 4, 1.3).fill(0x28323a);
        }
      } else if (feat.kind === 'culvert') {
        // Vaulted sandstone drainage culvert archway embedded in retaining wall
        const cx = feat.startX * ppm;
        const cy = -this.lookupY(feat.startX) * ppm + 76;
        this.terrainGraphic.roundRect(cx - 28, cy - 30, 56, 56, 26).fill(0x291a11).stroke({ width: 2.4, color: INK });
        for (let a = 0; a < 7; a++) {
          const ang = Math.PI + (a / 6) * Math.PI;
          const bx = cx + Math.cos(ang) * 28;
          const by = cy - 4 + Math.sin(ang) * 26;
          this.terrainGraphic
            .roundRect(bx - 6, by - 5, 12, 10, 2)
            .fill(a % 2 === 0 ? 0xd9b07f : 0xc1915d)
            .stroke({ width: 1.3, color: 0x3b2618 });
        }
      } else if (feat.kind === 'sign' && feat.signKind) {
        const px = feat.startX * ppm;
        const py = -this.lookupY(feat.startX) * ppm;
        const sg = new Graphics();
        drawRoadSign(sg, px, py, feat.signKind);
        this.scenery.addChild(sg);
      }
    }
  }

  private buildScenery(): void {
    const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;
    const locations = [12, 22, 33, 51, 74, 84, 107, 123, 143, 151, 188, 211, 229, 241, 283, 307, 321];
    locations.forEach((x, i) => {
      const g = new Graphics();
      g.position.set(x * ppm, -this.lookupY(x) * ppm + 3);
      if (i % 3 === 0) {
        // Multi-faceted boulder cluster
        g.poly([-18, 0, -13, -15, -2, -20, 11, -13, 19, -3, 15, 2], true)
          .fill(0xc58e5b)
          .stroke({ width: 1.5, color: INK });
        g.moveTo(-11, -12).lineTo(-1, -9).lineTo(9, -13).stroke({ width: 1.4, color: 0xf4d29a });
      } else if (i % 3 === 1) {
        // Stylized desert saguaro cactus with cel ribs
        g.roundRect(-4.5, -34, 9, 34, 4.5).fill(0x5d8d4a).stroke({ width: 1.5, color: INK });
        g.roundRect(-13, -24, 9, 5, 2.5).fill(0x5d8d4a).stroke({ width: 1.3, color: INK });
        g.roundRect(-14, -32, 5.5, 11, 2.5).fill(0x5d8d4a).stroke({ width: 1.3, color: INK });
        g.roundRect(4, -20, 8, 5, 2.5).fill(0x5d8d4a).stroke({ width: 1.3, color: INK });
        g.roundRect(7.5, -28, 5.5, 11, 2.5).fill(0x5d8d4a).stroke({ width: 1.3, color: INK });
        g.moveTo(-1, -30).lineTo(-1, -6).stroke({ width: 1.1, color: 0x89b86c });
      } else {
        // Desert scrub & racing pennant flag
        for (const [dx, dy] of [
          [-10, -10],
          [-4, -18],
          [3, -14],
          [11, -9],
        ]) {
          g.moveTo(0, 0).quadraticCurveTo(dx * 0.25, dy * 0.4, dx, dy).stroke({ width: 1.7, color: 0x455c35 });
          g.ellipse(dx, dy, 3.6, 2.2).fill(0x7d9652).stroke({ width: 0.9, color: 0x2a3822 });
        }
      }
      this.scenery.addChild(g);
    });
  }

  private buildMarkers(): void {
    const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;

    // Checkpoint loudspeaker poles
    const poleXs = this.track.checkpointPoleXs ?? [0.6, 158.5, 246.5];
    for (const poleX of poleXs) {
      const px = poleX * ppm;
      const py = -this.lookupY(poleX) * ppm;
      this.markers.rect(px - 3.5, py - 108, 7, 108).fill(0x52616a).stroke({ width: 1.4, color: INK });
      this.markers.rect(px - 1.5, py - 106, 2.2, 104).fill(0x8899a2);
      this.markers.roundRect(px - 6, py - 12, 12, 12, 2).fill(0x3a4750).stroke({ width: 1.4, color: INK });
      this.markers.roundRect(px - 14, py - 134, 28, 28, 5).fill(0x4c5a63).stroke({ width: 1.8, color: INK });
      this.markers.circle(px, py - 120, 9.5).fill(0x1b232a).stroke({ width: 1.2, color: 0x8ea0aa });
      this.markers.circle(px, py - 120, 4.2).fill(0x32404a).stroke({ width: 0.9, color: INK });
    }

    // Finish line checkered arch
    const fx = this.track.finishX * ppm;
    const fy = -this.lookupY(this.track.finishX) * ppm;
    this.markers.rect(fx - 5, fy - 148, 9, 148).fill(DESERT_PALETTE.finishPole).stroke({ width: 1.5, color: INK });
    this.markers.rect(fx + 52, fy - 148, 9, 148).fill(DESERT_PALETTE.finishPole).stroke({ width: 1.5, color: INK });
    this.markers.roundRect(fx - 12, fy - 154, 78, 36, 7).fill(DESERT_PALETTE.finishBannerPrimary).stroke({ width: 1.8, color: INK });
    for (let col = 0; col < 5; col++) {
      for (let row = 0; row < 2; row++) {
        if ((col + row) % 2 === 0) {
          this.markers.rect(fx - 5 + col * 12.8, fy - 147 + row * 11.5, 11.2, 10).fill(DESERT_PALETTE.finishBannerAccent);
        }
      }
    }
  }

  private buildInteractiveObstacles(): void {
    const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;
    for (const saw of this.track.hazardSaws ?? []) {
      const mount = new Graphics();
      const sx = saw.x * ppm;
      const sy = -saw.y * ppm;
      const floorY = -this.lookupY(saw.x) * ppm + 18;
      mount
        .rect(sx - 6, sy, 12, Math.max(24, floorY - sy))
        .fill(0x3e4b54)
        .stroke({ width: 1.8, color: INK });
      mount.rect(sx - 2.5, sy + 2, 3, Math.max(20, floorY - sy - 4)).fill(0x6f818b);
      this.obstacleLayer.addChild(mount);

      const sawG = createSawWheelGraphic(saw, ppm);
      this.obstacleLayer.addChild(sawG);
      this.sawSprites.push({ graphic: sawG, spinSpeed: saw.spinSpeed });
    }

    for (const prop of this.track.dynamicObstacles ?? []) {
      const g = createDynamicPropGraphic(prop.kind, prop.width, prop.height, ppm);
      g.label = `obstacle:${prop.id}`;
      this.obstacleLayer.addChild(g);
      this.propSprites.set(prop.id, g);
    }
  }

  syncObstacles(dynamicProps: DynamicPropSnapshot[], elapsedSec: number): void {
    const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;
    for (const saw of this.sawSprites) {
      saw.graphic.rotation = elapsedSec * saw.spinSpeed;
    }
    for (const prop of dynamicProps) {
      const g = this.propSprites.get(prop.id);
      if (g) {
        g.position.set(prop.x * ppm, -prop.y * ppm);
        g.rotation = -prop.angle;
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

  updateParallax(cam: CameraTransform, elapsedSec = 0): void {
    const hs = cam.viewportHeight / 720;
    const ws = cam.viewportWidth / 1280;
    const verticalDrift = cam.worldY * 44 * cam.scale;
    if (this.viewportWidth !== cam.viewportWidth || this.viewportHeight !== cam.viewportHeight) {
      this.viewportWidth = cam.viewportWidth;
      this.viewportHeight = cam.viewportHeight;
      this.sky.clear().rect(0, 0, cam.viewportWidth, cam.viewportHeight).fill(0xafdbea);
      this.sky.rect(0, cam.viewportHeight * 0.42, cam.viewportWidth, cam.viewportHeight * 0.58).fill(0xc5e5ec);
      this.sky.circle(cam.viewportWidth * 0.83, 105 * hs, 54 * hs).fill({ color: 0xffe7a3, alpha: 0.35 });
      this.sky.circle(cam.viewportWidth * 0.83, 105 * hs, 39 * hs).fill(0xffe7a3);
      for (const [x, y] of [
        [0.17, 118],
        [0.43, 79],
        [0.67, 150],
      ]) {
        this.sky.roundRect(cam.viewportWidth * x - 36 * hs, y * hs, 110 * hs, 15 * hs, 7 * hs).fill(0xe2f1ed);
        this.sky.ellipse(cam.viewportWidth * x, y * hs, 26 * hs, 11 * hs).fill(0xe2f1ed);
      }
    }
    this.farZagros.scale.set(ws, hs);
    this.farZagros.position.set(
      finitePanoramaX(cam.worldX, this.track.startX, this.track.finishX, cam.viewportWidth, 3328 * ws) * 0.45,
      verticalDrift * 0.02
    );
    this.mountains.scale.set(ws, hs);
    this.mountains.position.set(
      finitePanoramaX(cam.worldX, this.track.startX, this.track.finishX, cam.viewportWidth, 3328 * ws),
      verticalDrift * 0.04
    );
    const base = cam.viewportHeight * 0.72 + verticalDrift * 0.06;
    const offset = cam.worldX * 44 * cam.scale * 0.13;
    this.duneBase.clear().moveTo(-2, cam.viewportHeight);
    for (let x = -2; x <= cam.viewportWidth + 32; x += 32) {
      this.duneBase.lineTo(
        x,
        base + Math.sin((x + offset) * 0.0021) * 17 * hs + Math.cos((x + offset) * 0.0037) * 11 * hs
      );
    }
    this.duneBase.lineTo(cam.viewportWidth + 32, cam.viewportHeight).closePath().fill(0xd6b18a);
    this.mesaRidges.scale.set(ws, hs);
    this.mesaRidges.position.set(
      finitePanoramaX(cam.worldX, this.track.startX, this.track.finishX, cam.viewportWidth, 3328 * ws) * 0.92,
      verticalDrift * 0.075
    );
    this.geology.scale.set(hs);
    this.geology.position.set(
      cam.viewportWidth / 2 + (95 - cam.worldX) * 44 * cam.scale * 0.17,
      cam.viewportHeight * 0.78 + verticalDrift * 0.08
    );
    this.nearDunes.scale.set(hs);
    this.nearDunes.position.set(
      cam.viewportWidth / 2 + (240 - cam.worldX) * 44 * cam.scale * 0.23,
      cam.viewportHeight * 0.82 + verticalDrift * 0.12
    );
    ARCHITECTURE.forEach((entry, i) => {
      const sprite = this.landmarks[i];
      sprite.height = entry.referenceHeight * hs;
      sprite.width = (sprite.height * sprite.texture.width) / sprite.texture.height;
      sprite.position.set(
        landmarkScreenX(entry, cam.worldX, cam.viewportWidth, cam.scale),
        cam.viewportHeight * 0.76 + verticalDrift * 0.1
      );
      sprite.visible = sprite.x + sprite.width / 2 > -30 && sprite.x - sprite.width / 2 < cam.viewportWidth + 30;
    });

    this.dustStorm.update(cam, elapsedSec);
  }
}
