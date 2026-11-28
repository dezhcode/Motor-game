import { describe, expect, it, vi, afterEach } from 'vitest';
import { buildSmoothProfile, profileHeight, terrainProfile } from '../track/trackProfile';
import { DESERT_TRACK, sampleTrackHeight } from '../track/desertTrackData';
import { TUTORIAL_TRACK } from '../track/tutorialTrackData';
import { renderResolution } from '../config/renderBudget';
import { PickupFlightSystem } from '../effects/PickupFlightSystem';
import type { GameArtwork } from '../artwork/GameArtwork';

describe('Shared rounded terrain',()=>{
  it('preserves authored ridge/pit heights without overshoot and uses a bounded collision mesh',()=>{
    for(const track of [DESERT_TRACK,TUTORIAL_TRACK]) {
      const profile=terrainProfile(track);
      expect(terrainProfile(track)).toBe(profile);
      expect(profile.length).toBeLessThan(2200);
      for(let i=1;i<profile.length;i++)expect(profile[i].x).toBeGreaterThan(profile[i-1].x);
      for(let i=0;i<track.points.length-1;i++) {
        const a=track.points[i],b=track.points[i+1];
        for(let j=0;j<=10;j++) {
          const x=a.x+(b.x-a.x)*j/10,y=sampleTrackHeight(track,x);
          expect(y).toBeGreaterThanOrEqual(Math.min(a.y,b.y)-1e-8);
          expect(y).toBeLessThanOrEqual(Math.max(a.y,b.y)+1e-8);
          expect(y).toBe(profileHeight(profile,x));
        }
      }
    }
  });
  it('rounds the photographed first jump and the second pit instead of hard V joins',()=>{
    const profile=terrainProfile(DESERT_TRACK);
    for(const [left,right] of [[160,180],[248,272]]) {
      let maximumTurn=0;
      for(let i=1;i<profile.length-1;i++) {
        const a=profile[i-1],b=profile[i],c=profile[i+1];
        if(b.x<left||b.x>right)continue;
        maximumTurn=Math.max(maximumTurn,Math.abs(Math.atan2(c.y-b.y,c.x-b.x)-Math.atan2(b.y-a.y,b.x-a.x)));
      }
      expect(maximumTurn).toBeLessThan(.35);
    }
  });
  it('does not subdivide a long straight into unnecessary physics edges',()=>{
    expect(buildSmoothProfile([{x:-20,y:0},{x:250,y:0}])).toEqual([{x:-20,y:0},{x:250,y:0}]);
  });
});

describe('Phone rendering work',()=>{
  afterEach(()=>vi.unstubAllGlobals());
  it('caps dense-screen render work while preserving CSS layout sizes',()=>{
    for(const [w,h] of [[844,390],[960,432],[1280,720],[1536,690]]) {
      const resolution=renderResolution(w,h,3);
      expect(resolution).toBeLessThanOrEqual(1.5);
      expect(w*h*resolution*resolution).toBeLessThanOrEqual(1_500_001);
      expect(w*h*resolution*resolution).toBeLessThan(w*h*4*.57);
    }
    expect(renderResolution(844,390,1)).toBe(1);
  });
  it('does no idle effect redraws and clears only the previous flight bounds',()=>{
    const ctx={clearRect:vi.fn(),setTransform:vi.fn(),createRadialGradient:()=>({addColorStop:vi.fn()}),fillRect:vi.fn(),
      save:vi.fn(),restore:vi.fn(),beginPath:vi.fn(),arc:vi.fn(),fill:vi.fn(),translate:vi.fn(),rotate:vi.fn(),drawImage:vi.fn(),
      moveTo:vi.fn(),lineTo:vi.fn(),closePath:vi.fn()};
    vi.stubGlobal('document',{createElement:()=>({getContext:()=>ctx,style:{},setAttribute:vi.fn(),isConnected:true,remove:vi.fn()})});
    vi.stubGlobal('window',{devicePixelRatio:2,matchMedia:()=>({matches:false})});
    const fx=new PickupFlightSystem(),targets={coin:{x:40,y:30},fuel:{x:40,y:70}};
    fx.resize(960,432);
    for(let i=0;i<100;i++)fx.update(1/60,targets);
    expect(ctx.clearRect).not.toHaveBeenCalled();
    const art={coin:{source:{resource:{}},frame:{x:0,y:0,width:40,height:40}}} as unknown as GameArtwork;
    fx.add({id:'coin',kind:'coin',x:10,y:0,amount:1},{x:500,y:300},40,art);
    fx.update(.02,targets);fx.update(.02,targets);
    const clear=ctx.clearRect.mock.calls.at(-1)!;
    expect(clear[2]*clear[3]).toBeLessThan(960*432*.1);
    fx.update(2,targets);
    const count=ctx.clearRect.mock.calls.length;
    for(let i=0;i<100;i++)fx.update(1/60,targets);
    expect(ctx.clearRect).toHaveBeenCalledTimes(count);
    fx.destroy();
  });
});
