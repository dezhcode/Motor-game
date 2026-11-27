import { Container, Graphics, Sprite } from 'pixi.js';
import type { GameArtwork } from '../artwork/GameArtwork';
import { ARCHITECTURE, finitePanoramaX, landmarkScreenX } from '../artwork/SceneryPlan';
import { DESERT_PALETTE } from '../config/palette';
import { PHYSICS_CONFIG } from '../config/physicsConfig';
import type { TrackDefinition } from './desertTrackData';
import type { CameraTransform } from '../camera/FollowCamera';

export class TrackRenderer {
  public readonly backgroundContainer = new Container();
  public readonly worldContainer = new Container();
  private readonly sky: Sprite;
  private readonly mountains: Sprite;
  private readonly duneBase = new Graphics();
  private readonly geology: Sprite;
  private readonly nearDunes: Sprite;
  private readonly buildings = new Container();
  private readonly landmarks: Sprite[] = [];
  private readonly terrainGraphic = new Graphics();
  private readonly scenery = new Container();
  private readonly markers = new Graphics();

  constructor(private readonly track: TrackDefinition, private readonly art: GameArtwork) {
    this.sky = new Sprite(art.sky);
    this.mountains = new Sprite(art['far-mountains']);
    this.geology = new Sprite(art['kalut-arches-v2']);
    this.nearDunes = new Sprite(art['dune-ridge-v2']);
    this.geology.anchor.set(0.5, 1);
    this.nearDunes.anchor.set(0.5, 1);
    ARCHITECTURE.forEach((entry) => {
      const sprite = new Sprite(art[entry.key]);
      sprite.label = `landmark:${entry.key}`;
      sprite.anchor.set(0.5, 1);
      sprite.alpha = 0.94;
      this.landmarks.push(sprite);
      this.buildings.addChild(sprite);
    });
    this.backgroundContainer.addChild(this.sky, this.mountains, this.duneBase, this.geology, this.buildings, this.nearDunes);
    this.worldContainer.addChild(this.scenery, this.terrainGraphic, this.markers);
    this.buildTerrainMesh();
    this.buildScenery();
    this.buildMarkers();
  }

  private buildTerrainMesh(): void {
    const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;
    const pts = this.track.points;
    this.terrainGraphic.moveTo(pts[0].x * ppm, 1500);
    for (const p of pts) this.terrainGraphic.lineTo(p.x * ppm, -p.y * ppm);
    this.terrainGraphic.lineTo(pts[pts.length - 1].x * ppm, 1500).closePath();
    this.terrainGraphic.fill({ texture: this.art['sand-texture'], textureSpace: 'global' });

    // The painted material never changes the exact physical surface silhouette.
    this.terrainGraphic.moveTo(pts[0].x * ppm, -pts[0].y * ppm);
    for (const p of pts) this.terrainGraphic.lineTo(p.x * ppm, -p.y * ppm);
    for (let i = pts.length - 1; i >= 0; i--) {
      this.terrainGraphic.lineTo(pts[i].x * ppm, -pts[i].y * ppm + 17);
    }
    this.terrainGraphic.closePath().fill({ color: 0xe9b772, alpha: 0.7 });
    this.terrainGraphic.moveTo(pts[0].x * ppm, -pts[0].y * ppm + 2);
    for (let i = 1; i < pts.length; i++) this.terrainGraphic.lineTo(pts[i].x * ppm, -pts[i].y * ppm + 2);
    this.terrainGraphic.stroke({ width: 4, color: 0xf6d8a5, cap: 'round', join: 'round' });
    this.terrainGraphic.moveTo(pts[0].x * ppm, -pts[0].y * ppm);
    for (let i = 1; i < pts.length; i++) this.terrainGraphic.lineTo(pts[i].x * ppm, -pts[i].y * ppm);
    this.terrainGraphic.stroke({ width: 2.4, color: 0x895332, cap: 'round', join: 'round' });
  }

  private buildScenery(): void {
    const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;
    const locations = [12, 22, 33, 51, 74, 84, 107, 123, 143, 151, 188, 211, 229, 241, 283, 307, 321];
    locations.forEach((x, i) => {
      const isShrub = i % 3 !== 0;
      const sprite = new Sprite(isShrub ? this.art.shrub : this.art.rock);
      sprite.anchor.set(0.5, 1);
      const height = isShrub ? 25 + (i % 4) * 6 : 15 + (i % 4) * 3;
      sprite.height = height;
      sprite.width = height * sprite.texture.width / sprite.texture.height;
      if (i % 2 === 1) sprite.scale.x *= -1;
      sprite.position.set(x * ppm, -this.lookupY(x) * ppm + 7);
      this.scenery.addChild(sprite);
    });
  }

  private buildMarkers(): void {
    const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;
    this.markers.rect(0.5 * ppm - 3, -72, 6, 72).fill(DESERT_PALETTE.finishPole);
    this.markers.roundRect(0.5 * ppm - 2, -70, 32, 18, 4).fill(DESERT_PALETTE.bikeTurquoise);
    const fx = this.track.finishX * ppm;
    const fy = -this.lookupY(this.track.finishX) * ppm;
    this.markers.rect(fx - 5, fy - 145, 8, 145).fill(DESERT_PALETTE.finishPole);
    this.markers.rect(fx + 52, fy - 145, 8, 145).fill(DESERT_PALETTE.finishPole);
    this.markers.roundRect(fx - 10, fy - 150, 74, 34, 6).fill(DESERT_PALETTE.finishBannerPrimary);
    for (let col = 0; col < 5; col++) for (let row = 0; row < 2; row++) {
      if ((col + row) % 2 === 0) {
        this.markers.rect(fx - 4 + col * 12.5, fy - 144 + row * 11, 11, 10).fill(DESERT_PALETTE.finishBannerAccent);
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
    const heightScale = cam.viewportHeight / 720;
    const verticalDrift = cam.worldY * PHYSICS_CONFIG.world.pixelsPerMeter * cam.scale;
    this.sky.width = cam.viewportWidth;
    this.sky.height = cam.viewportHeight;

    // One long, finite mountain view. It never wraps or mirrors back to a previous ridge.
    this.mountains.width = cam.viewportWidth * 2.6;
    this.mountains.height = cam.viewportHeight * 0.95;
    this.mountains.position.set(
      finitePanoramaX(cam.worldX, this.track.startX, this.track.finishX, cam.viewportWidth, this.mountains.width),
      cam.viewportHeight * 0.73 + verticalDrift * 0.04 - this.mountains.height
    );

    // Continuous low dunes join isolated scenery without repeating a painted village strip.
    const base = cam.viewportHeight * 0.72 + verticalDrift * 0.06;
    const offset = cam.worldX * 44 * cam.scale * 0.13;
    this.duneBase.clear().moveTo(-2, cam.viewportHeight);
    for (let x = -2; x <= cam.viewportWidth + 32; x += 32) {
      const y = base + Math.sin((x + offset) * 0.0021) * 17 * heightScale
        + Math.cos((x + offset) * 0.0037) * 11 * heightScale;
      this.duneBase.lineTo(x, y);
    }
    this.duneBase.lineTo(cam.viewportWidth + 32, cam.viewportHeight).closePath().fill(0xd6b18a);

    this.geology.height = 275 * heightScale;
    this.geology.width = this.geology.height * this.geology.texture.width / this.geology.texture.height;
    this.geology.position.set(cam.viewportWidth / 2 + (95 - cam.worldX) * 44 * cam.scale * 0.17,
      cam.viewportHeight * 0.79 + verticalDrift * 0.08);
    this.nearDunes.width = 1450 * heightScale;
    this.nearDunes.height = this.nearDunes.width * this.nearDunes.texture.height / this.nearDunes.texture.width;
    this.nearDunes.position.set(cam.viewportWidth / 2 + (240 - cam.worldX) * 44 * cam.scale * 0.23,
      cam.viewportHeight * 0.82 + verticalDrift * 0.12);
    ARCHITECTURE.forEach((entry, i) => {
      const sprite = this.landmarks[i];
      sprite.height = entry.referenceHeight * heightScale;
      sprite.width = sprite.height * sprite.texture.width / sprite.texture.height;
      sprite.position.set(landmarkScreenX(entry, cam.worldX, cam.viewportWidth, cam.scale),
        cam.viewportHeight * 0.76 + verticalDrift * 0.10);
      sprite.visible = sprite.x + sprite.width / 2 > -30 && sprite.x - sprite.width / 2 < cam.viewportWidth + 30;
    });
  }
}
