import {
  memo,
  useLayoutEffect,
  useRef,
  type ButtonHTMLAttributes,
} from "react";

const textures = new Map<string, Promise<HTMLImageElement>>();
function texture(url: string): Promise<HTMLImageElement> {
  let pending = textures.get(url);
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = url;
    });
    textures.set(url, pending);
  }
  return pending;
}

/** Compose existing raster pixels only; no paths, shapes or generated UI art. */
export const BitmapSurface = memo(
  ({ variant = "panel" }: { variant?: "panel" | "wide" | "square" }) => {
    const ref = useRef<HTMLCanvasElement>(null);
    useLayoutEffect(() => {
      const canvas = ref.current,
        host = canvas?.parentElement;
      if (!canvas || !host) return;
      let active = true,
        revision = 0,
        frame = 0,
        armed = false;
      const draw = async () => {
        const ticket = ++revision;
        // Native CSS resolves image URLs against the stylesheet. A raw custom
        // property keeps relative URLs, which Image.src would resolve against
        // the page instead (and lose /assets/ in a production build).
        const source = getComputedStyle(canvas).backgroundImage;
        const url = /url\(["']?([^"')]+)["']?\)/.exec(source)?.[1];
        if (!url) return;
        canvas.dataset.imageState = "loading";
        const image = await texture(url).catch(() => null);
        if (!active || ticket !== revision) return;
        if (!image) {
          textures.delete(url);
          canvas.dataset.imageState = "error";
          console.error("Unable to load UI artwork", url);
          return;
        }
        const rect = host.getBoundingClientRect();
        const density = window.devicePixelRatio || 1;
        const width = Math.max(1, Math.round(rect.width * density));
        const height = Math.max(1, Math.round(rect.height * density));
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.imageSmoothingQuality = "high";
        const sw = image.naturalWidth,
          sh = image.naturalHeight;
        if (variant === "square") {
          const scale = Math.min(width / sw, height / sh);
          ctx.drawImage(
            image,
            (width - sw * scale) / 2,
            (height - sh * scale) / 2,
            sw * scale,
            sh * scale,
          );
          canvas.dataset.imageState = "ready";
          return;
        }
        const sx = variant === "wide" ? 500 : 190;
        const sy = variant === "wide" ? 0 : 190;
        const authoredCorner =
          parseFloat(
            getComputedStyle(host).getPropertyValue("--panel-corner"),
          ) || 36;
        const corner = Math.min(
          width / 2,
          height / 2,
          ((authoredCorner * rect.width) / host.offsetWidth) * density,
        );
        const dx =
          variant === "wide" ? Math.min(width / 2, (height * sx) / sh) : corner;
        const dy = variant === "wide" ? 0 : corner;
        const xs = [0, sx, sw - sx, sw],
          ys = sy ? [0, sy, sh - sy, sh] : [0, sh];
        const xd = [0, Math.round(dx), width - Math.round(dx), width];
        const yd = sy
          ? [0, Math.round(dy), height - Math.round(dy), height]
          : [0, height];
        for (let y = 0; y < ys.length - 1; y++)
          for (let x = 0; x < 3; x++) {
            ctx.drawImage(
              image,
              xs[x],
              ys[y],
              xs[x + 1] - xs[x],
              ys[y + 1] - ys[y],
              xd[x],
              yd[y],
              xd[x + 1] - xd[x],
              yd[y + 1] - yd[y],
            );
          }
        canvas.dataset.imageState = "ready";
      };
      const schedule = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          void draw();
        });
      };
      const down = () => {
        armed = true;
        schedule();
      };
      const up = () => {
        if (armed) {
          armed = false;
          schedule();
        }
      };
      const resize = new ResizeObserver(schedule);
      resize.observe(host);
      const mutations = new MutationObserver(schedule);
      mutations.observe(host, {
        attributes: true,
        attributeFilter: ["class", "disabled", "style"],
      });
      host.addEventListener("pointerdown", down);
      host.addEventListener("keydown", down);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
      host.addEventListener("keyup", up);
      host.addEventListener("blur", up);
      window.addEventListener("resize", schedule);
      window.addEventListener("kavir:menu-resize", schedule);
      void draw();
      return () => {
        active = false;
        cancelAnimationFrame(frame);
        resize.disconnect();
        mutations.disconnect();
        host.removeEventListener("pointerdown", down);
        host.removeEventListener("keydown", down);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        host.removeEventListener("keyup", up);
        host.removeEventListener("blur", up);
        window.removeEventListener("resize", schedule);
        window.removeEventListener("kavir:menu-resize", schedule);
      };
    }, [variant]);
    return (
      <canvas
        className={`bitmap-surface skin-${variant}`}
        ref={ref}
        aria-hidden="true"
      />
    );
  },
);

export function SkinButton({
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const square = /(?:icon-button|garage-arrow|game-icon-btn)/.test(className);
  return (
    <button {...props} className={className}>
      <BitmapSurface variant={square ? "square" : "wide"} />
      {children}
    </button>
  );
}
