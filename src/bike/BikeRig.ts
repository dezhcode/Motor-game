import { Container, Graphics } from 'pixi.js';
import { DESERT_PALETTE } from '../config/palette';
import { PHYSICS_CONFIG } from '../config/physicsConfig';
import type { PhysicsSnapshot } from '../physics/PhysicsWorld';

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
    const rearX = wCfg.rearOffsetX * ppm;
    const rearY = -wCfg.rearOffsetY * ppm;
    const frontX = wCfg.frontOffsetX * ppm;
    const frontY = -wCfg.frontOffsetY * ppm;

    // Suspension dynamic graphics container
    this.suspensionSlot.addChild(this.rearSpringGraphic, this.frontForkGraphic);

    // Copper tubular trial frame + bash plate + engine block
    const frame = new Graphics();
    // Engine core
    frame.roundRect(-14, -10, 24, 21, 5);
    frame.fill(DESERT_PALETTE.bikeEngineDark);
    frame.circle(-2, 2, 6);
    frame.fill(DESERT_PALETTE.bikeRim);

    // Exhaust header pipe
    frame
      .moveTo(8, 2)
      .quadraticCurveTo(16, 8, -10, 10)
      .lineTo(-28, -4)
      .stroke({ width: 4.5, color: 0x94a3b8, cap: 'round' });

    // Copper frame tubes
    frame
      .moveTo(-26, -12)
      .lineTo(2, -18)
      .lineTo(22, -24)
      .lineTo(12, 8)
      .lineTo(-15, 10)
      .lineTo(-26, -12)
      .stroke({ width: 4.2, color: DESERT_PALETTE.bikeCopper, join: 'round', cap: 'round' });

    // Bash plate under engine
    frame
      .moveTo(-16, 12)
      .lineTo(13, 10)
      .lineTo(18, 4)
      .stroke({ width: 3.5, color: DESERT_PALETTE.bikeCopperLight, cap: 'round' });

    // Footpeg & brake pedal
    frame.roundRect(-8, 8, 9, 4, 2).fill(DESERT_PALETTE.bikeCopperLight);

    // Handlebars stem
    frame
      .moveTo(21, -24)
      .lineTo(19, -37)
      .lineTo(14, -39)
      .stroke({ width: 3.4, color: DESERT_PALETTE.bikeCopperLight, cap: 'round' });
    frame.circle(13, -39, 3).fill(DESERT_PALETTE.bikeTire);

    this.frameSlot.addChild(frame);

    // Rear swingarm visual (pivot to rear hub)
    const swingarm = new Graphics();
    swingarm
      .moveTo(-14, 5)
      .lineTo(rearX, rearY)
      .stroke({ width: 4.4, color: DESERT_PALETTE.bikeCopper, cap: 'round' });
    this.swingarmSlot.addChild(swingarm);

    // Turquoise bodywork: sculpted fuel tank, side shroud & front/rear fenders
    const body = new Graphics();
    // Rear tail fender
    body
      .moveTo(-16, -15)
      .quadraticCurveTo(-31, -21, -41, -18)
      .lineTo(-34, -12)
      .lineTo(-14, -11)
      .closePath()
      .fill(DESERT_PALETTE.bikeTurquoise);

    // Fuel tank / side shroud
    body
      .moveTo(-5, -18)
      .quadraticCurveTo(10, -27, 22, -21)
      .lineTo(16, -10)
      .lineTo(-6, -12)
      .closePath()
      .fill(DESERT_PALETTE.bikeTurquoise);
    body
      .moveTo(0, -19)
      .lineTo(17, -20)
      .lineTo(13, -14)
      .lineTo(1, -14)
      .closePath()
      .fill(DESERT_PALETTE.bikeTurquoiseDark);

    // High front mudguard fender
    body
      .moveTo(21, -20)
      .quadraticCurveTo(35, -24, 42, -16)
      .lineTo(35, -13)
      .quadraticCurveTo(28, -18, 20, -16)
      .closePath()
      .fill(DESERT_PALETTE.bikeTurquoise);

    this.tankAndFenderSlot.addChild(body);

    // Cream ergonomic trial seat
    const seat = new Graphics();
    seat
      .moveTo(-24, -15)
      .quadraticCurveTo(-12, -17, -2, -18)
      .lineTo(-4, -12)
      .lineTo(-22, -11)
      .closePath()
      .fill(DESERT_PALETTE.bikeSeatCream);
    this.seatSlot.addChild(seat);

    // Small round headlight + warm glow
    const headlight = new Graphics();
    headlight.circle(26, -24, 5.2).fill(DESERT_PALETTE.bikeEngineDark);
    headlight.circle(27.2, -24, 3.8).fill(DESERT_PALETTE.bikeHeadlightGlow);
    this.headlightSlot.addChild(headlight);

    // Initial suspension draw
    this.redrawSuspension(0, 0, rearX, rearY, frontX, frontY);
  }

  private buildRiderVisual(): void {
    // Pivot around hips/footpeg area so torso leans cleanly with balance controls
    this.riderSlot.position.set(-8, -12);

    const g = new Graphics();

    // Back leg + boot near footpeg
    g.moveTo(-1, -4)
      .lineTo(7, 8)
      .lineTo(2, 20)
      .stroke({ width: 6.5, color: DESERT_PALETTE.riderSuit, cap: 'round', join: 'round' });
    g.roundRect(-2, 18, 10, 5, 2).fill(DESERT_PALETTE.riderBoot);

    // Torso (coordinated dark slate + turquoise jersey stripe)
    g.roundRect(-7, -26, 13, 24, 6).fill(DESERT_PALETTE.riderSuit);
    g.roundRect(-3, -23, 7, 15, 3).fill(DESERT_PALETTE.riderSuitAccent);

    // Arm reaching toward handlebar grip
    g.moveTo(2, -21)
      .lineTo(14, -22)
      .lineTo(21, -27)
      .stroke({ width: 5.2, color: DESERT_PALETTE.riderSuit, cap: 'round', join: 'round' });
    g.circle(21, -27, 3.1).fill(DESERT_PALETTE.bikeTurquoiseDark);

    // Cream helmet with turquoise stripe & dark visor
    g.circle(3, -34, 9.5).fill(DESERT_PALETTE.riderHelmetCream);
    // Helmet peak/visor brim
    g.moveTo(8, -40)
      .lineTo(16, -38)
      .lineTo(11, -35)
      .closePath()
      .fill(DESERT_PALETTE.riderHelmetCream);
    // Turquoise racing stripe
    g.arc(3, -34, 8.2, -Math.PI * 0.9, -Math.PI * 0.2).stroke({
      width: 3,
      color: DESERT_PALETTE.riderHelmetStripe,
    });
    // Goggle visor
    g.roundRect(5, -37, 7.5, 4.6, 2).fill(DESERT_PALETTE.riderVisor);

    this.riderSlot.addChild(g);
  }

  private redrawSuspension(
    rearCompPx: number,
    frontCompPx: number,
    rearX: number,
    rearY: number,
    frontX: number,
    frontY: number
  ): void {
    // Yellow rear coil spring
    this.rearSpringGraphic.clear();
    const topX = -14;
    const topY = -12;
    const botX = rearX * 0.55;
    const botY = (rearY - rearCompPx) * 0.45 + 2;

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

    // Front telescopic fork with yellow spring sleeve
    this.frontForkGraphic.clear();
    const forkTopX = 21;
    const forkTopY = -24;
    const forkBotX = frontX;
    const forkBotY = frontY - frontCompPx;

    this.frontForkGraphic
      .moveTo(forkTopX, forkTopY)
      .lineTo(forkBotX, forkBotY)
      .stroke({ width: 4.5, color: DESERT_PALETTE.bikeCopper, cap: 'round' });

    const midX = forkTopX + (forkBotX - forkTopX) * 0.46;
    const midY = forkTopY + (forkBotY - forkTopY) * 0.46;
    this.frontForkGraphic
      .moveTo(forkTopX + (forkBotX - forkTopX) * 0.16, forkTopY + (forkBotY - forkTopY) * 0.16)
      .lineTo(midX, midY)
      .stroke({ width: 6, color: DESERT_PALETTE.bikeYellowSpring, cap: 'round' });
  }

  public sync(
    snapshot: PhysicsSnapshot,
    leanInput: -1 | 0 | 1,
    dt: number
  ): void {
    const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;
    const wCfg = PHYSICS_CONFIG.wheels;

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

    this.redrawSuspension(
      snapshot.suspensionCompressionRear * ppm,
      snapshot.suspensionCompressionFront * ppm,
      wCfg.rearOffsetX * ppm,
      -wCfg.rearOffsetY * ppm,
      wCfg.frontOffsetX * ppm,
      -wCfg.frontOffsetY * ppm
    );
  }
}
