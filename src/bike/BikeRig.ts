import { Container, Sprite } from 'pixi.js';
import type { GameArtwork } from '../artwork/GameArtwork';
import { PHYSICS_CONFIG } from '../config/physicsConfig';
import type { PhysicsSnapshot } from '../physics/PhysicsWorld';
import { HeadDynamics } from './HeadDynamics';
import { RIDER_SPRITE as R } from './riderSpriteGeometry';

export interface BikeSyncControls {
  throttle: boolean;
  brake: boolean;
}

/** Four visible pieces: integrated body/suspension, head, and two independent wheels. */
export class BikeRig {
  readonly root = new Container();
  readonly rearWheelLayer = new Container();
  readonly frontWheelLayer = new Container();
  readonly chassisLayer = new Container();
  private readonly headPivot = new Container();
  private readonly headMotion = new HeadDynamics();

  constructor(art: GameArtwork) {
    this.root.label = 'motorcycle';
    this.chassisLayer.label = 'motorcycle:fixed-body-and-suspension';
    this.root.addChild(this.rearWheelLayer, this.frontWheelLayer, this.chassisLayer);
    for (const [index, layer] of [this.rearWheelLayer, this.frontWheelLayer].entries()) {
      const wheel = new Sprite(art['rider-wheel']);
      wheel.label = `motorcycle:${index === 0 ? 'rear' : 'front'}-wheel`;
      wheel.pivot.set(R.wheelCenter.x, R.wheelCenter.y);
      wheel.scale.set(PHYSICS_CONFIG.wheels.radius * PHYSICS_CONFIG.world.pixelsPerMeter / R.wheelRadius);
      layer.addChild(wheel);
    }
    const body = new Sprite(art['rider-body']);
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

  sync(snapshot: PhysicsSnapshot, _leanInput: -1 | 0 | 1, dt: number, _controls?: BikeSyncControls): void {
    const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;
    const rx = snapshot.rearWheel.x * ppm, ry = -snapshot.rearWheel.y * ppm;
    const fx = snapshot.frontWheel.x * ppm, fy = -snapshot.frontWheel.y * ppm;
    this.rearWheelLayer.position.set(rx, ry);
    this.frontWheelLayer.position.set(fx, fy);
    this.rearWheelLayer.rotation = -snapshot.rearWheel.angle;
    this.frontWheelLayer.rotation = -snapshot.frontWheel.angle;
    // Fit the rigid drawing to the measured axle frame, so fixed fork/axle art never detaches.
    // Uniform scaling preserves proportions; no fork or shock is separately animated.
    const nativeDx = R.frontAxle.x - R.rearAxle.x, nativeDy = R.frontAxle.y - R.rearAxle.y;
    const scale = Math.hypot(fx - rx, fy - ry) / Math.hypot(nativeDx, nativeDy);
    this.chassisLayer.position.set(rx, ry);
    this.chassisLayer.rotation = Math.atan2(fy - ry, fx - rx) - Math.atan2(nativeDy, nativeDx);
    this.chassisLayer.scale.set(scale);
    this.headPivot.rotation = this.headMotion.update({
      velocityX: snapshot.chassisVelX,
      velocityY: snapshot.chassisVelY,
      pitch: snapshot.chassis.angle,
      angularVelocity: snapshot.chassisAngularVelocity,
      grounded: snapshot.rearGrounded || snapshot.frontGrounded || snapshot.chassisGrounded,
      landing: snapshot.justLandedStrength,
      obstacleHit: snapshot.justHitObstacleStrength,
    }, dt);
  }
}
