import React, { useLayoutEffect, useRef } from "react";
import { RIDER_SPRITE as R } from "../bike/riderSpriteGeometry";
import {
  garageAsset,
  JEEP_SPRITE as J,
  VEHICLES,
  type VehicleId,
} from "../vehicles/vehicleCatalog";
const riderAsset = (name: string) =>
  new URL(`./assets/art/rider-v6/${name}.png`, document.baseURI).href;
/** Only places complete image layers; no generated shapes or vector drawing. */
export const VehiclePreview: React.FC<{ id: VehicleId }> = ({ id }) => {
  const jeep = id === "jeep",
    width = jeep ? J.width : 1536,
    height = jeep ? 1070 : 1100;
  const axles = jeep ? [J.rearAxle, J.frontAxle] : [R.rearAxle, R.frontAxle];
  const radius = jeep ? 187 : 216,
    center = jeep ? J.wheelCenter : R.wheelCenter,
    sourceRadius = jeep ? J.wheelRadius : R.wheelRadius;
  const wheelSize = (1254 * radius) / sourceRadius;
  const frame = useRef<HTMLDivElement>(null);
  const artwork = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const fit = () => {
      if (!frame.current || !artwork.current) return;
      const scale = Math.min(frame.current.clientWidth / width, frame.current.clientHeight / height);
      artwork.current.style.width = `${width * scale}px`;
      artwork.current.style.height = `${height * scale}px`;
    };
    const observer = new ResizeObserver(fit);
    if (frame.current) observer.observe(frame.current);
    fit();
    return () => observer.disconnect();
  }, [width, height]);
  const position = (
    x: number,
    y: number,
    w: number,
    h: number,
  ): React.CSSProperties => ({
    left: `${(x / width) * 100}%`,
    top: `${(y / height) * 100}%`,
    width: `${(w / width) * 100}%`,
    height: `${(h / height) * 100}%`,
  });
  return (
    <div
      className="vehicle-preview"
      ref={frame}
      style={{ "--vehicle-ratio": `${width}/${height}` } as React.CSSProperties}
      role="img"
      aria-label={VEHICLES[id].name}
    >
      <div className="vehicle-image-layers" ref={artwork}>
      {axles.map((p, i) => (
        <img
          key={i}
          src={jeep ? garageAsset("jeep-wheel") : riderAsset("wheel")}
          style={position(
            p.x - (center.x * radius) / sourceRadius,
            p.y - (center.y * radius) / sourceRadius,
            wheelSize,
            wheelSize,
          )}
          alt=""
          draggable={false}
        />
      ))}
      <img
        src={jeep ? garageAsset("jeep-body") : riderAsset("body")}
        style={position(0, 0, jeep ? J.width : 1536, jeep ? J.height : 1024)}
        alt=""
        draggable={false}
      />
      {!jeep && (
        <img
          src={riderAsset("head")}
          style={position(
            R.headOffset.x,
            R.headOffset.y,
            1536 * R.headScale.x,
            1024 * R.headScale.y,
          )}
          alt=""
          draggable={false}
        />
      )}
      </div>
    </div>
  );
};
