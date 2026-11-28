import { describe, expect, it } from 'vitest';
import { PickupDeliveryQueue, samplePickupFlight } from '../effects/PickupFlightModel';
import { pickupNotes } from '../effects/PickupSound';

const coin = {id:'coin:1',kind:'coin' as const,x:10,y:2,amount:1};
const fuel = {id:'fuel:1',kind:'fuel' as const,x:11,y:2,amount:.1};
describe('Pickup display delivery',()=>{
  it('holds each display credit until its own arrival and delivers it only once',()=>{
    const queue=new PickupDeliveryQueue();
    queue.add(coin,{x:400,y:300},42);queue.add(fuel,{x:450,y:310},56);
    expect(queue.pending('coin')).toBe(1);expect(queue.pending('fuel')).toBeCloseTo(.1);
    expect(queue.update(.5)).toEqual([]);
    expect(queue.update(0)).toEqual([]); // Paused animation cannot deliver rewards.
    expect(queue.pending('coin')).toBe(1);
    expect(queue.update(.15)).toEqual([coin]);expect(queue.pending('coin')).toBe(0);
    expect(queue.pending('fuel')).toBeCloseTo(.1);
    expect(queue.update(.2)).toEqual([fuel]);expect(queue.update(1)).toEqual([]);
  });
  it('clears flights on restart and bounds effect load without inventing pending credits',()=>{
    const queue=new PickupDeliveryQueue();
    for(let i=0;i<32;i++) expect(queue.add({...coin,id:String(i)},{x:400,y:300},42)).not.toBeNull();
    expect(queue.add(coin,{x:400,y:300},42)).toBeNull();expect(queue.pending('coin')).toBe(32);
    queue.clear();expect(queue.pending('coin')).toBe(0);expect(queue.update(10)).toEqual([]);
  });
  it('starts exactly at the collected item and ends at the measured HUD icon in any viewport',()=>{
    for(const target of [{x:43,y:29},{x:52,y:115}]){
      const start={x:560,y:430};
      expect(samplePickupFlight(start,target,0)).toEqual(start);
      expect(samplePickupFlight(start,target,1)).toEqual(target);
      expect(samplePickupFlight(start,target,2)).toEqual(target);
      const early=samplePickupFlight(start,target,.2),late=samplePickupFlight(start,target,.9);
      expect(early.y).toBeLessThan(start.y);
      expect(Math.hypot(late.x-target.x,late.y-target.y)).toBeLessThan(Math.hypot(early.x-target.x,early.y-target.y));
    }
  });
});
describe('Pickup sound cues',()=>{
  it('gives coins a brief bounded rising streak and fuel a distinct lower refill cue',()=>{
    const first=pickupNotes('coin',0),streak=pickupNotes('coin',99),fuelNotes=pickupNotes('fuel');
    expect(streak[0].frequency).toBeGreaterThan(first[0].frequency);
    expect(streak).toEqual(pickupNotes('coin',5));
    expect(fuelNotes[0].frequency).toBeLessThan(first[0].frequency/2);
    for(const note of [...first,...streak,...fuelNotes]){
      expect(note.gain).toBeLessThanOrEqual(.085);
      expect(note.offset+note.duration).toBeLessThan(.4);
      expect(note.endFrequency).toBeGreaterThan(0);
    }
  });
});
