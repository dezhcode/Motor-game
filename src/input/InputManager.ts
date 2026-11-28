export type ControlAction = 'throttle' | 'brake' | 'leanLeft' | 'leanRight';

export interface ControlState {
  throttle: boolean;
  brake: boolean;
  leanLeft: boolean;
  leanRight: boolean;
  anyActive: boolean;
}

export interface InputCallbacks {
  onRestartRequested?: () => void;
  onPauseToggleRequested?: () => void;
  onFirstControl?: () => void;
}

export interface EffectiveControlSignals {
  throttleActive: boolean;
  brakeActive: boolean;
  leanDir: -1 | 0 | 1;
}

export function resolveEffectiveControls(state: ControlState): EffectiveControlSignals {
  // Opposing drive inputs: brake always takes safety precedence over throttle,
  // while both inputs remain independently tracked so releasing brake resumes throttle cleanly.
  const brakeActive = state.brake;
  const throttleActive = state.throttle && !state.brake;
  // Opposing balance inputs: holding both left & right cancels cleanly to neutral (0).
  const leanDir: -1 | 0 | 1 =
    state.leanLeft && !state.leanRight
      ? -1
      : state.leanRight && !state.leanLeft
        ? 1
        : 0;
  return { throttleActive, brakeActive, leanDir };
}

export class InputManager {
  private readonly activePointers = new Map<number, ControlAction>();
  private readonly activeKeys = new Set<string>();
  private callbacks: InputCallbacks = {};
  private controlsLocked = false;
  private readonly onChangeListeners = new Set<(state: ControlState) => void>();

  private readonly handleKeyDown = (e: KeyboardEvent): void => {
    if (
      typeof HTMLElement !== 'undefined' &&
      e.target instanceof HTMLElement &&
      e.target.closest('input, textarea, select, [contenteditable="true"]')
    ) {
      return;
    }
    if (e.code === 'Escape' && !e.repeat) {
      e.preventDefault();
      this.callbacks.onPauseToggleRequested?.();
      return;
    }
    if (e.code === 'KeyR' && !e.repeat) {
      e.preventDefault();
      this.callbacks.onRestartRequested?.();
      return;
    }

    if (this.controlsLocked) return;

    if (
      e.code === 'KeyW' ||
      e.code === 'ArrowUp' ||
      e.code === 'KeyS' ||
      e.code === 'ArrowDown' ||
      e.code === 'KeyA' ||
      e.code === 'ArrowLeft' ||
      e.code === 'KeyD' ||
      e.code === 'ArrowRight'
    ) {
      e.preventDefault();
      if (!this.activeKeys.has(e.code)) {
        this.activeKeys.add(e.code);
        this.callbacks.onFirstControl?.();
        this.emitState();
      }
    }
  };

  private readonly handleKeyUp = (e: KeyboardEvent): void => {
    if (this.activeKeys.delete(e.code)) {
      this.emitState();
    }
  };

  private readonly handleWindowPointerEnd = (e: PointerEvent): void => {
    this.onPointerRelease(e.pointerId);
  };

  private readonly handleWindowBlur = (): void => {
    this.clearAll();
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.clearAll();
    }
  };

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyDown, { passive: false });
      window.addEventListener('keyup', this.handleKeyUp);
      window.addEventListener('pointerup', this.handleWindowPointerEnd);
      window.addEventListener('pointercancel', this.handleWindowPointerEnd);
      window.addEventListener('blur', this.handleWindowBlur);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  public setCallbacks(callbacks: InputCallbacks): void {
    this.callbacks = callbacks;
  }

  public setLocked(locked: boolean): void {
    this.controlsLocked = locked;
    if (locked) {
      this.clearAll();
    }
  }

  public onPointerDown(pointerId: number, action: ControlAction): void {
    if (this.controlsLocked) return;
    const prevAction = this.activePointers.get(pointerId);
    this.activePointers.set(pointerId, action);
    if (prevAction !== action) {
      this.callbacks.onFirstControl?.();
      this.emitState();
    }
  }

  public onPointerRelease(pointerId: number): void {
    if (this.activePointers.delete(pointerId)) {
      this.emitState();
    }
  }

  public getActivePointerCount(): number {
    return this.activePointers.size;
  }

  public clearAll(): void {
    const hadAny = this.activePointers.size > 0 || this.activeKeys.size > 0;
    this.activePointers.clear();
    this.activeKeys.clear();
    if (hadAny) {
      this.emitState();
    }
  }

  public subscribe(listener: (state: ControlState) => void): () => void {
    this.onChangeListeners.add(listener);
    listener(this.getState());
    return () => {
      this.onChangeListeners.delete(listener);
    };
  }

  public getState(): ControlState {
    if (this.controlsLocked) {
      return {
        throttle: false,
        brake: false,
        leanLeft: false,
        leanRight: false,
        anyActive: false,
      };
    }

    let throttle = this.activeKeys.has('KeyW') || this.activeKeys.has('ArrowUp');
    let brake = this.activeKeys.has('KeyS') || this.activeKeys.has('ArrowDown');
    let leanLeft = this.activeKeys.has('KeyA') || this.activeKeys.has('ArrowLeft');
    let leanRight = this.activeKeys.has('KeyD') || this.activeKeys.has('ArrowRight');

    for (const action of this.activePointers.values()) {
      if (action === 'throttle') throttle = true;
      else if (action === 'brake') brake = true;
      else if (action === 'leanLeft') leanLeft = true;
      else if (action === 'leanRight') leanRight = true;
    }

    return {
      throttle,
      brake,
      leanLeft,
      leanRight,
      anyActive: throttle || brake || leanLeft || leanRight,
    };
  }

  private emitState(): void {
    const snapshot = this.getState();
    for (const listener of this.onChangeListeners) {
      listener(snapshot);
    }
  }

  public destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyDown);
      window.removeEventListener('keyup', this.handleKeyUp);
      window.removeEventListener('pointerup', this.handleWindowPointerEnd);
      window.removeEventListener('pointercancel', this.handleWindowPointerEnd);
      window.removeEventListener('blur', this.handleWindowBlur);
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    this.onChangeListeners.clear();
    this.activePointers.clear();
    this.activeKeys.clear();
  }
}
