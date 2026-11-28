export interface LoadingTilt { x: number; y: number }
export const clampTilt = (value: number) => Math.max(-1, Math.min(1, value));

/** Project device axes onto the current screen, then normalize a gentle 18° tilt. */
export function screenTilt(beta: number, gamma: number, angle: number): LoadingTilt {
  if (![beta, gamma, angle].every(Number.isFinite)) return { x: 0, y: 0 };
  const radians = angle * Math.PI / 180;
  return {
    x: gamma * Math.cos(radians) + beta * Math.sin(radians),
    y: beta * Math.cos(radians) - gamma * Math.sin(radians),
  };
}

export function relativeTilt(current: LoadingTilt, baseline: LoadingTilt): LoadingTilt {
  return { x: clampTilt((current.x - baseline.x) / 18), y: clampTilt((current.y - baseline.y) / 18) };
}
