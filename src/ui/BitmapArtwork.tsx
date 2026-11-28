import React from "react";
import { paintedUrl } from "../artwork/paintedManifest";
import { garageAsset } from "../vehicles/vehicleCatalog";

export const bitmapUrl = (name: string) =>
  new URL(`./assets/art/ui-bitmaps/${name}.webp`, document.baseURI).href;
export type BitmapIconName =
  | "home"
  | "garage"
  | "flag"
  | "trophy"
  | "settings"
  | "back"
  | "arrow-left"
  | "arrow-right"
  | "restart"
  | "pause"
  | "play"
  | "sound-on"
  | "sound-off"
  | "haptics-on"
  | "haptics-off"
  | "close"
  | "check"
  | "lock"
  | "star"
  | "star-empty"
  | "crash"
  | "rotate"
  | "distance"
  | "engine"
  | "balance"
  | "shock"
  | "fuel"
  | "wheel"
  | "time"
  | "records";
export const BitmapIcon = React.memo(
  ({ kind, className = "" }: { kind: BitmapIconName; className?: string }) => {
    const source =
      kind === "fuel"
        ? paintedUrl("fuel")
        : kind === "wheel"
          ? garageAsset("jeep-wheel")
          : bitmapUrl(`icon-${kind === "records" ? "trophy" : kind}`);
    return (
      <img
        src={source}
        className={`bitmap-icon ${className}`}
        alt=""
        aria-hidden="true"
        draggable={false}
        decoding="async"
      />
    );
  },
);
export const ImageMeter: React.FC<{ value: number; label: string }> = ({
  value,
  label,
}) => (
  <span
    className="bitmap-meter"
    role="meter"
    aria-label={label}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={value}
  >
    <img src={bitmapUrl("bar-track")} alt="" draggable={false} />
    <img
      src={bitmapUrl("bar-fill")}
      alt=""
      draggable={false}
      style={{
        clipPath: `inset(0 ${100 - Math.max(0, Math.min(100, value))}% 0 0)`,
      }}
    />
  </span>
);
/** Normal and pressed textures are separate generated files. Warm them once off the render path. */
export function preloadButtonStates(): () => void {
  const images: HTMLImageElement[] = [];
  const timer = setTimeout(() => {
    for (const key of [
      "button-dark-pressed",
      "button-amber-pressed",
      "button-selected-pressed",
      "square-dark-pressed",
      "square-amber-pressed",
      "panel-dark-pressed",
      "panel-selected-pressed",
    ]) {
      const image = new Image();
      image.src = bitmapUrl(key);
      images.push(image);
    }
  }, 300);
  return () => {
    clearTimeout(timer);
    images.length = 0;
  };
}
