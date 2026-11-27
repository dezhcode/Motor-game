import {
  kickerSegment,
  smoothSegment,
  type ControlNode,
  type TrackDefinition,
  type TrackPoint,
} from './desertTrackData';

function buildTutorialPracticeTrack(): TrackDefinition {
  const controlNodes: ControlNode[] = [
    // Safe backstop & long smooth training straight for Throttle + Brake steps
    { x: -12, y: 7.5, linear: true },
    { x: -7, y: 0.2, linear: true },
    { x: -3, y: 0.0 },
    { x: 66, y: 0.0 },

    // Gentle practice ridge & descent for Balance control step (no lethal gaps)
    { x: 78, y: 1.8 },
    { x: 88, y: 2.8 },
    { x: 96, y: 2.8 },
    { x: 112, y: 0.6 },
    { x: 128, y: 0.6 },
  ];

  const points: TrackPoint[] = [];
  for (let i = 0; i < controlNodes.length - 1; i++) {
    const a = controlNodes[i];
    const b = controlNodes[i + 1];
    if (a.linear) {
      points.push({ x: a.x, y: a.y });
    } else {
      const step = Math.abs(b.y - a.y) > 0.4 ? 1.0 : 2.0;
      points.push(...smoothSegment(a, b, step));
    }
  }

  // Safe practice jump: kicker (128..140) -> shallow sand dip (no saw hazard!) -> wide forgiving landing deck (145..178)
  points.push(...kickerSegment(128, 0.6, 140, 3.3, 0.8));
  points.push({ x: 140, y: 3.3 });
  points.push({ x: 141.6, y: 0.8 });
  points.push({ x: 143.6, y: 0.8 });
  points.push({ x: 145.2, y: 2.4 });
  points.push(...smoothSegment({ x: 145.2, y: 2.4 }, { x: 176, y: 0.8 }, 1.2));

  // Smooth finish runout
  points.push(...smoothSegment({ x: 176, y: 0.8 }, { x: 198, y: 0.8 }, 1.5));
  points.push({ x: 206, y: 7.8 });

  return {
    points,
    startX: 4,
    startY: 0.72,
    finishX: 186,
    minX: -12,
    maxX: 206,
    hints: [],
    rampVisualRanges: [[130, 140]],
    checkpointPoleXs: [0.6, 125],
    roadFeatures: [
      { kind: 'sign', startX: 64, endX: 64, signKind: 'slope' },
      { kind: 'sign', startX: 123, endX: 123, signKind: 'jump' },
      { kind: 'sign', startX: 174, endX: 174, signKind: 'finish' },
    ],
    dynamicObstacles: [],
    hazardSaws: [],
  };
}

export const TUTORIAL_TRACK: TrackDefinition = buildTutorialPracticeTrack();
