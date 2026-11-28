import { useLayoutEffect, useRef, type ReactNode } from "react";

/** Match the approved landscape composition at one uniform scale. */
export function MenuCanvas({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    const host = element?.parentElement;
    if (!element || !host) return;
    const fit = () => {
      const scale = Math.min(host.clientWidth / 1600, host.clientHeight / 720);
      element.style.setProperty("--menu-scale", `${scale}`);
      element.style.left = `${host.clientWidth / (2 * scale)}px`;
      element.style.top = `${host.clientHeight / (2 * scale)}px`;
      window.dispatchEvent(new Event("kavir:menu-resize"));
    };
    const observer = new ResizeObserver(fit);
    observer.observe(host);
    fit();
    return () => observer.disconnect();
  }, []);
  return (
    <div className="menu-layout" ref={ref}>
      {children}
    </div>
  );
}
