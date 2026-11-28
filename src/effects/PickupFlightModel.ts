import type { CollectedPickup } from '../track/RideCollectibles';

export interface FlightPoint { x: number; y: number }
export type PickupTargets = Record<'coin' | 'fuel', FlightPoint & { size?: number }>;
export interface PickupFlight {
  pickup: CollectedPickup;
  start: FlightPoint;
  size: number;
  elapsed: number;
  duration: number;
}

export const PICKUP_LIFT_END = .22;
export const PICKUP_DOCK_START = .9;

/** Visible vertical lift, magnetic attraction, then a brief merge ON the HUD icon. */
export function samplePickupFlight(start: FlightPoint, target: FlightPoint, progress: number): FlightPoint {
  const p = Math.max(0, Math.min(1, progress));
  const lift = Math.min(54, Math.max(24, Math.abs(start.y - target.y) * .11));
  if (p < PICKUP_LIFT_END) {
    const rise = p / PICKUP_LIFT_END;
    return {x:start.x,y:start.y - lift * rise * rise * (3 - 2 * rise)};
  }
  if (p >= PICKUP_DOCK_START) return {x:target.x,y:target.y};
  const t = Math.pow((p - PICKUP_LIFT_END) / (PICKUP_DOCK_START - PICKUP_LIFT_END), 1.5), u = 1 - t;
  const liftedY = start.y - lift;
  const approachX = target.x + Math.max(30, Math.abs(start.x - target.x) * .18);
  const approachY = target.y + Math.min(70, Math.abs(liftedY - target.y) * .12);
  return {
    x: u*u*u*start.x + 3*u*u*t*start.x + 3*u*t*t*approachX + t*t*t*target.x,
    y: u*u*u*liftedY + 3*u*u*t*(liftedY - 8) + 3*u*t*t*approachY + t*t*t*target.y,
  };
}

/** Gameplay rewards commit at contact; only the displayed credit waits for arrival. */
export class PickupDeliveryQueue {
  readonly flights: PickupFlight[] = [];
  add(pickup: CollectedPickup, start: FlightPoint, size: number): PickupFlight | null {
    if (this.flights.length >= 32) return null;
    const flight = { pickup, start, size, elapsed: 0, duration: pickup.kind === 'coin' ? .78 : .9 };
    this.flights.push(flight);
    return flight;
  }
  pending(kind: 'coin' | 'fuel'): number {
    return this.flights.reduce((total, flight) => total + (flight.pickup.kind === kind ? flight.pickup.amount : 0), 0);
  }
  update(dt: number): CollectedPickup[] {
    const arrived: CollectedPickup[] = [];
    for (let i = this.flights.length - 1; i >= 0; i--) {
      const flight = this.flights[i];
      flight.elapsed += Math.max(0, dt);
      if (flight.elapsed >= flight.duration) {
        arrived.push(flight.pickup);
        this.flights.splice(i, 1);
      }
    }
    return arrived;
  }
  clear(): void { this.flights.length = 0; }
}
