import React from "react";
import { paintedUrl } from "../artwork/paintedManifest";
import { garageAsset } from "../vehicles/vehicleCatalog";
import {
  resolvedBitmapUrl,
  warmBitmapTextures,
} from "../artwork/bitmapTextures";
import { BitmapSurface } from "./BitmapSurface";

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
    <span className="bitmap-meter-track" aria-hidden="true">
      <BitmapSurface variant="wide" />
    </span>
    <span
      className="bitmap-meter-fill"
      aria-hidden="true"
      style={{
        clipPath: `inset(0 ${100 - Math.max(0, Math.min(100, value))}% 0 0)`,
      }}
    >
      <BitmapSurface variant="wide" />
    </span>
  </span>
);
/** Normal and pressed textures are separate generated files. Warm them once off the render path. */
export function preloadButtonStates(): () => void {
  const timer = setTimeout(() => {
    const probe = document.createElement("span");
    // Keep background-image declared in the stylesheet, like a drawn surface.
    // An inline background-image would resolve relative URLs against the page.
    probe.className = "bitmap-surface";
    probe.style.cssText =
      "position:fixed;width:0;height:0;visibility:hidden;pointer-events:none";
    document.body.append(probe);
    const urls: string[] = [];
    try {
      for (const property of [
        "--ui-dark-down",
        "--ui-amber-down",
        "--ui-selected-down",
        "--ui-square-down",
        "--ui-square-amber-down",
        "--ui-panel-down",
        "--ui-panel-selected-down",
        "--ui-arrow-down",
      ]) {
        probe.style.setProperty("--skin-image", `var(${property})`);
        const url = resolvedBitmapUrl(probe);
        if (url) urls.push(url);
      }
    } finally {
      probe.remove();
    }
    warmBitmapTextures(urls);
  }, 300);
  return () => {
    clearTimeout(timer);
  };
}
