// The texture extends beyond the wheel contact line in both directions.
export const ROAD_FAR_EDGE = 34;
export const ROAD_NEAR_EDGE = 32;
export const ROAD_TILE_WIDTH = 726;

export function farShoulderOffset(worldX: number): number {
  // Match the phase of the mirrored road tile so roadside props sit in its lip.
  const period = 2 * ROAD_TILE_WIDTH;
  const wrappedX = ((worldX % period) + period) % period;
  const x = Math.min(wrappedX, period - wrappedX);
  return -20 + 3.3 * Math.sin(x / 21) + 2.7 * Math.sin(x / 9.5 + 2.6) + Math.sin(x / 3.8 + 0.8);
}
