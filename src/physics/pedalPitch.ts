/** Physical pitch assist for the two-pedal scheme. Positive torque raises the front wheel. */
export function pedalPitchTorque(throttle: boolean, brake: boolean, grounded: boolean, pitch: number, slope: number, omega: number, inertia: number): number {
  const direction = brake ? -1 : throttle ? 1 : 0;
  if (!direction) return grounded ? 0 : -omega * .9;
  if (!grounded) return Math.max(-100, Math.min(100, (direction * 1.05 - omega) * inertia * 4.8));
  const relativePitch = Math.atan2(Math.sin(pitch - slope), Math.cos(pitch - slope));
  const target = brake ? -.16 : .24;
  return Math.max(-90, Math.min(90, ((target - relativePitch) * 32 - omega * 7) * inertia));
}
