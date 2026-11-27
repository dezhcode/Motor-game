import { HeadDynamics } from '../../src/bike/HeadDynamics';
import { RIDER_SPRITE as R } from '../../src/bike/riderSpriteGeometry';
declare const spriteImages: Record<string, string>;
const stage = document.querySelector<HTMLCanvasElement>('#stage')!;
const ctx = stage.getContext('2d')!;
const head = new HeadDynamics();
let throttle = false, brake = false, velocity = 0, pitch = 0, angle = 0, spin = 0, impact = 0;
let targetPitch = 0, last = 0;
const sprites: Record<string, HTMLImageElement> = {};
function held(id: string, set: (v: boolean) => void) {
  const b = document.getElementById(id)!;
  b.addEventListener('pointerdown', e => { b.setPointerCapture(e.pointerId); set(true); b.classList.add('on'); });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(name, () => { set(false); b.classList.remove('on'); });
}
held('gas', v => throttle = v); held('brake', v => brake = v);
function clear() { throttle = brake = false; document.querySelectorAll('.on').forEach(b => b.classList.remove('on')); }
window.addEventListener('blur', clear);
document.addEventListener('visibilitychange', () => { last = 0; if (document.hidden) clear(); });
document.getElementById('reset')!.onclick = () => {
  clear(); velocity = pitch = targetPitch = angle = spin = impact = 0; head.reset();
  document.querySelector<HTMLInputElement>('#slope')!.value = '0';
  document.getElementById('slopeValue')!.textContent = '0°';
};
document.querySelector<HTMLInputElement>('#slope')!.oninput = e => {
  const value = Number((e.target as HTMLInputElement).value); targetPitch = value * Math.PI / 180;
  document.getElementById('slopeValue')!.textContent = `${value}°`;
};
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-impact]')) b.onclick = () => impact = Number(b.dataset.impact);
window.addEventListener('keydown', e => { if (e.code === 'ArrowRight') { e.preventDefault(); throttle = true; } if (e.code === 'ArrowLeft') { e.preventDefault(); brake = true; } });
window.addEventListener('keyup', e => { if (e.code === 'ArrowRight') throttle = false; if (e.code === 'ArrowLeft') brake = false; });
function frame(now: number) {
  const dt = last ? Math.min((now - last) / 1000, .05) : 0; last = now;
  const previousPitch = pitch;
  if (dt > 0) {
    velocity = Math.max(0, Math.min(20, velocity + (brake ? -10 : throttle ? 7 : -velocity * .18) * dt));
    pitch += (targetPitch - pitch) * (1 - Math.exp(-4 * dt));
    spin += velocity * dt / .37;
    angle = head.update({ velocityX: velocity, velocityY: 0, pitch, angularVelocity: (pitch - previousPitch) / dt, grounded: true, landing: impact, obstacleHit: 0 }, dt);
    impact = 0;
  }
  ctx.resetTransform(); ctx.fillStyle = '#f4eee4'; ctx.fillRect(0, 0, 1400, 1115);
  ctx.translate(700, 557.5); ctx.scale(.84, .84); ctx.translate(-792, -555);
  ctx.translate(792, 867); ctx.rotate(-pitch); ctx.translate(-792, -867);
  ctx.strokeStyle = '#cbb797'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-500, 1075); ctx.lineTo(2000, 1075); ctx.stroke();
  for (const axle of [R.rearAxle, R.frontAxle]) {
    ctx.save(); ctx.translate(axle.x, axle.y); ctx.rotate(spin); ctx.scale(203 / 605, 203 / 605);
    ctx.drawImage(sprites.wheel, -R.wheelCenter.x, -R.wheelCenter.y); ctx.restore();
  }
  ctx.drawImage(sprites.body, 0, 0);
  ctx.translate(R.neckPivot.x, R.neckPivot.y); ctx.rotate(angle); ctx.translate(-R.neckPivot.x, -R.neckPivot.y);
  ctx.translate(R.headOffset.x, R.headOffset.y); ctx.scale(R.headScale.x, R.headScale.y); ctx.drawImage(sprites.head, 0, 0);
  document.getElementById('readout')!.textContent = `سرعت: ${(velocity * 3.6).toFixed(0)} km/h · زاویه واکنش سر: ${(angle * 180 / Math.PI).toFixed(2)}°`;
  // Inspectable, read-only telemetry for browser verification.
  Object.assign(window, { headPreviewState: { angle, velocity, pitch, throttle, brake } });
  requestAnimationFrame(frame);
}
Promise.all(Object.entries(spriteImages).map(async ([key, src]) => {
  const img = new Image(); img.src = src; await img.decode(); sprites[key] = img;
})).then(() => requestAnimationFrame(frame));
