const fs=require('fs'),path=require('path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const esbuild=require('esbuild');
const dest=path.resolve(process.argv[2]||'docs/head-motion');fs.mkdirSync(dest,{recursive:true});
const source=esbuild.buildSync({entryPoints:['src/bike/HeadDynamics.ts'],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text;
const m={exports:{}};new Function('module','exports',source)(m,m.exports);const {HeadDynamics}=m.exports;
const g=esbuild.buildSync({entryPoints:['src/bike/riderSpriteGeometry.ts'],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text;
const gm={exports:{}};new Function('module','exports',g)(gm,gm.exports);const R=gm.exports.RIDER_SPRITE;
(async()=>{
 const dir='public/assets/art/rider-v6';
 const [body,head,wheel]=await Promise.all(['body','head','wheel'].map(n=>loadImage(`${dir}/${n}.png`)));
 function draw(ctx,w,h,angle,pitch=0,wheelAngle=0){
  ctx.fillStyle='#f4eee4';ctx.fillRect(0,0,w,h);
  const s=Math.min(w/1400,h/1115);ctx.save();ctx.translate(w/2,h/2);ctx.scale(s,s);ctx.translate(-800,-555);
  ctx.translate(792,867);ctx.rotate(-pitch);ctx.translate(-792,-867);
  for(const axle of [R.rearAxle,R.frontAxle]){ctx.save();ctx.translate(axle.x,axle.y);ctx.rotate(wheelAngle);ctx.scale(203/605,203/605);ctx.drawImage(wheel,-R.wheelCenter.x,-R.wheelCenter.y);ctx.restore();}
  ctx.drawImage(body,0,0);
  ctx.save();ctx.translate(R.neckPivot.x,R.neckPivot.y);ctx.rotate(angle);ctx.translate(-R.neckPivot.x,-R.neckPivot.y);ctx.translate(R.headOffset.x,R.headOffset.y);ctx.scale(R.headScale.x,R.headScale.y);ctx.drawImage(head,0,0);ctx.restore();ctx.restore();
 }
 const c=createCanvas(1400,1115),ctx=c.getContext('2d');draw(ctx,1400,1115,0);fs.writeFileSync(path.join(dest,'KavirSavar_v6_Preview.png'),c.toBuffer('image/png'));
 for(const deg of [-6,6]){draw(ctx,1400,1115,deg*Math.PI/180);fs.writeFileSync(path.join(dest,`neck_${deg}.png`),c.toBuffer('image/png'));}
 const frames=path.join(dest,'frames');fs.mkdirSync(frames,{recursive:true});
 const sm=createCanvas(840,669),cc=sm.getContext('2d'),dyn=new HeadDynamics();
 let vx=0,pitch=0,prevPitch=0,spin=0;const fps=30;
 for(let i=0;i<300;i++){
  const t=i/fps;let label='سکون',accel=0,targetPitch=0,landing=0;
  if(t>=1&&t<2.5){accel=7;label='گاز دادن';}
  else if(t>=2.5&&t<4){targetPitch=.25;label='سربالایی';}
  else if(t>=4&&t<5.5){targetPitch=-.2;label='سرازیری';}
  else if(t>=5.5&&t<6.5){accel=-8;label='ترمز';}
  else if(t>=6.5&&t<7.6){label='ضربه آرام';if(i===195)landing=3;}
  else if(t>=7.6&&t<8.7){label='ضربه متوسط';if(i===228)landing=6;}
  else if(t>=8.7){label='ضربه شدید';if(i===261)landing=11;}
  vx=Math.max(0,vx+accel/fps);prevPitch=pitch;pitch+=(targetPitch-pitch)*(1-Math.exp(-4/fps));spin+=vx/fps/.37;
  const angle=dyn.update({velocityX:vx,velocityY:0,pitch,angularVelocity:(pitch-prevPitch)*fps,grounded:true,landing,obstacleHit:0},1/fps);
  draw(cc,840,669,angle,pitch,spin);cc.fillStyle='#24494b';cc.font='bold 25px sans-serif';cc.textAlign='center';cc.fillText(label,420,630);
  fs.writeFileSync(path.join(frames,`${String(i).padStart(3,'0')}.png`),sm.toBuffer('image/png'));
 }
 console.log(dest);
})();
