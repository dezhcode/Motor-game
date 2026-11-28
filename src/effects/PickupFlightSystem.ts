import type { GameArtwork } from '../artwork/GameArtwork';
import type { CollectedPickup } from '../track/RideCollectibles';
import { PICKUP_DOCK_START, PICKUP_LIFT_END, PickupDeliveryQueue, samplePickupFlight,
  type FlightPoint, type PickupFlight, type PickupTargets } from './PickupFlightModel';

interface FlightArt { image: CanvasImageSource; sx: number; sy: number; sw: number; sh: number }

/** A transparent DOM canvas above the HUD, sharing the already loaded artwork. */
export class PickupFlightSystem {
  readonly queue = new PickupDeliveryQueue();
  private readonly canvas = document.createElement('canvas');
  private readonly context = this.canvas.getContext('2d');
  private readonly art = new Map<PickupFlight, FlightArt>();
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  private width = 1;
  private height = 1;
  private resolution = 1;

  constructor() {
    this.canvas.className = 'pickup-flight-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
  }

  mount(host: HTMLElement): void { host.replaceChildren(this.canvas); }

  resize(width: number, height: number): void {
    const resolution = Math.min(window.devicePixelRatio || 1, 2);
    if (width === this.width && height === this.height && resolution === this.resolution) return;
    this.width = width; this.height = height; this.resolution = resolution;
    this.canvas.width = Math.max(1, Math.round(width * resolution));
    this.canvas.height = Math.max(1, Math.round(height * resolution));
  }

  setVisible(visible: boolean): void { this.canvas.style.visibility = visible ? 'visible' : 'hidden'; }

  add(pickup: CollectedPickup, start: FlightPoint, size: number, artwork: GameArtwork): boolean {
    if (!this.context || !this.canvas.isConnected || this.reducedMotion.matches) return false;
    const texture = artwork[pickup.kind];
    const image = texture.source.resource as CanvasImageSource | undefined;
    if (!image) return false;
    const flight = this.queue.add(pickup, start, size);
    if (!flight) return false;
    const {x:sx,y:sy,width:sw,height:sh} = texture.frame;
    this.art.set(flight, {image,sx,sy,sw,sh});
    return true;
  }

  update(dt: number, targets: PickupTargets): CollectedPickup[] {
    const arrived = this.queue.update(this.reducedMotion.matches ? 10 : dt);
    for (const flight of this.art.keys()) if (!this.queue.flights.includes(flight)) this.art.delete(flight);
    this.draw(targets);
    return arrived;
  }

  private draw(targets: PickupTargets): void {
    const ctx = this.context;
    if (!ctx) return;
    ctx.setTransform(this.resolution,0,0,this.resolution,0,0);
    ctx.clearRect(0,0,this.width,this.height);
    for (const [flight, art] of this.art) {
      const t = flight.elapsed / flight.duration;
      const target = targets[flight.pickup.kind];
      const point = samplePickupFlight(flight.start,target,t);
      const travel = Math.max(0,Math.min(1,(t-PICKUP_LIFT_END)/(PICKUP_DOCK_START-PICKUP_LIFT_END)));
      const finalSize = target.size ?? 32;
      const size = t < PICKUP_LIFT_END ? flight.size * (1 + .13*Math.sin(t/PICKUP_LIFT_END*Math.PI)) :
        flight.size + (finalSize-flight.size)*travel;
      const merging = t >= PICKUP_DOCK_START;
      const color = flight.pickup.kind === 'coin' ? '#ffd65b' : '#70fff0';

      ctx.save();
      // Fade only the decorative trail, never the pickup before it reaches its icon.
      ctx.fillStyle = color;
      for (let j=4;j>=1;j--) {
        const tail = samplePickupFlight(flight.start,target,Math.max(0,t-j*.025));
        ctx.globalAlpha = merging ? 0 : (1-j/5)*.32;
        ctx.beginPath(); ctx.arc(tail.x,tail.y,Math.max(1,size*.08*(1-j/6)),0,Math.PI*2);ctx.fill();
      }
      ctx.translate(point.x,point.y);
      ctx.globalAlpha = .2;
      const halo = ctx.createRadialGradient(0,0,0,0,0,size*.7);
      halo.addColorStop(0,color);halo.addColorStop(1,'transparent');
      ctx.fillStyle=halo;ctx.beginPath();ctx.arc(0,0,size*.7,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=1;
      ctx.rotate(merging ? 0 : Math.sin(t*Math.PI*4)*.14);
      const spin = flight.pickup.kind === 'coin' && !merging ? .8+.2*Math.abs(Math.cos(travel*Math.PI*3)) : 1;
      const width=size*art.sw/art.sh*spin;
      ctx.drawImage(art.image,art.sx,art.sy,art.sw,art.sh,-width/2,-size/2,width,size);
      if (!merging) {
        ctx.fillStyle=color;ctx.globalAlpha=Math.sin(t*Math.PI)*.85;
        for(let i=0;i<6;i++) {
          const angle=i*Math.PI/3+t*2,radius=size*.6;
          const x=Math.cos(angle)*radius,y=Math.sin(angle)*radius;
          ctx.beginPath();ctx.moveTo(x,y-3);ctx.lineTo(x+1,y-1);ctx.lineTo(x+3,y);ctx.lineTo(x+1,y+1);
          ctx.lineTo(x,y+3);ctx.lineTo(x-1,y+1);ctx.lineTo(x-3,y);ctx.lineTo(x-1,y-1);ctx.closePath();ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  clear(): void {
    this.queue.clear();this.art.clear();
    this.context?.clearRect(0,0,this.canvas.width,this.canvas.height);
  }
  destroy(): void { this.clear(); this.canvas.remove(); this.canvas.width=this.canvas.height=1; }
}
