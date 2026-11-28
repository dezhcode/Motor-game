import { Container, Graphics, Sprite } from 'pixi.js';
import type { GameArtwork } from '../artwork/GameArtwork';
import type { CollectedPickup } from '../track/RideCollectibles';
import { PickupDeliveryQueue, samplePickupFlight, type FlightPoint, type PickupFlight, type PickupTargets } from './PickupFlightModel';

interface FlightArt { root: Container; icon: Sprite; glow: Graphics; trail: Graphics; sparks: Graphics[] }

/** Screen-space sprites stay independent of camera scrolling and bike physics. */
export class PickupFlightSystem {
  readonly container = new Container();
  readonly queue = new PickupDeliveryQueue();
  private readonly art = new Map<PickupFlight, FlightArt>();
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  add(pickup: CollectedPickup, start: FlightPoint, size: number, artwork: GameArtwork): boolean {
    if (this.reducedMotion.matches) return false;
    const flight = this.queue.add(pickup, start, size);
    if (!flight) return false;
    const root = new Container(), icon = new Sprite(artwork[pickup.kind]);
    const color = pickup.kind === 'coin' ? 0xffd65b : 0x70fff0;
    const glow = new Graphics().circle(0, 0, size * .63).fill({color, alpha:.12})
      .circle(0, 0, size * .43).fill({color, alpha:.16});
    const trail = new Graphics();
    icon.anchor.set(.5);
    icon.height = size;
    icon.width = size * icon.texture.width / icon.texture.height;
    root.addChild(glow, icon);
    const sparks = Array.from({length:6}, () => new Graphics()
      .poly([0,-4,1.2,-1.2,4,0,1.2,1.2,0,4,-1.2,1.2,-4,0,-1.2,-1.2]).fill(color));
    root.addChild(...sparks);
    root.position.set(start.x, start.y);
    this.container.addChild(trail, root);
    this.art.set(flight, {root, icon, glow, trail, sparks});
    return true;
  }

  update(dt: number, targets: PickupTargets): CollectedPickup[] {
    const arrived = this.queue.update(this.reducedMotion.matches ? 10 : dt);
    for (const [flight, visual] of this.art) {
      if (!this.queue.flights.includes(flight)) {
        visual.root.destroy({children:true}); visual.trail.destroy(); this.art.delete(flight);
        continue;
      }
      const t = flight.elapsed / flight.duration;
      const target = targets[flight.pickup.kind];
      const point = samplePickupFlight(flight.start, target, t);
      visual.root.position.set(point.x, point.y);
      const scale = 1 + Math.sin(Math.min(1, t * 4) * Math.PI) * .22 - t * .55;
      visual.root.scale.set(scale);
      visual.icon.width = flight.size * visual.icon.texture.width / visual.icon.texture.height *
        (flight.pickup.kind === 'coin' ? .65 + .35 * Math.abs(Math.cos(t * Math.PI * 3)) : 1);
      visual.icon.rotation = flight.pickup.kind === 'fuel' ? Math.sin(t * Math.PI * 2) * .16 : -.16 + t * .35;
      visual.root.alpha = t > .92 ? (1 - t) / .08 : 1;
      visual.glow.alpha = .65 + Math.sin(t * Math.PI) * .35;
      const color = flight.pickup.kind === 'coin' ? 0xffd65b : 0x70fff0;
      visual.trail.clear();
      for (let j = 4; j >= 1; j--) {
        const tail = samplePickupFlight(flight.start, target, Math.max(0, t - j * .028));
        visual.trail.circle(tail.x, tail.y, Math.max(1, flight.size * .1 * (1 - j / 6)))
          .fill({color, alpha:(1 - j / 5) * .32});
      }
      visual.sparks.forEach((spark, i) => {
        const angle = i * Math.PI / 3 + t * 2;
        const radius = flight.size * (.5 + .25 * Math.sin(t * Math.PI));
        spark.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius);
        spark.alpha = Math.sin(t * Math.PI) * .85;
        spark.scale.set(.5 + (i % 3) * .16);
      });
    }
    return arrived;
  }
  clear(): void {
    this.queue.clear();
    this.container.removeChildren().forEach(child => child.destroy({children:true}));
    this.art.clear();
  }
  destroy(): void { this.clear(); this.container.destroy(); }
}
