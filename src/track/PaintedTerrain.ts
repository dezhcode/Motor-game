import { Container, Sprite, Texture } from 'pixi.js';
import type { GameArtwork } from '../artwork/GameArtwork';
import { PHYSICS_CONFIG } from '../config/physicsConfig';
import { sampleTrackHeight, type TrackDefinition } from './desertTrackData';
import { terrainProfile } from './trackProfile';

/** Continuous painted ribbon along the same rounded profile used by Planck. */
export function createPaintedTerrain(track: TrackDefinition, art: GameArtwork) {
  const root = new Container(), textures: Texture[] = [];
  root.label='terrain:chunks';
  const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;
  const profile=terrainProfile(track);
  const chunks:Array<{sprite:Sprite;texture:Texture;left:number;right:number;resident:boolean}>=[];
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
  let ribbonDistance = min;
  for (let x0 = min; x0 < max; x0 += 768) {
    const x1 = Math.min(max, x0 + 768), path = [{ x: x0, y: heightAt(x0) }];
    for (const p of profile) if (p.x * ppm > x0 && p.x * ppm < x1) path.push({ x: p.x * ppm, y: -p.y * ppm });
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
    // World-aligned UV phase continues across chunk boundaries.
    let distance = ribbonDistance;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y);
      for (let s = 0; s < len; s += 4) {
        const n = Math.min(4, len - s), u = ((distance + s) % 1200 + 1200) % 1200;
        const sx = (u < 600 ? u : 1200 - u) / 600 * (art.surface.width - 20);
        // Continuous vertical-sided quads share BOTH top and bottom endpoints.
        // Rotated rectangles fan apart on concave curves and produce comb-like gaps.
        ctx.save();
        ctx.transform((b.x-a.x)*n/len,(b.y-a.y)*n/len,0,30,a.x+(b.x-a.x)*s/len,a.y+(b.y-a.y)*s/len);
        ctx.drawImage(surface,sx,0,18,art.surface.height,-.015,0,1.03,1);ctx.restore();
      }
      distance += len;
    }
    ribbonDistance=distance;
    const texture = Texture.from(canvas); textures.push(texture);
    const sprite = new Sprite(texture);sprite.position.set(x0 - 1, top);sprite.visible=false;root.addChild(sprite);
    chunks.push({sprite,texture,left:x0,right:x1,resident:false});
  }
  return { root,
    updateView:(left:number,right:number)=>{
      for(const chunk of chunks) {
        const near=chunk.right>=left-384 && chunk.left<=right+384;
        chunk.sprite.visible=near;
        if(!near && chunk.resident) chunk.texture.source.unload();
        chunk.resident=near;
      }
    },
    dispose: () => textures.forEach(t => t.destroy(true)) };
}
