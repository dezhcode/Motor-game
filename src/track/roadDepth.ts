// Vertical offsets in world pixels. Physics follows the center of the visible
// lane, with the far shoulder behind the tires and the near shoulder in front.
export const ROAD_FAR_EDGE = 34;
export const ROAD_NEAR_EDGE = 32;

export function farShoulderOffset(worldX: number): number {
  return -ROAD_FAR_EDGE + 1.7 + 0.8 * Math.sin(worldX / 61) + 0.55 * Math.sin(worldX / 19);
}
