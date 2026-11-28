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

export const PICKUP_DOCK_START = .9;

/** One easing curve with zero velocity/acceleration at launch and docking. */
export function pickupFlightProgress(progress: number): number {
  const t = Math.max(0, Math.min(1, progress / PICKUP_DOCK_START));
  return t*t*t*(t*(t*6-15)+10);
}

/** Gently become translucent after contact, staying visible over the HUD. */
export function pickupFlightOpacity(progress: number): number {
  const t = Math.max(0, Math.min(1, progress / .12));
  return 1 - .28*t*t*(3-2*t);
}

/** A single continuous arc: mostly upward at launch, gradually bending toward the HUD. */
export function samplePickupFlight(start: FlightPoint, target: FlightPoint, progress: number): FlightPoint {
  const t = pickupFlightProgress(progress), u = 1-t;
  const dx = target.x-start.x;
  const lift = Math.min(70,Math.max(30,Math.abs(start.y-target.y)*.2));
  const approachX = target.x-dx*.18;
  const approachY = target.y+Math.min(45,Math.abs(start.y-target.y)*.08);
  return {
    x: u*u*u*start.x + 3*u*u*t*(start.x+dx*.04) + 3*u*t*t*approachX + t*t*t*target.x,
    y: u*u*u*start.y + 3*u*u*t*(start.y-lift) + 3*u*t*t*approachY + t*t*t*target.y,
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
