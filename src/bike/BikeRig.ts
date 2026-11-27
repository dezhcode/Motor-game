import { Container, Sprite } from 'pixi.js';
import type { GameArtwork } from '../artwork/GameArtwork';
import { wheelToChassisPixels } from '../artwork/artworkGeometry';
import { PHYSICS_CONFIG } from '../config/physicsConfig';
import type { PhysicsSnapshot } from '../physics/PhysicsWorld';

type Point = { x: number; y: number };

/** Independent painted parts remain attached to the physical wheel centers. */
export class BikeRig {
  public readonly root = new Container();
  public readonly rearWheelLayer = new Container();
  public readonly frontWheelLayer = new Container();
  public readonly chassisLayer = new Container();
  public readonly swingarmSlot = new Container();
  public readonly suspensionSlot = new Container();
  public readonly frameSlot = new Container();
  public readonly riderSlot = new Container();

  private readonly swingarm: Sprite;
  private readonly fork: Sprite;
  private readonly shock: Sprite;
  private riderLeanVisual = 0;

  constructor(art: GameArtwork) {
    this.root.addChild(this.rearWheelLayer, this.frontWheelLayer, this.chassisLayer);
    this.chassisLayer.addChild(this.swingarmSlot, this.suspensionSlot, this.riderSlot, this.frameSlot);
    const diameter = PHYSICS_CONFIG.wheels.radius * PHYSICS_CONFIG.world.pixelsPerMeter * 2;
    for (const layer of [this.rearWheelLayer, this.frontWheelLayer]) {
      const wheel = new Sprite(art['bike-wheel']);
      wheel.anchor.set(0.5);
      wheel.width = diameter;
      wheel.height = diameter;
      layer.addChild(wheel);
    }
    const chassis = new Sprite(art['bike-chassis']);
    chassis.anchor.set(0.5, 0.94);
    chassis.width = 91;
    chassis.height = 91 * chassis.texture.height / chassis.texture.width;
    this.frameSlot.addChild(chassis);
    this.swingarm = new Sprite(art['bike-swingarm']);
    this.fork = new Sprite(art['bike-fork']);
    this.shock = new Sprite(art['bike-shock']);
    this.swingarmSlot.addChild(this.swingarm);
    this.suspensionSlot.addChild(this.fork, this.shock);

    const rider = new Sprite(art.rider);
    rider.anchor.set(0.18, 0.55); // Hip pivot inside the trimmed artwork.
    rider.height = 60;
    rider.width = rider.height * rider.texture.width / rider.texture.height;
    this.riderSlot.position.set(-14, -18);
    this.riderSlot.addChild(rider);
  }

  private fitVerticalPart(sprite: Sprite, from: Point, to: Point, minimumWidth: number): void {
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    sprite.anchor.set(0.5, 0.03);
    sprite.position.set(from.x, from.y);
    sprite.height = length / 0.94; // Eye centers lie 3% and 97% down each image.
    sprite.width = Math.max(minimumWidth, sprite.height * sprite.texture.width / sprite.texture.height);
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
    const length = Math.hypot(rear.x - pivot.x, rear.y - pivot.y);
    this.swingarm.anchor.set(0.077, 0.665);
    this.swingarm.position.set(pivot.x, pivot.y);
    this.swingarm.width = length / 0.868;
    this.swingarm.height = this.swingarm.width * this.swingarm.texture.height / this.swingarm.texture.width;
    this.swingarm.rotation = Math.atan2(rear.y - pivot.y, rear.x - pivot.x);
    this.fitVerticalPart(this.fork, { x: 22, y: -24 }, front, 4.6);
    this.fitVerticalPart(this.shock, { x: -15, y: -15 }, {
      x: pivot.x + (rear.x - pivot.x) * 0.58,
      y: pivot.y + (rear.y - pivot.y) * 0.58,
    }, 3.6);

    const targetLean = leanInput * PHYSICS_CONFIG.balance.riderLeanVisualAngle;
    this.riderLeanVisual += (targetLean - this.riderLeanVisual) * (1 - Math.exp(-12 * dt));
    this.riderSlot.rotation = this.riderLeanVisual;
  }
}
