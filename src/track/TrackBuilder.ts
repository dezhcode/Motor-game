import { Container, Graphics, Sprite } from 'pixi.js';
import type { GameArtwork } from '../artwork/GameArtwork';
import { DESERT_PALETTE } from '../config/palette';
import { PHYSICS_CONFIG } from '../config/physicsConfig';
import type { DynamicPropSnapshot } from '../physics/PhysicsWorld';
import { sampleTrackHeight, type TrackDefinition } from './desertTrackData';
import type { CameraTransform } from '../camera/FollowCamera';
import { createDynamicPropGraphic, createSawWheelGraphic } from './ObstacleGraphics';
import { createPaintedTerrain } from './PaintedTerrain';
import type { Pickup } from './RideCollectibles';

const INK = 0x141e26;

export class TrackRenderer {
  readonly backgroundContainer = new Container();
  readonly worldContainer = new Container();
  private readonly sky: Sprite;
  private readonly layers: Array<{ sprite: Sprite; factor: number; height: number; bottom: number }> = [];
  private readonly scenery = new Container();
  private readonly markers = new Graphics();
  private readonly obstacleLayer = new Container();
  private readonly pickupLayer = new Container();
  private readonly sawSprites: Array<{ graphic: Graphics; spinSpeed: number }> = [];
  private readonly propSprites = new Map<string, Sprite | Graphics>();
  private readonly pickupSprites = new Map<string, Sprite>();
  private readonly terrain: ReturnType<typeof createPaintedTerrain>;

  constructor(private readonly track: TrackDefinition, private readonly art: GameArtwork) {
    this.sky = new Sprite(art.sky);this.backgroundContainer.addChild(this.sky);
    for (const [key, factor, height, bottom] of [
      ['mesas', .035, 1.05, .88], ['dunes', .075, 1.3, .96], ['village', .15, .43, .67],
    ] as const) {
      const sprite = new Sprite(art[key]);sprite.anchor.set(.5, 1);
      this.layers.push({sprite, factor, height, bottom});this.backgroundContainer.addChild(sprite);
    }
    this.terrain = createPaintedTerrain(track, art);
    this.worldContainer.addChild(this.scenery, this.terrain.root, this.markers, this.obstacleLayer, this.pickupLayer);
    this.buildScenery(); this.buildMarkers(); this.buildInteractiveObstacles(); this.buildRoadFeatures();
  }

  private buildScenery(): void {
    const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;
    for (let x = this.track.startX + 12; x < this.track.finishX; x += 31) {
      const rock = new Sprite(this.art.rock);rock.anchor.set(.5, 1);rock.width = 95;rock.height = 34;
      rock.position.set(x * ppm, -this.lookupY(x) * ppm + 70);this.obstacleLayer.addChild(rock);
      const plants = new Sprite(this.art.plants);plants.anchor.set(.5, .9);plants.width = 470;plants.height = 157;
      plants.position.set((x + 6) * ppm, -this.lookupY(x + 6) * ppm + 50);this.scenery.addChild(plants);
    }
  }

  private buildRoadFeatures(): void {
    const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;
    for (const f of this.track.roadFeatures ?? []) {
      if (f.kind === 'sign') {
        const s = new Sprite(this.art.sign);s.anchor.set(.5, 1);s.height = 100;s.width = 100 * this.art.sign.width / this.art.sign.height;
        s.position.set(f.startX * ppm, -this.lookupY(f.startX) * ppm + 4);this.scenery.addChild(s);
      } else if (f.kind === 'bridge') {
        const g = new Graphics();
        for (let x = f.startX; x < f.endX; x += .65) {
          const next = Math.min(f.endX, x + .61), y = -this.lookupY(x) * ppm, yn = -this.lookupY(next) * ppm;
          g.poly([x*ppm,y,next*ppm,yn,next*ppm,yn+12,x*ppm,y+12]).fill(0xb57940).stroke({width:1,color:INK});
        }
        this.obstacleLayer.addChild(g);
      }
    }
    for (const [a, b] of this.track.rampVisualRanges ?? []) {
      const s = new Sprite(this.art.ramp);s.anchor.set(1, 0);s.width = (b-a)*ppm;s.height = s.width * this.art.ramp.height / this.art.ramp.width;
      s.position.set(b*ppm, -this.lookupY(b)*ppm+5);this.obstacleLayer.addChild(s);
    }
  }

  setPickups(pickups: readonly Pickup[]): void {
    this.pickupLayer.removeChildren().forEach(s => s.destroy());this.pickupSprites.clear();
    const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;
    for (const p of pickups) {
      const s = new Sprite(this.art[p.kind]);s.anchor.set(.5);s.height = p.kind === 'coin' ? 28 : 38;s.width = s.height * s.texture.width/s.texture.height;
      s.position.set(p.x*ppm, -p.y*ppm);this.pickupSprites.set(p.id,s);this.pickupLayer.addChild(s);
    }
  }

  syncPickups(pickups: readonly Pickup[]): void {
    for (const p of pickups) { const s = this.pickupSprites.get(p.id);if(s)s.visible = !p.collected; }
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
      const g = prop.kind === 'crate' ? new Sprite(this.art.crate) : createDynamicPropGraphic(prop.kind, prop.width, prop.height, ppm);
      if (g instanceof Sprite) { g.anchor.set(0.5); g.width = prop.width * ppm; g.height = prop.height * ppm; }
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

  private lookupY(x: number): number { return sampleTrackHeight(this.track, x); }

  updateParallax(cam: CameraTransform): void {
    this.sky.width = cam.viewportWidth;this.sky.height = cam.viewportHeight;
    for (const layer of this.layers) {
      const s = layer.sprite;s.height = cam.viewportHeight * layer.height;s.width = s.height * s.texture.width / s.texture.height;
      // Finite authored panorama: clamp its edges instead of repeating buildings.
      const span = Math.max(0, (s.width - cam.viewportWidth) / 2);
      const drift = (cam.worldX - this.track.startX) * 44 * cam.scale * layer.factor;
      s.x = cam.viewportWidth / 2 + Math.max(-span, Math.min(span, span * .3 - drift));
      s.y = cam.viewportHeight * layer.bottom + cam.worldY * 44 * cam.scale * layer.factor * .3;
    }
  }

  dispose(): void { this.terrain.dispose(); }
}
