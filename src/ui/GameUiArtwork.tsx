import React from "react";
import { BitmapIcon } from "./BitmapArtwork";

export const TimerStopwatchArt: React.FC = () => (
  <BitmapIcon kind="time" className="hud-badge-svg" />
);
export const ProgressRiderMarkerArt: React.FC = () => (
  <BitmapIcon kind="garage" className="progress-rider-svg" />
);
export const FinishFlagMiniArt: React.FC = () => (
  <BitmapIcon kind="flag" className="progress-flag-svg" />
);
export type HudActionKind =
  "sound" | "haptics" | "restart" | "pause" | "settings";
export const HudActionIconArt = React.memo(
  ({ kind, active = true }: { kind: HudActionKind; active?: boolean }) => (
    <BitmapIcon
      kind={
        kind === "sound"
          ? active
            ? "sound-on"
            : "sound-off"
          : kind === "haptics"
            ? active
              ? "haptics-on"
              : "haptics-off"
            : kind
      }
      className="hud-action-svg"
    />
  ),
);
export const KavirLogoCrestArt: React.FC = () => (
  <img
    className="logo-crest-svg"
    src={new URL("./assets/art/home/logo.webp", document.baseURI).href}
    alt="کویرسوار"
  />
);
export const OverlayBadgeArt: React.FC<{
  kind: "pause" | "crash" | "victory";
  stars?: number;
}> = ({ kind, stars = 3 }) => (
  <div className={`bitmap-overlay-badge ${kind}`}>
    <BitmapIcon
      kind={kind === "victory" ? "trophy" : kind}
      className="overlay-badge-svg"
    />
    {kind === "victory" && (
      <div className="bitmap-victory-stars" aria-label={`${stars} ستاره`}>
        {[1, 2, 3].map((i) => (
          <BitmapIcon key={i} kind={i <= stars ? "star" : "star-empty"} />
        ))}
      </div>
    )}
  </div>
);
export const ActionBtnIconArt: React.FC<{
  kind: "play" | "replay" | "resume" | "settings";
}> = ({ kind }) => (
  <BitmapIcon
    kind={kind === "replay" ? "restart" : kind === "resume" ? "play" : kind}
    className="btn-icon-svg"
  />
);
