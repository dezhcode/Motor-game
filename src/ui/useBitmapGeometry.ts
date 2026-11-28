import { useLayoutEffect, type RefObject } from 'react';

// These surfaces stretch only their straight middle. End caps are scaled by the
// complete image height, so changing a label or viewport cannot squash a corner.
const SURFACES = [
  '.metal-panel', '.metal-button', '.menu-text-button', '.ownership-badge',
  '.owned-tag', '.price-tag', '.soon-label', '.game-plaque', '.game-dialog-frame',
  '.game-icon-btn', '.game-action-btn', '.hint-banner', '.stat-pill',
  '.setting-toggle-card', '.setting-slider-card', '.setting-val-pill',
  '.tutorial-confirm-box', '.preview-clamp-note', '.skip-tutorial-btn',
  '.tutorial-step-counter', '.preview-pill', '.preview-corridor-label',
  '.fuel-warning', '.record-badge', '.tutorial-item.illustrated',
  '.painted-timer', '.painted-counter', '.bitmap-meter', '.game-range',
  '.progress-track', '.progress-fill',
].join(',');

export function useBitmapGeometry(rootRef: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const tracked = new Set<HTMLElement>();
    const resize = new ResizeObserver(entries => {
      for (const entry of entries) {
        const height = entry.borderBoxSize?.[0]?.blockSize ?? (entry.target as HTMLElement).offsetHeight;
        const element = entry.target as HTMLElement;
        const value = `${height}px`;
        if (height > 0 && element.style.getPropertyValue('--bitmap-height') !== value) {
          element.style.setProperty('--bitmap-height', value);
        }
      }
    });
    const visit = (node: Element, add: boolean) => {
      const elements = [node, ...node.querySelectorAll<HTMLElement>(SURFACES)];
      for (const element of elements) {
        if (!(element instanceof HTMLElement) || !element.matches(SURFACES)) continue;
        if (add && !tracked.has(element)) {
          tracked.add(element);
          element.style.setProperty('--bitmap-height', `${element.offsetHeight}px`);
          resize.observe(element);
        } else if (!add && tracked.delete(element)) resize.unobserve(element);
      }
    };
    visit(root, true);
    const mutations = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.removedNodes) if (node instanceof Element) visit(node, false);
        for (const node of record.addedNodes) if (node instanceof Element) visit(node, true);
      }
    });
    mutations.observe(root, { childList: true, subtree: true });
    return () => { mutations.disconnect(); resize.disconnect(); tracked.clear(); };
  }, [rootRef]);
}
