import { CanvasSource, Graphics, Sprite, Texture } from 'pixi.js';
import { RIDER_FORK, RIDER_SPRITE } from './riderSpriteGeometry';

const { upperGuide, lowerGuide } = RIDER_FORK;
const sliderOrigin = { x: 1165, y: 780 };
const shaftWidth = 64;
const shaftAngle = Math.atan2(lowerGuide.y - upperGuide.y, lowerGuide.x - upperGuide.x);

// Cut just below the fixed collar, clear of the fender and the rest of the body.
const movingForkOutline = [[1128, 685], [1180, 664], [1284, 852], [1284, 911], [1204, 911]];
const sliderOutline = [[1171, 818], [1248, 785], [1284, 852], [1284, 911], [1204, 911]];
const forkTextures = new WeakMap<Texture, { body: Texture; shaft: Texture; slider: Texture }>();

function traceOutline(ctx: CanvasRenderingContext2D, points: number[][]) {
  ctx.beginPath();
  for (const [x, y] of points) ctx.lineTo(x, y);
  ctx.closePath();
}

function paintTexture(width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to prepare motorcycle fork sprite');
  paint(ctx);
  return new Texture({ source: new CanvasSource({ resource: canvas, transparent: true }) });
}

function splitFork(texture: Texture) {
  const cached = forkTextures.get(texture);
  if (cached) return cached;
  const original = texture.source.resource as CanvasImageSource;
  const body = paintTexture(texture.width, texture.height, ctx => {
    ctx.drawImage(original, 0, 0);
    ctx.globalCompositeOperation = 'destination-out';
    traceOutline(ctx, movingForkOutline);
    ctx.fill();
  });
  const slider = paintTexture(119, 131, ctx => {
    ctx.translate(-sliderOrigin.x, -sliderOrigin.y);
    traceOutline(ctx, sliderOutline);
    ctx.clip();
    ctx.drawImage(original, 0, 0);
  });

  // Sample the straight chrome between the two collars in the tube's local orientation.
  const shaft = paintTexture(113, shaftWidth, ctx => {
    ctx.translate(-12, shaftWidth / 2);
    ctx.rotate(-shaftAngle);
    ctx.translate(-upperGuide.x, -upperGuide.y);
    ctx.drawImage(original, 0, 0);
  });
  const parts = { body, shaft, slider };
  forkTextures.set(texture, parts);
  return parts;
}

export class MotorcycleFork {
  readonly body: Sprite;
  readonly shaft: Sprite;
  readonly slider: Sprite;
  // The fixed fender occludes the far side of the tire as it rises into the wheel well.
  readonly wheelWell = new Graphics()
    .moveTo(900, 729)
    .lineTo(1045, 723)
    .bezierCurveTo(1087, 657, 1143, 629, 1197, 614)
    .bezierCurveTo(1271, 597, 1320, 634, 1350, 668)
    .quadraticCurveTo(1359, 677, 1361, 694)
    .lineTo(1510, 694)
    .lineTo(1510, 1260)
    .lineTo(900, 1260)
    .closePath()
    .fill(0xffffff);

  constructor(texture: Texture) {
    const parts = splitFork(texture);
    this.body = new Sprite(parts.body);
    this.shaft = new Sprite(parts.shaft);
    this.slider = new Sprite(parts.slider);
    this.body.label = 'motorcycle:body-no-scarf';
    this.shaft.label = 'motorcycle:front-fork-shaft';
    this.slider.label = 'motorcycle:front-fork-axle';
    this.shaft.anchor.y = .5;
    this.shaft.position.set(upperGuide.x, upperGuide.y);
    this.sync(RIDER_SPRITE.frontAxle.x, RIDER_SPRITE.frontAxle.y);
  }

  sync(frontX: number, frontY: number) {
    const offsetX = frontX - RIDER_SPRITE.frontAxle.x;
    const offsetY = frontY - RIDER_SPRITE.frontAxle.y;
    this.slider.position.set(sliderOrigin.x + offsetX, sliderOrigin.y + offsetY);
    const dx = lowerGuide.x + offsetX - upperGuide.x;
    const dy = lowerGuide.y + offsetY - upperGuide.y;
    this.shaft.rotation = Math.atan2(dy, dx);
    this.shaft.width = Math.hypot(dx, dy);
  }
}
