import { useEffect, useRef } from 'react';
import { clampTilt, relativeTilt, screenTilt, type LoadingTilt } from './loadingMotion';

export function useLoadingMotion() {
  const surfaceRef = useRef<HTMLElement>(null);
  const target = useRef<LoadingTilt>({ x: 0, y: 0 });
  const baseline = useRef<LoadingTilt | null>(null);
  const sensorSeen = useRef(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let previous = 0;
    const current = { x: 0, y: 0 };
    const reset = () => { baseline.current = null; target.current = { x: 0, y: 0 }; };
    const orient = (event: DeviceOrientationEvent) => {
      if (reduced.matches ||
          event.beta === null || event.gamma === null ||
          !Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
      const legacyAngle = (window as Window & { orientation?: number }).orientation;
      const projected = screenTilt(event.beta, event.gamma, window.screen.orientation?.angle ?? legacyAngle ?? 0);
      baseline.current ??= projected;
      target.current = relativeTilt(projected, baseline.current);
      sensorSeen.current = true;
    };
    const pointer = (event: PointerEvent) => {
      if (sensorSeen.current || reduced.matches || (event.target as Element).closest('button')) return;
      const rect = surfaceRef.current?.getBoundingClientRect();
      if (rect) target.current = {
        x: clampTilt((event.clientX - rect.left) / rect.width * 2 - 1),
        y: clampTilt((event.clientY - rect.top) / rect.height * 2 - 1),
      };
    };
    const animate = (time: number) => {
      const dt = Math.min(previous ? time - previous : 16, 48);
      previous = time;
      const amount = 1 - Math.exp(-dt / 150);
      current.x += (target.current.x - current.x) * amount;
      current.y += (target.current.y - current.y) * amount;
      const node = surfaceRef.current;
      if (node) {
        node.style.setProperty('--tilt-x', String(current.x));
        node.style.setProperty('--tilt-y', String(current.y));
      }
      frame = requestAnimationFrame(animate);
    };
    const updateAnimation = () => {
      cancelAnimationFrame(frame);
      previous = 0;
      if (reduced.matches) {
        reset();
        surfaceRef.current?.style.setProperty('--tilt-x', '0');
        surfaceRef.current?.style.setProperty('--tilt-y', '0');
      } else if (!document.hidden) frame = requestAnimationFrame(animate);
    };
    const surface = surfaceRef.current;
    window.addEventListener('deviceorientation', orient, { passive: true });
    window.addEventListener('orientationchange', reset);
    window.screen.orientation?.addEventListener('change', reset);
    surface?.addEventListener('pointermove', pointer, { passive: true });
    surface?.addEventListener('pointerleave', reset);
    document.addEventListener('visibilitychange', updateAnimation);
    reduced.addEventListener('change', updateAnimation);
    updateAnimation();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('deviceorientation', orient);
      window.removeEventListener('orientationchange', reset);
      window.screen.orientation?.removeEventListener('change', reset);
      surface?.removeEventListener('pointermove', pointer);
      surface?.removeEventListener('pointerleave', reset);
      document.removeEventListener('visibilitychange', updateAnimation);
      reduced.removeEventListener('change', updateAnimation);
    };
  }, []);
  // No permission prompts or buttons on the splash. Browsers requiring a new
  // gesture-bound sensor grant keep the existing pointer/touch fallback.
  return surfaceRef;
}
