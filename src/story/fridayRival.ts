import type { ControlState } from '../input/InputManager';
import { PhysicsWorld, type PhysicsSnapshot } from '../physics/PhysicsWorld';
import { vehiclePhysics } from '../vehicles/vehicleCatalog';
import { FRIDAY_TRACK } from './fridayTrack';

const coast: ControlState = {
  throttle: false, brake: false, leanLeft: false, leanRight: false, anyActive: false,
};

export class FridayRival {
  private readonly world = new PhysicsWorld(FRIDAY_TRACK, vehiclePhysics('sport'));
  private heldAtCrest = false;
  private releaseUntil = 0;
  private elapsed = 0;
  pose = this.world.step(0, coast, false);
  controls = coast;

  constructor() {
    this.world.reset({ startX: FRIDAY_TRACK.startX - 1.3 });
    this.pose = this.world.step(0, coast, false);
  }

  step(dt: number, started: boolean): void {
    if (this.pose.finished || this.pose.crashedReason) return;
    this.elapsed += started ? dt : 0;
    this.controls = started ? this.raceControls(this.pose) : coast;
    this.pose = this.world.step(dt, this.controls, true);
  }

  private raceControls(snap: PhysicsSnapshot): ControlState {
    const air = !snap.frontGrounded && !snap.rearGrounded;
    if (!this.heldAtCrest && snap.chassis.x >= 128) {
      this.heldAtCrest = true;
      this.releaseUntil = this.elapsed + .62;
    }
    const throttle = this.elapsed > .42 && this.elapsed >= this.releaseUntil && (!air || snap.chassis.angle < .04);
    const brake = air && snap.chassis.angle > .18;
    return { ...coast, throttle, brake, anyActive: throttle || brake };
  }
}
