import { sampleTrackHeight, type TrackDefinition } from './desertTrackData';
export interface Pickup { id: string; kind: 'coin' | 'fuel'; x: number; y: number; collected: boolean }
export class RideCollectibles {
  readonly pickups: Pickup[] = [];
  coins = 0;
  fuel = 1;
  private previous: {x: number; y: number} | null = null;
  constructor(track: TrackDefinition) {
    for (let x = track.startX + 7, i = 0; x < track.finishX - 3; x += 4, i++) {
      const y = sampleTrackHeight(track, x);
      if (y < -2 || Math.abs(sampleTrackHeight(track,x+1)-sampleTrackHeight(track,x-1)) > 2) continue;
      const kind = i % 14 === 6 ? 'fuel' : 'coin';
      this.pickups.push({id:`pickup:${i}`,kind,x,y:y+1.1,collected:false});
    }
  }
  reset(): void {this.coins=0;this.fuel=1;this.previous=null;this.pickups.forEach(p=>p.collected=false);}
  update(dt: number, x: number, y: number, throttle: boolean, consume: boolean): void {
    if(consume)this.fuel=Math.max(0,this.fuel-dt*(throttle?.013:.002));
    const a=this.previous??{x,y},dx=x-a.x,dy=y-a.y,len=dx*dx+dy*dy;
    for(const p of this.pickups){
      if(p.collected)continue;
      const t=len?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/len)):0;
      if(Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)>1.05)continue;
      p.collected=true;if(p.kind==='coin')this.coins++;else this.fuel=Math.min(1,this.fuel+.42);
    }
    this.previous={x,y};
  }
}
