import React from "react";
import { RIDER_SPRITE as R } from "../bike/riderSpriteGeometry";
import {
  garageAsset,
  JEEP_SPRITE as J,
  VEHICLES,
  type VehicleId,
} from "../vehicles/vehicleCatalog";

const riderAsset = (name: string) =>
  new URL(`./assets/art/rider-v6/${name}.png`, document.baseURI).href;
export const VehiclePreview: React.FC<{ id: VehicleId }> = ({ id }) => {
  const jeep = id === "jeep";
  const width = jeep ? J.width : 1536,
    height = jeep ? 1070 : 1100;
  const axles = jeep ? [J.rearAxle, J.frontAxle] : [R.rearAxle, R.frontAxle];
  const radius = jeep ? 187 : 216;
  const center = jeep ? J.wheelCenter : R.wheelCenter;
  const sourceRadius = jeep ? J.wheelRadius : R.wheelRadius;
  const sourceSize = 1254;
  const wheelSize = (sourceSize * radius) / sourceRadius;
  return (
    <svg
      className="vehicle-preview"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={VEHICLES[id].name}
    >
      <ellipse
        cx={width / 2}
        cy={jeep ? 990 : 1060}
        rx={width * 0.39}
        ry="28"
        fill="#492d1c"
        opacity=".22"
      />
      {axles.map((p, index) => (
        <image
          key={index}
          href={jeep ? garageAsset("jeep-wheel") : riderAsset("wheel")}
          x={p.x - (center.x * radius) / sourceRadius}
          y={p.y - (center.y * radius) / sourceRadius}
          width={wheelSize}
          height={wheelSize}
        />
      ))}
      <image
        href={jeep ? garageAsset("jeep-body") : riderAsset("body")}
        width={jeep ? J.width : 1536}
        height={jeep ? J.height : 1024}
      />
      {!jeep && (
        <image
          href={riderAsset("head")}
          x={R.headOffset.x}
          y={R.headOffset.y}
          width={1536 * R.headScale.x}
          height={1024 * R.headScale.y}
        />
      )}
    </svg>
  );
};
