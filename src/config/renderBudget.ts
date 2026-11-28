/** Bound fill-rate on dense phone screens while keeping HTML HUD text at native resolution. */
export function renderResolution(width:number,height:number,dpr:number):number {
  const pixels=Math.max(1,width*height);
  return Math.max(.75,Math.min(dpr,1.5,Math.sqrt(1_500_000/pixels)));
}
