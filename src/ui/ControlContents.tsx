import { useLayoutEffect, useRef, type ReactNode } from "react";
import { BitmapIcon, type BitmapIconName } from "./BitmapArtwork";

let metrics: CanvasRenderingContext2D | null | undefined;
/** Align the visible Persian glyphs, including dots, rather than a fallback font's line box. */
export function ControlCopy({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    let active = true;
    const align = () => {
      const element = ref.current;
      if (!active || !element) return;
      metrics ??= document.createElement("canvas").getContext("2d");
      if (!metrics) return;
      const style = getComputedStyle(element);
      metrics.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const m = metrics.measureText(element.textContent ?? "");
      const lift =
        (m.fontBoundingBoxAscent -
          m.fontBoundingBoxDescent -
          (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent)) /
        2;
      element.style.setProperty(
        "--copy-lift",
        `${Number.isFinite(lift) ? lift : 0}px`,
      );
    };
    align();
    void document.fonts.ready.then(align);
    const observer = new ResizeObserver(align);
    if (ref.current) observer.observe(ref.current);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [children]);
  return (
    <span className="control-copy" ref={ref}>
      {children}
    </span>
  );
}

export function ControlContents({
  children,
  icon,
}: {
  children: ReactNode;
  icon?: BitmapIconName;
}) {
  return (
    <span className="control-content">
      {icon && <BitmapIcon kind={icon} />}
      <ControlCopy>{children}</ControlCopy>
    </span>
  );
}
