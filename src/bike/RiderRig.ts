import { Container, Graphics } from 'pixi.js';
import { flatPart } from '../artwork/vectorArtwork';
import { riderPose, solveTwoBone, RIDER_BONES, type RigPoint } from '../artwork/rigGeometry';

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

  constructor() {
    this.farLimbs.label = 'rider:far-limbs';
    this.nearLimbs.label = 'rider:near-limbs';
    this.torsoLayer.label = 'rider:torso';
    this.helmetLayer.label = 'rider:head';
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? 'far' : 'near';
      const parent = i === 0 ? this.farLimbs : this.nearLimbs;
      const leg = { upper: flatPart('thigh', `rider:${side}-thigh`), lower: flatPart('shin', `rider:${side}-shin`), boot: flatPart('boot', `rider:${side}-boot`) };
      const arm = { upper: flatPart('upperArm', `rider:${side}-upper-arm`), lower: flatPart('forearm', `rider:${side}-forearm`), glove: flatPart('glove', `rider:${side}-glove`) };
      parent.addChild(leg.upper, leg.lower, leg.boot, arm.upper, arm.lower, arm.glove);
      if (i === 0) for (const graphic of Object.values(leg).concat(Object.values(arm))) graphic.tint = 0xb9d2cf;
      this.legs.push(leg);
      this.arms.push(arm);
    }
    this.torsoLayer.addChild(this.torso);
    this.neck.label = 'rider:neck-and-balaclava';
    this.helmetLayer.addChild(this.neck, this.helmet);
  }

  private bone(graphic: Graphics, from: RigPoint, to: RigPoint): void {
    graphic.position.set(from.x, from.y);
    graphic.rotation = Math.atan2(to.y - from.y, to.x - from.x) - Math.PI / 2;
    // The authored limb length equals the solved bone length; scale remains exactly 1.
  }

  sync(input: -1 | 0 | 1, compression: number, dt: number): void {
    this.lean += (input - this.lean) * (1 - Math.exp(-12 * dt));
    const pose = riderPose(this.lean, compression);
    this.bone(this.torso, pose.neck, pose.hip);
    this.torso.scale.y = Math.hypot(pose.hip.x - pose.neck.x, pose.hip.y - pose.neck.y) / 22;
    this.helmet.position.set(pose.helmetCenter.x, pose.helmetCenter.y);
    this.neck.clear().moveTo(pose.neck.x, pose.neck.y + 1)
      .lineTo(pose.helmetCenter.x - 2.5, pose.helmetCenter.y + 4.5)
      .stroke({ width: 4.6, color: 0x20333e, cap: 'round' });
    for (let i = 0; i < 2; i++) {
      const shoulder = { x: pose.shoulder.x - (i === 0 ? 1.5 : 0), y: pose.shoulder.y };
      const hip = { x: pose.hip.x - (i === 0 ? 1 : 0), y: pose.hip.y };
      const grip = i === 0 ? pose.farGrip : pose.nearGrip;
      const foot = i === 0 ? pose.farFoot : pose.nearFoot;
      const arm = solveTwoBone(shoulder, grip, RIDER_BONES.armUpper, RIDER_BONES.armLower, 1);
      const leg = solveTwoBone(hip, foot, RIDER_BONES.legUpper, RIDER_BONES.legLower, -1);
      this.bone(this.arms[i].upper, shoulder, arm.joint);
      this.bone(this.arms[i].lower, arm.joint, arm.end);
      this.arms[i].glove.position.set(grip.x, grip.y);
      this.bone(this.legs[i].upper, hip, leg.joint);
      this.bone(this.legs[i].lower, leg.joint, leg.end);
      this.legs[i].boot.position.set(foot.x, foot.y);
    }
  }
}
