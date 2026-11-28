import type { ArtKey } from './artManifest';

export interface SceneryLandmark {
  key: ArtKey;
  worldX: number;
  depth: number;
  referenceHeight: number;
}

/** Every architectural landmark occurs once in this finite level; no tile index or modulo. */
export const ARCHITECTURE: readonly SceneryLandmark[] = [
  { key: 'windcatchers-flat', worldX: 12, depth: 0.34, referenceHeight: 200 },
  { key: 'terraces-flat', worldX: 105, depth: 0.34, referenceHeight: 230 },
  { key: 'caravanserai-flat', worldX: 210, depth: 0.34, referenceHeight: 170 },
  { key: 'oasis-flat', worldX: 315, depth: 0.34, referenceHeight: 215 },
];

export function finitePanoramaX(worldX: number, start: number, finish: number, viewportWidth: number, imageWidth: number): number {
  const progress = Math.max(0, Math.min(1, (worldX - start) / Math.max(1, finish - start)));
  return 0 - progress * Math.max(0, imageWidth - viewportWidth);
}

export function landmarkScreenX(landmark: SceneryLandmark, cameraWorldX: number, viewportWidth: number, scale: number): number {
  return viewportWidth / 2 + (landmark.worldX - cameraWorldX) * 44 * scale * landmark.depth;
}

/** A single authored village enters from the right and leaves fully through the left. */
export function passingVillageX(worldX: number, start: number, finish: number, viewportWidth: number, imageWidth: number): number {
  const progress = Math.max(0, Math.min(1, (worldX-start)/Math.max(1,finish-start)));
  const margin = 24;
  return viewportWidth + imageWidth/2 + margin - progress*(viewportWidth + imageWidth + margin*2);
}
