export const SETTINGS_STORAGE_KEY = 'kavirsavar_settings_v1';
export const TUTORIAL_STORAGE_KEY = 'kavirsavar_tutorial_v1';
export const SETTINGS_SCHEMA_VERSION = 1 as const;
export const TUTORIAL_SCHEMA_VERSION = 1 as const;

export interface ControlLayoutSettings {
  buttonScale: number;
  edgeMarginPx: number;
  buttonOpacity: number;
}

export interface GameSettings {
  version: 1;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  controls: ControlLayoutSettings;
}

export interface TutorialProgress {
  version: 1;
  completed: boolean;
  skipped: boolean;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const CONTROL_LIMITS = {
  buttonScale: { min: 0.75, max: 1.25, step: 0.05 },
  edgeMarginPx: { min: 0, max: 44, step: 2 },
  buttonOpacity: { min: 0.35, max: 1.0, step: 0.05 },
} as const;

export const DEFAULT_CONTROL_LAYOUT: Readonly<ControlLayoutSettings> = {
  buttonScale: 1.0,
  edgeMarginPx: 12,
  buttonOpacity: 1.0,
};

export const DEFAULT_GAME_SETTINGS: Readonly<GameSettings> = {
  version: SETTINGS_SCHEMA_VERSION,
  soundEnabled: true,
  hapticsEnabled: true,
  controls: { ...DEFAULT_CONTROL_LAYOUT },
};

export const DEFAULT_TUTORIAL_PROGRESS: Readonly<TutorialProgress> = {
  version: TUTORIAL_SCHEMA_VERSION,
  completed: false,
  skipped: false,
};

function getBrowserStorage(): StorageLike | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number, decimals = 2): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  const clamped = Math.min(max, Math.max(min, value));
  const factor = Math.pow(10, decimals);
  return Math.round(clamped * factor) / factor;
}

export function sanitizeControlLayout(raw: unknown): ControlLayoutSettings {
  const rec = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    buttonScale: clampNumber(
      rec.buttonScale,
      CONTROL_LIMITS.buttonScale.min,
      CONTROL_LIMITS.buttonScale.max,
      DEFAULT_CONTROL_LAYOUT.buttonScale,
      2
    ),
    edgeMarginPx: clampNumber(
      rec.edgeMarginPx,
      CONTROL_LIMITS.edgeMarginPx.min,
      CONTROL_LIMITS.edgeMarginPx.max,
      DEFAULT_CONTROL_LAYOUT.edgeMarginPx,
      0
    ),
    buttonOpacity: clampNumber(
      rec.buttonOpacity,
      CONTROL_LIMITS.buttonOpacity.min,
      CONTROL_LIMITS.buttonOpacity.max,
      DEFAULT_CONTROL_LAYOUT.buttonOpacity,
      2
    ),
  };
}

export function sanitizeGameSettings(raw: unknown): GameSettings {
  if (!raw || typeof raw !== 'object') {
    return {
      version: SETTINGS_SCHEMA_VERSION,
      soundEnabled: DEFAULT_GAME_SETTINGS.soundEnabled,
      hapticsEnabled: DEFAULT_GAME_SETTINGS.hapticsEnabled,
      controls: { ...DEFAULT_CONTROL_LAYOUT },
    };
  }
  const rec = raw as Record<string, unknown>;
  // Reject completely mismatched future/incompatible versions if non-numeric or invalid
  if (rec.version !== undefined && typeof rec.version !== 'number') {
    return {
      version: SETTINGS_SCHEMA_VERSION,
      soundEnabled: DEFAULT_GAME_SETTINGS.soundEnabled,
      hapticsEnabled: DEFAULT_GAME_SETTINGS.hapticsEnabled,
      controls: { ...DEFAULT_CONTROL_LAYOUT },
    };
  }
  return {
    version: SETTINGS_SCHEMA_VERSION,
    soundEnabled:
      typeof rec.soundEnabled === 'boolean' ? rec.soundEnabled : DEFAULT_GAME_SETTINGS.soundEnabled,
    hapticsEnabled:
      typeof rec.hapticsEnabled === 'boolean' ? rec.hapticsEnabled : DEFAULT_GAME_SETTINGS.hapticsEnabled,
    controls: sanitizeControlLayout(rec.controls),
  };
}

export function loadGameSettings(storage: StorageLike | null = getBrowserStorage()): GameSettings {
  if (!storage) {
    return sanitizeGameSettings(null);
  }
  try {
    const raw = storage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return sanitizeGameSettings(null);
    const parsed: unknown = JSON.parse(raw);
    return sanitizeGameSettings(parsed);
  } catch {
    return sanitizeGameSettings(null);
  }
}

export function saveGameSettings(
  settings: GameSettings,
  storage: StorageLike | null = getBrowserStorage()
): GameSettings {
  const sanitized = sanitizeGameSettings(settings);
  if (!storage) return sanitized;
  try {
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(sanitized));
  } catch {
    // Ignore storage quota or private-mode security errors
  }
  return sanitized;
}

export function resetControlLayoutOnly(
  current: GameSettings,
  storage: StorageLike | null = getBrowserStorage()
): GameSettings {
  const next: GameSettings = {
    version: SETTINGS_SCHEMA_VERSION,
    soundEnabled: current.soundEnabled,
    hapticsEnabled: current.hapticsEnabled,
    controls: { ...DEFAULT_CONTROL_LAYOUT },
  };
  return saveGameSettings(next, storage);
}

export function sanitizeTutorialProgress(raw: unknown): TutorialProgress {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_TUTORIAL_PROGRESS };
  }
  const rec = raw as Record<string, unknown>;
  return {
    version: TUTORIAL_SCHEMA_VERSION,
    completed: typeof rec.completed === 'boolean' ? rec.completed : false,
    skipped: typeof rec.skipped === 'boolean' ? rec.skipped : false,
  };
}

export function loadTutorialProgress(
  storage: StorageLike | null = getBrowserStorage()
): TutorialProgress {
  if (!storage) return { ...DEFAULT_TUTORIAL_PROGRESS };
  try {
    const raw = storage.getItem(TUTORIAL_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_TUTORIAL_PROGRESS };
    const parsed: unknown = JSON.parse(raw);
    return sanitizeTutorialProgress(parsed);
  } catch {
    return { ...DEFAULT_TUTORIAL_PROGRESS };
  }
}

export function saveTutorialProgress(
  progress: Partial<TutorialProgress>,
  storage: StorageLike | null = getBrowserStorage()
): TutorialProgress {
  const current = loadTutorialProgress(storage);
  const next = sanitizeTutorialProgress({
    ...current,
    ...progress,
    version: TUTORIAL_SCHEMA_VERSION,
  });
  if (!storage) return next;
  try {
    storage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage failures
  }
  return next;
}

export function isTutorialFinishedOrSkipped(progress: TutorialProgress): boolean {
  return progress.completed || progress.skipped;
}
