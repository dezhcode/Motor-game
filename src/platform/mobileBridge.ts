import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export interface MobileBridgeHandlers {
  onBackPressed: () => void;
  onBackgroundPause: () => void;
}

declare global {
  interface Window {
    __kavirAndroidBack?: () => boolean;
    __kavirAndroidPause?: () => void;
  }
}

export function isNativeAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export function isPortraitViewport(): boolean {
  return window.innerHeight > window.innerWidth;
}

export async function requestLandscapeAndFullscreenIfSupported(): Promise<void> {
  if (isNativeAndroid()) return;
  try {
    const docEl = document.documentElement;
    if (!document.fullscreenElement && typeof docEl.requestFullscreen === 'function') {
      await docEl.requestFullscreen();
    }
  } catch {
    // Fullscreen may be unsupported or blocked; continue gracefully.
  }

  try {
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (orientation: string) => Promise<void>;
    };
    if (orientation && typeof orientation.lock === 'function') {
      await orientation.lock('landscape');
    }
  } catch {
    // Screen orientation lock is unsupported on many mobile browsers (e.g., iOS Safari).
  }
}

export function registerMobileLifecycleBridge(handlers: MobileBridgeHandlers): () => void {
  const cleanups: Array<() => void> = [];

  // Native WebView fallback bridge (used by AI Studio Android MainActivity as well)
  window.__kavirAndroidBack = () => {
    handlers.onBackPressed();
    return true;
  };
  window.__kavirAndroidPause = () => {
    handlers.onBackgroundPause();
  };
  cleanups.push(() => {
    delete window.__kavirAndroidBack;
    delete window.__kavirAndroidPause;
  });

  const handleVisibility = (): void => {
    if (document.hidden) {
      handlers.onBackgroundPause();
    }
  };
  const handleBlur = (): void => {
    handlers.onBackgroundPause();
  };
  document.addEventListener('visibilitychange', handleVisibility);
  window.addEventListener('blur', handleBlur);
  cleanups.push(() => {
    document.removeEventListener('visibilitychange', handleVisibility);
    window.removeEventListener('blur', handleBlur);
  });

  if (Capacitor.isNativePlatform()) {
    let disposed = false;
    const backPromise = CapacitorApp.addListener('backButton', () => {
      handlers.onBackPressed();
    });
    const statePromise = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        handlers.onBackgroundPause();
      }
    });

    cleanups.push(() => {
      if (disposed) return;
      disposed = true;
      void backPromise.then((h) => h.remove());
      void statePromise.then((h) => h.remove());
    });
  }

  return () => {
    for (const fn of cleanups) {
      fn();
    }
  };
}
