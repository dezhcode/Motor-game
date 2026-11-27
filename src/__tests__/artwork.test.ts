import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ART_MANIFEST } from '../artwork/artManifest';
import { wheelToChassisPixels } from '../artwork/artworkGeometry';
import { ARCHITECTURE, finitePanoramaX } from '../artwork/SceneryPlan';
import { RIDER_BONES, riderPose, solveTwoBone } from '../artwork/rigGeometry';
import { FollowCamera } from '../camera/FollowCamera';

describe('Bundled artwork', () => {
  it('ships every declared WebP locally within a mobile-friendly total size', () => {
    let totalBytes = 0;
    for (const entry of Object.values(ART_MANIFEST)) {
      const bytes = readFileSync(`public/assets/art/${entry.file}`);
      expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
      expect(bytes.toString('ascii', 8, 12)).toBe('WEBP');
      totalBytes += bytes.length;
      expect(entry.frame.width).toBeGreaterThan(0);
      expect(entry.frame.height).toBeGreaterThan(0);
      expect(entry.frame.x + entry.frame.width).toBeLessThanOrEqual(entry.width);
      expect(entry.frame.y + entry.frame.height).toBeLessThanOrEqual(entry.height);
    }
    expect(totalBytes).toBeLessThan(3_000_000);
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

  it('uses four unique architectural landmarks and a finite mountain view with no wraparound', () => {
    expect(ARCHITECTURE).toHaveLength(4);
    expect(new Set(ARCHITECTURE.map(x => x.key)).size).toBe(4);
    expect(ARCHITECTURE.every((x, i) => i === 0 || x.worldX > ARCHITECTURE[i - 1].worldX)).toBe(true);
    const positions = [4, 87, 170, 253, 336].map(x => finitePanoramaX(x, 4, 336, 1280, 3328));
    expect(new Set(positions).size).toBe(5);
    positions.forEach((x, i) => { if (i > 0) expect(x).toBeLessThan(positions[i - 1]); });
    expect(positions[0]).toBe(0);
    expect(positions[4]).toBe(-2048);
    expect(finitePanoramaX(500, 4, 336, 1280, 3328)).toBe(-2048);
  });

  it('keeps hands and feet attached for both limbs throughout leaning and landing compression', () => {
    for (const lean of [-1, -0.5, 0, 0.5, 1]) for (const compression of [0, 0.12, 0.23]) {
      const pose = riderPose(lean, compression);
      for (const far of [true, false]) {
        const shoulder = { x: pose.shoulder.x - (far ? 1.5 : 0), y: pose.shoulder.y };
        const hip = { x: pose.hip.x - (far ? 1 : 0), y: pose.hip.y };
        const grip = far ? pose.farGrip : pose.nearGrip;
        const foot = far ? pose.farFoot : pose.nearFoot;
        for (const [start, end, upper, lower, bend] of [
          [shoulder, grip, RIDER_BONES.armUpper, RIDER_BONES.armLower, 1],
          [hip, foot, RIDER_BONES.legUpper, RIDER_BONES.legLower, -1],
        ] as const) {
          const solved = solveTwoBone(start, end, upper, lower, bend);
          expect(solved.end.x).toBeCloseTo(end.x, 7);
          expect(solved.end.y).toBeCloseTo(end.y, 7);
          expect(Math.hypot(solved.joint.x - start.x, solved.joint.y - start.y)).toBeCloseTo(upper, 7);
          expect(Math.hypot(solved.end.x - solved.joint.x, solved.end.y - solved.joint.y)).toBeCloseTo(lower, 7);
        }
      }
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
