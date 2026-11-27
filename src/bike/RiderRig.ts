import { Container, Sprite } from 'pixi.js';
import type { GameArtwork } from '../artwork/GameArtwork';
import { riderPose, solveTwoBone, RIDER_BONES, type RigPoint } from '../artwork/rigGeometry';

/** Far/near arms and legs have independent bones; hands and boots stay on their bike attachments. */
export class RiderRig {
  readonly farLimbs = new Container();
  readonly torsoLayer = new Container();
  readonly nearLimbs = new Container();
  readonly helmetLayer = new Container();
  private readonly torso: Sprite;
  private readonly helmet: Sprite;
  private readonly arms: Array<{ upper: Sprite; lower: Sprite }> = [];
  private readonly legs: Array<{ upper: Sprite; lower: Sprite }> = [];
  private lean = 0;

  constructor(art: GameArtwork) {
    this.farLimbs.label = 'rider:far-limbs';
    this.nearLimbs.label = 'rider:near-limbs';
    this.torsoLayer.label = 'rider:torso';
    this.helmetLayer.label = 'rider:helmet';
    for (let i = 0; i < 2; i++) {
      const parent = i === 0 ? this.farLimbs : this.nearLimbs;
      const leg = { upper: new Sprite(art['rider-thigh-v2']), lower: new Sprite(art['rider-shin-v2']) };
      const arm = { upper: new Sprite(art['rider-upper-arm-v2']), lower: new Sprite(art['rider-forearm-v2']) };
      for (const [name, sprite] of Object.entries({ thigh: leg.upper, shin: leg.lower, upperArm: arm.upper, forearm: arm.lower })) {
        sprite.label = `rider:${i === 0 ? 'far' : 'near'}-${name}`;
        if (i === 0) sprite.tint = 0xadb9b6;
      }
      parent.addChild(leg.upper, leg.lower, arm.upper, arm.lower);
      this.legs.push(leg);
      this.arms.push(arm);
    }
    this.torso = new Sprite(art['rider-torso-v2']);
    this.helmet = new Sprite(art['rider-helmet-v2']);
    this.torsoLayer.addChild(this.torso);
    this.helmetLayer.addChild(this.helmet);
    this.helmet.anchor.set(0.44, 0.83);
    this.helmet.height = 20;
    this.helmet.width = 19;
  }

  private bone(sprite: Sprite, from: RigPoint, to: RigPoint, width: number, start = 0.07, end = 0.93): void {
    sprite.anchor.set(0.5, start);
    sprite.position.set(from.x, from.y);
    sprite.width = width;
    sprite.height = Math.hypot(to.x - from.x, to.y - from.y) / (end - start);
    sprite.rotation = Math.atan2(to.y - from.y, to.x - from.x) - Math.PI / 2;
  }

  sync(input: -1 | 0 | 1, compression: number, dt: number): void {
    this.lean += (input - this.lean) * (1 - Math.exp(-12 * dt));
    const pose = riderPose(this.lean, compression);
    this.bone(this.torso, pose.neck, pose.hip, 12.5, 0.03, 0.96);
    this.helmet.position.set(pose.neck.x + 3, pose.neck.y + 2);
    this.helmet.rotation = this.lean * 0.07;
    for (let i = 0; i < 2; i++) {
      const shoulder = { x: pose.shoulder.x - (i === 0 ? 1.5 : 0), y: pose.shoulder.y };
      const hip = { x: pose.hip.x - (i === 0 ? 1 : 0), y: pose.hip.y };
      const arm = solveTwoBone(shoulder, i === 0 ? pose.farGrip : pose.nearGrip, RIDER_BONES.armUpper, RIDER_BONES.armLower, 1);
      const leg = solveTwoBone(hip, i === 0 ? pose.farFoot : pose.nearFoot, RIDER_BONES.legUpper, RIDER_BONES.legLower, -1);
      this.bone(this.arms[i].upper, shoulder, arm.joint, 6.0);
      this.bone(this.arms[i].lower, arm.joint, arm.end, 5.6, 0.06, 0.89);
      this.bone(this.legs[i].upper, hip, leg.joint, 8.4);
      this.bone(this.legs[i].lower, leg.joint, leg.end, 9.5, 0.08, 0.94);
    }
  }
}
