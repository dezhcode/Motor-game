import { kickerSegment, smoothSegment, type TrackDefinition } from '../track/desertTrackData';

const beforeCrest = [
  { x: -12, y: 5 }, { x: -4, y: 0 }, { x: 22, y: 0 },
  { x: 32, y: .85 }, { x: 43, y: .2 }, { x: 56, y: .2 },
  { x: 78, y: 3.2 }, { x: 95, y: 3.2 }, { x: 119, y: 1 },
];
const afterCrest = [
  { x: 134, y: 3.5 }, { x: 139, y: 2.9 }, { x: 159, y: .8 },
  { x: 193, y: .8 }, { x: 201, y: 6 },
];
function smoothRoute(nodes: typeof beforeCrest) {
  return nodes.slice(0, -1).flatMap((node, index) => smoothSegment(node, nodes[index + 1]));
}

export const FRIDAY_TRACK: TrackDefinition = {
  points: [
    ...smoothRoute(beforeCrest),
    ...kickerSegment(119, 1, 134, 3.5),
    ...smoothRoute(afterCrest),
    afterCrest[afterCrest.length - 1],
  ],
  startX: 4, startY: .72, finishX: 182, minX: -12, maxX: 201,
  hints: [
    { id: 'throttle', startX: 0, endX: 13, labelFa: 'گاز بده و مسابقه رو شروع کن' },
    { id: 'jump1', startX: 116, endX: 134, labelFa: 'نزدیک نوک تپه گاز رو رها کن' },
  ],
  roadFeatures: [
    { kind: 'sign', startX: 25, endX: 25, signKind: 'bumps' },
    { kind: 'sign', startX: 118, endX: 118, signKind: 'jump' },
    { kind: 'sign', startX: 172, endX: 172, signKind: 'finish' },
  ],
};
