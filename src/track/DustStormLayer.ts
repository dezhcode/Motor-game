import { Container, Graphics } from 'pixi.js';
import type { CameraTransform } from '../camera/FollowCamera';

interface StormMote {
  graphic: Graphics;
  normX: number;
  normY: number;
  speedPx: number;
  depth: number;
  swayPhase: number;
  baseAlpha: number;
}

/**
 * Multi-layered animated Iranian desert dust storm:
 * - Far drifting golden-sand haze curtains above mountain valleys
 * - Near windblown sand gusts & airborne dust motes responding to camera parallax
 */
export class DustStormLayer {
  public readonly farContainer = new Container();
  public readonly nearContainer = new Container();

  private readonly farCurtain = new Graphics();
  private readonly nearCurtain = new Graphics();
  private readonly motes: StormMote[] = [];
  private lastWidth = 0;
  private lastHeight = 0;
  private lastTime = 0;

  constructor(moteCount = 34) {
    this.farContainer.addChild(this.farCurtain);
    this.nearContainer.addChild(this.nearCurtain);

    for (let i = 0; i < moteCount; i++) {
      const isNear = i % 2 === 0;
      const g = new Graphics();
      if (i % 5 === 0) {
        // Slanted desert wind-sand streak
        g.roundRect(-14, -1.2, 28, 2.4, 1.2).fill({ color: 0xf4d8a8, alpha: 0.75 });
      } else {
        // Soft swirling sand puff mote
        const r = isNear ? 4.5 + (i % 4) * 2.1 : 3.2 + (i % 3) * 1.4;
        g.circle(0, 0, r).fill({ color: isNear ? 0xeac288 : 0xf1d4a4, alpha: 0.6 });
      }

      const parent = isNear ? this.nearContainer : this.farContainer;
      parent.addChild(g);

      this.motes.push({
        graphic: g,
        normX: ((i * 37) % 100) / 100,
        normY: 0.24 + (((i * 23) % 62) / 100),
        speedPx: isNear ? 95 + (i % 5) * 24 : 48 + (i % 4) * 16,
        depth: isNear ? 0.28 : 0.11,
        swayPhase: i * 0.73,
        baseAlpha: isNear ? 0.28 : 0.18,
      });
    }
  }

  public update(cam: CameraTransform, elapsedSec: number): void {
    const w = Math.max(320, cam.viewportWidth);
    const h = Math.max(240, cam.viewportHeight);
    const dt = Math.min(0.05, Math.max(0, elapsedSec - this.lastTime));
    this.lastTime = elapsedSec;

    const hs = h / 720;
    const gustStrength = 0.65 + 0.35 * Math.sin(elapsedSec * 0.38);

    // Draw sweeping valley dust-haze ribbons when viewport changes or periodically
    if (this.lastWidth !== w || this.lastHeight !== h || Math.floor(elapsedSec * 20) !== Math.floor((elapsedSec - dt) * 20)) {
      this.lastWidth = w;
      this.lastHeight = h;

      const farDrift = (cam.worldX * 14 + elapsedSec * 36) % (w + 260);
      this.farCurtain.clear();
      this.drawHazeBand(this.farCurtain, w, h * 0.64, 58 * hs, farDrift, 0xecd0a1, 0.16 * gustStrength, elapsedSec);

      const nearDrift = (cam.worldX * 26 + elapsedSec * 72) % (w + 300);
      this.nearCurtain.clear();
      this.drawHazeBand(this.nearCurtain, w, h * 0.79, 46 * hs, nearDrift, 0xe5b87b, 0.22 * gustStrength, elapsedSec * 1.4);
    }

    // Advance windblown sand motes with parallax + wind drift
    for (const m of this.motes) {
      m.normX -= (m.speedPx * dt) / w;
      if (m.normX < -0.08) m.normX += 1.16;
      if (m.normX > 1.08) m.normX -= 1.16;

      const parallaxShift = ((cam.worldX * 44 * cam.scale * m.depth) % (w * 1.15));
      let sx = (m.normX * w - parallaxShift) % (w + 90);
      if (sx < -45) sx += w + 90;

      const bob = Math.sin(elapsedSec * 2.1 + m.swayPhase) * 9 * hs;
      const sy = m.normY * h + bob;

      m.graphic.position.set(sx, sy);
      m.graphic.scale.set((0.75 + 0.35 * gustStrength) * hs);
      m.graphic.alpha = m.baseAlpha * gustStrength * (0.7 + 0.3 * Math.sin(elapsedSec * 3.0 + m.swayPhase));
    }
  }

  private drawHazeBand(
    g: Graphics,
    width: number,
    baseY: number,
    thickness: number,
    phasePx: number,
    color: number,
    alpha: number,
    time: number
  ): void {
    g.moveTo(-20, baseY + thickness);
    for (let x = -20; x <= width + 40; x += 64) {
      const wave =
        Math.sin((x + phasePx) * 0.0085) * thickness * 0.42 +
        Math.cos((x - phasePx * 0.6) * 0.015 + time * 0.6) * thickness * 0.22;
      g.lineTo(x, baseY - thickness * 0.4 + wave);
    }
    g.lineTo(width + 40, baseY + thickness * 1.4)
      .lineTo(-20, baseY + thickness * 1.4)
      .closePath()
      .fill({ color, alpha });
  }
}
