import { Container, Graphics, Sprite } from 'pixi.js';
import type { GameArtwork } from '../artwork/GameArtwork';
import { wheelToChassisPixels } from '../artwork/artworkGeometry';
import { PHYSICS_CONFIG } from '../config/physicsConfig';
import type { PhysicsSnapshot } from '../physics/PhysicsWorld';
import { RiderRig } from './RiderRig';

type Point = { x: number; y: number };

/** Mechanical parts and rider bones are independent layers, calibrated in chassis-local pixels. */
export class BikeRig {
  public readonly root = new Container();
  public readonly rearWheelLayer = new Container();
  public readonly frontWheelLayer = new Container();
  public readonly chassisLayer = new Container();
  private readonly swingarm: Sprite;
  private readonly fork: Sprite;
  private readonly shock: Sprite;
  private readonly frontFender: Sprite;
  private readonly chain = new Graphics();
  private readonly fenderBraces = new Graphics();
  private readonly sprocket = new Graphics();
  private readonly rider: RiderRig;

  constructor(art: GameArtwork) {
    this.root.label = 'motorcycle';
    this.chassisLayer.label = 'motorcycle:chassis';
    this.root.addChild(this.rearWheelLayer, this.frontWheelLayer, this.chassisLayer);
    const diameter = PHYSICS_CONFIG.wheels.radius * PHYSICS_CONFIG.world.pixelsPerMeter * 2;
    for (const [i, layer] of [this.rearWheelLayer, this.frontWheelLayer].entries()) {
      const wheel = new Sprite(art['bike-wheel']);
      wheel.label = `motorcycle:${i === 0 ? 'rear' : 'front'}-wheel`;
      wheel.anchor.set(0.5);
      wheel.width = diameter;
      wheel.height = diameter;
      layer.addChild(wheel);
    }
    this.rider = new RiderRig(art);
    this.swingarm = new Sprite(art['bike-swingarm']);
    this.fork = new Sprite(art['bike-fork']);
    this.shock = new Sprite(art['bike-shock']);
    this.frontFender = this.part(art['front-fender-v2'], 34, 7, 0, 0, 'front-fender');
    const frame = this.part(art['frame-v2'], 60.14, 29.52, -13, 0, 'frame');
    frame.anchor.set(0.346, 0.892); // Swingarm pivot and steering head calibrated to their bearing centers.
    const engine = this.part(art['engine-v2'], 20, 24, -1, -9, 'engine');
    const tank = this.part(art['tank-v2'], 33, 12, 3, -24, 'tank');
    const seat = this.part(art['seat-v2'], 26, 5, -18, -21, 'seat');
    const rearFender = this.part(art['rear-fender-v2'], 32, 6, -34, -16, 'rear-fender');
    const lamp = this.part(art['headlamp-v2'], 9, 10, 27, -28, 'headlamp');
    const handlebar = new Graphics();
    handlebar.label = 'motorcycle:handlebar-and-footpegs';
    handlebar.moveTo(22, -25).lineTo(20, -34).lineTo(17, -35).lineTo(13, -36)
      .stroke({ width: 1.3, color: 0xb27c4b, cap: 'round', join: 'round' });
    handlebar.moveTo(13, -36).lineTo(19, -35).stroke({ width: 2.0, color: 0x27343a, cap: 'round' });
    handlebar.moveTo(18, -34).quadraticCurveTo(26, -20, 17, -11)
      .stroke({ width: 0.45, color: 0x354047 });
    handlebar.moveTo(-9, 2).lineTo(0, 2).stroke({ width: 2.6, color: 0x354047, cap: 'round' });
    this.sprocket.circle(0, 0, 5).stroke({ width: 1.2, color: 0xb5a27c });
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      this.sprocket.moveTo(Math.cos(angle) * 2, Math.sin(angle) * 2).lineTo(Math.cos(angle) * 4.7, Math.sin(angle) * 4.7);
    }
    this.sprocket.stroke({ width: 0.7, color: 0x6b5d43 });
    this.chassisLayer.addChild(
      this.rider.farLimbs, this.swingarm, this.shock, frame, rearFender,
      engine, this.chain, this.sprocket, this.fork, this.fenderBraces, this.frontFender, tank, seat, lamp, handlebar,
      this.rider.torsoLayer, this.rider.nearLimbs, this.rider.helmetLayer
    );
  }

  private part(texture: GameArtwork[keyof GameArtwork], width: number, height: number, x: number, y: number, label: string): Sprite {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.width = width;
    sprite.height = height;
    sprite.position.set(x, y);
    sprite.label = `motorcycle:${label}`;
    return sprite;
  }

  private fitVerticalPart(sprite: Sprite, from: Point, to: Point, width: number): void {
    sprite.anchor.set(0.5, 0.03);
    sprite.position.set(from.x, from.y);
    sprite.height = Math.hypot(to.x - from.x, to.y - from.y) / 0.94;
    sprite.width = width;
    sprite.rotation = Math.atan2(to.y - from.y, to.x - from.x) - Math.PI / 2;
  }

  public sync(snapshot: PhysicsSnapshot, leanInput: -1 | 0 | 1, dt: number): void {
    const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;
    this.rearWheelLayer.position.set(snapshot.rearWheel.x * ppm, -snapshot.rearWheel.y * ppm);
    this.rearWheelLayer.rotation = -snapshot.rearWheel.angle;
    this.frontWheelLayer.position.set(snapshot.frontWheel.x * ppm, -snapshot.frontWheel.y * ppm);
    this.frontWheelLayer.rotation = -snapshot.frontWheel.angle;
    this.chassisLayer.position.set(snapshot.chassis.x * ppm, -snapshot.chassis.y * ppm);
    this.chassisLayer.rotation = -snapshot.chassis.angle;
    const rear = wheelToChassisPixels(snapshot.rearWheel, snapshot.chassis, ppm);
    const front = wheelToChassisPixels(snapshot.frontWheel, snapshot.chassis, ppm);
    const pivot = { x: -13, y: 0 };
    this.swingarm.anchor.set(0.077, 0.665);
    this.swingarm.position.set(pivot.x, pivot.y);
    this.swingarm.width = Math.hypot(rear.x - pivot.x, rear.y - pivot.y) / 0.868;
    this.swingarm.height = 7.5;
    this.swingarm.rotation = Math.atan2(rear.y - pivot.y, rear.x - pivot.x);
    this.fitVerticalPart(this.fork, { x: 22, y: -25 }, front, 4.1);
    this.fitVerticalPart(this.shock, { x: -17, y: -14 }, {
      x: pivot.x + (rear.x - pivot.x) * 0.58,
      y: pivot.y + (rear.y - pivot.y) * 0.58,
    }, 3.8);
    this.frontFender.position.set(front.x + 2, front.y - PHYSICS_CONFIG.wheels.radius * ppm - 7);
    const fenderY = this.frontFender.y;
    const forkFraction = (fenderY + 25) / (front.y + 25);
    const forkAtFenderX = 22 + (front.x - 22) * forkFraction;
    this.fenderBraces.clear().moveTo(forkAtFenderX, fenderY + 9)
      .lineTo(this.frontFender.x - 5, fenderY + 1)
      .moveTo(forkAtFenderX, fenderY + 8).lineTo(this.frontFender.x + 8, fenderY + 1)
      .stroke({ width: 0.8, color: 0x6d6653, cap: 'round' });
    this.sprocket.position.set(rear.x, rear.y);
    this.sprocket.rotation = -(snapshot.rearWheel.angle - snapshot.chassis.angle);
    this.chain.clear().moveTo(-10, -2).lineTo(rear.x, rear.y - 4.5)
      .moveTo(-10, 3).quadraticCurveTo((rear.x - 10) * 0.5, rear.y + 6, rear.x, rear.y + 4.5)
      .stroke({ width: 1.1, color: 0x514c3e, cap: 'round' });
    this.rider.sync(leanInput, Math.max(snapshot.suspensionCompressionRear, snapshot.suspensionCompressionFront), dt);
  }
}
