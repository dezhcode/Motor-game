import { Container, Sprite } from 'pixi.js';
import type { GameArtwork } from '../artwork/GameArtwork';
import { PHYSICS_CONFIG } from '../config/physicsConfig';
import type { PhysicsSnapshot } from '../physics/PhysicsWorld';
import { HeadDynamics } from './HeadDynamics';
import { RIDER_SPRITE as R } from './riderSpriteGeometry';
import { carSprite, isCar, vehiclePhysics, type VehicleId } from '../vehicles/vehicleCatalog';

export interface BikeSyncControls {
  throttle: boolean;
  brake: boolean;
}

/** Sprite rig shared by the motorcycle and jeep; road wheels rotate independently. */
export class BikeRig {
  readonly root = new Container();
  readonly rearWheelLayer = new Container();
  readonly frontWheelLayer = new Container();
  readonly chassisLayer = new Container();
  private readonly headPivot = new Container();
  private readonly headMotion = new HeadDynamics();
  private readonly wheels: ReturnType<typeof vehiclePhysics>['wheels'];
  private readonly axleAngleOffset: number;
  private readonly nominalAxleAngle: number;

  constructor(art: GameArtwork, private readonly vehicleId: VehicleId = 'motorcycle') {
    const jeep = isCar(vehicleId), J = carSprite(vehicleId);
    const cfg = vehiclePhysics(vehicleId);
    this.wheels = cfg.wheels;
    const geometry = jeep ? J : R;
    const nativeDx = geometry.frontAxle.x - geometry.rearAxle.x;
    const nativeDy = geometry.frontAxle.y - geometry.rearAxle.y;
    const axleDx = this.wheels.frontOffsetX - this.wheels.rearOffsetX;
    const axleDy = this.wheels.rearOffsetY - this.wheels.frontOffsetY;
    this.nominalAxleAngle = Math.atan2(axleDy, axleDx);
    this.axleAngleOffset = this.nominalAxleAngle - Math.atan2(nativeDy, nativeDx);
    this.chassisLayer.scale.set(Math.hypot(axleDx, axleDy) * PHYSICS_CONFIG.world.pixelsPerMeter / Math.hypot(nativeDx, nativeDy));
    this.root.label = vehicleId;
    this.chassisLayer.label = 'motorcycle:fixed-body-and-suspension';
    this.root.addChild(this.rearWheelLayer, this.frontWheelLayer, this.chassisLayer);
    for (const [index, layer] of [this.rearWheelLayer, this.frontWheelLayer].entries()) {
      const wheel = new Sprite(art[jeep ? 'jeep-wheel' : 'rider-wheel']);
      wheel.label = `motorcycle:${index === 0 ? 'rear' : 'front'}-wheel`;
      const center = jeep ? J.wheelCenter : R.wheelCenter;
      wheel.pivot.set(center.x, center.y);
      wheel.scale.set(cfg.wheels.radius * PHYSICS_CONFIG.world.pixelsPerMeter / (jeep ? J.wheelRadius : R.wheelRadius));
      layer.addChild(wheel);
    }
    const body = new Sprite(art[vehicleId === 'buggy' ? 'buggy-body' : jeep ? 'jeep-body' : vehicleId === 'sport' ? 'sport-body' : 'rider-body']);
    if (jeep) {
      this.chassisLayer.addChild(body);
      this.chassisLayer.pivot.set(J.rearAxle.x, J.rearAxle.y);
      return;
    }
    body.label = 'motorcycle:body-no-scarf';
    const head = new Sprite(art['rider-head']);
    head.label = 'rider:head';
    head.scale.set(R.headScale.x, R.headScale.y);
    head.position.set(R.headOffset.x - R.neckPivot.x, R.headOffset.y - R.neckPivot.y);
    this.headPivot.position.set(R.neckPivot.x, R.neckPivot.y);
    this.headPivot.addChild(head);
    this.chassisLayer.addChild(body, this.headPivot);
    this.chassisLayer.pivot.set(R.rearAxle.x, R.rearAxle.y);
  }

  reset(): void {
    this.headMotion.reset();
    this.headPivot.rotation = 0;
  }

  sync(snapshot: PhysicsSnapshot, _leanInput: -1 | 0 | 1, dt: number, controls?: BikeSyncControls): void {
    const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;
    const rx = snapshot.rearWheel.x * ppm, ry = -snapshot.rearWheel.y * ppm;
    const fx = snapshot.frontWheel.x * ppm, fy = -snapshot.frontWheel.y * ppm;
    this.rearWheelLayer.position.set(rx, ry);
    this.frontWheelLayer.position.set(fx, fy);
    this.rearWheelLayer.rotation = -snapshot.rearWheel.angle;
    this.frontWheelLayer.rotation = -snapshot.frontWheel.angle;
    const chassis = snapshot.chassis;
    const cos = Math.cos(chassis.angle), sin = Math.sin(chassis.angle);
    const sprungX = (chassis.x + this.wheels.rearOffsetX * cos - this.wheels.rearOffsetY * sin) * ppm;
    const sprungY = -(chassis.y + this.wheels.rearOffsetX * sin + this.wheels.rearOffsetY * cos) * ppm;
    // The body mostly follows the sprung chassis; a little axle motion keeps the painted fork registered.
    this.chassisLayer.position.set(sprungX + (rx - sprungX) * .22, sprungY + (ry - sprungY) * .22);
    const sprungAngle = -chassis.angle + this.axleAngleOffset;
    const wheelLine = Math.atan2(fy - ry, fx - rx);
    const nominalLine = -chassis.angle + this.nominalAxleAngle;
    const delta = wheelLine - nominalLine;
    this.chassisLayer.rotation = sprungAngle + Math.atan2(Math.sin(delta), Math.cos(delta)) * .22;
    if (isCar(this.vehicleId)) return;
    this.headPivot.rotation = this.headMotion.update({
      velocityX: snapshot.chassisVelX,
      velocityY: snapshot.chassisVelY,
      pitch: snapshot.chassis.angle,
      angularVelocity: snapshot.chassisAngularVelocity,
      grounded: snapshot.rearGrounded || snapshot.frontGrounded || snapshot.chassisGrounded,
      landing: snapshot.justLandedStrength,
      obstacleHit: snapshot.justHitObstacleStrength,
      throttle: controls?.throttle ?? false,
      brake: controls?.brake ?? false,
    }, dt);
  }
}
