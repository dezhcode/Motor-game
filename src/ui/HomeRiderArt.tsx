import React, { useEffect, useRef } from 'react';
import { RIDER_SPRITE as R } from '../bike/riderSpriteGeometry';

/** Uses the approved gameplay sprites, including the corrected neck registration. */
export const HomeRiderArt: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let active = true;
    const images = ['body', 'head', 'wheel'].map(name => {
      const image = new Image();
      image.src = new URL(`./assets/art/rider-v6/${name}.png`, document.baseURI).href;
      return image;
    });
    void Promise.all(images.map(image => image.decode())).then(() => {
      if (!active) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const [body, head, wheel] = images;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(800, 625);
      ctx.rotate(-0.18);
      ctx.translate(-792, -555);
      for (const axle of [R.rearAxle, R.frontAxle]) {
        ctx.save();
        ctx.translate(axle.x, axle.y);
        ctx.scale(203 / R.wheelRadius, 203 / R.wheelRadius);
        ctx.drawImage(wheel, -R.wheelCenter.x, -R.wheelCenter.y);
        ctx.restore();
      }
      ctx.drawImage(body, 0, 0);
      ctx.translate(R.headOffset.x, R.headOffset.y);
      ctx.scale(R.headScale.x, R.headScale.y);
      ctx.drawImage(head, 0, 0);
      ctx.restore();
    }).catch(() => {
      // Keep navigation available if the decorative image cannot decode.
    });
    return () => { active = false; };
  }, []);
  return <canvas ref={ref} width={1600} height={1250} className="home-rider-canvas" role="img" aria-label="موتورسوار کویرسوار با موتور فیروزه‌ای در حال پرش" />;
};
