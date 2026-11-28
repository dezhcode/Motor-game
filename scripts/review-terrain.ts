import { Application, Container } from 'pixi.js';
import { loadGameArtwork } from '../src/artwork/GameArtwork';
import { DESERT_TRACK, sampleTrackHeight } from '../src/track/desertTrackData';
import { TrackRenderer } from '../src/track/TrackBuilder';
import { RideCollectibles } from '../src/track/RideCollectibles';
import { PhysicsWorld } from '../src/physics/PhysicsWorld';
import { FIRST_STAGE_PHYSICS_CONFIG } from '../src/config/physicsConfig';
import { renderResolution } from '../src/config/renderBudget';

const host=document.querySelector<HTMLElement>('#view')!;
const app=new Application();
await app.init({width:1280,height:480,autoStart:false,resolution:1,antialias:true});
host.appendChild(app.canvas);
const art=await loadGameArtwork(),renderer=new TrackRenderer(DESERT_TRACK,art),world=new Container();
world.addChild(renderer.worldContainer);app.stage.addChild(renderer.backgroundContainer,world);
renderer.setPickups(new RideCollectibles(DESERT_TRACK).pickups);
const physics=new PhysicsWorld(DESERT_TRACK,FIRST_STAGE_PHYSICS_CONFIG);
const snapshot=physics.step(0,{throttle:false,brake:false,leanLeft:false,leanRight:false,anyActive:false},false);
renderer.syncObstacles(snapshot.dynamicProps,0);
const select=document.querySelector<HTMLSelectElement>('#jump')!;
function draw(){
  const x=Number(select.value),y=sampleTrackHeight(DESERT_TRACK,x),scale=1.75;
  world.scale.set(scale);world.position.set(640-x*44*scale,115+y*44*scale);
  renderer.updateParallax({worldX:x,worldY:y,scale,viewportWidth:1280,viewportHeight:480});
  app.renderer.render(app.stage);
  const terrain=renderer.worldContainer.children.find(child=>child.label==='terrain:chunks')!;
  document.querySelector('#stats')!.textContent=`Terrain chunks drawn: ${terrain.children.filter(child=>child.visible).length}/${terrain.children.length}. Phone render ratio (1536×690, DPR 3): ${renderResolution(1536,690,3).toFixed(2)}.`;
}
select.addEventListener('change',draw);draw();
