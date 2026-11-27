import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ART_MANIFEST } from '../artwork/artManifest';
import { panoramaTile, wheelToChassisPixels } from '../artwork/artworkGeometry';
import { FollowCamera } from '../camera/FollowCamera';

describe('Bundled artwork', () => {
  it('ships every declared WebP locally within a mobile-friendly total size', () => {
    let totalBytes = 0;
    for (const entry of Object.values(ART_MANIFEST)) {
      const bytes = readFileSync(`public/assets/art/v1/${entry.file}`);
      expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
      expect(bytes.toString('ascii', 8, 12)).toBe('WEBP');
      totalBytes += bytes.length;
      expect(entry.frame.width).toBeGreaterThan(0);
      expect(entry.frame.height).toBeGreaterThan(0);
      expect(entry.frame.x + entry.frame.width).toBeLessThanOrEqual(entry.width);
      expect(entry.frame.y + entry.frame.height).toBeLessThanOrEqual(entry.height);
    }
    expect(totalBytes).toBeLessThan(2_000_000);
  });

  it('keeps fork and swingarm endpoints aligned with wheel centers as the bike rotates', () => {
    for (const angle of [0, Math.PI / 2, -0.6, 2.6]) {
      const chassis = { x: 15, y: 3, angle };
      const local = { x: 0.78, y: -0.27 };
      const wheel = {
        x: chassis.x + local.x * Math.cos(angle) - local.y * Math.sin(angle),
        y: chassis.y + local.x * Math.sin(angle) + local.y * Math.cos(angle),
        angle: 12,
      };
      const endpoint = wheelToChassisPixels(wheel, chassis, 44);
      expect(endpoint.x).toBeCloseTo(local.x * 44, 8);
      expect(endpoint.y).toBeCloseTo(-local.y * 44, 8);
    }
  });

  it('mirrors adjacent panorama edges consistently even when scrolling backwards', () => {
    for (const index of [-3, -2, -1, 0, 1, 2, 3]) {
      const a = panoramaTile(index, 83, 640);
      const b = panoramaTile(index + 1, 83, 640);
      const aRight = a.x + (a.mirrored ? 0 : 640);
      const bLeft = b.x - (b.mirrored ? 640 : 0);
      expect(aRight).toBe(bLeft);
      expect(a.mirrored).not.toBe(b.mirrored);
    }
  });

  it('keeps the enlarged bike on screen at full speed on both common and ultrawide phones', () => {
    for (const [width, height] of [[1280, 720], [960, 432], [1536, 690]]) {
      const camera = new FollowCamera();
      camera.setViewport(width, height);
      camera.reset(4, 1);
      let view = camera.update(4, 1, 16, 1 / 60);
      for (let i = 0; i < 180; i++) view = camera.update(4, 1, 16, 1 / 60);
      const bikeScreenX = width / 2 + (4 - view.worldX) * 44 * view.scale;
      expect(bikeScreenX).toBeGreaterThan(width * 0.2);
      expect(bikeScreenX).toBeLessThan(width * 0.4);
    }
  });
});
