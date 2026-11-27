import { Graphics } from 'pixi.js';
import wheel from './vectors/wheel.svg?raw';
import frame from './vectors/frame.svg?raw';
import engine from './vectors/engine.svg?raw';
import tank from './vectors/tank.svg?raw';
import seat from './vectors/seat.svg?raw';
import rearFender from './vectors/rear-fender.svg?raw';
import frontFender from './vectors/front-fender.svg?raw';
import headlamp from './vectors/headlamp.svg?raw';
import upperArm from './vectors/upper-arm.svg?raw';
import forearm from './vectors/forearm.svg?raw';
import thigh from './vectors/thigh.svg?raw';
import shin from './vectors/shin.svg?raw';
import glove from './vectors/glove.svg?raw';
import boot from './vectors/boot.svg?raw';
import torso from './vectors/torso.svg?raw';
import helmet from './vectors/helmet.svg?raw';

const sources = { wheel, frame, engine, tank, seat, rearFender, frontFender, headlamp, upperArm, forearm, thigh, shin, glove, boot, torso, helmet };
/** SVGs contain paths at exact local coordinates; Pixi renders vector geometry, without raster scaling. */
export function flatPart(key: keyof typeof sources, label: string): Graphics {
  const graphic = new Graphics().svg(sources[key]);
  graphic.label = label;
  return graphic;
}
