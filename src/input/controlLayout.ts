import { CONTROL_LIMITS, type ControlLayoutSettings, sanitizeControlLayout } from '../storage/settingsStorage';

export interface ViewportMetrics {
  width: number;
  height: number;
  safeTop: number;
  safeRight: number;
  safeBottom: number;
  safeLeft: number;
}

export interface ResolvedControlLayout {
  requestedScale: number;
  effectiveScale: number;
  maxAllowedScale: number;
  requestedEdgePx: number;
  effectiveEdgeX: number;
  effectiveEdgeY: number;
  maxEdgeX: number;
  maxEdgeY: number;
  buttonOpacity: number;
  leanWidth: number;
  leanHeight: number;
  brakeWidth: number;
  brakeHeight: number;
  throttleWidth: number;
  throttleHeight: number;
  clusterGap: number;
  touchMinSize: number;
  leftClusterWidth: number;
  rightClusterWidth: number;
  centerClearancePx: number;
  wasClampedForScreen: boolean;
}

export const MIN_TOUCH_TARGET_PX = 56;

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function baseDimensionsForViewport(width: number, height: number) {
  const safeW = Math.max(320, width);
  const safeH = Math.max(240, height);
  const compact = safeH <= 440;

  if (compact) {
    return {
      leanW: 74,
      leanH: 78,
      brakeW: 78,
      brakeH: 80,
      throttleW: 86,
      throttleH: 94,
      gap: 10,
      topHudReserve: 64,
    };
  }

  return {
    leanW: clamp(safeW * 0.115, 78, 102),
    leanH: clamp(safeW * 0.122, 84, 108),
    brakeW: clamp(safeW * 0.12, 84, 106),
    brakeH: clamp(safeW * 0.125, 86, 108),
    throttleW: clamp(safeW * 0.135, 92, 118),
    throttleH: clamp(safeW * 0.145, 102, 128),
    gap: clamp(safeW * 0.018, 8, 18),
    topHudReserve: 74,
  };
}

/**
 * Resolves stored user control preferences against current viewport dimensions and safe-area insets
 * so touch buttons never clip off-screen, overlap each other, block the central riding corridor,
 * or drop below a finger-friendly touch target.
 */
export function resolveControlLayout(
  requestedRaw: ControlLayoutSettings,
  viewport: ViewportMetrics
): ResolvedControlLayout {
  const requested = sanitizeControlLayout(requestedRaw);
  const width = Math.max(320, Number.isFinite(viewport.width) ? viewport.width : 1280);
  const height = Math.max(240, Number.isFinite(viewport.height) ? viewport.height : 720);
  const safeTop = Math.max(0, Number.isFinite(viewport.safeTop) ? viewport.safeTop : 0);
  const safeRight = Math.max(0, Number.isFinite(viewport.safeRight) ? viewport.safeRight : 0);
  const safeBottom = Math.max(0, Number.isFinite(viewport.safeBottom) ? viewport.safeBottom : 0);
  const safeLeft = Math.max(0, Number.isFinite(viewport.safeLeft) ? viewport.safeLeft : 0);

  const availW = Math.max(260, width - safeLeft - safeRight);
  const availH = Math.max(200, height - safeTop - safeBottom);
  const base = baseDimensionsForViewport(width, height);

  // Reserve a clean central corridor so the motorcycle and upcoming landing ramp remain visible
  const minCenterClearance = Math.max(88, Math.round(availW * 0.22));
  const centerVerticalReserve = Math.max(106, Math.round(availH * 0.42));
  const maxBottomBudget = Math.max(92, availH - base.topHudReserve - centerVerticalReserve);

  const rawHorizontalTotal = base.leanW * 2 + base.brakeW + base.throttleW + base.gap * 2;
  const maxHorizontalScale = (availW - minCenterClearance) / rawHorizontalTotal;
  const maxVerticalScale = maxBottomBudget / base.throttleH;

  const maxAllowedScale = clamp(
    Math.floor(Math.min(maxHorizontalScale, maxVerticalScale, CONTROL_LIMITS.buttonScale.max) * 100) / 100,
    CONTROL_LIMITS.buttonScale.min,
    CONTROL_LIMITS.buttonScale.max
  );

  const effectiveScale = clamp(
    requested.buttonScale,
    CONTROL_LIMITS.buttonScale.min,
    maxAllowedScale
  );

  const leanWidth = Math.round(base.leanW * effectiveScale);
  const leanHeight = Math.round(base.leanH * effectiveScale);
  const brakeWidth = Math.round(base.brakeW * effectiveScale);
  const brakeHeight = Math.round(base.brakeH * effectiveScale);
  const throttleWidth = Math.round(base.throttleW * effectiveScale);
  const throttleHeight = Math.round(base.throttleH * effectiveScale);
  const clusterGap = Math.max(6, Math.round(base.gap * Math.min(1.15, effectiveScale)));

  // Interactive hit area stays >= MIN_TOUCH_TARGET_PX even at smallest visual scale
  const effectiveLeanHitW = Math.max(MIN_TOUCH_TARGET_PX, leanWidth);
  const effectiveBrakeHitW = Math.max(MIN_TOUCH_TARGET_PX, brakeWidth);
  const effectiveThrottleHitW = Math.max(MIN_TOUCH_TARGET_PX, throttleWidth);
  const effectiveThrottleHitH = Math.max(MIN_TOUCH_TARGET_PX, throttleHeight);

  const leftClusterWidth = effectiveLeanHitW * 2 + clusterGap;
  const rightClusterWidth = effectiveBrakeHitW + effectiveThrottleHitW + clusterGap;

  const remainingWidth = Math.max(0, availW - leftClusterWidth - rightClusterWidth - minCenterClearance);
  const maxEdgeX = Math.max(
    0,
    Math.min(CONTROL_LIMITS.edgeMarginPx.max, Math.floor(remainingWidth / 2))
  );
  const maxEdgeY = Math.max(
    0,
    Math.min(CONTROL_LIMITS.edgeMarginPx.max, Math.floor(maxBottomBudget - effectiveThrottleHitH))
  );

  const effectiveEdgeX = clamp(requested.edgeMarginPx, 0, maxEdgeX);
  const effectiveEdgeY = clamp(requested.edgeMarginPx, 0, maxEdgeY);
  const centerClearancePx = Math.max(
    0,
    availW - leftClusterWidth - rightClusterWidth - effectiveEdgeX * 2
  );

  const wasClampedForScreen =
    effectiveScale < requested.buttonScale - 0.005 ||
    effectiveEdgeX < requested.edgeMarginPx ||
    effectiveEdgeY < requested.edgeMarginPx;

  return {
    requestedScale: requested.buttonScale,
    effectiveScale,
    maxAllowedScale,
    requestedEdgePx: requested.edgeMarginPx,
    effectiveEdgeX,
    effectiveEdgeY,
    maxEdgeX,
    maxEdgeY,
    buttonOpacity: requested.buttonOpacity,
    leanWidth,
    leanHeight,
    brakeWidth,
    brakeHeight,
    throttleWidth,
    throttleHeight,
    clusterGap,
    touchMinSize: MIN_TOUCH_TARGET_PX,
    leftClusterWidth,
    rightClusterWidth,
    centerClearancePx,
    wasClampedForScreen,
  };
}

let cachedProbeEl: HTMLDivElement | null = null;

export function readViewportMetrics(): ViewportMetrics {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      width: 1280,
      height: 720,
      safeTop: 0,
      safeRight: 0,
      safeBottom: 0,
      safeLeft: 0,
    };
  }

  const width = window.innerWidth || document.documentElement.clientWidth || 1280;
  const height = window.innerHeight || document.documentElement.clientHeight || 720;

  let safeTop = 0;
  let safeRight = 0;
  let safeBottom = 0;
  let safeLeft = 0;

  try {
    if (!cachedProbeEl && document.body) {
      const el = document.createElement('div');
      el.setAttribute('aria-hidden', 'true');
      el.style.cssText =
        'position:fixed;inset:0;pointer-events:none;visibility:hidden;z-index:-1;' +
        'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);';
      document.body.appendChild(el);
      cachedProbeEl = el;
    }
    if (cachedProbeEl) {
      const cs = window.getComputedStyle(cachedProbeEl);
      safeTop = parseFloat(cs.paddingTop) || 0;
      safeRight = parseFloat(cs.paddingRight) || 0;
      safeBottom = parseFloat(cs.paddingBottom) || 0;
      safeLeft = parseFloat(cs.paddingLeft) || 0;
    }
  } catch {
    // Fallback to zero insets if DOM measurement unavailable
  }

  return { width, height, safeTop, safeRight, safeBottom, safeLeft };
}
