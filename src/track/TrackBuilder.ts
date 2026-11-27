import { Container, Graphics, Sprite } from 'pixi.js';
import type { GameArtwork } from '../artwork/GameArtwork';
import { ARCHITECTURE, finitePanoramaX, landmarkScreenX } from '../artwork/SceneryPlan';
import { DESERT_PALETTE } from '../config/palette';
import { PHYSICS_CONFIG } from '../config/physicsConfig';
import type { TrackDefinition } from './desertTrackData';
import type { CameraTransform } from '../camera/FollowCamera';

/** Flat illustrated elevations and solid silhouettes: no painted lighting or perspective textures. */
export class TrackRenderer {
  readonly backgroundContainer = new Container();
  readonly worldContainer = new Container();
  private readonly sky = new Graphics();
  private readonly mountains = new Graphics();
  private readonly duneBase = new Graphics();
  private readonly geology = new Graphics();
  private readonly nearDunes = new Graphics();
  private readonly buildings = new Container();
  private readonly landmarks: Sprite[] = [];
  private readonly terrainGraphic = new Graphics();
  private readonly scenery = new Container();
  private readonly markers = new Graphics();
  private viewportWidth = 0;
  private viewportHeight = 0;

  constructor(private readonly track: TrackDefinition, art: GameArtwork) {
    ARCHITECTURE.forEach((entry) => {
      const sprite = new Sprite(art[entry.key]);
      sprite.label = `landmark:${entry.key}`;
      sprite.anchor.set(0.5, 1);
      this.landmarks.push(sprite); this.buildings.addChild(sprite);
    });
    this.backgroundContainer.addChild(this.sky, this.mountains, this.duneBase, this.geology, this.buildings, this.nearDunes);
    this.worldContainer.addChild(this.scenery, this.terrainGraphic, this.markers);
    this.buildTerrainMesh(); this.buildScenery(); this.buildMarkers();
    // A finite authored ridge silhouette; pan without wrapping or mirroring.
    const ridge = [0,366,110,338,193,345,290,285,355,278,435,332,550,304,648,238,699,251,765,214,851,291,960,318,1090,270,1225,329,1350,300,1460,248,1540,269,1655,332,1770,304,1900,251,1980,282,2095,332,2210,294,2330,245,2400,282,2530,320,2640,276,2750,303,2850,249,2990,299,3140,269,3328,340];
    this.mountains.poly([0,720,...ridge,3328,720],true).fill(0xb4cbd1);
    const low = [0,434,170,385,265,402,390,355,530,389,660,339,780,371,900,397,1050,354,1220,397,1390,353,1540,388,1700,343,1890,377,2050,399,2190,349,2380,386,2570,343,2720,378,2900,352,3090,391,3328,352];
    this.mountains.poly([0,720,...low,3328,720],true).fill(0x8eb5c0);
    this.geology.poly([-225,0,-211,-68,-165,-68,-157,-157,-99,-157,-87,-73,-49,-73,-27,-124,37,-124,53,-64,78,-65,94,-178,154,-178,175,-63,206,-63,226,0],true).fill(0xc68d5d);
    this.geology.moveTo(-157,-140).lineTo(-100,-140).moveTo(99,-158).lineTo(149,-158)
      .moveTo(-211,-42).lineTo(-151,-42).moveTo(70,-35).lineTo(180,-35).stroke({width:3,color:0xdba66b,cap:'round'});
    this.nearDunes.moveTo(-680,0).bezierCurveTo(-490,-50,-370,-62,-190,-25)
      .bezierCurveTo(-20,12,180,-96,350,-70).bezierCurveTo(480,-64,600,-13,720,0)
      .lineTo(720,250).lineTo(-680,250).closePath().fill(0xdfb27c);
    this.nearDunes.moveTo(-610,-12).bezierCurveTo(-420,-48,-350,-44,-230,-24)
      .moveTo(130,-61).bezierCurveTo(260,-101,420,-63,510,-38).stroke({width:3,color:0xf1cf93,cap:'round'});
  }

  private buildTerrainMesh(): void {
    const ppm = PHYSICS_CONFIG.world.pixelsPerMeter, pts = this.track.points;
    this.terrainGraphic.moveTo(pts[0].x*ppm,1500);
    for (const p of pts) this.terrainGraphic.lineTo(p.x*ppm,-p.y*ppm);
    this.terrainGraphic.lineTo(pts[pts.length-1].x*ppm,1500).closePath().fill(0xaa744a);
    // Solid strata follow the collision silhouette without a photographic repeating texture.
    for (const [top,bottom,color] of [[0,18,0xeabb79],[18,36,0xc68b55],[70,78,0xb98050],[135,143,0xb17b4d]] as const) {
      this.terrainGraphic.moveTo(pts[0].x*ppm,-pts[0].y*ppm+top);
      for (const p of pts) this.terrainGraphic.lineTo(p.x*ppm,-p.y*ppm+top);
      for (let i=pts.length-1;i>=0;i--) this.terrainGraphic.lineTo(pts[i].x*ppm,-pts[i].y*ppm+bottom);
      this.terrainGraphic.closePath().fill(color);
    }
    for (const [offset,width,color] of [[2,3,0xffdda0],[0,1.7,0x805737]] as const) {
      this.terrainGraphic.moveTo(pts[0].x*ppm,-pts[0].y*ppm+offset);
      for (let i=1;i<pts.length;i++) this.terrainGraphic.lineTo(pts[i].x*ppm,-pts[i].y*ppm+offset);
      this.terrainGraphic.stroke({width,color,cap:'round',join:'round'});
    }
    // Small deterministic pebbles, sparse enough to keep the ride surface readable.
    for (let i=0;i<100;i++) {
      const x=8+i*3.23, y=-this.lookupY(x)*ppm+46+(i*37%94);
      this.terrainGraphic.roundRect(x*ppm,y,3+(i%3),1.2,.6).fill(0x94633f);
    }
  }

  private buildScenery(): void {
    const locations=[12,22,33,51,74,84,107,123,143,151,188,211,229,241,283,307,321];
    locations.forEach((x,i)=>{
      const g=new Graphics();g.position.set(x*44,-this.lookupY(x)*44+6);
      if (i%3===0) {
        g.poly([-12,0,-9,-9,-2,-13,7,-10,13,-3,11,1],true).fill(0xc58e5b).stroke({width:.8,color:0x8c6844});
        g.moveTo(-8,-8).lineTo(-1,-6).lineTo(6,-9).stroke({width:1,color:0xe4b47b});
      } else {
        for (const [dx,dy] of [[-10,-9],[-4,-17],[3,-13],[11,-8]]) {
          g.moveTo(0,0).quadraticCurveTo(dx*.25,dy*.4,dx,dy).stroke({width:1.4,color:0x63794e});
          g.ellipse(dx,dy,3,1.8).fill(0x859858);
        }
      }
      this.scenery.addChild(g);
    });
  }

  private buildMarkers(): void {
    const ppm=PHYSICS_CONFIG.world.pixelsPerMeter;
    this.markers.rect(.5*ppm-3,-72,6,72).fill(DESERT_PALETTE.finishPole);
    this.markers.roundRect(.5*ppm-2,-70,32,18,4).fill(DESERT_PALETTE.bikeTurquoise);
    const fx=this.track.finishX*ppm,fy=-this.lookupY(this.track.finishX)*ppm;
    this.markers.rect(fx-5,fy-145,8,145).fill(DESERT_PALETTE.finishPole);
    this.markers.rect(fx+52,fy-145,8,145).fill(DESERT_PALETTE.finishPole);
    this.markers.roundRect(fx-10,fy-150,74,34,6).fill(DESERT_PALETTE.finishBannerPrimary);
    for(let col=0;col<5;col++)for(let row=0;row<2;row++)if((col+row)%2===0)
      this.markers.rect(fx-4+col*12.5,fy-144+row*11,11,10).fill(DESERT_PALETTE.finishBannerAccent);
  }

  private lookupY(x:number):number {
    const pts=this.track.points;
    for(let i=0;i<pts.length-1;i++)if(x>=pts[i].x&&x<=pts[i+1].x){const t=(x-pts[i].x)/Math.max(.001,pts[i+1].x-pts[i].x);return pts[i].y+(pts[i+1].y-pts[i].y)*t;}
    return 0;
  }

  updateParallax(cam:CameraTransform):void {
    const hs=cam.viewportHeight/720,ws=cam.viewportWidth/1280;
    const verticalDrift=cam.worldY*44*cam.scale;
    if(this.viewportWidth!==cam.viewportWidth||this.viewportHeight!==cam.viewportHeight){
      this.viewportWidth=cam.viewportWidth;this.viewportHeight=cam.viewportHeight;
      this.sky.clear().rect(0,0,cam.viewportWidth,cam.viewportHeight).fill(0xafdbea);
      this.sky.circle(cam.viewportWidth*.83,105*hs,39*hs).fill(0xffe7a3);
      for(const [x,y] of [[.17,118],[.43,79],[.67,150]]){
        this.sky.roundRect(cam.viewportWidth*x-36*hs,y*hs,110*hs,15*hs,7*hs).fill(0xe2f1ed);
        this.sky.ellipse(cam.viewportWidth*x,y*hs,26*hs,11*hs).fill(0xe2f1ed);
      }
    }
    this.mountains.scale.set(ws,hs);
    this.mountains.position.set(finitePanoramaX(cam.worldX,this.track.startX,this.track.finishX,cam.viewportWidth,3328*ws),verticalDrift*.04);
    const base=cam.viewportHeight*.72+verticalDrift*.06,offset=cam.worldX*44*cam.scale*.13;
    this.duneBase.clear().moveTo(-2,cam.viewportHeight);
    for(let x=-2;x<=cam.viewportWidth+32;x+=32)this.duneBase.lineTo(x,base+Math.sin((x+offset)*.0021)*17*hs+Math.cos((x+offset)*.0037)*11*hs);
    this.duneBase.lineTo(cam.viewportWidth+32,cam.viewportHeight).closePath().fill(0xd6b18a);
    this.geology.scale.set(hs);this.geology.position.set(cam.viewportWidth/2+(95-cam.worldX)*44*cam.scale*.17,cam.viewportHeight*.78+verticalDrift*.08);
    this.nearDunes.scale.set(hs);this.nearDunes.position.set(cam.viewportWidth/2+(240-cam.worldX)*44*cam.scale*.23,cam.viewportHeight*.82+verticalDrift*.12);
    ARCHITECTURE.forEach((entry,i)=>{
      const sprite=this.landmarks[i];sprite.height=entry.referenceHeight*hs;
      sprite.width=sprite.height*sprite.texture.width/sprite.texture.height;
      sprite.position.set(landmarkScreenX(entry,cam.worldX,cam.viewportWidth,cam.scale),cam.viewportHeight*.76+verticalDrift*.1);
      sprite.visible=sprite.x+sprite.width/2>-30&&sprite.x-sprite.width/2<cam.viewportWidth+30;
    });
  }
}
