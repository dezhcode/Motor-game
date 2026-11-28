import { sampleTrackHeight, type TrackDefinition } from './desertTrackData';
export interface Pickup { id: string; kind: 'coin' | 'fuel'; x: number; y: number; collected: boolean }
export interface CollectedPickup extends Omit<Pickup, 'collected'> { amount: number }
export class RideCollectibles {
  readonly pickups: Pickup[] = [];
  coins = 0;
  fuel = 1;
  private previous: {x: number; y: number} | null = null;
  constructor(track: TrackDefinition) {
    // Short, closely spaced trails follow the road instead of isolated airborne dots.
    let index = 0;
    for (let groupX = track.startX + 5, group = 0; groupX < track.finishX - 3; groupX += 9.2, group++) {
      for (let j = 0; j < 7; j++, index++) {
        const x = groupX + j * .95;
        if (x >= track.finishX - 2) break;
        const y = sampleTrackHeight(track, x);
        const slopeRise = sampleTrackHeight(track,x+.5) - sampleTrackHeight(track,x-.5);
        if (y < -2 || Math.abs(slopeRise) > .8) continue;
        const kind = group % 4 === 2 && j === 6 ? 'fuel' : 'coin';
        this.pickups.push({id:`pickup:${index}`,kind,x,y:y+(kind === 'fuel' ? .62 : .55),collected:false});
      }
    }
  }
  reset(): void {this.coins=0;this.fuel=1;this.previous=null;this.pickups.forEach(p=>p.collected=false);}
  update(dt: number, x: number, y: number, throttle: boolean, consume: boolean): CollectedPickup[] {
    const collected: CollectedPickup[] = [];
    if(consume)this.fuel=Math.max(0,this.fuel-dt*(throttle?.013:.002));
    const a=this.previous??{x,y},dx=x-a.x,dy=y-a.y,len=dx*dx+dy*dy;
    for(const p of this.pickups){
      if(p.collected)continue;
      const t=len?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/len)):0;
      if(Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)>1.05)continue;
      const amount = p.kind === 'coin' ? 1 : Math.min(.42, 1 - this.fuel);
      p.collected=true;if(p.kind==='coin')this.coins++;else this.fuel=Math.min(1,this.fuel+.42);
      collected.push({ id: p.id, kind: p.kind, x: p.x, y: p.y, amount });
    }
    this.previous={x,y};
    return collected;
  }
}
