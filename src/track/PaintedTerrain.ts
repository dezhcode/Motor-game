import { Container, Sprite, Texture } from 'pixi.js';
import type { GameArtwork } from '../artwork/GameArtwork';
import { PHYSICS_CONFIG } from '../config/physicsConfig';
import { sampleTrackHeight, type TrackDefinition } from './desertTrackData';
import { ROAD_FAR_EDGE, ROAD_NEAR_EDGE } from './roadDepth';
import { lowerBoundX, terrainProfile } from './trackProfile';

const CHUNK_WIDTH = 640;
const KEEP_MARGIN = CHUNK_WIDTH * 2;
const PREFETCH_MARGIN = 180;
const SOIL_DEPTH = 620;
const DETAIL_DEPTH = 232;
const SOIL_BASE = '#69331f';

type Point = { x: number; y: number };
type Chunk = {
  left: number;
  right: number;
  sprite?: Sprite;
};

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function mirroredStrip(texture: Texture, width: number, height: number, soil: boolean) {
  const canvas = makeCanvas(width * 2, height);
  const ctx = canvas.getContext('2d')!;
  const image = texture.source.resource as CanvasImageSource;
  ctx.drawImage(image, 0, 0, width, height);
  ctx.save();
  ctx.translate(width * 2, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(image, 0, 0, width, height);
  ctx.restore();

  const shade = ctx.createLinearGradient(0, 0, 0, height);
  if (soil) {
    shade.addColorStop(0, 'rgba(48, 18, 6, 0.38)');
    shade.addColorStop(0.11, 'rgba(48, 18, 6, 0)');
    shade.addColorStop(0.71, 'rgba(105, 51, 31, 0)');
    shade.addColorStop(1, SOIL_BASE);
  } else {
    shade.addColorStop(0, 'rgba(67, 30, 10, 0.32)');
    shade.addColorStop(0.25, 'rgba(67, 30, 10, 0)');
    shade.addColorStop(0.80, 'rgba(62, 26, 8, 0)');
    shade.addColorStop(1, 'rgba(62, 26, 8, 0.52)');
  }
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, canvas.width, height);
  return canvas;
}

function paintBand(
  ctx: CanvasRenderingContext2D,
  path: Point[],
  tile: HTMLCanvasElement,
  offset: number,
) {
  const pattern = ctx.createPattern(tile, 'repeat-x')!;
  ctx.fillStyle = pattern;
  // Each segment is an affine shear sharing its boundaries with its neighbors.
  // Pattern coordinates remain in world X, so texture phase stays continuous.
  for (let index = 1; index < path.length; index++) {
    const from = path[index - 1];
    const to = path[index];
    const slope = (to.y - from.y) / (to.x - from.x);
    ctx.save();
    ctx.transform(1, slope, 0, 1, 0, from.y + offset - from.x * slope);
    ctx.fillRect(from.x - 0.45, 0, to.x - from.x + 0.9, tile.height);
    ctx.restore();
  }
}

/** Bake a curved road and its cutaway only near the camera. The shared track
 * profile runs through the middle of the road, aligned with the contacts. */
export function createPaintedTerrain(track: TrackDefinition, art: GameArtwork) {
  const root = new Container({ label: 'terrain:chunks' });
  const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;
  const profile = terrainProfile(track);
  const road = mirroredStrip(art.roadDepth, 620, ROAD_FAR_EDGE + ROAD_NEAR_EDGE, false);
  const earth = mirroredStrip(art.earthStrata, 520, DETAIL_DEPTH, true);
  const chunks: Chunk[] = [];
  const min = Math.floor(profile[0].x * ppm);
  const max = Math.ceil(profile.at(-1)!.x * ppm);

  for (let x = min; x < max; x += CHUNK_WIDTH) {
    chunks.push({ left: x, right: Math.min(x + CHUNK_WIDTH, max) });
  }

  const heightAt = (x: number) => -sampleTrackHeight(track, x / ppm) * ppm;

  function bake({ left, right }: Chunk): Sprite {
    const path = [{ x: left - 2, y: heightAt(left - 2) }];
    for (let i = lowerBoundX(profile, (left - 2) / ppm); i < profile.length; i++) {
      const x = profile[i].x * ppm;
      if (x >= right + 2) break;
      if (x > left - 2) path.push({ x, y: -profile[i].y * ppm });
    }
    path.push({ x: right + 2, y: heightAt(right + 2) });

    const top = Math.floor(Math.min(...path.map(p => p.y)) - ROAD_FAR_EDGE - 2);
    const bottom = Math.ceil(Math.max(...path.map(p => p.y)) + SOIL_DEPTH);
    const canvas = makeCanvas(right - left + 2, bottom - top);
    const ctx = canvas.getContext('2d')!;
    ctx.translate(1 - left, -top);

    // Opaque underpaint closes antialiasing gaps between small segments.
    ctx.beginPath();
    ctx.moveTo(path[0].x, bottom);
    for (const point of path) ctx.lineTo(point.x, point.y - ROAD_FAR_EDGE);
    ctx.lineTo(path.at(-1)!.x, bottom);
    ctx.closePath();
    ctx.fillStyle = SOIL_BASE;
    ctx.fill();
    ctx.save();
    ctx.clip();
    paintBand(ctx, path, earth, ROAD_NEAR_EDGE - 2);
    paintBand(ctx, path, road, -ROAD_FAR_EDGE);
    ctx.restore();

    // Keep neighboring pixels as texture gutters. Render only the inner
    // rectangle, so antialiasing at translucent shoulders cannot stack.
    const backing = Texture.from(canvas);
    const frame = backing.frame.clone();
    frame.x = 1;
    frame.width -= 2;
    const texture = new Texture({ source: backing.source, frame });
    backing.destroy(false);
    const sprite = new Sprite(texture);
    sprite.position.set(left, top);
    root.addChild(sprite);
    return sprite;
  }

  function release(chunk: Chunk) {
    chunk.sprite?.destroy({ texture: true, textureSource: true });
    chunk.sprite = undefined;
  }

  return {
    root,
    updateView(left: number, right: number) {
      for (const chunk of chunks) {
        const visible = chunk.right >= left && chunk.left <= right;
        const nearby = chunk.right >= left - PREFETCH_MARGIN && chunk.left <= right + PREFETCH_MARGIN;
        const cached = chunk.right >= left - KEEP_MARGIN && chunk.left <= right + KEEP_MARGIN;
        if (nearby && !chunk.sprite) chunk.sprite = bake(chunk);
        if (!cached && chunk.sprite) release(chunk);
        if (chunk.sprite) chunk.sprite.visible = visible;
      }
    },
    dispose() {
      chunks.forEach(release);
    },
  };
}
