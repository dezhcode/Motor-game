/** Registration in original PNG pixels. Keep source canvases intact. */
export const RIDER_SPRITE = {
  rearAxle: { x: 347.702, y: 867.377 },
  frontAxle: { x: 1236.512, y: 866.775 },
  wheelCenter: { x: 623.1717681536959, y: 634.4324324324324 },
  wheelRadius: 605,
  neckPivot: { x: 721, y: 282 },
  headScale: { x: 0.3630731102850062, y: 0.355 },
  headOffset: { x: 493.0198265179678, y: 5.73 },
} as const;
export const RIDER_SPRITE_FILES = {
  'rider-body': 'rider-v6/body.png',
  'rider-head': 'rider-v6/head.png',
  'rider-wheel': 'rider-v6/wheel.png',
} as const;
export type RiderSpriteKey = keyof typeof RIDER_SPRITE_FILES;
