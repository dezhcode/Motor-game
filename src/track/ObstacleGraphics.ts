import { Graphics } from 'pixi.js';
import type { DynamicObstacleDef, HazardSawDef, RoadFeatureDef } from './desertTrackData';

const INK = 0x141e26;

export function createSawWheelGraphic(def: HazardSawDef, ppm: number): Graphics {
  const g = new Graphics();
  const r = def.radius * ppm;
  const toothCount = 12;
  const toothDepth = r * 0.22;
  const outerR = r;
  const baseR = r - toothDepth;

  // Alternating black & gold spiked teeth around rim
  for (let i = 0; i < toothCount; i++) {
    const a0 = (i / toothCount) * Math.PI * 2;
    const aMid = ((i + 0.5) / toothCount) * Math.PI * 2;
    const a1 = ((i + 1) / toothCount) * Math.PI * 2;
    const fill = i % 2 === 0 ? 0xf5c43d : 0x26313a;
    g.poly(
      [
        Math.cos(a0) * baseR,
        Math.sin(a0) * baseR,
        Math.cos(aMid) * (outerR + 2),
        Math.sin(aMid) * (outerR + 2),
        Math.cos(a1) * baseR,
        Math.sin(a1) * baseR,
      ],
      true
    )
      .fill(fill)
      .stroke({ width: 2.0, color: INK, join: 'round' });
  }

  // Outer hazard ring (yellow + black hazard quarters)
  g.circle(0, 0, baseR).fill(0xf6c945).stroke({ width: 2.6, color: INK });
  for (let q = 0; q < 4; q++) {
    const start = q * (Math.PI / 2);
    const end = start + Math.PI / 4;
    const x1 = Math.cos(start) * baseR;
    const y1 = Math.sin(start) * baseR;
    const x2 = Math.cos(end) * baseR;
    const y2 = Math.sin(end) * baseR;
    const ix1 = Math.cos(start) * (baseR * 0.78);
    const iy1 = Math.sin(start) * (baseR * 0.78);
    const ix2 = Math.cos(end) * (baseR * 0.78);
    const iy2 = Math.sin(end) * (baseR * 0.78);
    g.poly([ix1, iy1, x1, y1, x2, y2, ix2, iy2], true).fill(0x212b34);
  }
  g.circle(0, 0, baseR * 0.78).fill(0xf3be34).stroke({ width: 2.2, color: INK });

  // Center hazard warning triangle & rivets
  const triR = baseR * 0.42;
  g.poly(
    [0, -triR, triR * 0.9, triR * 0.65, -triR * 0.9, triR * 0.65],
    true
  )
    .fill(0xf3be34)
    .stroke({ width: 3.4, color: INK, join: 'round' });
  g.roundRect(-2.4, -triR * 0.45, 4.8, triR * 0.56, 2).fill(INK);
  g.circle(0, triR * 0.34, 2.7).fill(INK);

  // Steel axle hub & rivets
  g.circle(0, 0, baseR * 0.17).fill(0x9fb0b8).stroke({ width: 1.8, color: INK });
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    g.circle(Math.cos(a) * baseR * 0.62, Math.sin(a) * baseR * 0.62, 2.1).fill(0x3a4650);
  }

  g.position.set(def.x * ppm, -def.y * ppm);
  return g;
}

export function createDynamicPropGraphic(
  kind: DynamicObstacleDef['kind'],
  widthM: number,
  heightM: number,
  ppm: number
): Graphics {
  const g = new Graphics();
  const w = widthM * ppm;
  const h = heightM * ppm;
  const hw = w * 0.5;
  const hh = h * 0.5;

  if (kind === 'crate') {
    // Cel-shaded cross-braced wooden crate
    g.roundRect(-hw, -hh, w, h, 3).fill(0xc48a47).stroke({ width: 2.0, color: INK });
    g.roundRect(-hw + 3.5, -hh + 3.5, w - 7, h - 7, 2).fill(0xd99f5a).stroke({ width: 1.3, color: 0x6b441d });
    // Diagonal brace plank
    g.poly(
      [
        -hw + 4,
        -hh + 6,
        -hw + 8,
        -hh + 4,
        hw - 4,
        hh - 6,
        hw - 8,
        hh - 4,
      ],
      true
    )
      .fill(0xb17638)
      .stroke({ width: 1.1, color: 0x5c3917 });
    // Corner iron rivets
    for (const [rx, ry] of [
      [-hw + 3.5, -hh + 3.5],
      [hw - 3.5, -hh + 3.5],
      [-hw + 3.5, hh - 3.5],
      [hw - 3.5, hh - 3.5],
    ]) {
      g.circle(rx, ry, 1.4).fill(0x4b5962);
    }
  } else if (kind === 'barrel') {
    // Hazard striped desert oil barrel
    g.roundRect(-hw, -hh, w, h, 3.5).fill(0xdd6b39).stroke({ width: 2.0, color: INK });
    // Highlight left side
    g.roundRect(-hw + 2.5, -hh + 3, w * 0.28, h - 6, 2).fill(0xf3945d);
    // Yellow hazard band across center
    g.rect(-hw + 1, -hh * 0.34, w - 2, h * 0.32).fill(0xf5c43d).stroke({ width: 1.2, color: INK });
    // Top, mid, bottom steel ribs
    for (const ry of [-hh + 4, -hh * 0.35, hh * 0.35, hh - 4]) {
      g.moveTo(-hw - 0.8, ry).lineTo(hw + 0.8, ry).stroke({ width: 2.4, color: 0x32404a });
      g.moveTo(-hw, ry - 0.5).lineTo(hw, ry - 0.5).stroke({ width: 0.9, color: 0xb6c5cc });
    }
  } else {
    // Striped traffic safety cone
    g.roundRect(-hw - 2, hh - 4.5, w + 4, 4.5, 1.5).fill(0xe8612c).stroke({ width: 1.6, color: INK });
    g.poly(
      [-hw + 2.2, hh - 4.5, -hw * 0.28, -hh, hw * 0.28, -hh, hw - 2.2, hh - 4.5],
      true
    )
      .fill(0xf06f32)
      .stroke({ width: 1.7, color: INK, join: 'round' });
    // White reflective band
    g.poly(
      [-hw * 0.58, 0, -hw * 0.42, -hh * 0.45, hw * 0.42, -hh * 0.45, hw * 0.58, 0],
      true
    )
      .fill(0xfff4d6)
      .stroke({ width: 1.0, color: INK });
  }

  return g;
}

export function drawRoadSign(
  target: Graphics,
  px: number,
  py: number,
  signKind: NonNullable<RoadFeatureDef['signKind']>
): void {
  // Steel post + concrete footing
  target.rect(px - 2.4, py - 62, 4.8, 62).fill(0x5b6a73).stroke({ width: 1.3, color: INK });
  target.roundRect(px - 5, py - 6, 10, 6, 1.5).fill(0x88969e).stroke({ width: 1.2, color: INK });

  if (signKind === 'finish') {
    target.roundRect(px - 17, py - 84, 34, 24, 4).fill(0x14a89d).stroke({ width: 1.8, color: INK });
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 2; r++) {
        if ((c + r) % 2 === 0) {
          target.rect(px - 12 + c * 6, py - 79 + r * 7, 5.5, 6.2).fill(0xfff3d4);
        }
      }
    }
    return;
  }

  // Yellow diamond caution sign
  const cy = py - 70;
  target
    .poly([px, cy - 16, px + 16, cy, px, cy + 16, px - 16, cy], true)
    .fill(0xf5c43d)
    .stroke({ width: 2.0, color: INK, join: 'round' });
  target
    .poly([px, cy - 12, px + 12, cy, px, cy + 12, px - 12, cy], true)
    .stroke({ width: 1.2, color: 0x3a2c14, join: 'round' });

  if (signKind === 'jump') {
    target.moveTo(px - 6, cy + 4).lineTo(px + 5, cy - 4).stroke({ width: 2.4, color: INK, cap: 'round' });
    target.poly([px + 1, cy - 6, px + 8, cy - 6, px + 6, cy + 1], true).fill(INK);
  } else if (signKind === 'bumps') {
    target
      .moveTo(px - 8, cy + 3)
      .quadraticCurveTo(px - 4, cy - 5, px, cy + 3)
      .quadraticCurveTo(px + 4, cy - 5, px + 8, cy + 3)
      .stroke({ width: 2.2, color: INK, cap: 'round' });
  } else {
    target.moveTo(px - 7, cy - 4).lineTo(px + 7, cy + 4).stroke({ width: 2.4, color: INK, cap: 'round' });
  }
}
