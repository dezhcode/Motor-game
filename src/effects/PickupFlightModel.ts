import type { CollectedPickup } from '../track/RideCollectibles';

export interface FlightPoint { x: number; y: number }
export type PickupTargets = Record<'coin' | 'fuel', FlightPoint>;
export interface PickupFlight {
  pickup: CollectedPickup;
  start: FlightPoint;
  size: number;
  elapsed: number;
  duration: number;
}

/** Starts with a small lift, then accelerates into the matching HUD icon. */
export function samplePickupFlight(start: FlightPoint, target: FlightPoint, progress: number): FlightPoint {
  const t = Math.pow(Math.max(0, Math.min(1, progress)), 1.55), u = 1 - t;
  const lift = Math.min(95, Math.max(38, Math.abs(start.y - target.y) * .3));
  return {
    x: u*u*u*start.x + 3*u*u*t*(start.x + 38) + 3*u*t*t*(target.x + 95) + t*t*t*target.x,
    y: u*u*u*start.y + 3*u*u*t*(start.y - lift) + 3*u*t*t*(target.y + 8) + t*t*t*target.y,
  };
}

/** Gameplay rewards commit at contact; only the displayed credit waits for arrival. */
export class PickupDeliveryQueue {
  readonly flights: PickupFlight[] = [];
  add(pickup: CollectedPickup, start: FlightPoint, size: number): PickupFlight | null {
    if (this.flights.length >= 32) return null;
    const flight = { pickup, start, size, elapsed: 0, duration: pickup.kind === 'coin' ? .64 : .78 };
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
