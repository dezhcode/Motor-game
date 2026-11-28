import type { GameArtwork } from '../artwork/GameArtwork';
import type { CollectedPickup } from '../track/RideCollectibles';
import { renderResolution } from '../config/renderBudget';
import { PICKUP_DOCK_START, pickupFlightOpacity, pickupFlightProgress, PickupDeliveryQueue, samplePickupFlight,
  type FlightPoint, type PickupFlight, type PickupTargets } from './PickupFlightModel';

interface FlightArt { image: CanvasImageSource; sx: number; sy: number; sw: number; sh: number }
interface DirtyRect {left:number;top:number;right:number;bottom:number}

function makeHalo(color:string):HTMLCanvasElement {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const ctx=canvas.getContext('2d');
  if(ctx) {const glow=ctx.createRadialGradient(32,32,0,32,32,32);glow.addColorStop(0,color);glow.addColorStop(1,'transparent');ctx.fillStyle=glow;ctx.fillRect(0,0,64,64);}
  return canvas;
}

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
  private dirty:DirtyRect|null=null;
  private readonly halos={coin:makeHalo('#ffd65b'),fuel:makeHalo('#70fff0')};

  constructor() {
    this.canvas.className = 'pickup-flight-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
  }

  mount(host: HTMLElement): void { host.replaceChildren(this.canvas); }

  resize(width: number, height: number): void {
    const resolution = renderResolution(width,height,window.devicePixelRatio||1);
    if (width === this.width && height === this.height && resolution === this.resolution) return;
    this.width = width; this.height = height; this.resolution = resolution;
    this.canvas.width = Math.max(1, Math.round(width * resolution));
    this.canvas.height = Math.max(1, Math.round(height * resolution));
    this.dirty=null;
  }

  setVisible(visible: boolean): void { const value=visible?'visible':'hidden';if(this.canvas.style.visibility!==value)this.canvas.style.visibility=value; }

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
    if (!ctx || (!this.art.size && !this.dirty)) return;
    ctx.setTransform(this.resolution,0,0,this.resolution,0,0);
    if(this.dirty)ctx.clearRect(this.dirty.left,this.dirty.top,this.dirty.right-this.dirty.left,this.dirty.bottom-this.dirty.top);
    this.dirty=null;
    for (const [flight, art] of this.art) {
      const t = flight.elapsed / flight.duration;
      const target = targets[flight.pickup.kind];
      const point = samplePickupFlight(flight.start,target,t);
      const travel = pickupFlightProgress(t);
      const opacity = pickupFlightOpacity(t);
      const finalSize = target.size ?? 32;
      const size = flight.size + (finalSize-flight.size)*travel + flight.size*.08*Math.sin(Math.PI*travel);
      const merging = t >= PICKUP_DOCK_START;
      const color = flight.pickup.kind === 'coin' ? '#ffd65b' : '#70fff0';
      this.includeDirty(point.x,point.y,size*.9+8);

      ctx.save();
      // Slight translucency after contact, with no disappearance before docking.
      ctx.fillStyle = color;
      for (let j=4;j>=1;j--) {
        const tail = samplePickupFlight(flight.start,target,Math.max(0,t-j*.025));
        if(!merging)this.includeDirty(tail.x,tail.y,size*.1+3);
        ctx.globalAlpha = merging ? 0 : (1-j/5)*.32*opacity;
        ctx.beginPath(); ctx.arc(tail.x,tail.y,Math.max(1,size*.08*(1-j/6)),0,Math.PI*2);ctx.fill();
      }
      ctx.translate(point.x,point.y);
      ctx.globalAlpha = .2*opacity;
      ctx.drawImage(this.halos[flight.pickup.kind],-size*.7,-size*.7,size*1.4,size*1.4);
      ctx.globalAlpha=opacity;
      ctx.rotate(Math.sin(travel*Math.PI*4)*.14*(1-travel));
      const spin = flight.pickup.kind === 'coin' ? 1-.18*Math.pow(Math.sin(travel*Math.PI*3),2) : 1;
      const width=size*art.sw/art.sh*spin;
      ctx.drawImage(art.image,art.sx,art.sy,art.sw,art.sh,-width/2,-size/2,width,size);
      if (!merging) {
        ctx.fillStyle=color;ctx.globalAlpha=Math.sin(t*Math.PI)*.85*opacity;
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

  private includeDirty(x:number,y:number,radius:number):void {
    const left=Math.max(0,Math.floor(x-radius)),top=Math.max(0,Math.floor(y-radius));
    const right=Math.min(this.width,Math.ceil(x+radius)),bottom=Math.min(this.height,Math.ceil(y+radius));
    if (right <= left || bottom <= top) return;
    if(this.dirty){this.dirty.left=Math.min(this.dirty.left,left);this.dirty.top=Math.min(this.dirty.top,top);this.dirty.right=Math.max(this.dirty.right,right);this.dirty.bottom=Math.max(this.dirty.bottom,bottom);}
    else this.dirty={left,top,right,bottom};
  }

  clear(): void {
    this.queue.clear();this.art.clear();
    if(this.dirty)this.context?.clearRect(this.dirty.left,this.dirty.top,this.dirty.right-this.dirty.left,this.dirty.bottom-this.dirty.top);
    this.dirty=null;
  }
  destroy(): void { this.clear(); this.canvas.remove(); this.canvas.width=this.canvas.height=1; }
}
