import type { CSSProperties } from 'react';
import { paintedUrl, type PaintedArtKey } from '../artwork/paintedManifest';
import type { VehicleId } from '../vehicles/vehicleCatalog';

type Point = readonly [x: number, y: number];
type Field = readonly [x: number, y: number, width: number, height: number];
type Dial = { pivot: Point; angles: Point; needleLength: number };
type Face = { face: PaintedArtKey; size: Point };
type AnalogFace = Face & {
  kind: 'analog';
  speed: Dial;
  fuel: Dial;
  readout: Point;
  scaleRadii: Point;
};
type DigitalFace = Face & {
  kind: 'digital';
  readout: Field;
  fuel: Field;
  speedBar?: Field;
};

// Coordinates are measured on the approved full-resolution art. All positions scale with the bitmap.
const faces: Record<VehicleId, AnalogFace | DigitalFace> = {
  motorcycle: {
    kind: 'analog', face: 'motorcycleGauge', size: [1592, 879],
    speed: { pivot: [584, 437], angles: [151, 389], needleLength: 277 },
    fuel: { pivot: [1213, 517], angles: [205, 333], needleLength: 152 },
    readout: [585, 681], scaleRadii: [239, 254],
  },
  sport: {
    kind: 'digital', face: 'sportGauge', size: [1968, 701],
    readout: [300, 253, 806, 300], fuel: [1210, 455, 363, 40], speedBar: [520, 132, 920, 54],
  },
  jeep: {
    kind: 'analog', face: 'jeepGauge', size: [2139, 679],
    speed: { pivot: [820, 558], angles: [185, 355], needleLength: 356 },
    fuel: { pivot: [1677, 545], angles: [224, 316], needleLength: 220 },
    readout: [820, 492], scaleRadii: [425, 304],
  },
  buggy: {
    kind: 'digital', face: 'buggyGauge', size: [1975, 571],
    readout: [190, 138, 710, 235], fuel: [1284, 216, 490, 82],
  },
};

const MAX_SCALE_SPEED = 140;
const SPEED_MARKS = [0, 35, 70, 105, 140] as const;
const NEEDLE_PIVOT = '7.69% 49.77%';
const NEEDLE_THICKNESS_SCALE = 1.55;
// Segment order is clockwise from the top, then the middle.
const DIGIT_SEGMENTS = [
  '1111110', '0110000', '1101101', '1111001', '0110011',
  '1011011', '1011111', '1110000', '1111111', '1111011',
] as const;

const percent = (value: number, total: number) => `${value / total * 100}%`;
const clampRatio = (value: number) => Math.max(0, Math.min(1, value));
const angleAt = (dial: Dial, value: number) =>
  dial.angles[0] + (dial.angles[1] - dial.angles[0]) * clampRatio(value);
const pointStyle = ([x, y]: Point, [width, height]: Point) => ({
  left: percent(x, width), top: percent(y, height),
});
const fieldStyle = ([x, y, width, height]: Field, size: Point) => ({
  ...pointStyle([x, y], size), width: percent(width, size[0]), height: percent(height, size[1]),
});

function Needle({ dial, size, value }: { dial: Dial; size: Point; value: number }) {
  return <img className="vehicle-gauge-needle" src={paintedUrl('gaugeNeedle')} alt="" style={{
    ...pointStyle(dial.pivot, size),
    width: percent(dial.needleLength * 1431 / 1321, size[0]),
    transformOrigin: NEEDLE_PIVOT,
    transform: `translate(-7.69%, -49.77%) rotate(${angleAt(dial, value)}deg) scaleY(${NEEDLE_THICKNESS_SCALE})`,
  }} />;
}

function SegmentMeter({ field, size, value, count }: { field: Field; size: Point; value: number; count: number }) {
  return <span className="vehicle-gauge-segments" style={fieldStyle(field, size)}>
    {Array.from({ length: count }, (_, index) => (
      <i key={index} style={{ '--segment-fill': percent(clampRatio(value * count - index), 1) } as CSSProperties} />
    ))}
  </span>;
}

function BuggySpeed({ value }: { value: number }) {
  return <strong className="buggy-speed">
    <span className="buggy-speed-text">{value}</span>
    <span className="buggy-speed-digits" aria-hidden="true">
      {String(value).split('').map((digit, index) => (
        <span className="buggy-digit" key={index}>
          {DIGIT_SEGMENTS[Number(digit)].split('').map((lit, segment) => (
            <i key={segment} className={lit === '1' ? 'is-lit' : undefined} />
          ))}
        </span>
      ))}
    </span>
  </strong>;
}

export function VehicleGauge({ vehicle, speed, fuel }: { vehicle: VehicleId; speed: number; fuel: number }) {
  const gauge = faces[vehicle];
  const speedRatio = speed / MAX_SCALE_SPEED;
  const roundedSpeed = Math.round(speed);
  const speedReadout = <>
    {vehicle === 'buggy' ? <BuggySpeed value={roundedSpeed} /> : <strong>{roundedSpeed}</strong>}
    <small>KM/H</small>
  </>;
  return (
    <div className={`vehicle-gauge gauge-${vehicle}`} role="img"
      aria-label={`سرعت ${roundedSpeed} کیلومتر بر ساعت، بنزین ${Math.round(fuel * 100)} درصد`}>
      <img className="vehicle-gauge-face" src={paintedUrl(gauge.face)} alt="" draggable={false} />
      {gauge.kind === 'analog' ? <>
        {SPEED_MARKS.map(mark => {
          const angle = angleAt(gauge.speed, mark / MAX_SCALE_SPEED) * Math.PI / 180;
          const [cx, cy] = gauge.speed.pivot;
          const [rx, ry] = gauge.scaleRadii;
          return <span key={mark} className="vehicle-gauge-mark"
            style={pointStyle([cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)], gauge.size)}>{mark}</span>;
        })}
        <Needle dial={gauge.speed} size={gauge.size} value={speedRatio} />
        <Needle dial={gauge.fuel} size={gauge.size} value={fuel} />
        <span className="vehicle-gauge-speed centered" style={pointStyle(gauge.readout, gauge.size)}>{speedReadout}</span>
      </> : <>
        <span className="vehicle-gauge-speed" style={fieldStyle(gauge.readout, gauge.size)}>{speedReadout}</span>
        <SegmentMeter field={gauge.fuel} size={gauge.size} value={fuel} count={vehicle === 'buggy' ? 8 : 5} />
        {gauge.speedBar && <SegmentMeter field={gauge.speedBar} size={gauge.size} value={speedRatio} count={8} />}
      </>}
    </div>
  );
}
