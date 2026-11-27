import { Container, Graphics } from 'pixi.js';
import { flatPart } from '../artwork/vectorArtwork';
import { riderPose, solveTwoBone, RIDER_BONES, type RigPoint } from '../artwork/rigGeometry';

export interface RiderMotionInput {
  leanInput: -1 | 0 | 1;
  compression: number;
  throttle?: boolean;
  brake?: boolean;
  chassisVelX?: number;
  chassisAngle?: number;
  airborne?: boolean;
  landingImpulse?: number;
}

/** Rigid, authored 2D limb segments: no bitmap stretching and no guessed alpha-margin anchors. */
export class RiderRig {
  readonly farLimbs = new Container();
  readonly torsoLayer = new Container();
  readonly nearLimbs = new Container();
  readonly helmetLayer = new Container();
  private readonly torso = flatPart('torso', 'rider:jersey');
  private readonly helmet = flatPart('helmet', 'rider:helmet');
  private readonly neck = new Graphics();
  private readonly arms: Array<{ upper: Graphics; lower: Graphics; glove: Graphics }> = [];
  private readonly legs: Array<{ upper: Graphics; lower: Graphics; boot: Graphics }> = [];

  private lean = 0;
  private surge = 0;
  private smoothCompression = 0;
  private landingBob = 0;
  private landingBobVel = 0;
  private headPitch = 0;

  constructor() {
    this.farLimbs.label = 'rider:far-limbs';
    this.nearLimbs.label = 'rider:near-limbs';
    this.torsoLayer.label = 'rider:torso';
    this.helmetLayer.label = 'rider:head';
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? 'far' : 'near';
      const parent = i === 0 ? this.farLimbs : this.nearLimbs;
      const leg = {
        upper: flatPart('thigh', `rider:${side}-thigh`),
        lower: flatPart('shin', `rider:${side}-shin`),
        boot: flatPart('boot', `rider:${side}-boot`),
      };
      const arm = {
        upper: flatPart('upperArm', `rider:${side}-upper-arm`),
        lower: flatPart('forearm', `rider:${side}-forearm`),
        glove: flatPart('glove', `rider:${side}-glove`),
      };
      parent.addChild(leg.upper, leg.lower, leg.boot, arm.upper, arm.lower, arm.glove);
      if (i === 0) {
        for (const graphic of Object.values(leg).concat(Object.values(arm))) {
          graphic.tint = 0x9eb8b8;
        }
      }
      this.legs.push(leg);
      this.arms.push(arm);
    }
    this.torso.scale.set(1, 1);
    this.torsoLayer.addChild(this.torso);
    this.neck.label = 'rider:neck-and-balaclava';
    this.helmetLayer.addChild(this.neck, this.helmet);
  }

  private bone(graphic: Graphics, from: RigPoint, to: RigPoint): void {
    graphic.position.set(from.x, from.y);
    graphic.rotation = Math.atan2(to.y - from.y, to.x - from.x) - Math.PI / 2;
    // Authored limb length equals solved bone length; scale stays strictly 1.
  }

  public reset(): void {
    this.lean = 0;
    this.surge = 0;
    this.smoothCompression = 0;
    this.landingBob = 0;
    this.landingBobVel = 0;
    this.headPitch = 0;
  }

  sync(inputOrMotion: -1 | 0 | 1 | RiderMotionInput, compression = 0, dt = 1 / 60): void {
    const safeDt = Math.min(0.05, Math.max(0.001, dt));
    const motion: RiderMotionInput =
      typeof inputOrMotion === 'number'
        ? { leanInput: inputOrMotion, compression }
        : inputOrMotion;

    const targetLean = motion.leanInput;
    const rawComp = Math.max(0, motion.compression);
    const speedX = motion.chassisVelX ?? 0;

    // Longitudinal surge reaction: lean into throttle pull, brace forward slightly under hard braking
    let targetSurge = 0;
    if (motion.brake && speedX > 0.8) {
      targetSurge = -0.85;
    } else if (motion.throttle && !motion.brake) {
      targetSurge = motion.airborne ? 0.25 : 0.75;
    }

    if ((motion.landingImpulse ?? 0) > 0) {
      this.landingBobVel += Math.min(1.6, (motion.landingImpulse ?? 0) * 0.16);
    }

    // Critically damped secondary bob on landing (strictly visual, zero physics side-effect)
    const springK = 155;
    const dampC = 22;
    this.landingBobVel += (-springK * this.landingBob - dampC * this.landingBobVel) * safeDt;
    this.landingBob = Math.max(-0.04, Math.min(0.11, this.landingBob + this.landingBobVel * safeDt));

    const smoothLeanAlpha = 1 - Math.exp(-12 * safeDt);
    const smoothSurgeAlpha = 1 - Math.exp(-8.5 * safeDt);
    const smoothCompAlpha = 1 - Math.exp(-18 * safeDt);

    this.lean += (targetLean - this.lean) * smoothLeanAlpha;
    this.surge += (targetSurge - this.surge) * smoothSurgeAlpha;
    this.smoothCompression += (rawComp - this.smoothCompression) * smoothCompAlpha;

    const visualCompression = Math.max(0, Math.min(0.24, this.smoothCompression + Math.max(0, this.landingBob)));
    const pose = riderPose(this.lean, visualCompression, { surge: this.surge });

    // Rigid torso rotation from neck down to hip (length stays fixed, scale stays 1.0)
    this.bone(this.torso, pose.neck, pose.hip);
    this.torso.scale.set(1, 1);

    // Subtle bounded helmet pitch & position follow (stays centered over physical head collider)
    const slopeCounterPitch = Math.max(-0.18, Math.min(0.18, -(motion.chassisAngle ?? 0) * 0.28));
    const targetHeadPitch = Math.max(
      -0.14,
      Math.min(0.14, this.lean * 0.07 + this.surge * 0.04 + slopeCounterPitch * 0.45)
    );
    this.headPitch += (targetHeadPitch - this.headPitch) * (1 - Math.exp(-10 * safeDt));

    const headX = pose.helmetCenter.x + this.lean * 1.1 + this.surge * 0.5;
    const headY = pose.helmetCenter.y + Math.min(1.8, visualCompression * 5.2);
    this.helmet.position.set(headX, headY);
    this.helmet.rotation = this.headPitch;

    this.neck
      .clear()
      .moveTo(pose.neck.x, pose.neck.y + 1.5)
      .lineTo(headX - 2.2, headY + 4.8)
      .stroke({ width: 4.8, color: 0x141e26, cap: 'round' });

    for (let i = 0; i < 2; i++) {
      const shoulder = { x: pose.shoulder.x - (i === 0 ? 1.5 : 0), y: pose.shoulder.y };
      const hip = { x: pose.hip.x - (i === 0 ? 1.0 : 0), y: pose.hip.y };
      const grip = i === 0 ? pose.farGrip : pose.nearGrip;
      const foot = i === 0 ? pose.farFoot : pose.nearFoot;

      const arm = solveTwoBone(shoulder, grip, RIDER_BONES.armUpper, RIDER_BONES.armLower, 1);
      const leg = solveTwoBone(hip, foot, RIDER_BONES.legUpper, RIDER_BONES.legLower, -1);

      this.bone(this.arms[i].upper, shoulder, arm.joint);
      this.bone(this.arms[i].lower, arm.joint, arm.end);
      this.arms[i].glove.position.set(grip.x, grip.y);
      const forearmAngle = Math.atan2(arm.end.y - arm.joint.y, arm.end.x - arm.joint.x);
      this.arms[i].glove.rotation = Math.max(-0.45, Math.min(0.45, forearmAngle * 0.45));

      this.bone(this.legs[i].upper, hip, leg.joint);
      this.bone(this.legs[i].lower, leg.joint, leg.end);
      this.legs[i].boot.position.set(foot.x, foot.y);
      this.legs[i].boot.rotation = Math.max(-0.14, Math.min(0.14, this.lean * 0.08 - this.surge * 0.05));
    }
  }
}
