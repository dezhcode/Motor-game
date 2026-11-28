import { describe, expect, it } from 'vitest';
import { FIRST_STAGE_PHYSICS_CONFIG } from '../config/physicsConfig';
import { resolveControlLayout } from '../input/controlLayout';
import { InputManager, resolveEffectiveControls, type ControlState } from '../input/InputManager';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { loadBestTimeMs, saveBestTimeIfFaster } from '../storage/bestTimeStorage';
import {
  CONTROL_LIMITS,
  DEFAULT_CONTROL_LAYOUT,
  DEFAULT_GAME_SETTINGS,
  isTutorialFinishedOrSkipped,
  loadGameSettings,
  loadTutorialProgress,
  resetControlLayoutOnly,
  saveGameSettings,
  saveTutorialProgress,
  SETTINGS_STORAGE_KEY,
  type StorageLike,
} from '../storage/settingsStorage';
import { DESERT_TRACK } from '../track/desertTrackData';
import { TUTORIAL_TRACK } from '../track/tutorialTrackData';
import { TutorialController } from '../tutorial/TutorialController';

function createMemoryStorage(initial: Record<string, string> = {}): StorageLike {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
  };
}

const IDLE: ControlState = {
  throttle: false,
  brake: false,
  leanLeft: false,
  leanRight: false,
  anyActive: false,
};

describe('Stage 2 - Settings Persistence & Fault Tolerance', () => {
  it('loads defaults on missing storage, corrupt JSON, or out-of-range values and clamps cleanly', () => {
    expect(loadGameSettings(createMemoryStorage())).toEqual(DEFAULT_GAME_SETTINGS);

    const corrupt = createMemoryStorage({ [SETTINGS_STORAGE_KEY]: '{not-valid-json' });
    expect(loadGameSettings(corrupt)).toEqual(DEFAULT_GAME_SETTINGS);

    const outOfRange = createMemoryStorage({
      [SETTINGS_STORAGE_KEY]: JSON.stringify({
        version: 1,
        soundEnabled: false,
        hapticsEnabled: 'bad-type',
        controls: {
          buttonScale: 9.9,
          edgeMarginPx: -40,
          buttonOpacity: 0.01,
        },
      }),
    });
    const loaded = loadGameSettings(outOfRange);
    expect(loaded.soundEnabled).toBe(false);
    expect(loaded.hapticsEnabled).toBe(true);
    expect(loaded.controls.buttonScale).toBe(CONTROL_LIMITS.buttonScale.max);
    expect(loaded.controls.edgeMarginPx).toBe(CONTROL_LIMITS.edgeMarginPx.min);
    expect(loaded.controls.buttonOpacity).toBe(CONTROL_LIMITS.buttonOpacity.min);
  });

  it('survives throwing localStorage without crashing', () => {
    const throwingStorage: StorageLike = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(loadGameSettings(throwingStorage)).toEqual(DEFAULT_GAME_SETTINGS);
    expect(
      saveGameSettings(
        {
          ...DEFAULT_GAME_SETTINGS,
          soundEnabled: false,
          controls: { buttonScale: 1.15, edgeMarginPx: 20, buttonOpacity: 0.7 },
        },
        throwingStorage
      ).soundEnabled
    ).toBe(false);
    expect(loadTutorialProgress(throwingStorage).completed).toBe(false);
  });

  it('resets only control layout while preserving sound, haptics, tutorial status, and race records', () => {
    const storage = createMemoryStorage();
    const initial = saveGameSettings(
      {
        version: 1,
        soundEnabled: false,
        hapticsEnabled: false,
        controls: { buttonScale: 1.2, edgeMarginPx: 32, buttonOpacity: 0.5 },
      },
      storage
    );
    saveTutorialProgress({ completed: true }, storage);

    const afterReset = resetControlLayoutOnly(initial, storage);
    expect(afterReset.controls).toEqual(DEFAULT_CONTROL_LAYOUT);
    expect(afterReset.soundEnabled).toBe(false);
    expect(afterReset.hapticsEnabled).toBe(false);
    expect(isTutorialFinishedOrSkipped(loadTutorialProgress(storage))).toBe(true);
  });
});

describe('Stage 2 - Control Layout Clamping & Touch Targets', () => {
  it('preserves default spacing on 1280x720 and keeps buttons in-bounds without overlap on tight notched screens', () => {
    const desktopLayout = resolveControlLayout(DEFAULT_CONTROL_LAYOUT, {
      width: 1280,
      height: 720,
      safeTop: 0,
      safeRight: 0,
      safeBottom: 0,
      safeLeft: 0,
    });
    expect(desktopLayout.effectiveScale).toBe(1.0);
    expect(desktopLayout.effectiveEdgeX).toBe(12);
    expect(desktopLayout.effectiveEdgeY).toBe(12);
    expect(desktopLayout.wasClampedForScreen).toBe(false);

    // Extreme small/notched landscape phone with user requesting max scale and max edge margin
    const tightLayout = resolveControlLayout(
      { buttonScale: 1.25, edgeMarginPx: 44, buttonOpacity: 0.35 },
      {
        width: 640,
        height: 320,
        safeTop: 0,
        safeRight: 16,
        safeBottom: 16,
        safeLeft: 44,
      }
    );
    const availW = 640 - 44 - 16;
    expect(tightLayout.wasClampedForScreen).toBe(true);
    expect(
      tightLayout.leftClusterWidth +
        tightLayout.rightClusterWidth +
        tightLayout.effectiveEdgeX * 2 +
        tightLayout.centerClearancePx
    ).toBeLessThanOrEqual(availW + 1);
    expect(tightLayout.centerClearancePx).toBeGreaterThanOrEqual(88);
    expect(tightLayout.buttonOpacity).toBe(0.35);

    // Minimum visual scale still retains >= 56px hit target
    const smallBtnLayout = resolveControlLayout(
      { buttonScale: 0.75, edgeMarginPx: 0, buttonOpacity: 0.4 },
      { width: 640, height: 320, safeTop: 0, safeRight: 0, safeBottom: 0, safeLeft: 0 }
    );
    expect(smallBtnLayout.touchMinSize).toBeGreaterThanOrEqual(56);
    expect(Math.max(smallBtnLayout.touchMinSize, smallBtnLayout.leanWidth)).toBeGreaterThanOrEqual(56);
  });
});

describe('Stage 2 - Multi-touch Isolation & Opposing Input Resolution', () => {
  it('tracks independent pointerIds, handles opposing inputs cleanly, and survives capture loss or blur', () => {
    const input = new InputManager();

    // Two-finger hold: gas + leanLeft
    input.onPointerDown(1, 'throttle');
    input.onPointerDown(2, 'leanLeft');
    expect(input.getState()).toMatchObject({ throttle: true, leanLeft: true, brake: false });

    // Opposing lean finger pressed simultaneously cancels lean neutrally without dropping gas
    input.onPointerDown(3, 'leanRight');
    expect(resolveEffectiveControls(input.getState())).toEqual({
      throttleActive: true,
      brakeActive: false,
      leanDir: 0,
    });

    // Releasing leanLeft immediately activates leanRight while gas remains active
    input.onPointerRelease(2);
    expect(resolveEffectiveControls(input.getState())).toEqual({
      throttleActive: true,
      brakeActive: false,
      leanDir: 1,
    });

    // Holding brake alongside throttle gives brake precedence; releasing brake restores throttle
    input.onPointerDown(4, 'brake');
    expect(resolveEffectiveControls(input.getState())).toEqual({
      throttleActive: false,
      brakeActive: true,
      leanDir: 1,
    });
    input.onPointerRelease(4);
    expect(resolveEffectiveControls(input.getState())).toEqual({
      throttleActive: true,
      brakeActive: false,
      leanDir: 1,
    });

    // Locking clears all held pointers cleanly
    input.setLocked(true);
    expect(input.getActivePointerCount()).toBe(0);
    expect(input.getState().anyActive).toBe(false);
    input.destroy();
  });
});

describe('Stage 2 - Practical 4-Step Interactive Tutorial', () => {
  it('validates real physics + input actions through all 4 steps on TUTORIAL_TRACK without altering DESERT_TRACK', () => {
    // Ensure main DESERT_TRACK was not altered
    expect(DESERT_TRACK.finishX).toBe(336);
    expect(DESERT_TRACK.hazardSaws?.length).toBe(2);

    const tutorial = new TutorialController();
    const world = new PhysicsWorld(TUTORIAL_TRACK, FIRST_STAGE_PHYSICS_CONFIG);

    // 1. Standing still or tapping lean does NOT pass step 1 (throttle)
    for (let i = 0; i < 30; i++) {
      const s = world.step(1 / 60, { ...IDLE, leanLeft: true, anyActive: true }, true);
      const t = tutorial.update(1 / 60, { ...IDLE, leanLeft: true, anyActive: true }, s);
      expect(t.stepId).toBe('throttle');
    }

    // Hold throttle until Step 1 completes
    let tutSnap = tutorial.getSnapshot();
    for (let i = 0; i < 180 && tutSnap.stepId === 'throttle'; i++) {
      const ctrl = { ...IDLE, throttle: true, anyActive: true };
      const s = world.step(1 / 60, ctrl, true);
      tutSnap = tutorial.update(1 / 60, ctrl, s);
    }
    expect(tutSnap.stepId).toBe('brake');

    // 2. Hold brake to measurably slow down until Step 2 completes
    for (let i = 0; i < 180 && tutSnap.stepId === 'brake'; i++) {
      const ctrl = { ...IDLE, brake: true, anyActive: true };
      const s = world.step(1 / 60, ctrl, true);
      tutSnap = tutorial.update(1 / 60, ctrl, s);
    }
    expect(tutSnap.stepId).toBe('balance');

    // 3. Ride into the gentle slope & apply balance control until Step 3 completes
    for (let i = 0; i < 600 && tutSnap.stepId === 'balance'; i++) {
      const ctrl = { ...IDLE, throttle: true, anyActive: true };
      const s = world.step(1 / 60, ctrl, true);
      tutSnap = tutorial.update(1 / 60, ctrl, s);
    }
    expect(tutSnap.stepId).toBe('jump');

    // 4. Accelerate off practice jump kicker and land upright on wheels
    for (let i = 0; i < 600 && tutSnap.status === 'active'; i++) {
      const prev = world.step(0, IDLE, false);
      const inAir = !prev.frontGrounded && !prev.rearGrounded;
      const ctrl = {
        throttle: inAir ? prev.chassis.angle < .04 : prev.chassis.x < 142,
        brake: inAir && prev.chassis.angle > .14,
        leanLeft: false,
        leanRight: false,
        anyActive: true,
      };
      const s = world.step(1 / 60, ctrl, true);
      tutSnap = tutorial.update(1 / 60, ctrl, s);
    }
    expect(tutSnap.status).toBe('completed');
    expect(tutSnap.stepIndex).toBe(3);

    // Tutorial never updates race best time
    expect(loadBestTimeMs()).toBeNull();
    void saveBestTimeIfFaster;
  });

  it('triggers step_failed on crash/overshoot and retries the current step cleanly', () => {
    const tutorial = new TutorialController();
    const world = new PhysicsWorld(TUTORIAL_TRACK, FIRST_STAGE_PHYSICS_CONFIG);

    // Advance into Step 4 (jump) then intentionally force a flip crash before completing jump
    const spawn = tutorial.getRetrySpawnForStep('jump');
    tutorial.resetAll(3);
    world.reset(spawn);

    let failedState = tutorial.getSnapshot();
    for (let i = 0; i < 360; i++) {
      const ctrl = { ...IDLE, throttle: true, leanLeft: true, anyActive: true };
      const s = world.step(1 / 60, ctrl, true);
      failedState = tutorial.update(1 / 60, ctrl, s);
      if (failedState.status === 'step_failed') break;
    }
    expect(failedState.status).toBe('step_failed');
    expect(failedState.stepId).toBe('jump');

    // Retry restores exact same step upright at safe spawn
    const retrySpawn = tutorial.retryCurrentStep();
    world.reset(retrySpawn);
    const recoveredSnap = world.step(1 / 60, IDLE, true);
    expect(recoveredSnap.crashedReason).toBeNull();
    expect(tutorial.getSnapshot().status).toBe('active');
    expect(tutorial.getSnapshot().stepId).toBe('jump');
  });
});
