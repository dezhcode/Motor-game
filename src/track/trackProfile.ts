import type { TrackDefinition, TrackPoint } from './desertTrackData';

const profiles = new WeakMap<TrackDefinition, TrackPoint[]>();

/** Shape-preserving cubic interpolation: round corners without overshooting pit/ridge heights. */
export function buildSmoothProfile(points: readonly TrackPoint[], maxStep = .25): TrackPoint[] {
  if (points.length < 2) return points.map(p => ({...p}));
  // Some authoring joins repeat a waypoint; keep one strictly increasing vertex.
  const nodes: TrackPoint[] = [];
  for (const p of points) {
    if (nodes.length && Math.abs(p.x-nodes.at(-1)!.x)<1e-8) nodes[nodes.length-1]={...p};
    else nodes.push({...p});
  }
  const n=nodes.length,h:number[]=[],d:number[]=[],m:number[]=[];
  for(let i=0;i<n-1;i++) {h.push(nodes[i+1].x-nodes[i].x);d.push((nodes[i+1].y-nodes[i].y)/h[i]);}
  m[0]=d[0];m[n-1]=d[n-2];
  for(let i=1;i<n-1;i++) {
    if(d[i-1]*d[i]<=0) m[i]=0;
    else {const w1=2*h[i]+h[i-1],w2=h[i]+2*h[i-1];m[i]=(w1+w2)/(w1/d[i-1]+w2/d[i]);}
  }
  const out:TrackPoint[]=[];
  for(let i=0;i<n-1;i++) {
    const a=nodes[i],b=nodes[i+1];
    const linear=Math.abs(m[i]-d[i])<1e-10 && Math.abs(m[i+1]-d[i])<1e-10;
    const bend=Math.max(Math.abs(m[i]-d[i]),Math.abs(m[i+1]-d[i]));
    const step=bend>.6?Math.min(maxStep,.04):bend>.2?Math.min(maxStep,.1):maxStep;
    const count=linear?1:Math.max(1,Math.ceil(h[i]/step));
    for(let j=0;j<count;j++) {
      const t=j/count,t2=t*t,t3=t2*t;
      out.push({x:a.x+h[i]*t,y:(2*t3-3*t2+1)*a.y+(t3-2*t2+t)*h[i]*m[i]+(-2*t3+3*t2)*b.y+(t3-t2)*h[i]*m[i+1]});
    }
  }
  out.push({...nodes[n-1]});
  return out;
}

/** The exact same bounded polyline is used by collision, painted ground and sampling. */
export function terrainProfile(track: TrackDefinition): TrackPoint[] {
  let profile=profiles.get(track);
  if(!profile) {profile=buildSmoothProfile(track.points);profiles.set(track,profile);}
  return profile;
}

export function lowerBoundX(points: readonly {x:number}[], x:number): number {
  let lo=0,hi=points.length;
  while(lo<hi) {const mid=(lo+hi)>>>1;if(points[mid].x<x)lo=mid+1;else hi=mid;}
  return lo;
}

export function profileHeight(points: readonly TrackPoint[],x:number):number {
  const next=lowerBoundX(points,x);
  if(next===0)return points[0].y;
  if(next===points.length)return points.at(-1)!.y;
  const a=points[next-1],b=points[next];
  return a.y+(b.y-a.y)*(x-a.x)/(b.x-a.x);
}
