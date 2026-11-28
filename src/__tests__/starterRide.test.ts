import { describe, expect, it } from 'vitest';
import { HeadDynamics, type HeadTelemetry } from '../bike/HeadDynamics';
import { FIRST_STAGE_PHYSICS_CONFIG, PHYSICS_CONFIG } from '../config/physicsConfig';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { resolveControlLayout, resolveDrivePlacement } from '../input/controlLayout';
import { DEFAULT_CONTROL_LAYOUT } from '../storage/settingsStorage';
import { DESERT_TRACK, type TrackDefinition } from '../track/desertTrackData';
import type { ControlState } from '../input/InputManager';
const rest:HeadTelemetry={velocityX:0,velocityY:0,pitch:0,angularVelocity:0,grounded:true,landing:0,obstacleHit:0};
const idle:ControlState={throttle:false,brake:false,leanLeft:false,leanRight:false,anyActive:false};
const flat:TrackDefinition={points:[{x:-20,y:0},{x:250,y:0}],startX:4,startY:1.1,finishX:220,minX:-20,maxX:250,hints:[]};
describe('Starter ride correction',()=>{
 it('reacts strongly to a gas/brake press even before velocity changes',()=>{
  const gas=new HeadDynamics(),brake=new HeadDynamics();gas.update(rest,1/60);brake.update(rest,1/60);
  let gasPeak=0,brakePeak=0;
  for(let i=0;i<24;i++){gasPeak=Math.min(gasPeak,gas.update({...rest,throttle:true},1/60));brakePeak=Math.max(brakePeak,brake.update({...rest,brake:true},1/60));}
  expect(gasPeak).toBeLessThan(-8*Math.PI/180);expect(brakePeak).toBeGreaterThan(10*Math.PI/180);
  const before=gas.angle;gas.update({...rest,brake:true},0);expect(gas.angle).toBe(before);
  for(let i=0;i<600;i++)gas.update(rest,1/60);expect(Math.abs(gas.angle)).toBeLessThan(.00001);
 });
 it('shows substantially larger reactions to strong landings and obstacle hits',()=>{
  for(const event of [{landing:8},{obstacleHit:8}]){
   const h=new HeadDynamics();h.update(rest,1/60);let peak=0;
   for(let i=0;i<90;i++)peak=Math.max(peak,Math.abs(h.update({...rest,...(i===0?event:{})},1/60)));
   expect(peak).toBeGreaterThan(9*Math.PI/180);
  }
 });
 it('leaves an ample visible gap between pedals and gauges on landscape screens',()=>{
  for(const [width,height] of [[640,320],[844,390],[1280,720],[1536,690]]){
   const layout=resolveControlLayout(DEFAULT_CONTROL_LAYOUT,{width,height,safeLeft:0,safeRight:0,safeTop:0,safeBottom:0});
   const p=resolveDrivePlacement(layout),actualGap=(p.width-layout.brakeWidth-layout.throttleWidth-p.dashboardWidth)/2;
   expect(p.width).toBeLessThanOrEqual(width);expect(actualGap).toBeGreaterThan(width*.14);
  }
 });
 it('makes the actual starter configuration slower to accelerate and caps flat-road speed near 41 km/h',()=>{
  const run=(config:typeof PHYSICS_CONFIG)=>{const world=new PhysicsWorld(flat,config);for(let i=0;i<120;i++)world.step(1/60,idle,true);let atOne=0,peak=0;for(let i=0;i<360;i++){const s=world.step(1/60,{...idle,throttle:true,anyActive:true},true);if(i===59)atOne=s.chassisVelX;peak=Math.max(peak,s.chassisVelX);expect(s.crashedReason).toBeNull();}return {atOne,peak};};
  const starter=run(FIRST_STAGE_PHYSICS_CONFIG),previous=run(PHYSICS_CONFIG);
  expect(starter.atOne).toBeLessThan(previous.atOne*.85);
  expect(starter.peak*3.6).toBeGreaterThan(35);expect(starter.peak*3.6).toBeLessThan(45);
  expect(starter.peak).toBeLessThan(previous.peak*.75);
 });
 it('keeps the complete first course finishable at the reduced speed with only the two pedals',()=>{
  const world=new PhysicsWorld(DESERT_TRACK,FIRST_STAGE_PHYSICS_CONFIG);
  let last=world.step(0,idle,false),finished=false;
  for(let i=0;i<60*90;i++){
   const inAir=!last.frontGrounded&&!last.rearGrounded;
   const throttle=inAir ? last.chassis.angle<.04 : true;
   const brake=inAir && last.chassis.angle>.16;
   last=world.step(1/60,{...idle,throttle,brake,anyActive:throttle||brake},true);
   expect(last.crashedReason,`Crash at ${last.chassis.x.toFixed(1)}m`).toBeNull();
   if(last.finished){finished=true;break;}
  }
  expect(finished).toBe(true);
 });

});
