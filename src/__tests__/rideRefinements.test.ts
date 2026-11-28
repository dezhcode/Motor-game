import { describe, expect, it } from 'vitest';
import { passingVillageX } from '../artwork/SceneryPlan';
import { HeadDynamics, type HeadTelemetry } from '../bike/HeadDynamics';
import { FollowCamera } from '../camera/FollowCamera';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { DESERT_TRACK, sampleTrackHeight } from '../track/desertTrackData';
import { RideCollectibles } from '../track/RideCollectibles';
import { DEFAULT_CONTROL_LAYOUT } from '../storage/settingsStorage';
import { resolveControlLayout, resolveDrivePlacement } from '../input/controlLayout';
import type { ControlState } from '../input/InputManager';
const idle: ControlState = {throttle:false,brake:false,leanLeft:false,leanRight:false,anyActive:false};

describe('Two-pedal riding and closer presentation',()=>{
 it('raises and lowers the physical front axle in flight using only gas/brake',()=>{
  const air = {...DESERT_TRACK, startY:15};
  const run=(control: ControlState)=>{const world=new PhysicsWorld(air);let s=world.step(0,idle,false);for(let i=0;i<24;i++)s=world.step(1/60,control,true);return s;};
  const gas=run({...idle,throttle:true,anyActive:true}),brake=run({...idle,brake:true,anyActive:true}),coast=run(idle);
  expect(gas.frontWheel.y-gas.rearWheel.y).toBeGreaterThan(coast.frontWheel.y-coast.rearWheel.y+.1);
  expect(brake.frontWheel.y-brake.rearWheel.y).toBeLessThan(coast.frontWheel.y-coast.rearWheel.y-.1);
  expect(gas.chassisAngularVelocity).toBeGreaterThan(0);expect(brake.chassisAngularVelocity).toBeLessThan(0);
 });
 it('keeps a larger bike in the left riding corridor and leaves instruments clear on phones',()=>{
  for(const [width,height] of [[844,390],[960,432],[1280,720],[1536,690]]){
   const cam=new FollowCamera();cam.setViewport(width,height);cam.reset(4,1);let view=cam.update(4,1,0,1/60);
   expect(view.scale).toBeGreaterThan(Math.min(height/720,width/1120)*2);
   const x=width*.5+(4-view.worldX)*44*view.scale;
   expect(x).toBeGreaterThan(width*.2);expect(x).toBeLessThan(width*.4);
   const layout=resolveControlLayout(DEFAULT_CONTROL_LAYOUT,{width,height,safeLeft:0,safeRight:0,safeTop:0,safeBottom:0});
   const placement=resolveDrivePlacement(layout);
   expect(placement.width).toBeLessThanOrEqual(width);
   expect(placement.width-layout.brakeWidth-layout.throttleWidth).toBeGreaterThan(placement.dashboardWidth+30);
  }
 });
 it('lets the village fully enter and fully exit with continuous leftward travel',()=>{
  const w=960,image=700,xs=[4,50,100,200,336].map(x=>passingVillageX(x,4,336,w,image));
  expect(xs[0]-image/2).toBeGreaterThan(w);expect(xs.at(-1)!+image/2).toBeLessThan(0);
  xs.slice(1).forEach((x,i)=>expect(x).toBeLessThan(xs[i]));
 });
 it('places close collectible trails just above the actual road surface',()=>{
  const ride=new RideCollectibles(DESERT_TRACK);const first=ride.pickups.slice(0,7);
  for(let i=1;i<first.length;i++)expect(first[i].x-first[i-1].x).toBeCloseTo(.95);
  for(const p of ride.pickups){const clearance=p.y-sampleTrackHeight(DESERT_TRACK,p.x);expect(clearance).toBeGreaterThan(.5);expect(clearance).toBeLessThan(.7);}
 });
 it('gives a visible, softer head rebound after impacts without introducing idle movement',()=>{
  const h=new HeadDynamics();const rest:HeadTelemetry={velocityX:0,velocityY:0,pitch:0,angularVelocity:0,grounded:true,landing:0,obstacleHit:0};h.update(rest,1/60);
  let peak=0,atQuarterSecond=0;for(let i=0;i<60;i++){const a=h.update({...rest,landing:i===0?8:0},1/60);peak=Math.max(peak,Math.abs(a));if(i===15)atQuarterSecond=Math.abs(a);}
  expect(peak).toBeGreaterThan(3*Math.PI/180);expect(atQuarterSecond).toBeGreaterThan(.025);
 });
});
