import { Container, Graphics } from 'pixi.js';
import { DESERT_PALETTE } from '../config/palette';
import { PHYSICS_CONFIG } from '../config/physicsConfig';
import type { BodyPose, PhysicsSnapshot } from '../physics/PhysicsWorld';

function worldPoseToChassisPixi(
  wheel: BodyPose,
  chassis: BodyPose,
  ppm: number
): { x: number; y: number } {
  const dx = wheel.x - chassis.x;
  const dy = wheel.y - chassis.y;
  const cos = Math.cos(-chassis.angle);
  const sin = Math.sin(-chassis.angle);
  // Physics local coordinates (Y-up)
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;
  // Pixi chassisLayer local coordinates (Y-down)
  return {
    x: localX * ppm,
    y: -localY * ppm,
  };
}

/**
 * Modular 2D bike & rider rig.
 * Each sub-part is mounted into its own named Container so custom transparent PNG/WebP
 * sprites can replace any procedural Graphics node later without changing physics or engine code.
 */
export class BikeRig {
  public readonly root = new Container();

  public readonly rearWheelLayer = new Container();
  public readonly frontWheelLayer = new Container();
  public readonly chassisLayer = new Container();

  public readonly swingarmSlot = new Container();
  public readonly suspensionSlot = new Container();
  public readonly frameSlot = new Container();
  public readonly tankAndFenderSlot = new Container();
  public readonly seatSlot = new Container();
  public readonly headlightSlot = new Container();
  public readonly riderSlot = new Container();

  private readonly swingarmGraphic = new Graphics();
  private readonly rearSpringGraphic = new Graphics();
  private readonly frontForkGraphic = new Graphics();
  private riderLeanVisual = 0;

  constructor() {
    this.root.addChild(this.rearWheelLayer);
    this.root.addChild(this.frontWheelLayer);
    this.root.addChild(this.chassisLayer);

    this.chassisLayer.addChild(
      this.swingarmSlot,
      this.suspensionSlot,
      this.frameSlot,
      this.riderSlot,
      this.tankAndFenderSlot,
      this.seatSlot,
      this.headlightSlot
    );

    this.buildWheelVisual(this.rearWheelLayer);
    this.buildWheelVisual(this.frontWheelLayer);
    this.buildChassisVisuals();
    this.buildRiderVisual();
  }

  private buildWheelVisual(target: Container): void {
    const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;
    const r = PHYSICS_CONFIG.wheels.radius * ppm;

    const tire = new Graphics();
    // Knobby tread teeth around outer tire
    const knobCount = 16;
    for (let i = 0; i < knobCount; i++) {
      const a = (i / knobCount) * Math.PI * 2;
      const kx = Math.cos(a) * (r - 1.5);
      const ky = Math.sin(a) * (r - 1.5);
      tire.circle(kx, ky, 3.1);
    }
    tire.fill(DESERT_PALETTE.bikeTire);

    // Main tire ring
    tire.circle(0, 0, r - 2.2);
    tire.stroke({ width: 7.5, color: DESERT_PALETTE.bikeTire });

    // Metallic rim
    tire.circle(0, 0, r * 0.56);
    tire.stroke({ width: 2.8, color: DESERT_PALETTE.bikeRim });

    // Spokes
    const spokeCount = 8;
    for (let i = 0; i < spokeCount; i++) {
      const a = (i / spokeCount) * Math.PI * 2;
      tire.moveTo(0, 0);
      tire.lineTo(Math.cos(a) * r * 0.54, Math.sin(a) * r * 0.54);
    }
    tire.stroke({ width: 1.4, color: 0xcbd5e1, alpha: 0.85 });

    // Copper center hub
    tire.circle(0, 0, 5.2);
    tire.fill(DESERT_PALETTE.bikeCopper);
    tire.circle(0, 0, 2.2);
    tire.fill(DESERT_PALETTE.bikeSeatCream);

    target.addChild(tire);
  }

  private buildChassisVisuals(): void {
    const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;
    const wCfg = PHYSICS_CONFIG.wheels;
    const rearRest = { x: wCfg.rearOffsetX * ppm, y: -wCfg.rearOffsetY * ppm };
    const frontRest = { x: wCfg.frontOffsetX * ppm, y: -wCfg.frontOffsetY * ppm };

    this.swingarmSlot.addChild(this.swingarmGraphic);
    this.suspensionSlot.addChild(this.rearSpringGraphic, this.frontForkGraphic);

    // Copper tubular trial frame + bash plate + engine block (bottom aligns with physics hull y=-0.05m -> +2.2px)
    const frame = new Graphics();
    // Engine core
    frame.roundRect(-13, -15, 23, 17, 4);
    frame.fill(DESERT_PALETTE.bikeEngineDark);
    frame.circle(-2, -6, 5.5);
    frame.fill(DESERT_PALETTE.bikeRim);

    // Exhaust header pipe tucked inside frame clearance
    frame
      .moveTo(8, -6)
      .quadraticCurveTo(15, 0, -10, 1)
      .lineTo(-27, -10)
      .stroke({ width: 4.0, color: 0x94a3b8, cap: 'round' });

    // Copper frame tubes
    frame
      .moveTo(-25, -15)
      .lineTo(2, -20)
      .lineTo(22, -26)
      .lineTo(12, 1)
      .lineTo(-14, 2)
      .lineTo(-25, -15)
      .stroke({ width: 4.2, color: DESERT_PALETTE.bikeCopper, join: 'round', cap: 'round' });

    // Bash plate aligned to physical lower edge (+2px)
    frame
      .moveTo(-15, 2)
      .lineTo(13, 1.5)
      .lineTo(18, -3)
      .stroke({ width: 3.2, color: DESERT_PALETTE.bikeCopperLight, cap: 'round' });

    // Footpeg & brake pedal
    frame.roundRect(-9, 0, 9, 3.5, 1.5).fill(DESERT_PALETTE.bikeCopperLight);

    // Handlebars stem
    frame
      .moveTo(21, -26)
      .lineTo(19, -38)
      .lineTo(14, -40)
      .stroke({ width: 3.4, color: DESERT_PALETTE.bikeCopperLight, cap: 'round' });
    frame.circle(13, -40, 3).fill(DESERT_PALETTE.bikeTire);

    this.frameSlot.addChild(frame);

    // Turquoise bodywork: sculpted fuel tank, side shroud & front/rear fenders
    const body = new Graphics();
    // Rear tail fender
    body
      .moveTo(-16, -16)
      .quadraticCurveTo(-31, -22, -41, -19)
      .lineTo(-34, -13)
      .lineTo(-14, -12)
      .closePath()
      .fill(DESERT_PALETTE.bikeTurquoise);

    // Fuel tank / side shroud
    body
      .moveTo(-5, -19)
      .quadraticCurveTo(10, -28, 22, -22)
      .lineTo(16, -11)
      .lineTo(-6, -13)
      .closePath()
      .fill(DESERT_PALETTE.bikeTurquoise);
    body
      .moveTo(0, -20)
      .lineTo(17, -21)
      .lineTo(13, -15)
      .lineTo(1, -15)
      .closePath()
      .fill(DESERT_PALETTE.bikeTurquoiseDark);

    // High front mudguard fender
    body
      .moveTo(21, -21)
      .quadraticCurveTo(35, -25, 42, -17)
      .lineTo(35, -14)
      .quadraticCurveTo(28, -19, 20, -17)
      .closePath()
      .fill(DESERT_PALETTE.bikeTurquoise);

    this.tankAndFenderSlot.addChild(body);

    // Cream ergonomic trial seat
    const seat = new Graphics();
    seat
      .moveTo(-24, -16)
      .quadraticCurveTo(-12, -18, -2, -19)
      .lineTo(-4, -13)
      .lineTo(-22, -12)
      .closePath()
      .fill(DESERT_PALETTE.bikeSeatCream);
    this.seatSlot.addChild(seat);

    // Small round headlight + warm glow
    const headlight = new Graphics();
    headlight.circle(26, -25, 5.2).fill(DESERT_PALETTE.bikeEngineDark);
    headlight.circle(27.2, -25, 3.8).fill(DESERT_PALETTE.bikeHeadlightGlow);
    this.headlightSlot.addChild(headlight);

    // Initial suspension draw to rest hubs
    this.redrawSuspension(rearRest, frontRest);
  }

  private buildRiderVisual(): void {
    // Pivot around hips/footpeg area so torso leans cleanly with balance controls
    this.riderSlot.position.set(-8, -13);

    const g = new Graphics();

    // Leg + boot resting on footpeg (aligns with footpeg at (-9, 0) in chassisLayer)
    g.moveTo(-1, -4)
      .lineTo(7, 5)
      .lineTo(1, 14)
      .stroke({ width: 6.2, color: DESERT_PALETTE.riderSuit, cap: 'round', join: 'round' });
    g.roundRect(-2, 12, 10, 4.8, 2).fill(DESERT_PALETTE.riderBoot);

    // Torso (coordinated dark slate + turquoise jersey stripe)
    g.roundRect(-7, -26, 13, 24, 6).fill(DESERT_PALETTE.riderSuit);
    g.roundRect(-3, -23, 7, 15, 3).fill(DESERT_PALETTE.riderSuitAccent);

    // Arm reaching toward handlebar grip
    g.moveTo(2, -21)
      .lineTo(14, -22)
      .lineTo(21, -27)
      .stroke({ width: 5.2, color: DESERT_PALETTE.riderSuit, cap: 'round', join: 'round' });
    g.circle(21, -27, 3.1).fill(DESERT_PALETTE.bikeTurquoiseDark);

    // Cream helmet aligned with rider-head collider (y=-13 + (-33) = -46px -> ~1.04m)
    g.circle(3, -33, 9.2).fill(DESERT_PALETTE.riderHelmetCream);
    g.moveTo(8, -39)
      .lineTo(16, -37)
      .lineTo(11, -34)
      .closePath()
      .fill(DESERT_PALETTE.riderHelmetCream);
    g.arc(3, -33, 8.0, -Math.PI * 0.9, -Math.PI * 0.2).stroke({
      width: 3,
      color: DESERT_PALETTE.riderHelmetStripe,
    });
    g.roundRect(5, -36, 7.5, 4.6, 2).fill(DESERT_PALETTE.riderVisor);

    this.riderSlot.addChild(g);
  }

  private redrawSuspension(
    rearHubLocal: { x: number; y: number },
    frontHubLocal: { x: number; y: number }
  ): void {
    // Copper rear swingarm connecting frame pivot directly to true rear wheel center
    const pivotX = -14;
    const pivotY = 0;
    this.swingarmGraphic.clear();
    this.swingarmGraphic
      .moveTo(pivotX, pivotY)
      .lineTo(rearHubLocal.x, rearHubLocal.y)
      .stroke({ width: 4.5, color: DESERT_PALETTE.bikeCopper, cap: 'round' });

    // Yellow rear coil spring attached between upper frame mount and mid-swingarm
    this.rearSpringGraphic.clear();
    const topX = -14;
    const topY = -14;
    const botX = pivotX + (rearHubLocal.x - pivotX) * 0.56;
    const botY = pivotY + (rearHubLocal.y - pivotY) * 0.56;

    this.rearSpringGraphic
      .moveTo(topX, topY)
      .lineTo(botX, botY)
      .stroke({ width: 2.5, color: DESERT_PALETTE.bikeEngineDark, cap: 'round' });

    const coils = 5;
    for (let i = 1; i < coils; i++) {
      const t = i / coils;
      const cx = topX + (botX - topX) * t;
      const cy = topY + (botY - topY) * t;
      const perp = i % 2 === 0 ? 3.5 : -3.5;
      this.rearSpringGraphic.circle(cx + perp * 0.4, cy, 2.3);
    }
    this.rearSpringGraphic.fill(DESERT_PALETTE.bikeYellowSpring);

    // Front telescopic fork connecting triple clamp directly to true front wheel center
    this.frontForkGraphic.clear();
    const forkTopX = 21;
    const forkTopY = -26;
    const forkBotX = frontHubLocal.x;
    const forkBotY = frontHubLocal.y;

    this.frontForkGraphic
      .moveTo(forkTopX, forkTopY)
      .lineTo(forkBotX, forkBotY)
      .stroke({ width: 4.5, color: DESERT_PALETTE.bikeCopper, cap: 'round' });

    const sleeveStartX = forkTopX + (forkBotX - forkTopX) * 0.16;
    const sleeveStartY = forkTopY + (forkBotY - forkTopY) * 0.16;
    const sleeveEndX = forkTopX + (forkBotX - forkTopX) * 0.52;
    const sleeveEndY = forkTopY + (forkBotY - forkTopY) * 0.52;
    this.frontForkGraphic
      .moveTo(sleeveStartX, sleeveStartY)
      .lineTo(sleeveEndX, sleeveEndY)
      .stroke({ width: 6, color: DESERT_PALETTE.bikeYellowSpring, cap: 'round' });
  }

  public sync(
    snapshot: PhysicsSnapshot,
    leanInput: -1 | 0 | 1,
    dt: number
  ): void {
    const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;

    // Position wheels & chassis directly from interpolated physics poses (Y-up -> Pixi Y-down)
    this.rearWheelLayer.position.set(snapshot.rearWheel.x * ppm, -snapshot.rearWheel.y * ppm);
    this.rearWheelLayer.rotation = -snapshot.rearWheel.angle;

    this.frontWheelLayer.position.set(snapshot.frontWheel.x * ppm, -snapshot.frontWheel.y * ppm);
    this.frontWheelLayer.rotation = -snapshot.frontWheel.angle;

    this.chassisLayer.position.set(snapshot.chassis.x * ppm, -snapshot.chassis.y * ppm);
    this.chassisLayer.rotation = -snapshot.chassis.angle;

    // Rider lean feedback (smooth forward/back lean)
    const targetLean = leanInput * PHYSICS_CONFIG.balance.riderLeanVisualAngle;
    const alpha = 1 - Math.exp(-12 * dt);
    this.riderLeanVisual += (targetLean - this.riderLeanVisual) * alpha;
    this.riderSlot.rotation = this.riderLeanVisual;

    // Transform true world wheel centers into chassis local coordinates so swingarm & fork stay connected
    const rearLocal = worldPoseToChassisPixi(snapshot.rearWheel, snapshot.chassis, ppm);
    const frontLocal = worldPoseToChassisPixi(snapshot.frontWheel, snapshot.chassis, ppm);
    this.redrawSuspension(rearLocal, frontLocal);
  }
}
