/** Cosmetic neck inertia. Physics uses +Y up; output uses clockwise screen radians. */
export interface HeadTelemetry {
  velocityX: number;
  velocityY: number;
  pitch: number;
  angularVelocity: number;
  grounded: boolean;
  landing: number;
  obstacleHit: number;
  throttle?: boolean;
  brake?: boolean;
}

export const HEAD_LIMIT = 18 * Math.PI / 180;
const clamp = (n: number, limit: number) => Math.max(-limit, Math.min(limit, n));
const finite = (n: number) => Number.isFinite(n) ? n : 0;

/** No idle animation: pedal transitions, measured acceleration, pitch and collision events. */
export class HeadDynamics {
  angle = 0;
  private speed = 0;
  private acceleration = 0;
  private verticalAcceleration = 0;
  private previous: HeadTelemetry | null = null;

  reset(): void {
    this.angle = this.speed = this.acceleration = this.verticalAcceleration = 0;
    this.previous = null;
  }

  update(input: HeadTelemetry, dt: number): number {
    // Freeze exactly during pause. Do not cache/consume an impact on a frozen frame.
    if (!Number.isFinite(dt) || dt <= 0) return this.angle;
    const t = Math.min(dt, 0.05);
    const m = Object.fromEntries(Object.entries(input).map(([k, v]) =>
      [k, typeof v === 'number' ? finite(v) : v])) as unknown as HeadTelemetry;
    const prev = this.previous ?? m;
    this.previous = { ...m };
    const ax = (m.velocityX - prev.velocityX) / t;
    const ay = (m.velocityY - prev.velocityY) / t;
    const alpha = 1 - Math.exp(-11 * t);
    this.acceleration += (clamp(ax, 30) - this.acceleration) * alpha;
    this.verticalAcceleration += (clamp(ay, 45) - this.verticalAcceleration) * alpha;
    // Counter-pitch stabilizes gaze on slopes. Forward acceleration tips the head back.
    // Airborne gravity is not a road impact; only grounded vertical acceleration is used.
    const localAcceleration = this.acceleration * Math.cos(m.pitch) +
      this.verticalAcceleration * Math.sin(m.pitch);
    // Controls were previously ignored by BikeRig: react immediately to each press/release,
    // then follow the measured acceleration. Brake wins if both pedals are held.
    const gas = Boolean(m.throttle && !m.brake), brake = Boolean(m.brake);
    const prevGas = Boolean(prev.throttle && !prev.brake), prevBrake = Boolean(prev.brake);
    if (gas && !prevGas) this.speed -= 1.0;
    if (brake && !prevBrake) this.speed += 1.3;
    if (!gas && prevGas && !brake) this.speed += .35;
    if (!brake && prevBrake && !gas) this.speed -= .35;
    const pedalLoad = brake ? .12 : gas ? -.09 : 0;
    const target = clamp(pedalLoad - localAcceleration * 0.012 + clamp(m.pitch, 1) * 0.10 +
      clamp(m.angularVelocity, 6) * 0.045 +
      (m.grounded ? clamp(this.verticalAcceleration, 25) * 0.0020 : 0), HEAD_LIMIT * 0.8);
    // Events are delivered once by PhysicsWorld. Impact strength controls angular impulse.
    const impact = Math.max(0, m.landing - 1.2) * 0.28 + Math.max(0, m.obstacleHit) * 0.22;
    this.speed += Math.min(3.7, impact);
    // Small fixed substeps avoid unstable springs after frame drops.
    const steps = Math.max(1, Math.ceil(t * 240));
    const h = t / steps;
    for (let i = 0; i < steps; i++) {
      this.speed += ((target - this.angle) * 45 - this.speed * 4.6) * h;
      this.angle += this.speed * h;
      if (Math.abs(this.angle) > HEAD_LIMIT) {
        this.angle = clamp(this.angle, HEAD_LIMIT);
        if (this.speed * this.angle > 0) this.speed = 0;
      }
    }
    return this.angle;
  }
}
