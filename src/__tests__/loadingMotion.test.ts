import { describe, expect, it } from 'vitest';
import { relativeTilt, screenTilt } from '../ui/loadingMotion';

describe('Loading screen device motion', () => {
  it('calibrates to the initial phone position without an initial jump', () => {
    const baseline = screenTilt(67, -13, 90);
    expect(relativeTilt(baseline, baseline)).toEqual({ x: 0, y: 0 });
    const moved = relativeTilt(screenTilt(76, -13, 90), baseline);
    expect(moved.x).toBeCloseTo(0.5);
    expect(moved.y).toBeCloseTo(0);
  });

  it('keeps screen directions correct in both landscape orientations and portrait', () => {
    const cases = [[0, 9, 0, 0.5, 0], [9, 0, 90, 0.5, 0], [-9, 0, 270, 0.5, 0],
      [9, 0, 0, 0, 0.5], [0, -9, 90, 0, 0.5], [0, 9, 270, 0, 0.5]];
    for (const [beta, gamma, angle, x, y] of cases) {
      const actual = relativeTilt(screenTilt(beta, gamma, angle), { x: 0, y: 0 });
      expect(actual.x).toBeCloseTo(x);
      expect(actual.y).toBeCloseTo(y);
    }
  });

  it('limits strong tilts and ignores invalid sensor readings', () => {
    expect(relativeTilt({ x: 100, y: -100 }, { x: 0, y: 0 })).toEqual({ x: 1, y: -1 });
    expect(screenTilt(NaN, 4, 90)).toEqual({ x: 0, y: 0 });
    expect(screenTilt(4, Infinity, 90)).toEqual({ x: 0, y: 0 });
  });
});
