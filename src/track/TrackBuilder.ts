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
    const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;
    const pts = this.track.points;

    // Deep earthen bedrock fill underneath the constructed masonry courses
    this.terrainGraphic.moveTo(pts[0].x * ppm, 1500);
    for (const p of pts) this.terrainGraphic.lineTo(p.x * ppm, -p.y * ppm);
    this.terrainGraphic.lineTo(pts[pts.length - 1].x * ppm, 1500).closePath().fill(0x6e4a31);

    // Lower compacted desert strata bands
    for (const [top, bottom, color] of [
      [18, 128, 0x875c3e],
      [128, 150, 0x764f35],
    ] as const) {
      this.terrainGraphic.moveTo(pts[0].x * ppm, -pts[0].y * ppm + top);
      for (const p of pts) this.terrainGraphic.lineTo(p.x * ppm, -p.y * ppm + top);
      for (let i = pts.length - 1; i >= 0; i--) {
        this.terrainGraphic.lineTo(pts[i].x * ppm, -pts[i].y * ppm + bottom);
      }
      this.terrainGraphic.closePath().fill(color);
    }

    // Constructed ashlar stone/adobe retaining wall courses (3 staggered rows) along the road contour
    const coursePalette = [0xb68459, 0xa8764c, 0x996840] as const;
    const courseHeight = 28;
    const blockTargetWidth = 52;
    const mortarInk = 0x3b2618;

    for (let row = 0; row < 3; row++) {
      const topY = 20 + row * (courseHeight + 2);
      const botY = topY + courseHeight;
      const stagger = (row % 2) * (blockTargetWidth * 0.5);
      const minPx = pts[0].x * ppm;
      const maxPx = pts[pts.length - 1].x * ppm;

      for (let bx = minPx - stagger; bx < maxPx; bx += blockTargetWidth) {
        const x0 = Math.max(minPx, bx + 1.5);
        const x1 = Math.min(maxPx, bx + blockTargetWidth - 1.5);
        if (x1 - x0 < 10) continue;

        const y0 = -this.lookupY(x0 / ppm) * ppm;
        const y1 = -this.lookupY(x1 / ppm) * ppm;
        const shade = ((Math.round(bx / blockTargetWidth) + row) % 3) === 0 ? 0xc29064 : coursePalette[row];

        this.terrainGraphic
          .poly([x0, y0 + topY, x1, y1 + topY, x1, y1 + botY, x0, y0 + botY], true)
          .fill(shade)
          .stroke({ width: 1.5, color: mortarInk, join: 'round' });

        // Crisp top-edge bevel highlight on each block
        this.terrainGraphic
          .moveTo(x0 + 2, y0 + topY + 2)
          .lineTo(x1 - 2, y1 + topY + 2)
          .stroke({ width: 1.4, color: 0xdfb484, cap: 'round' });
      }
    }

    // Thick bevelled top road deck (matching the crisp architectural cap in reference art)
    this.terrainGraphic.moveTo(pts[0].x * ppm, -pts[0].y * ppm);
    for (const p of pts) this.terrainGraphic.lineTo(p.x * ppm, -p.y * ppm);
    for (let i = pts.length - 1; i >= 0; i--) {
      this.terrainGraphic.lineTo(pts[i].x * ppm, -pts[i].y * ppm + 20);
    }
    this.terrainGraphic.closePath().fill(0xd9b88c).stroke({ width: 2.2, color: 0x2d1f15, join: 'round' });

    // Top sunlight bevel & dark underside lip on road cap
    this.terrainGraphic.moveTo(pts[0].x * ppm, -pts[0].y * ppm + 2.8);
    for (let i = 1; i < pts.length; i++) {
      this.terrainGraphic.lineTo(pts[i].x * ppm, -pts[i].y * ppm + 2.8);
    }
    this.terrainGraphic.stroke({ width: 3.2, color: 0xfff0cc, cap: 'round', join: 'round' });

    this.terrainGraphic.moveTo(pts[0].x * ppm, -pts[0].y * ppm + 17.5);
    for (let i = 1; i < pts.length; i++) {
      this.terrainGraphic.lineTo(pts[i].x * ppm, -pts[i].y * ppm + 17.5);
    }
    this.terrainGraphic.stroke({ width: 2.4, color: 0x8b6747, cap: 'round', join: 'round' });

    // Steel/timber trusses and hazard warning stripes on major jump ramps (Ramp 1 & Ramp 2)
    for (const [rStart, rEnd] of [
      [162, 172],
      [250, 262],
    ] as const) {
      for (let rx = rStart; rx < rEnd; rx += 1.6) {
        const xA = rx * ppm;
        const yA = -this.lookupY(rx) * ppm;
        const xB = Math.min(rEnd, rx + 0.85) * ppm;
        const yB = -this.lookupY(Math.min(rEnd, rx + 0.85)) * ppm;
        this.terrainGraphic
          .poly([xA, yA + 3, xB, yB + 3, xB, yB + 15, xA, yA + 15], true)
          .fill(0xf2be38)
          .stroke({ width: 1.2, color: 0x1d252c });
      }
      // Diagonal bracing truss beam under ramp lip
      const lipX = rEnd * ppm;
      const lipY = -this.lookupY(rEnd) * ppm;
      const baseX = (rEnd - 3.2) * ppm;
      const baseY = -this.lookupY(rEnd - 3.2) * ppm + 110;
      this.terrainGraphic
        .moveTo(lipX - 4, lipY + 20)
        .lineTo(lipX - 4, lipY + 125)
        .moveTo(lipX - 4, lipY + 28)
        .lineTo(baseX, baseY)
        .stroke({ width: 5, color: 0x26313a, cap: 'round' });
      this.terrainGraphic
        .moveTo(lipX - 4, lipY + 20)
        .lineTo(lipX - 4, lipY + 125)
        .moveTo(lipX - 4, lipY + 28)
        .lineTo(baseX, baseY)
        .stroke({ width: 2.4, color: 0x7b8d95, cap: 'round' });
    }
  }

  private buildScenery(): void {
    const locations = [12, 22, 33, 51, 74, 84, 107, 123, 143, 151, 188, 211, 229, 241, 283, 307, 321];
    locations.forEach((x, i) => {
      const g = new Graphics();
      g.position.set(x * 44, -this.lookupY(x) * 44 + 3);
      if (i % 3 === 0) {
        g.poly([-14, 0, -10, -11, -2, -15, 8, -11, 15, -3, 12, 1], true)
          .fill(0xc58e5b)
          .stroke({ width: 1.2, color: 0x3b2618 });
        g.moveTo(-9, -9).lineTo(-1, -7).lineTo(7, -10).stroke({ width: 1.2, color: 0xf1cc92 });
      } else {
        for (const [dx, dy] of [
          [-10, -10],
          [-4, -18],
          [3, -14],
          [11, -9],
        ]) {
          g.moveTo(0, 0).quadraticCurveTo(dx * 0.25, dy * 0.4, dx, dy).stroke({ width: 1.6, color: 0x455c35 });
          g.ellipse(dx, dy, 3.3, 2).fill(0x7d9652).stroke({ width: 0.8, color: 0x2a3822 });
        }
      }
      this.scenery.addChild(g);
    });
  }

  private buildMarkers(): void {
    const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;

    // Detailed start/checkpoint loudspeaker pole inspired by reference art
    for (const poleX of [0.6, 158.5, 246.5]) {
      const px = poleX * ppm;
      const py = -this.lookupY(poleX) * ppm;
      this.markers.rect(px - 3.5, py - 108, 7, 108).fill(0x52616a).stroke({ width: 1.4, color: 0x141e26 });
      this.markers.rect(px - 1.5, py - 106, 2.2, 104).fill(0x8899a2);
      this.markers.roundRect(px - 6, py - 12, 12, 12, 2).fill(0x3a4750).stroke({ width: 1.4, color: 0x141e26 });
      // Speaker housing on top
      this.markers.roundRect(px - 14, py - 134, 28, 28, 5).fill(0x4c5a63).stroke({ width: 1.8, color: 0x141e26 });
      this.markers.circle(px, py - 120, 9.5).fill(0x1b232a).stroke({ width: 1.2, color: 0x8ea0aa });
      this.markers.circle(px, py - 120, 4.2).fill(0x32404a).stroke({ width: 0.9, color: 0x141e26 });
    }

    // Finish line checkered arch with teal/cream cel styling
    const fx = this.track.finishX * ppm;
    const fy = -this.lookupY(this.track.finishX) * ppm;
    this.markers.rect(fx - 5, fy - 148, 9, 148).fill(DESERT_PALETTE.finishPole).stroke({ width: 1.5, color: 0x141e26 });
    this.markers.rect(fx + 52, fy - 148, 9, 148).fill(DESERT_PALETTE.finishPole).stroke({ width: 1.5, color: 0x141e26 });
    this.markers.roundRect(fx - 12, fy - 154, 78, 36, 7).fill(DESERT_PALETTE.finishBannerPrimary).stroke({ width: 1.8, color: 0x141e26 });
    for (let col = 0; col < 5; col++) {
      for (let row = 0; row < 2; row++) {
        if ((col + row) % 2 === 0) {
          this.markers.rect(fx - 5 + col * 12.8, fy - 147 + row * 11.5, 11.2, 10).fill(DESERT_PALETTE.finishBannerAccent);
        }
      }
    }
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
