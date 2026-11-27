import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import type { GameArtwork } from '../artwork/GameArtwork';
import { panoramaTile } from '../artwork/artworkGeometry';
import { DESERT_PALETTE } from '../config/palette';
import { PHYSICS_CONFIG } from '../config/physicsConfig';
import type { TrackDefinition } from './desertTrackData';
import type { CameraTransform } from '../camera/FollowCamera';

export class TrackRenderer {
  public readonly backgroundContainer = new Container();
  public readonly worldContainer = new Container();
  private readonly sky: Sprite;
  private readonly mountains = new Container();
  private readonly village = new Container();
  private readonly mountainCopies: Sprite[] = [];
  private readonly villageCopies: Sprite[] = [];
  private readonly terrainGraphic = new Graphics();
  private readonly scenery = new Container();
  private readonly markers = new Graphics();

  constructor(private readonly track: TrackDefinition, private readonly art: GameArtwork) {
    this.sky = new Sprite(art.sky);
    this.village.alpha = 0.9;
    this.backgroundContainer.addChild(this.sky, this.mountains, this.village);
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

  private positionPanorama(
    layer: Container, copies: Sprite[], texture: Texture,
    cam: CameraTransform, height: number, bottom: number, speed: number
  ): void {
    const scale = height / texture.height;
    const tileWidth = texture.width * scale;
    const offset = cam.worldX * PHYSICS_CONFIG.world.pixelsPerMeter * cam.scale * speed;
    const first = Math.floor(offset / tileWidth) - 1;
    const count = Math.ceil(cam.viewportWidth / tileWidth) + 3;
    while (copies.length < count) {
      const copy = new Sprite(texture);
      copies.push(copy);
      layer.addChild(copy);
    }
    copies.forEach((sprite, i) => {
      sprite.visible = i < count;
      if (!sprite.visible) return;
      const layout = panoramaTile(first + i, offset, tileWidth);
      sprite.scale.set(layout.mirrored ? -scale : scale, scale);
      sprite.position.set(layout.x, bottom - height);
    });
  }

  public updateParallax(cam: CameraTransform): void {
    this.sky.width = cam.viewportWidth;
    this.sky.height = cam.viewportHeight;
    const verticalDrift = cam.worldY * PHYSICS_CONFIG.world.pixelsPerMeter * cam.scale;
    this.positionPanorama(this.mountains, this.mountainCopies, this.art['far-mountains'],
      cam, cam.viewportHeight * 0.92, cam.viewportHeight * 0.73 + verticalDrift * 0.04, 0.08);
    this.positionPanorama(this.village, this.villageCopies, this.art['kaluts-village'],
      cam, cam.viewportHeight * 0.60, cam.viewportHeight * 0.75 + verticalDrift * 0.10, 0.22);
  }
}
