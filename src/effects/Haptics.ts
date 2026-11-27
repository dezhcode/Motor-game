declare global {
  interface Window {
    KavirHaptics?: {
      vibrate: (durationMs: number, amplitude: number) => void;
      cancel: () => void;
    };
  }
}

export type HapticButtonKind = 'ui' | 'throttle' | 'brake' | 'lean';

export class HapticController {
  private enabled = true;
  private lastThrottlePulseAt = 0;
  private lastTerrainPulseAt = 0;
  private lastBrakePulseAt = 0;
  private prevThrottle = false;
  private prevBrake = false;
  private prevCompression = 0;

  constructor(initialEnabled = true) {
    this.enabled = initialEnabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stopAll();
    } else {
      this.tapButton('ui');
    }
  }

  public resetRunState(): void {
    this.lastThrottlePulseAt = 0;
    this.lastTerrainPulseAt = 0;
    this.lastBrakePulseAt = 0;
    this.prevThrottle = false;
    this.prevBrake = false;
    this.prevCompression = 0;
  }

  public tapButton(kind: HapticButtonKind): void {
    if (!this.enabled) return;
    switch (kind) {
      case 'throttle':
        this.pulse(26, 185);
        break;
      case 'brake':
        this.pulse(22, 165);
        break;
      case 'lean':
        this.pulse(15, 130);
        break;
      case 'ui':
      default:
        this.pulse(16, 140);
        break;
    }
  }

  public onLanding(strength: number): void {
    if (!this.enabled || strength <= 0) return;
    const norm = Math.min(1, Math.max(0.15, (strength - 2.0) / 8.5));
    const ms = Math.round(28 + norm * 54);
    const amp = Math.round(135 + norm * 120);
    this.pulse(ms, amp);
  }

  public onUpshift(gear: number): void {
    if (!this.enabled) return;
    this.pulse(20 + Math.min(10, gear * 2), 185);
  }

  public onObstacleHit(strength = 0.7): void {
    if (!this.enabled) return;
    const clamped = Math.min(1, Math.max(0.2, strength));
    this.pulse(Math.round(20 + clamped * 22), Math.round(145 + clamped * 80));
  }

  public onCrash(): void {
    if (!this.enabled) return;
    if (typeof window !== 'undefined' && window.KavirHaptics) {
      window.KavirHaptics.vibrate(95, 255);
      setTimeout(() => {
        if (this.enabled) window.KavirHaptics?.vibrate(120, 210);
      }, 135);
      return;
    }
    this.webVibrate([95, 45, 120]);
  }

  public onFinish(): void {
    if (!this.enabled) return;
    if (typeof window !== 'undefined' && window.KavirHaptics) {
      window.KavirHaptics.vibrate(36, 200);
      setTimeout(() => {
        if (this.enabled) window.KavirHaptics?.vibrate(68, 245);
      }, 95);
      return;
    }
    this.webVibrate([36, 55, 68]);
  }

  /**
   * Continuous micro-haptic engine & terrain feedback during active riding.
   * Throttled tightly so the motor never stalls or drains battery while preserving
   * genuine throttle rumble, brake chatter, and suspension bump feel.
   */
  public updateRideFeedback(params: {
    nowMs: number;
    throttle: boolean;
    brake: boolean;
    speedX: number;
    rpm: number;
    grounded: boolean;
    compressionMax: number;
  }): void {
    if (!this.enabled) {
      this.prevThrottle = params.throttle;
      this.prevBrake = params.brake;
      this.prevCompression = params.compressionMax;
      return;
    }

    const { nowMs, throttle, brake, speedX, rpm, grounded, compressionMax } = params;

    // Initial edge kick for keyboard or pointer starts
    if (throttle && !this.prevThrottle) {
      this.tapButton('throttle');
      this.lastThrottlePulseAt = nowMs;
    } else if (brake && !this.prevBrake) {
      this.tapButton('brake');
      this.lastBrakePulseAt = nowMs;
    }

    // Throttle vibration cadence: faster & slightly firmer as RPM climbs
    if (throttle) {
      const intervalMs = Math.round(138 - Math.min(1, rpm) * 58); // 138ms -> 80ms
      if (nowMs - this.lastThrottlePulseAt >= intervalMs) {
        const amp = Math.round(52 + Math.min(1, rpm) * 54 + (grounded ? 14 : 0));
        this.pulse(12, amp);
        this.lastThrottlePulseAt = nowMs;
      }
    } else if (brake && grounded && Math.abs(speedX) > 2.2) {
      // Brake chatter / tire lock feel on dirt
      if (nowMs - this.lastBrakePulseAt >= 105) {
        const speedNorm = Math.min(1, Math.abs(speedX) / 14);
        this.pulse(13, Math.round(75 + speedNorm * 75));
        this.lastBrakePulseAt = nowMs;
      }
    }

    // Terrain bump / whoops rumble from rapid suspension compression spikes
    const deltaComp = compressionMax - this.prevCompression;
    if (grounded && deltaComp > 0.018 && nowMs - this.lastTerrainPulseAt >= 125) {
      const intensity = Math.min(1, (deltaComp - 0.018) / 0.07);
      this.pulse(Math.round(14 + intensity * 14), Math.round(85 + intensity * 85));
      this.lastTerrainPulseAt = nowMs;
    }

    this.prevThrottle = throttle;
    this.prevBrake = brake;
    this.prevCompression = compressionMax;
  }

  public stopAll(): void {
    this.resetRunState();
    try {
      if (typeof window !== 'undefined' && window.KavirHaptics) {
        window.KavirHaptics.cancel();
      } else if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(0);
      }
    } catch {
      // Ignore
    }
  }

  private pulse(durationMs: number, amplitude: number): void {
    if (!this.enabled) return;
    try {
      if (typeof window !== 'undefined' && window.KavirHaptics) {
        window.KavirHaptics.vibrate(durationMs, amplitude);
        return;
      }
      this.webVibrate(durationMs);
    } catch {
      // Ignore
    }
  }

  private webVibrate(pattern: number | number[]): void {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  }
}
