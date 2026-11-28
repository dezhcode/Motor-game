import { describe, expect, it } from 'vitest';
import { RideCollectibles } from '../track/RideCollectibles';
import { DESERT_TRACK, sampleTrackHeight } from '../track/desertTrackData';

describe('Race collectibles',()=>{
 it('collects along a fast swept movement once, then restores pickups on restart',()=>{
  const ride=new RideCollectibles(DESERT_TRACK),p=ride.pickups.find(p=>p.kind==='coin')!;
  ride.update(0,p.x-2,p.y,false,false);ride.update(.05,p.x+2,p.y,false,false);
  expect(p.collected).toBe(true);expect(ride.coins).toBeGreaterThanOrEqual(3);
  const once = ride.coins;
  ride.update(.05,p.x,p.y,false,false);expect(ride.coins).toBe(once);
  ride.reset();expect(p.collected).toBe(false);expect(ride.coins).toBe(0);expect(ride.fuel).toBe(1);
 });
 it('requires vertical proximity and avoids pit floors and steep discontinuities',()=>{
  const ride=new RideCollectibles(DESERT_TRACK),p=ride.pickups[0];ride.update(.05,p.x,p.y+4,false,false);expect(p.collected).toBe(false);
  for(const p of ride.pickups){expect(sampleTrackHeight(DESERT_TRACK,p.x)).toBeGreaterThanOrEqual(-2);expect(Math.abs(sampleTrackHeight(DESERT_TRACK,p.x+1)-sampleTrackHeight(DESERT_TRACK,p.x-1))).toBeLessThanOrEqual(2);}
 });
 it('consumes fuel only during active race time, refills on pickup, and clamps to capacity',()=>{
  const ride=new RideCollectibles(DESERT_TRACK),p=ride.pickups.find(p=>p.kind==='fuel')!;
  ride.update(10,0,20,true,false);expect(ride.fuel).toBe(1);
  ride.update(50,0,20,true,true);expect(ride.fuel).toBeCloseTo(.35);
  // A new run starts with a new sweep origin; test the pickup without teleporting across the level.
  ride.reset();ride.fuel=.3;ride.update(0,p.x,p.y,false,false);expect(ride.fuel).toBeCloseTo(.72);
  ride.update(1000,0,20,true,true);expect(ride.fuel).toBe(0);
 });
});
