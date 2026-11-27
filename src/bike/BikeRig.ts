import { Container, Graphics } from 'pixi.js';
import type { GameArtwork } from '../artwork/GameArtwork';
import { flatPart } from '../artwork/vectorArtwork';
import { wheelToChassisPixels } from '../artwork/artworkGeometry';
import { PHYSICS_CONFIG } from '../config/physicsConfig';
import type { PhysicsSnapshot } from '../physics/PhysicsWorld';
import { along, BIKE_ATTACHMENTS as A, chainOutline, type BikePoint } from './bikeGeometry';
import { RiderRig } from './RiderRig';

const INK = 0x20333e, TEAL = 0x20afa4, CREAM = 0xfff0ca, STEEL = 0xb4c7c9;
function line(g: Graphics, a: BikePoint, b: BikePoint, width: number, color: number) {
  g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width, color, cap: 'round', join: 'round' });
}

/** All parts use exact shared attachment coordinates and flat vector geometry. */
export class BikeRig {
  readonly root = new Container();
  readonly rearWheelLayer = new Container();
  readonly frontWheelLayer = new Container();
  readonly chassisLayer = new Container();
  private readonly swingarm = new Graphics();
  private readonly fork = new Graphics();
  private readonly shock = new Graphics();
  private readonly chain = new Graphics();
  private readonly sprocket = new Graphics();
  private readonly frontFender = flatPart('frontFender', 'motorcycle:front-fender');
  private readonly fenderMount = new Graphics();
  private readonly rider = new RiderRig();

  constructor(_art?: GameArtwork) {
    this.root.label = 'motorcycle';
    this.chassisLayer.label = 'motorcycle:chassis';
    this.root.addChild(this.rearWheelLayer, this.frontWheelLayer, this.chassisLayer);
    const radiusScale = PHYSICS_CONFIG.wheels.radius * PHYSICS_CONFIG.world.pixelsPerMeter / 16.28;
    for (const [index, layer] of [this.rearWheelLayer, this.frontWheelLayer].entries()) {
      const wheel = flatPart('wheel', `motorcycle:${index === 0 ? 'rear' : 'front'}-wheel`);
      wheel.scale.set(radiusScale);
      layer.addChild(wheel);
    }
    const frame = flatPart('frame', 'motorcycle:frame');
    const engine = flatPart('engine', 'motorcycle:engine'); engine.position.set(-1, -8);
    const tank = flatPart('tank', 'motorcycle:tank'); tank.position.set(3, -22);
    const seat = flatPart('seat', 'motorcycle:seat'); seat.position.set(-20, -20);
    const rearFender = flatPart('rearFender', 'motorcycle:rear-fender'); rearFender.position.set(-29, -19);
    const lamp = flatPart('headlamp', 'motorcycle:headlamp'); lamp.position.set(26, -24);
    const exhaust = new Graphics(); exhaust.label = 'motorcycle:exhaust';
    exhaust.moveTo(6, -15).bezierCurveTo(15, -16, 14, -9, 8, -10)
      .bezierCurveTo(-2, -12, -7, -15, -19, -14).lineTo(-30, -13)
      .stroke({ width: 3.1, color: INK, cap: 'round' });
    exhaust.moveTo(6, -15).bezierCurveTo(15, -16, 14, -9, 8, -10)
      .bezierCurveTo(-2, -12, -7, -15, -19, -14).lineTo(-30, -13)
      .stroke({ width: 1.5, color: STEEL, cap: 'round' });
    const bars = new Graphics(); bars.label = 'motorcycle:handlebars-and-pegs';
    const stem = { x: 20, y: -29 };
    line(bars, A.steeringHead, stem, 2.6, INK);
    line(bars, A.steeringHead, stem, 1.1, STEEL);
    line(bars, stem, A.farGrip, 1.7, INK);
    line(bars, A.farGrip, A.nearGrip, 2.4, INK);
    bars.moveTo(19, -30).bezierCurveTo(31, -28, 30, -18, 19, -12).stroke({ width: 0.55, color: INK });
    line(bars, { x: -11, y: 2 }, { x: -2, y: 2 }, 2.2, INK);
    for (const foot of [A.nearFoot, A.farFoot]) line(bars, { x: foot.x - 2, y: foot.y + 1 }, { x: foot.x + 3, y: foot.y + 1 }, 1, STEEL);
    const skid = new Graphics(); skid.moveTo(-11, 1).lineTo(-7, 4).lineTo(9, 4).lineTo(13, -1)
      .stroke({ width: 2.5, color: INK, join: 'round' });
    skid.moveTo(-9, 2).lineTo(-6, 3).lineTo(8, 3).lineTo(11, 0).stroke({ width: 1, color: CREAM });
    this.sprocket.circle(0, 0, 4.6).fill(CREAM).stroke({ width: 0.7, color: INK });
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      this.sprocket.circle(Math.cos(a) * 3, Math.sin(a) * 3, 0.55).fill(INK);
    }
    this.sprocket.circle(0, 0, 1.4).fill(TEAL).stroke({ width: 0.6, color: INK });
    for (const [name, object] of Object.entries({ swingarm: this.swingarm, fork: this.fork, shock: this.shock, chain: this.chain, sprocket: this.sprocket })) object.label = `motorcycle:${name}`;
    this.chassisLayer.addChild(
      this.rider.farLimbs, exhaust, this.swingarm, this.shock, frame, rearFender, engine, skid,
      this.sprocket, this.chain, this.fork, this.fenderMount, this.frontFender,
      tank, seat, lamp, bars, this.rider.torsoLayer, this.rider.nearLimbs, this.rider.helmetLayer
    );
  }

  sync(snapshot: PhysicsSnapshot, leanInput: -1 | 0 | 1, dt: number): void {
    const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;
    this.rearWheelLayer.position.set(snapshot.rearWheel.x * ppm, -snapshot.rearWheel.y * ppm);
    this.rearWheelLayer.rotation = -snapshot.rearWheel.angle;
    this.frontWheelLayer.position.set(snapshot.frontWheel.x * ppm, -snapshot.frontWheel.y * ppm);
    this.frontWheelLayer.rotation = -snapshot.frontWheel.angle;
    this.chassisLayer.position.set(snapshot.chassis.x * ppm, -snapshot.chassis.y * ppm);
    this.chassisLayer.rotation = -snapshot.chassis.angle;
    const rear = wheelToChassisPixels(snapshot.rearWheel, snapshot.chassis, ppm);
    const front = wheelToChassisPixels(snapshot.frontWheel, snapshot.chassis, ppm);
    this.swingarm.clear();
    line(this.swingarm, A.rearPivot, rear, 4.3, INK);
    line(this.swingarm, A.rearPivot, rear, 2.3, CREAM);
    this.swingarm.circle(rear.x, rear.y, 1.8).fill(STEEL).stroke({ width: 0.65, color: INK });
    this.swingarm.circle(A.rearPivot.x, A.rearPivot.y, 2).fill(TEAL).stroke({ width: 0.7, color: INK });

    const shockEnd = along(A.rearPivot, rear, 0.59);
    const shockLength = Math.hypot(shockEnd.x - A.shockTop.x, shockEnd.y - A.shockTop.y);
    this.shock.clear(); this.shock.position.set(A.shockTop.x, A.shockTop.y);
    this.shock.rotation = Math.atan2(shockEnd.y - A.shockTop.y, shockEnd.x - A.shockTop.x) - Math.PI / 2;
    line(this.shock, { x: 0, y: 0 }, { x: 0, y: shockLength }, 2.7, INK);
    line(this.shock, { x: 0, y: 0 }, { x: 0, y: shockLength }, 1.1, STEEL);
    for (let i = 0; i < 6; i++) {
      this.shock.moveTo(-1.9, 2 + i * (shockLength - 5) / 6)
        .lineTo(1.9, 3.2 + i * (shockLength - 5) / 6).stroke({ width: 1.2, color: INK });
      this.shock.moveTo(-1.7, 2 + i * (shockLength - 5) / 6)
        .lineTo(1.7, 3.2 + i * (shockLength - 5) / 6).stroke({ width: 0.65, color: 0xf0bc55 });
    }
    this.shock.circle(0, 0, 1.4).fill(CREAM).stroke({ width: 0.6, color: INK });
    this.shock.circle(0, shockLength, 1.4).fill(CREAM).stroke({ width: 0.6, color: INK });

    this.fork.clear();
    line(this.fork, A.steeringHead, front, 4.6, INK);
    line(this.fork, A.steeringHead, front, 2.8, STEEL);
    const slider = along(A.steeringHead, front, 0.62);
    line(this.fork, slider, front, 5, INK);
    line(this.fork, slider, front, 3, TEAL);
    for (let i = 0; i < 5; i++) {
      const rib = along(A.steeringHead, front, 0.22 + i * 0.045);
      const dx = front.x - A.steeringHead.x, dy = front.y - A.steeringHead.y;
      const len = Math.hypot(dx, dy);
      line(this.fork, { x: rib.x - dy / len * 2.2, y: rib.y + dx / len * 2.2 },
        { x: rib.x + dy / len * 2.2, y: rib.y - dx / len * 2.2 }, 1.25, INK);
    }
    this.fork.circle(front.x, front.y, 2.2).fill(CREAM).stroke({ width: 0.8, color: INK });
    this.fork.circle(front.x, front.y, 0.7).fill(INK);
    const fender = along(A.steeringHead, front, 0.34);
    this.frontFender.position.set(fender.x, fender.y);
    this.fenderMount.clear();
    line(this.fenderMount, fender, { x: fender.x - 3, y: fender.y - 2 }, 1.8, INK);
    this.sprocket.position.set(rear.x, rear.y);
    this.sprocket.rotation = -(snapshot.rearWheel.angle - snapshot.chassis.angle);
    const outline = chainOutline(rear);
    this.chain.clear().poly(outline.flatMap(p => [p.x, p.y]), true).stroke({ width: 1.55, color: INK, join: 'round' });
    this.chain.poly(outline.flatMap(p => [p.x, p.y]), true).stroke({ width: 0.7, color: STEEL, join: 'round' });
    outline.forEach((p, i) => { if (i % 2 === 0) this.chain.circle(p.x, p.y, 0.38).fill(INK); });
    this.rider.sync(leanInput, Math.max(snapshot.suspensionCompressionRear, snapshot.suspensionCompressionFront), dt);
  }
}
