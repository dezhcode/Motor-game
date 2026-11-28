import {
  World,
  ChainShape,
  CircleShape,
  PolygonShape,
  BoxShape,
  WheelJoint,
  Vec2,
  type Body,
  type Fixture,
  type Contact,
} from 'planck';
import { pedalPitchTorque } from './pedalPitch';
import { PHYSICS_CONFIG, type PhysicsConfig } from '../config/physicsConfig';
import type { ControlState } from '../input/InputManager';
import { sampleTrackHeight, type DynamicObstacleDef, type TrackDefinition } from '../track/desertTrackData';
import { terrainProfile } from '../track/trackProfile';

const CAT_GROUND = 0x0001;
const CAT_CHASSIS = 0x0002;
const CAT_WHEEL = 0x0004;
const CAT_HEAD = 0x0008;
const CAT_SENSOR = 0x0010;
const CAT_PROP = 0x0020;

export type CrashReason = 'head_impact' | 'sustained_flip' | 'out_of_bounds' | 'hazard_impact';

export interface BodyPose {
  x: number;
  y: number;
  angle: number;
}

export interface DynamicPropSnapshot {
  id: string;
  kind: DynamicObstacleDef['kind'];
  x: number;
  y: number;
  angle: number;
  width: number;
  height: number;
}

export interface PhysicsSnapshot {
  chassis: BodyPose;
  rearWheel: BodyPose;
  frontWheel: BodyPose;
  dynamicProps: DynamicPropSnapshot[];
  chassisVelX: number;
  chassisVelY: number;
  chassisAngularVelocity: number;
  rearGrounded: boolean;
  frontGrounded: boolean;
  chassisGrounded: boolean;
  justLandedStrength: number;
  justHitObstacleStrength: number;
  crashedReason: CrashReason | null;
  finished: boolean;
  progressRatio: number;
  suspensionCompressionRear: number;
  suspensionCompressionFront: number;
}

function normalizeAngle(rad: number): number {
  let a = rad % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  if (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function lerpAngle(a: number, b: number, t: number): number {
  return a + normalizeAngle(b - a) * t;
}

function lerpPose(prev: BodyPose, curr: BodyPose, t: number): BodyPose {
  return {
    x: prev.x + (curr.x - prev.x) * t,
    y: prev.y + (curr.y - prev.y) * t,
    angle: lerpAngle(prev.angle, curr.angle, t),
  };
}

export class PhysicsWorld {
  private readonly cfg: PhysicsConfig;
  private readonly track: TrackDefinition;

  private world!: World;
  private chassis!: Body;
  private rearWheel!: Body;
  private frontWheel!: Body;
  private rearJoint!: WheelJoint;
  private frontJoint!: WheelJoint;

  private accumulator = 0;
  private rearGroundContacts = 0;
  private frontGroundContacts = 0;
  private chassisGroundContacts = 0;
  private headGroundContacts = 0;

  private wasAirborne = false;
  private preLandingVy = 0;
  private pendingLandingStrength = 0;
  private pendingObstacleStrength = 0;

  private propBodies: Array<{
    def: DynamicObstacleDef;
    body: Body;
    prevPose: BodyPose;
    currPose: BodyPose;
  }> = [];

  private upsideDownTimer = 0;
  private crashedReason: CrashReason | null = null;
  private finished = false;

  private prevChassis: BodyPose = { x: 0, y: 0, angle: 0 };
  private currChassis: BodyPose = { x: 0, y: 0, angle: 0 };
  private prevRear: BodyPose = { x: 0, y: 0, angle: 0 };
  private currRear: BodyPose = { x: 0, y: 0, angle: 0 };
  private prevFront: BodyPose = { x: 0, y: 0, angle: 0 };
  private currFront: BodyPose = { x: 0, y: 0, angle: 0 };

  constructor(track: TrackDefinition, config: PhysicsConfig = PHYSICS_CONFIG) {
    this.track = track;
    this.cfg = config;
    this.reset();
  }

  public reset(override?: { startX?: number; startVx?: number }): void {
    this.accumulator = 0;
    this.rearGroundContacts = 0;
    this.frontGroundContacts = 0;
    this.chassisGroundContacts = 0;
    this.headGroundContacts = 0;
    this.wasAirborne = false;
    this.preLandingVy = 0;
    this.pendingLandingStrength = 0;
    this.pendingObstacleStrength = 0;
    this.propBodies = [];
    this.upsideDownTimer = 0;
    this.crashedReason = null;
    this.finished = false;

    this.world = new World({
      gravity: Vec2(0, this.cfg.world.gravityY),
    });

    this.buildTerrain();
    this.buildObstacles();
    this.buildBike(override);
    this.attachContactListeners();
    this.capturePoses(true);
  }

  private buildTerrain(): void {
    const terrainBody = this.world.createBody({
      type: 'static',
      position: Vec2(0, 0),
    });
    terrainBody.setUserData('ground');

    const chainVerts = terrainProfile(this.track).map((p) => Vec2(p.x, p.y));
    const chain = new ChainShape(chainVerts, false);
    terrainBody.createFixture({
      shape: chain,
      friction: 0.95,
      restitution: 0.02,
      filterCategoryBits: CAT_GROUND,
      filterMaskBits: CAT_CHASSIS | CAT_WHEEL | CAT_HEAD | CAT_PROP,
      userData: 'ground',
    });

    // Finish line sensor arch
    const finishBody = this.world.createBody({
      type: 'static',
      position: Vec2(this.track.finishX, 7.5),
    });
    finishBody.createFixture({
      shape: new BoxShape(0.45, 10.0),
      isSensor: true,
      filterCategoryBits: CAT_SENSOR,
      filterMaskBits: CAT_CHASSIS | CAT_WHEEL,
      userData: 'finish-line',
    });
  }

  private buildObstacles(): void {
    for (const prop of this.track.dynamicObstacles ?? []) {
      const groundY = sampleTrackHeight(this.track, prop.x);
      const body = this.world.createBody({
        type: 'dynamic',
        position: Vec2(prop.x, groundY + prop.yOffset),
        linearDamping: 0.15,
        angularDamping: 0.25,
      });
      body.createFixture({
        shape: new BoxShape(prop.width * 0.5, prop.height * 0.5),
        density: prop.density,
        friction: 0.22,
        restitution: 0.28,
        filterCategoryBits: CAT_PROP,
        filterMaskBits: CAT_GROUND | CAT_CHASSIS | CAT_WHEEL | CAT_PROP,
        userData: 'dynamic-prop',
      });
      const pose = { x: body.getPosition().x, y: body.getPosition().y, angle: body.getAngle() };
      this.propBodies.push({
        def: prop,
        body,
        prevPose: { ...pose },
        currPose: { ...pose },
      });
    }

    for (const saw of this.track.hazardSaws ?? []) {
      const sawBody = this.world.createBody({
        type: 'static',
        position: Vec2(saw.x, saw.y),
      });
      sawBody.createFixture({
        shape: new CircleShape(saw.dangerRadius),
        isSensor: true,
        filterCategoryBits: CAT_SENSOR,
        filterMaskBits: CAT_CHASSIS | CAT_WHEEL | CAT_HEAD,
        userData: 'hazard-saw',
      });
    }
  }

  private buildBike(override?: { startX?: number; startVx?: number }): void {
    const startX = override?.startX ?? this.track.startX;
    const startY =
      override?.startX !== undefined
        ? sampleTrackHeight(this.track, startX) + 0.72
        : this.track.startY;
    const startVx = override?.startVx ?? 0;
    const cCfg = this.cfg.chassis;
    const wCfg = this.cfg.wheels;
    const sCfg = this.cfg.suspension;

    this.chassis = this.world.createBody({
      type: 'dynamic',
      position: Vec2(startX, startY),
      linearDamping: cCfg.linearDamping,
      angularDamping: cCfg.angularDamping,
      allowSleep: false,
    });
    if (startVx !== 0) {
      this.chassis.setLinearVelocity(Vec2(startVx, 0));
    }
    this.chassis.setUserData('chassis');

    // Main chassis hull aligned with visual bash plate & frame
    this.chassis.createFixture({
      shape: this.cfg.vehicleShape === 'jeep' ? new BoxShape(1.38, 0.27, Vec2(0, 0.12)) : new PolygonShape([
        Vec2(-0.62, -0.05),
        Vec2(0.62, -0.03),
        Vec2(0.56, 0.36),
        Vec2(-0.14, 0.42),
        Vec2(-0.72, 0.24),
      ]),
      density: 1.0,
      friction: cCfg.friction,
      restitution: cCfg.restitution,
      filterCategoryBits: CAT_CHASSIS,
      filterMaskBits: CAT_GROUND | CAT_SENSOR | CAT_PROP,
      userData: 'chassis-body',
    });

    if (this.cfg.vehicleShape === 'jeep') {
      this.chassis.createFixture({
        shape: new BoxShape(0.72, 0.53, Vec2(-0.18, 0.8)),
        density: 0.35, friction: 0.4, restitution: 0.03,
        filterCategoryBits: CAT_CHASSIS, filterMaskBits: CAT_GROUND | CAT_PROP,
        userData: 'jeep-cabin',
      });
    } else {
    // Rider torso proxy (allows forgiving short scrapes without instant fail)
    this.chassis.createFixture({
      shape: new PolygonShape([
        Vec2(-0.34, 0.38),
        Vec2(0.18, 0.40),
        Vec2(0.10, 0.86),
        Vec2(-0.28, 0.82),
      ]),
      density: 0.35,
      friction: 0.4,
      restitution: 0.03,
      filterCategoryBits: CAT_CHASSIS,
      filterMaskBits: CAT_GROUND,
      userData: 'rider-torso',
    });

    // Rider helmet collider for valid head-ground impact detection
    this.chassis.createFixture({
      shape: new CircleShape(Vec2(-0.08, 1.04), 0.2),
      density: 0.15,
      friction: 0.45,
      restitution: 0.05,
      filterCategoryBits: CAT_HEAD,
      filterMaskBits: CAT_GROUND,
      userData: 'rider-head',
    });

    }
    this.chassis.setMassData({
      mass: cCfg.massKg,
      center: Vec2(cCfg.centerOfMassX, cCfg.centerOfMassY),
      I: cCfg.inertia,
    });

    const wheelDef = {
      density: wCfg.density,
      friction: wCfg.friction,
      restitution: wCfg.restitution,
      filterCategoryBits: CAT_WHEEL,
      filterMaskBits: CAT_GROUND | CAT_SENSOR | CAT_PROP,
    };

    this.rearWheel = this.world.createBody({
      type: 'dynamic',
      position: Vec2(startX + wCfg.rearOffsetX, startY + wCfg.rearOffsetY),
      angularDamping: wCfg.angularDamping,
      allowSleep: false,
    });
    if (startVx !== 0) {
      this.rearWheel.setLinearVelocity(Vec2(startVx, 0));
      this.rearWheel.setAngularVelocity(-startVx / wCfg.radius);
    }
    this.rearWheel.createFixture({
      shape: new CircleShape(wCfg.radius),
      ...wheelDef,
      userData: 'rear-wheel',
    });

    this.frontWheel = this.world.createBody({
      type: 'dynamic',
      position: Vec2(startX + wCfg.frontOffsetX, startY + wCfg.frontOffsetY),
      angularDamping: wCfg.angularDamping,
      allowSleep: false,
    });
    if (startVx !== 0) {
      this.frontWheel.setLinearVelocity(Vec2(startVx, 0));
      this.frontWheel.setAngularVelocity(-startVx / wCfg.radius);
    }
    this.frontWheel.createFixture({
      shape: new CircleShape(wCfg.radius),
      ...wheelDef,
      userData: 'front-wheel',
    });

    this.rearJoint = new WheelJoint(
      {
        motorSpeed: 0,
        maxMotorTorque: 0,
        enableMotor: false,
        frequencyHz: sCfg.rearFrequencyHz,
        dampingRatio: sCfg.rearDampingRatio,
        collideConnected: false,
      },
      this.chassis,
      this.rearWheel,
      this.rearWheel.getPosition(),
      Vec2(sCfg.axisX, sCfg.axisY)
    );
    this.world.createJoint(this.rearJoint);

    this.frontJoint = new WheelJoint(
      {
        motorSpeed: 0,
        maxMotorTorque: 0,
        enableMotor: false,
        frequencyHz: sCfg.frontFrequencyHz,
        dampingRatio: sCfg.frontDampingRatio,
        collideConnected: false,
      },
      this.chassis,
      this.frontWheel,
      this.frontWheel.getPosition(),
      Vec2(sCfg.axisX, sCfg.axisY)
    );
    this.world.createJoint(this.frontJoint);
  }

  private attachContactListeners(): void {
    const tagOf = (f: Fixture): unknown => f.getUserData();

    const classifyPair = (contact: Contact) => {
      const a = contact.getFixtureA();
      const b = contact.getFixtureB();
      const ta = tagOf(a);
      const tb = tagOf(b);
      return { ta, tb };
    };

    this.world.on('begin-contact', (contact) => {
      const { ta, tb } = classifyPair(contact);
      if ((ta === 'finish-line' && (tb === 'chassis-body' || tb === 'rear-wheel' || tb === 'front-wheel')) ||
          (tb === 'finish-line' && (ta === 'chassis-body' || ta === 'rear-wheel' || ta === 'front-wheel'))) {
        if (!this.crashedReason) {
          this.finished = true;
        }
        return;
      }

      if ((ta === 'hazard-saw' && (tb === 'chassis-body' || tb === 'rear-wheel' || tb === 'front-wheel' || tb === 'rider-head')) ||
          (tb === 'hazard-saw' && (ta === 'chassis-body' || ta === 'rear-wheel' || ta === 'front-wheel' || ta === 'rider-head'))) {
        if (!this.crashedReason && !this.finished) {
          this.crashedReason = 'hazard_impact';
        }
        return;
      }

      if ((ta === 'dynamic-prop' && (tb === 'chassis-body' || tb === 'rear-wheel' || tb === 'front-wheel')) ||
          (tb === 'dynamic-prop' && (ta === 'chassis-body' || ta === 'rear-wheel' || ta === 'front-wheel'))) {
        const speed = Math.hypot(this.chassis.getLinearVelocity().x, this.chassis.getLinearVelocity().y);
        if (speed > 2.0) {
          this.pendingObstacleStrength = Math.max(this.pendingObstacleStrength, Math.min(1, speed / 12));
        }
        return;
      }

      if (ta === 'ground' || tb === 'ground') {
        const other = ta === 'ground' ? tb : ta;
        if (other === 'rear-wheel') this.rearGroundContacts++;
        else if (other === 'front-wheel') this.frontGroundContacts++;
        else if (other === 'chassis-body' || other === 'rider-torso') this.chassisGroundContacts++;
        else if (other === 'rider-head') this.headGroundContacts++;
      }
    });

    this.world.on('end-contact', (contact) => {
      const { ta, tb } = classifyPair(contact);
      if (ta === 'ground' || tb === 'ground') {
        const other = ta === 'ground' ? tb : ta;
        if (other === 'rear-wheel') this.rearGroundContacts = Math.max(0, this.rearGroundContacts - 1);
        else if (other === 'front-wheel') this.frontGroundContacts = Math.max(0, this.frontGroundContacts - 1);
        else if (other === 'chassis-body' || other === 'rider-torso') {
          this.chassisGroundContacts = Math.max(0, this.chassisGroundContacts - 1);
        } else if (other === 'rider-head') {
          this.headGroundContacts = Math.max(0, this.headGroundContacts - 1);
        }
      }
    });

    this.world.on('post-solve', (contact, impulse) => {
      if (this.crashedReason || this.finished) return;
      const { ta, tb } = classifyPair(contact);
      const isHeadGround =
        (ta === 'rider-head' && tb === 'ground') || (tb === 'rider-head' && ta === 'ground');
      if (!isHeadGround) return;

      const normalImpulses = impulse.normalImpulses;
      let maxNormal = 0;
      for (let i = 0; i < normalImpulses.length; i++) {
        if (normalImpulses[i] > maxNormal) maxNormal = normalImpulses[i];
      }
      if (maxNormal >= this.cfg.crash.headCrashMinImpact) {
        this.crashedReason = 'head_impact';
      }
    });
  }

  private capturePoses(syncPrev: boolean): void {
    const cPos = this.chassis.getPosition();
    const rPos = this.rearWheel.getPosition();
    const fPos = this.frontWheel.getPosition();

    this.currChassis = { x: cPos.x, y: cPos.y, angle: this.chassis.getAngle() };
    this.currRear = { x: rPos.x, y: rPos.y, angle: this.rearWheel.getAngle() };
    this.currFront = { x: fPos.x, y: fPos.y, angle: this.frontWheel.getAngle() };
    for (const p of this.propBodies) {
      const bp = p.body.getPosition();
      p.currPose = { x: bp.x, y: bp.y, angle: p.body.getAngle() };
      if (syncPrev) {
        p.prevPose = { ...p.currPose };
      }
    }

    if (syncPrev) {
      this.prevChassis = { ...this.currChassis };
      this.prevRear = { ...this.currRear };
      this.prevFront = { ...this.currFront };
    }
  }

  public step(frameDt: number, controls: ControlState, allowControl: boolean): PhysicsSnapshot {
    const clampedDt = Math.min(Math.max(0, frameDt), this.cfg.world.maxFrameDt);
    this.accumulator += clampedDt;
    const fixedDt = this.cfg.world.fixedDt;

    while (this.accumulator >= fixedDt) {
      this.prevChassis = { ...this.currChassis };
      this.prevRear = { ...this.currRear };
      this.prevFront = { ...this.currFront };
      for (const p of this.propBodies) {
        p.prevPose = { ...p.currPose };
      }

      this.applyControls(controls, allowControl, fixedDt);
      this.applySuspensionBumpStops();
      this.world.step(fixedDt, this.cfg.world.velocityIterations, this.cfg.world.positionIterations);
      this.evaluateState(fixedDt);
      this.capturePoses(false);
      this.accumulator -= fixedDt;
    }

    const alpha = Math.max(0, Math.min(1, this.accumulator / fixedDt));
    const chassisPose = lerpPose(this.prevChassis, this.currChassis, alpha);
    const rearPose = lerpPose(this.prevRear, this.currRear, alpha);
    const frontPose = lerpPose(this.prevFront, this.currFront, alpha);

    const dynamicProps: DynamicPropSnapshot[] = this.propBodies.map((p) => {
      const pose = lerpPose(p.prevPose, p.currPose, alpha);
      return {
        id: p.def.id,
        kind: p.def.kind,
        x: pose.x,
        y: pose.y,
        angle: pose.angle,
        width: p.def.width,
        height: p.def.height,
      };
    });

    const vel = this.chassis.getLinearVelocity();
    const landing = this.pendingLandingStrength;
    this.pendingLandingStrength = 0;
    const obstacleHit = this.pendingObstacleStrength;
    this.pendingObstacleStrength = 0;

    // True physical suspension displacement along local Y (unclamped)
    const rearLocal = this.chassis.getLocalPoint(this.rearWheel.getPosition());
    const frontLocal = this.chassis.getLocalPoint(this.frontWheel.getPosition());
    const rearCompression = rearLocal.y - this.cfg.wheels.rearOffsetY;
    const frontCompression = frontLocal.y - this.cfg.wheels.frontOffsetY;

    const progressSpan = Math.max(1, this.track.finishX - this.track.startX);
    const progressRatio = Math.max(
      0,
      Math.min(1, (chassisPose.x - this.track.startX) / progressSpan)
    );

    return {
      chassis: chassisPose,
      rearWheel: rearPose,
      frontWheel: frontPose,
      dynamicProps,
      chassisVelX: vel.x,
      chassisVelY: vel.y,
      chassisAngularVelocity: this.chassis.getAngularVelocity(),
      rearGrounded: this.rearGroundContacts > 0,
      frontGrounded: this.frontGroundContacts > 0,
      chassisGrounded: this.chassisGroundContacts > 0,
      justLandedStrength: landing,
      justHitObstacleStrength: obstacleHit,
      crashedReason: this.crashedReason,
      finished: this.finished,
      progressRatio,
      suspensionCompressionRear: rearCompression,
      suspensionCompressionFront: frontCompression,
    };
  }

  /**
   * Planck's WheelJoint does not expose built-in prismatic translation limits.
   * Apply equal-and-opposite physical bump-stop & rebound-stop spring-damper forces
   * along the joint axis whenever travel exceeds [ -maxExtension, +maxCompression ].
   */
  private applySuspensionBumpStops(): void {
    this.enforceSingleSuspensionStop(this.rearJoint, this.rearWheel);
    this.enforceSingleSuspensionStop(this.frontJoint, this.frontWheel);
  }

  private enforceSingleSuspensionStop(joint: WheelJoint, wheel: Body): void {
    const sCfg = this.cfg.suspension;
    const translation = joint.getJointTranslation();

    const worldAxis = this.chassis.getWorldVector(joint.getLocalAxisA());
    const anchorA = joint.getAnchorA();
    const wheelCenter = wheel.getWorldCenter();

    const vChassisAtAnchor = this.chassis.getLinearVelocityFromWorldPoint(anchorA);
    const vWheel = wheel.getLinearVelocity();
    const relVAlongAxis =
      (vWheel.x - vChassisAtAnchor.x) * worldAxis.x +
      (vWheel.y - vChassisAtAnchor.y) * worldAxis.y;

    const invMassA = this.chassis.getMass() > 0 ? 1 / this.chassis.getMass() : 0;
    const invMassB = wheel.getMass() > 0 ? 1 / wheel.getMass() : 0;
    const invIA = this.chassis.getInertia() > 0 ? 1 / this.chassis.getInertia() : 0;
    const invIB = wheel.getInertia() > 0 ? 1 / wheel.getInertia() : 0;
    const rA = Vec2.sub(anchorA, this.chassis.getWorldCenter());
    const rAxAxis = rA.x * worldAxis.y - rA.y * worldAxis.x;
    const invEff = invMassA + invMassB + invIA * rAxAxis * rAxAxis;
    const effMass = invEff > 0 ? 1 / invEff : 0;

    const bottomConeStart = sCfg.maxCompression * 0.65;
    if (translation > bottomConeStart) {
      const coneRatio = Math.min(1.6, (translation - bottomConeStart) / (sCfg.maxCompression - bottomConeStart));
      const coneForce = -(sCfg.bumpStopStiffness * 0.85 * coneRatio * (translation - bottomConeStart) + Math.max(0, relVAlongAxis) * sCfg.bumpStopDamping * coneRatio);
      const fx = worldAxis.x * coneForce;
      const fy = worldAxis.y * coneForce;
      wheel.applyForce(Vec2(fx, fy), wheelCenter, true);
      this.chassis.applyForce(Vec2(-fx, -fy), anchorA, true);
    }

    if (translation > sCfg.maxCompression) {
      const excess = translation - sCfg.maxCompression;
      if (relVAlongAxis > 0 || excess > 0.002) {
        const targetVel = Math.max(0, relVAlongAxis) + Math.min(3.0, excess * 30);
        const jMag = -effMass * targetVel;
        const jx = worldAxis.x * jMag;
        const jy = worldAxis.y * jMag;
        wheel.applyLinearImpulse(Vec2(jx, jy), wheelCenter, true);
        this.chassis.applyLinearImpulse(Vec2(-jx, -jy), anchorA, true);
      }
    } else if (translation < -sCfg.maxExtension) {
      const droop = -sCfg.maxExtension - translation;
      const damp = Math.max(0, -relVAlongAxis) * sCfg.reboundStopDamping;
      const forceMag = sCfg.reboundStopStiffness * droop + damp;
      const fx = worldAxis.x * forceMag;
      const fy = worldAxis.y * forceMag;
      wheel.applyForce(Vec2(fx, fy), wheelCenter, true);
      this.chassis.applyForce(Vec2(-fx, -fy), anchorA, true);
    }
    void invIB;
  }

  private applyControls(controls: ControlState, allowControl: boolean, _dt: number): void {
    const drive = this.cfg.drive;
    const balance = this.cfg.balance;
    const vel = this.chassis.getLinearVelocity();
    const grounded = this.rearGroundContacts > 0 || this.frontGroundContacts > 0;

    if (!allowControl || this.crashedReason || this.finished) {
      this.rearJoint.enableMotor(true);
      this.rearJoint.setMotorSpeed(0);
      this.rearJoint.setMaxMotorTorque(drive.brakeTorque * 0.4);
      this.frontJoint.enableMotor(true);
      this.frontJoint.setMotorSpeed(0);
      this.frontJoint.setMaxMotorTorque(drive.brakeTorque * 0.4);
      return;
    }

    // Starter-bike governor adds progressive drag rather than snapping velocity on slopes.
    if (drive.speedGovernorMps !== undefined && vel.x > drive.speedGovernorMps) {
      this.chassis.applyForceToCenter(Vec2(-(vel.x - drive.speedGovernorMps) * this.chassis.getMass() * 8, 0), true);
    }

    if (controls.brake) {
      if (vel.x > 0.35) {
        // Active braking while moving forward
        this.rearJoint.enableMotor(true);
        this.rearJoint.setMotorSpeed(0);
        this.rearJoint.setMaxMotorTorque(drive.brakeTorque);
        this.frontJoint.enableMotor(true);
        this.frontJoint.setMotorSpeed(0);
        this.frontJoint.setMaxMotorTorque(drive.brakeTorque * 0.72);
      } else {
        // Gentle low-speed reverse to recover if needed
        this.rearJoint.enableMotor(true);
        this.rearJoint.setMotorSpeed(drive.targetWheelOmega * 0.25);
        this.rearJoint.setMaxMotorTorque(drive.maxMotorTorque * 0.55);
        this.frontJoint.enableMotor(false);
      }
    } else if (controls.throttle) {
      this.rearJoint.enableMotor(true);
      this.rearJoint.setMotorSpeed(-drive.targetWheelOmega);
      this.rearJoint.setMaxMotorTorque(drive.maxMotorTorque);
      this.frontJoint.enableMotor(false);
    } else {
      this.rearJoint.enableMotor(true);
      this.rearJoint.setMotorSpeed(0);
      this.rearJoint.setMaxMotorTorque(drive.coastDragTorque);
      this.frontJoint.enableMotor(false);
    }

    // Limited helper torque for balance (CCW = + lean back, CW = - lean forward)
    const leanStrength = grounded ? balance.groundLeanTorque : balance.airLeanTorque;
    const omega = this.chassis.getAngularVelocity();

    if (controls.leanLeft && !controls.leanRight) {
      if (omega < balance.maxAngularSpeed) {
        this.chassis.applyTorque(leanStrength, true);
      }
    } else if (controls.leanRight && !controls.leanLeft) {
      if (omega > -balance.maxAngularSpeed) {
        this.chassis.applyTorque(-leanStrength, true);
      }
    } else {
      const x = this.chassis.getPosition().x;
      const slope = Math.atan2(sampleTrackHeight(this.track, x + .6) - sampleTrackHeight(this.track, x - .6), 1.2);
      const torque = pedalPitchTorque(controls.throttle, controls.brake, grounded, this.chassis.getAngle(), slope, omega, this.chassis.getInertia());
      this.chassis.applyTorque(torque, true);
    }
  }

  private evaluateState(dt: number): void {
    const pos = this.chassis.getPosition();
    const vel = this.chassis.getLinearVelocity();

    const anyWheelGrounded = this.rearGroundContacts > 0 || this.frontGroundContacts > 0;
    if (!anyWheelGrounded) {
      this.wasAirborne = true;
      if (vel.y < this.preLandingVy) {
        this.preLandingVy = vel.y;
      }
    } else if (this.wasAirborne) {
      const impactVy = Math.abs(this.preLandingVy);
      if (impactVy > 2.4) {
        this.pendingLandingStrength = Math.max(this.pendingLandingStrength, impactVy);
      }
      this.wasAirborne = false;
      this.preLandingVy = 0;
    }

    if (this.crashedReason || this.finished) return;

    if (pos.y < this.cfg.crash.outOfBoundsY) {
      this.crashedReason = 'out_of_bounds';
      return;
    }

    // Check finish x threshold as well as sensor
    if (pos.x >= this.track.finishX) {
      this.finished = true;
      return;
    }

    // Sustained upside-down flip detection
    const tilt = Math.abs(normalizeAngle(this.chassis.getAngle()));
    const touchingGround = this.chassisGroundContacts > 0 || this.headGroundContacts > 0 || anyWheelGrounded;
    if (tilt > this.cfg.crash.upsideDownAngleRad && touchingGround) {
      this.upsideDownTimer += dt;
      if (this.upsideDownTimer >= this.cfg.crash.upsideDownGraceSeconds) {
        this.crashedReason = 'sustained_flip';
      }
    } else {
      this.upsideDownTimer = Math.max(0, this.upsideDownTimer - dt * 2.5);
    }
  }
}
