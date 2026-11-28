import { CanvasSource, Container, Rectangle, Sprite, Texture } from 'pixi.js';
import type { GameArtwork } from '../artwork/GameArtwork';
import { PHYSICS_CONFIG } from '../config/physicsConfig';
import { sampleTrackHeight, type TrackDefinition } from './desertTrackData';
import { farShoulderOffset, ROAD_FAR_EDGE, ROAD_NEAR_EDGE, ROAD_TILE_WIDTH } from './roadDepth';
import { lowerBoundX, terrainProfile } from './trackProfile';

const CHUNK_WIDTH = 640;
const KEEP_MARGIN = CHUNK_WIDTH * 2;
const PREFETCH_MARGIN = 180;
const SOIL_DEPTH = 620;
const DETAIL_DEPTH = 232;
const SOIL_BASE = '#69331f';
const SURFACE_RESOLUTION = 2;
const SURFACE_HEIGHT = ROAD_FAR_EDGE + ROAD_NEAR_EDGE;
const SOIL_TOP = ROAD_NEAR_EDGE - 9;

type Point = { x: number; y: number };
type Tile = { canvas: HTMLCanvasElement; height: number; resolution: number };
type Chunk = {
  left: number;
  right: number;
  container?: Container;
};

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function mirrorRightHalf(ctx: CanvasRenderingContext2D) {
  const { canvas } = ctx;
  const width = canvas.width / 2;
  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(canvas, 0, 0, width, canvas.height, 0, 0, width, canvas.height);
  ctx.restore();
}

function mirroredStrip(texture: Texture, width: number, height: number, resolution: number): Tile {
  const canvas = makeCanvas(width * 2 * resolution, height * resolution);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(texture.source.resource as CanvasImageSource, 0, 0, canvas.width / 2, canvas.height);
  mirrorRightHalf(ctx);
  return { canvas, height, resolution };
}

function makeRoadTile(texture: Texture): Tile {
  const resolution = SURFACE_RESOLUTION;
  const width = ROAD_TILE_WIDTH * resolution;
  const height = SURFACE_HEIGHT * resolution;
  const source = makeCanvas(width, height);
  const sourceCtx = source.getContext('2d')!;
  sourceCtx.imageSmoothingQuality = 'high';
  sourceCtx.drawImage(texture.source.resource as CanvasImageSource, 0, 0, width, height);
  const canvas = makeCanvas(width * 2, height);
  const ctx = canvas.getContext('2d')!;

  const farRim = 2 * resolution;
  const laneStart = (ROAD_FAR_EDGE - 13) * resolution;
  const laneEnd = (ROAD_FAR_EDGE + 11) * resolution;
  const nearRim = (ROAD_FAR_EDGE + 18) * resolution;
  ctx.drawImage(source, 0, laneStart, width, laneEnd - laneStart, 0, laneStart, width, laneEnd - laneStart);

  // Remap only the painted shoulders. Their silhouettes vary even where the
  // physical track has a single long flat segment.
  for (let column = 0; column < width; column++) {
    const x = (column + 0.5) / resolution;
    const farTop = Math.round((ROAD_FAR_EDGE + farShoulderOffset(x)) * resolution);
    const nearLift = 19 + 2.9 * Math.sin(x / 22 + 0.7) + 1.2 * Math.sin(x / 7 + 1.3);
    const nearTop = Math.round((ROAD_FAR_EDGE + nearLift) * resolution);
    ctx.drawImage(source, column, farRim, 1, laneStart - farRim, column, farTop, 1, laneStart - farTop);
    ctx.drawImage(source, column, laneEnd, 1, nearRim - laneEnd, column, laneEnd, 1, nearTop - laneEnd);
    ctx.drawImage(source, column, nearRim, 1, height - nearRim, column, nearTop, 1, height - nearTop);
  }
  mirrorRightHalf(ctx);

  const fadeStart = height - 8 * resolution;
  const blend = ctx.createLinearGradient(0, fadeStart, 0, height);
  blend.addColorStop(0, 'transparent');
  blend.addColorStop(1, 'black');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = blend;
  ctx.fillRect(0, fadeStart, canvas.width, height - fadeStart);
  return { canvas, height: SURFACE_HEIGHT, resolution };
}

function paintBand(
  ctx: CanvasRenderingContext2D,
  path: Point[],
  tile: Tile,
  offset: number,
  start = -Infinity,
  end = Infinity,
) {
  const pattern = ctx.createPattern(tile.canvas, 'repeat-x')!;
  const phase = Number.isFinite(start) ? start : 0;
  pattern.setTransform(new DOMMatrix([1 / tile.resolution, 0, 0, 1 / tile.resolution, phase, 0]));
  ctx.fillStyle = pattern;
  // Each segment is an affine shear sharing its boundaries with its neighbors.
  // Pattern coordinates remain in world X, so texture phase stays continuous.
  for (let index = 1; index < path.length; index++) {
    const from = path[index - 1];
    const to = path[index];
    const left = Math.max(from.x - 0.45, start);
    const right = Math.min(to.x + 0.45, end);
    if (left >= right) continue;
    const slope = (to.y - from.y) / (to.x - from.x);
    ctx.save();
    ctx.transform(1, slope, 0, 1, 0, from.y + offset - from.x * slope);
    ctx.fillRect(left, 0, right - left, tile.height);
    ctx.restore();
  }
}

function makeBandSprite(canvas: HTMLCanvasElement, left: number, top: number, resolution: number, label: string) {
  const source = new CanvasSource({ resource: canvas, resolution, transparent: true });
  // Keep one world pixel of gutter on each side for sampling chunk joins.
  const frame = new Rectangle(1, 0, source.width - 2, source.height);
  const sprite = new Sprite({ label, texture: new Texture({ source, frame }) });
  sprite.position.set(left, top);
  return sprite;
}

/** Bake a curved road and its cutaway only near the camera. The shared track
 * profile runs through the middle of the road, aligned with the contacts. */
export function createPaintedTerrain(track: TrackDefinition, art: GameArtwork) {
  const root = new Container({ label: 'terrain:chunks' });
  const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;
  const profile = terrainProfile(track);
  const road = makeRoadTile(art.roadDepth);
  const deck = mirroredStrip(art.woodenDeck, 392, SURFACE_HEIGHT, SURFACE_RESOLUTION);
  const earth = mirroredStrip(art.earthStrata, 610, DETAIL_DEPTH, 1);
  const earthCtx = earth.canvas.getContext('2d')!;
  const shade = earthCtx.createLinearGradient(0, 0, 0, earth.height);
  shade.addColorStop(0, 'rgba(61, 21, 8, 0.30)');
  shade.addColorStop(0.15, 'rgba(61, 21, 8, 0)');
  shade.addColorStop(0.75, 'rgba(105, 51, 31, 0)');
  shade.addColorStop(1, SOIL_BASE);
  earthCtx.fillStyle = shade;
  earthCtx.fillRect(0, 0, earth.canvas.width, earth.height);

  const bridges = (track.roadFeatures ?? [])
    .filter(feature => feature.kind === 'bridge')
    .map(feature => ({ left: feature.startX * ppm, right: feature.endX * ppm }));
  const chunks: Chunk[] = [];
  const min = Math.floor(profile[0].x * ppm);
  const max = Math.ceil(profile.at(-1)!.x * ppm);

  for (let x = min; x < max; x += CHUNK_WIDTH) {
    chunks.push({ left: x, right: Math.min(x + CHUNK_WIDTH, max) });
  }

  const heightAt = (x: number) => -sampleTrackHeight(track, x / ppm) * ppm;

  function bake({ left, right }: Chunk): Container {
    const path = [{ x: left - 2, y: heightAt(left - 2) }];
    for (let i = lowerBoundX(profile, (left - 2) / ppm); i < profile.length; i++) {
      const x = profile[i].x * ppm;
      if (x >= right + 2) break;
      if (x > left - 2) path.push({ x, y: -profile[i].y * ppm });
    }
    path.push({ x: right + 2, y: heightAt(right + 2) });

    const minY = Math.min(...path.map(point => point.y));
    const maxY = Math.max(...path.map(point => point.y));
    const width = right - left + 2;
    const soilTop = Math.floor(minY + SOIL_TOP - 2);
    const bottom = Math.ceil(maxY + SOIL_DEPTH);
    const soilCanvas = makeCanvas(width, bottom - soilTop);
    const soilCtx = soilCanvas.getContext('2d')!;
    soilCtx.translate(1 - left, -soilTop);

    soilCtx.beginPath();
    soilCtx.moveTo(path[0].x, bottom);
    for (const point of path) soilCtx.lineTo(point.x, point.y + SOIL_TOP);
    soilCtx.lineTo(path.at(-1)!.x, bottom);
    soilCtx.closePath();
    soilCtx.fillStyle = SOIL_BASE;
    soilCtx.fill();
    soilCtx.clip();
    paintBand(soilCtx, path, earth, SOIL_TOP);

    const surfaceTop = Math.floor(minY - ROAD_FAR_EDGE - 2);
    const surfaceBottom = Math.ceil(maxY + ROAD_NEAR_EDGE + 2);
    const surfaceCanvas = makeCanvas(width * SURFACE_RESOLUTION, (surfaceBottom - surfaceTop) * SURFACE_RESOLUTION);
    const surfaceCtx = surfaceCanvas.getContext('2d')!;
    surfaceCtx.scale(SURFACE_RESOLUTION, SURFACE_RESOLUTION);
    surfaceCtx.translate(1 - left, -surfaceTop);
    paintBand(surfaceCtx, path, road, -ROAD_FAR_EDGE);

    for (const bridge of bridges) {
      if (bridge.left < right + 1 && bridge.right > left - 1) {
        paintBand(surfaceCtx, path, deck, -ROAD_FAR_EDGE, bridge.left, bridge.right);
      }
    }

    const container = new Container({ label: 'terrain:chunk' });
    container.addChild(
      makeBandSprite(soilCanvas, left, soilTop, 1, 'terrain:earth'),
      makeBandSprite(surfaceCanvas, left, surfaceTop, SURFACE_RESOLUTION, 'terrain:surface'),
    );
    root.addChild(container);
    return container;
  }

  function release(chunk: Chunk) {
    chunk.container?.destroy({ children: true, texture: true, textureSource: true });
    chunk.container = undefined;
  }

  return {
    root,
    updateView(left: number, right: number) {
      for (const chunk of chunks) {
        const visible = chunk.right >= left && chunk.left <= right;
        const nearby = chunk.right >= left - PREFETCH_MARGIN && chunk.left <= right + PREFETCH_MARGIN;
        const cached = chunk.right >= left - KEEP_MARGIN && chunk.left <= right + KEEP_MARGIN;
        if (nearby && !chunk.container) chunk.container = bake(chunk);
        if (!cached && chunk.container) release(chunk);
        if (chunk.container) chunk.container.visible = visible;
      }
    },
    dispose() {
      chunks.forEach(release);
    },
  };
}
