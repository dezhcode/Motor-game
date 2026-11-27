import { Container, Sprite, Texture } from 'pixi.js';
import type { GameArtwork } from '../artwork/GameArtwork';
import { PHYSICS_CONFIG } from '../config/physicsConfig';
import { sampleTrackHeight, type TrackDefinition } from './desertTrackData';

/** Bakes bounded strips along the *same polyline* used by Planck; textures never define collision. */
export function createPaintedTerrain(track: TrackDefinition, art: GameArtwork) {
  const root = new Container(), textures: Texture[] = [];
  const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;
  const soil = art.soil.source.resource as CanvasImageSource;
  const surface = art.surface.source.resource as CanvasImageSource;
  const patternCanvas = document.createElement('canvas');
  const tile = 256;
  patternCanvas.width = patternCanvas.height = tile * 2;
  const pc = patternCanvas.getContext('2d')!;
  for (let iy = 0; iy < 2; iy++) for (let ix = 0; ix < 2; ix++) {
    pc.save(); pc.translate(ix ? tile * 2 : 0, iy ? tile * 2 : 0);
    pc.scale(ix ? -1 : 1, iy ? -1 : 1); pc.drawImage(soil, 0, 0, tile, tile); pc.restore();
  }
  const min = track.points[0].x * ppm, max = track.points.at(-1)!.x * ppm;
  const heightAt = (x: number) => -sampleTrackHeight(track, x / ppm) * ppm;
  for (let x0 = min; x0 < max; x0 += 768) {
    const x1 = Math.min(max, x0 + 768), path = [{ x: x0, y: heightAt(x0) }];
    for (const p of track.points) if (p.x * ppm > x0 && p.x * ppm < x1) path.push({ x: p.x * ppm, y: -p.y * ppm });
    path.push({ x: x1, y: heightAt(x1) });
    const top = Math.floor(Math.min(...path.map(p => p.y)) - 3);
    const bottom = Math.ceil(Math.max(...path.map(p => p.y)) + 640);
    const canvas = document.createElement('canvas'); canvas.width = Math.ceil(x1 - x0) + 2; canvas.height = bottom - top;
    const ctx = canvas.getContext('2d')!;
    ctx.translate(-x0 + 1, -top);
    ctx.beginPath();ctx.moveTo(x0 - 1, bottom);
    for (const p of path) ctx.lineTo(p.x, p.y);
    ctx.lineTo(x1 + 1, path.at(-1)!.y);ctx.lineTo(x1 + 1, bottom);ctx.closePath();
    ctx.fillStyle = ctx.createPattern(patternCanvas, 'repeat')!;ctx.fill();
    // Each original physical segment is subdivided only for UV sampling, never smoothed.
    let distance = x0;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y), angle = Math.atan2(b.y - a.y, b.x - a.x);
      for (let s = 0; s < len; s += 4) {
        const n = Math.min(4, len - s), u = ((distance + s) % 1200 + 1200) % 1200;
        const sx = (u < 600 ? u : 1200 - u) / 600 * (art.surface.width - 20);
        ctx.save();ctx.translate(a.x + (b.x - a.x) * s / len, a.y + (b.y - a.y) * s / len);ctx.rotate(angle);
        ctx.drawImage(surface, sx, 0, 18, art.surface.height, -0.5, 0, n + 1, 30);ctx.restore();
      }
      distance += len;
    }
    const texture = Texture.from(canvas); textures.push(texture);
    const sprite = new Sprite(texture);sprite.position.set(x0 - 1, top);root.addChild(sprite);
  }
  return { root, dispose: () => textures.forEach(t => t.destroy(true)) };
}
