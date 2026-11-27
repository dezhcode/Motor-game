import { Container, Graphics } from 'pixi.js';
import type { GameArtwork } from '../artwork/GameArtwork';
import { flatPart } from '../artwork/vectorArtwork';
import { wheelToChassisPixels } from '../artwork/artworkGeometry';
import { PHYSICS_CONFIG } from '../config/physicsConfig';
import type { PhysicsSnapshot } from '../physics/PhysicsWorld';
import { along, BIKE_ATTACHMENTS as A, chainOutline, type BikePoint } from './bikeGeometry';
import { RiderRig } from './RiderRig';

const INK = 0x141e26,
  TEAL = 0x14a89d,
  CREAM = 0xfff3d4,
  STEEL = 0xc5d6da,
  GOLD = 0xe89b3c;

function line(g: Graphics, a: BikePoint, b: BikePoint, width: number, color: number) {
  g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width, color, cap: 'round', join: 'round' });
}

export interface BikeSyncControls {
  throttle: boolean;
  brake: boolean;
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
    const radiusScale = (PHYSICS_CONFIG.wheels.radius * PHYSICS_CONFIG.world.pixelsPerMeter) / 16.28;
    for (const [index, layer] of [this.rearWheelLayer, this.frontWheelLayer].entries()) {
      const wheel = flatPart('wheel', `motorcycle:${index === 0 ? 'rear' : 'front'}-wheel`);
      wheel.scale.set(radiusScale);
      layer.addChild(wheel);
    }
    const frame = flatPart('frame', 'motorcycle:frame');
    const engine = flatPart('engine', 'motorcycle:engine');
    engine.position.set(-1, -8);
    const tank = flatPart('tank', 'motorcycle:tank');
    tank.position.set(3, -22);
    const seat = flatPart('seat', 'motorcycle:seat');
    seat.position.set(-20, -20);
    const rearFender = flatPart('rearFender', 'motorcycle:rear-fender');
    rearFender.position.set(-29, -19);
    const lamp = flatPart('headlamp', 'motorcycle:headlamp');
    lamp.position.set(26, -24);

    const exhaust = new Graphics();
    exhaust.label = 'motorcycle:exhaust';
    // Gold/titanium header pipe looping into sculpted tapered aluminum silencer with carbon end cap
    exhaust
      .moveTo(6, -15)
      .bezierCurveTo(15, -16, 14, -9, 8, -10)
      .bezierCurveTo(-1, -11.5, -7, -14.5, -15, -14)
      .stroke({ width: 3.0, color: INK, cap: 'round' });
    exhaust
      .moveTo(6, -15)
      .bezierCurveTo(15, -16, 14, -9, 8, -10)
      .bezierCurveTo(-1, -11.5, -7, -14.5, -15, -14)
      .stroke({ width: 1.5, color: GOLD, cap: 'round' });
    exhaust
      .poly([-15, -16, -32.5, -17.5, -34, -12.5, -15, -11.5], true)
      .fill(STEEL)
      .stroke({ width: 1.4, color: INK, join: 'round' });
    exhaust.moveTo(-16, -15.3).lineTo(-31.5, -16.6).stroke({ width: 0.9, color: 0xf4fafb, cap: 'round' });
    exhaust
      .poly([-31.5, -17.3, -34.2, -17.1, -34.8, -12.8, -32, -12.6], true)
      .fill(0x27333d)
      .stroke({ width: 1.0, color: INK, join: 'round' });

    const bars = new Graphics();
    bars.label = 'motorcycle:handlebars-and-pegs';
    const stem = { x: 20, y: -29 };
    line(bars, A.steeringHead, stem, 2.8, INK);
    line(bars, A.steeringHead, stem, 1.3, STEEL);
    line(bars, stem, A.farGrip, 1.8, INK);
    line(bars, stem, A.nearGrip, 2.7, INK);
    line(bars, stem, A.nearGrip, 1.1, GOLD);
    bars.moveTo(19, -30).bezierCurveTo(31, -28, 30, -18, 19, -12).stroke({ width: 0.7, color: INK });
    line(bars, { x: -11, y: 2 }, { x: -2, y: 2 }, 2.4, INK);
    for (const foot of [A.nearFoot, A.farFoot]) {
      line(bars, { x: foot.x - 2, y: foot.y + 1 }, { x: foot.x + 3, y: foot.y + 1 }, 1.2, STEEL);
    }

    const skid = new Graphics();
    skid.moveTo(-11, 1).lineTo(-7, 4).lineTo(9, 4).lineTo(13, -1).stroke({ width: 2.7, color: INK, join: 'round' });
    skid.moveTo(-9, 2).lineTo(-6, 3).lineTo(8, 3).lineTo(11, 0).stroke({ width: 1.1, color: CREAM });

    this.sprocket.circle(0, 0, 4.8).fill(STEEL).stroke({ width: 0.9, color: INK });
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      this.sprocket.circle(Math.cos(a) * 3.1, Math.sin(a) * 3.1, 0.65).fill(INK);
    }
    this.sprocket.circle(0, 0, 1.6).fill(GOLD).stroke({ width: 0.7, color: INK });

    for (const [name, object] of Object.entries({
      swingarm: this.swingarm,
      fork: this.fork,
      shock: this.shock,
      chain: this.chain,
      sprocket: this.sprocket,
    })) {
      object.label = `motorcycle:${name}`;
    }

    this.chassisLayer.addChild(
      this.rider.farLimbs,
      exhaust,
      this.swingarm,
      this.shock,
      frame,
      rearFender,
      engine,
      skid,
      this.sprocket,
      this.chain,
      this.fork,
      this.fenderMount,
      this.frontFender,
      tank,
      seat,
      lamp,
      bars,
      this.rider.torsoLayer,
      this.rider.nearLimbs,
      this.rider.helmetLayer
    );
  }

  public reset(): void {
    this.rider.reset();
  }

  sync(
    snapshot: PhysicsSnapshot,
    leanInput: -1 | 0 | 1,
    dt: number,
    controls?: BikeSyncControls
  ): void {
    const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;
    this.rearWheelLayer.position.set(snapshot.rearWheel.x * ppm, -snapshot.rearWheel.y * ppm);
    this.rearWheelLayer.rotation = -snapshot.rearWheel.angle;
    this.frontWheelLayer.position.set(snapshot.frontWheel.x * ppm, -snapshot.frontWheel.y * ppm);
    this.frontWheelLayer.rotation = -snapshot.frontWheel.angle;
    this.chassisLayer.position.set(snapshot.chassis.x * ppm, -snapshot.chassis.y * ppm);
    this.chassisLayer.rotation = -snapshot.chassis.angle;

    const rear = wheelToChassisPixels(snapshot.rearWheel, snapshot.chassis, ppm);
    const front = wheelToChassisPixels(snapshot.frontWheel, snapshot.chassis, ppm);

    // Swingarm connecting chassis pivot cleanly to physical rear wheel axle
    this.swingarm.clear();
    line(this.swingarm, A.rearPivot, rear, 5.2, INK);
    line(this.swingarm, A.rearPivot, rear, 3.0, STEEL);
    line(this.swingarm, { x: A.rearPivot.x, y: A.rearPivot.y - 0.8 }, { x: rear.x, y: rear.y - 0.6 }, 0.9, 0xf2fafb);
    this.swingarm.circle(rear.x, rear.y, 2.2).fill(GOLD).stroke({ width: 0.8, color: INK });
    this.swingarm.circle(rear.x, rear.y, 0.85).fill(INK);
    this.swingarm.circle(A.rearPivot.x, A.rearPivot.y, 2.2).fill(TEAL).stroke({ width: 0.8, color: INK });

    // Rear monoshock telescoping cleanly between frame shockTop and swingarm linkage
    const shockEnd = along(A.rearPivot, rear, 0.59);
    const shockLength = Math.max(8, Math.hypot(shockEnd.x - A.shockTop.x, shockEnd.y - A.shockTop.y));
    this.shock.clear();
    this.shock.position.set(A.shockTop.x, A.shockTop.y);
    this.shock.rotation = Math.atan2(shockEnd.y - A.shockTop.y, shockEnd.x - A.shockTop.x) - Math.PI / 2;
    line(this.shock, { x: 0, y: 0 }, { x: 0, y: shockLength }, 3.0, INK);
    line(this.shock, { x: 0, y: 0 }, { x: 0, y: shockLength }, 1.25, STEEL);
    for (let i = 0; i < 6; i++) {
      this.shock
        .moveTo(-2.1, 2 + (i * (shockLength - 5)) / 6)
        .lineTo(2.1, 3.3 + (i * (shockLength - 5)) / 6)
        .stroke({ width: 1.4, color: INK });
      this.shock
        .moveTo(-1.8, 2 + (i * (shockLength - 5)) / 6)
        .lineTo(1.8, 3.3 + (i * (shockLength - 5)) / 6)
        .stroke({ width: 0.75, color: 0xf5c43d });
    }
    this.shock.circle(0, 0, 1.5).fill(GOLD).stroke({ width: 0.7, color: INK });
    this.shock.circle(0, shockLength, 1.5).fill(CREAM).stroke({ width: 0.7, color: INK });

    // USD inverted forks: rigid anodized outer stanchions + telescoping chrome lower sliders
    this.fork.clear();
    const forkDx = front.x - A.steeringHead.x;
    const forkDy = front.y - A.steeringHead.y;
    const forkLen = Math.max(12, Math.hypot(forkDx, forkDy));
    const forkUx = forkDx / forkLen;
    const forkUy = forkDy / forkLen;
    const outerLen = Math.min(forkLen - 4.5, 22.0);
    const lowerStart = {
      x: A.steeringHead.x + forkUx * outerLen,
      y: A.steeringHead.y + forkUy * outerLen,
    };

    line(this.fork, A.steeringHead, lowerStart, 5.2, INK);
    line(this.fork, A.steeringHead, lowerStart, 3.2, GOLD);
    line(this.fork, A.steeringHead, lowerStart, 1.0, 0xffdf99);
    line(this.fork, lowerStart, front, 4.4, INK);
    line(this.fork, lowerStart, front, 2.5, STEEL);

    // Lower fork guard rides with front axle & overlaps fork seal cleanly
    const guardTop = { x: front.x - forkUx * 16.5, y: front.y - forkUy * 16.5 };
    const guardBot = { x: front.x - forkUx * 4.5, y: front.y - forkUy * 4.5 };
    line(this.fork, { x: guardTop.x + 1.4, y: guardTop.y - 0.6 }, { x: guardBot.x + 1.4, y: guardBot.y - 0.6 }, 2.6, INK);
    line(this.fork, { x: guardTop.x + 1.4, y: guardTop.y - 0.6 }, { x: guardBot.x + 1.4, y: guardBot.y - 0.6 }, 1.4, CREAM);

    // Front brake caliper attached to lower fork leg near axle
    this.fork.roundRect(front.x - 4.4, front.y - 2.6, 3.8, 4.2, 1.1).fill(0xd9613b).stroke({ width: 0.7, color: INK });
    for (let i = 0; i < 3; i++) {
      const clampT = 4.2 + i * 2.5;
      const rib = { x: A.steeringHead.x + forkUx * clampT, y: A.steeringHead.y + forkUy * clampT };
      line(
        this.fork,
        { x: rib.x - forkUy * 2.5, y: rib.y + forkUx * 2.5 },
        { x: rib.x + forkUy * 2.5, y: rib.y - forkUx * 2.5 },
        1.4,
        INK
      );
    }
    this.fork.circle(front.x, front.y, 2.4).fill(GOLD).stroke({ width: 0.85, color: INK });
    this.fork.circle(front.x, front.y, 0.8).fill(INK);

    // High front fender mounted rigidly to lower triple clamp so it always clears the front tire
    const fender = {
      x: A.steeringHead.x + forkUx * 8.2,
      y: A.steeringHead.y + forkUy * 8.2,
    };
    const forkRakeOffset = Math.atan2(forkDx, forkDy) - 0.345;
    this.frontFender.position.set(fender.x, fender.y);
    this.frontFender.rotation = -forkRakeOffset * 0.6;
    this.fenderMount.clear();
    line(this.fenderMount, { x: A.steeringHead.x + forkUx * 6.5, y: A.steeringHead.y + forkUy * 6.5 }, fender, 2.2, INK);

    // Sprocket & exact external tangent chain
    this.sprocket.position.set(rear.x, rear.y);
    this.sprocket.rotation = -(snapshot.rearWheel.angle - snapshot.chassis.angle);
    const outline = chainOutline(rear);
    this.chain.clear().poly(outline.flatMap((p) => [p.x, p.y]), true).stroke({ width: 1.55, color: INK, join: 'round' });
    this.chain.poly(outline.flatMap((p) => [p.x, p.y]), true).stroke({ width: 0.7, color: STEEL, join: 'round' });
    outline.forEach((p, i) => {
      if (i % 2 === 0) this.chain.circle(p.x, p.y, 0.38).fill(INK);
    });

    this.rider.sync(
      {
        leanInput,
        compression: Math.max(snapshot.suspensionCompressionRear, snapshot.suspensionCompressionFront),
        throttle: controls?.throttle ?? false,
        brake: controls?.brake ?? false,
        chassisVelX: snapshot.chassisVelX,
        chassisAngle: snapshot.chassis.angle,
        airborne: !snapshot.rearGrounded && !snapshot.frontGrounded,
        landingImpulse: snapshot.justLandedStrength,
      },
      undefined,
      dt
    );
  }
}
