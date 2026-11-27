import { Application, Container } from 'pixi.js';
import { loadGameArtwork } from '../artwork/GameArtwork';
import { BikeRig } from '../bike/BikeRig';
import { FollowCamera } from '../camera/FollowCamera';
import { PHYSICS_CONFIG } from '../config/physicsConfig';
import { DesertAudio, DustSystem } from '../effects/DustAndAudio';
import { InputManager, type ControlState } from '../input/InputManager';
import { PhysicsWorld, type CrashReason, type PhysicsSnapshot } from '../physics/PhysicsWorld';
import { saveBestTimeIfFaster, loadBestTimeMs } from '../storage/bestTimeStorage';
import { DESERT_TRACK } from '../track/desertTrackData';
import { TrackRenderer } from '../track/TrackBuilder';

export type GamePhase = 'start' | 'playing' | 'paused' | 'crashed' | 'finished';

export interface HudSnapshot {
  phase: GamePhase;
  elapsedMs: number;
  bestTimeMs: number | null;
  isNewRecord: boolean;
  progressRatio: number;
  crashReason: CrashReason | null;
  activeHint: string | null;
  tutorialVisible: boolean;
  muted: boolean;
}

export class GameEngine {
  private readonly input: InputManager;
  private readonly physics: PhysicsWorld;
  private readonly camera = new FollowCamera();
  private readonly audio = new DesertAudio();
  private readonly dust = new DustSystem(28);
  private bikeRig: BikeRig | null = null;
  private trackRenderer: TrackRenderer | null = null;

  private app: Application | null = null;
  private readonly cameraWorldLayer = new Container();

  private phase: GamePhase = 'start';
  private elapsedMs = 0;
  private timerStarted = false;
  private bestTimeMs: number | null = loadBestTimeMs();
  private isNewRecord = false;
  private crashReason: CrashReason | null = null;
  private progressRatio = 0;
  private muted = false;

  private lastTimestamp = 0;
  private rafId: number | null = null;
  private lastHudPushTime = 0;
  private destroyed = false;

  private readonly onHudChange: (snapshot: HudSnapshot) => void;
  private readonly resizeObserver: ResizeObserver | null = null;
  private hostElement: HTMLElement | null = null;

  constructor(input: InputManager, onHudChange: (snapshot: HudSnapshot) => void) {
    this.input = input;
    this.onHudChange = onHudChange;
    this.physics = new PhysicsWorld(DESERT_TRACK, PHYSICS_CONFIG);

    this.input.setCallbacks({
      onPauseToggleRequested: () => {
        if (this.phase === 'playing') {
          this.pause();
        } else if (this.phase === 'paused') {
          this.resume();
        }
      },
      onRestartRequested: () => {
        if (this.phase === 'playing' || this.phase === 'paused' || this.phase === 'crashed' || this.phase === 'finished') {
          this.restartRun();
        }
      },
      onFirstControl: () => {
        if (this.phase === 'playing' && !this.timerStarted) {
          this.timerStarted = true;
          this.audio.unlock();
        }
      },
    });

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.handleResize();
      });
    }
  }

  public async mount(container: HTMLElement): Promise<void> {
    this.hostElement = container;
    const app = new Application();
    await app.init({
      resizeTo: container,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      backgroundColor: 0xbde0f5,
    });

    const artwork = await loadGameArtwork();

    if (this.destroyed) {
      app.destroy(true);
      return;
    }

    this.app = app;
    this.bikeRig = new BikeRig(artwork);
    this.trackRenderer = new TrackRenderer(DESERT_TRACK, artwork);
    this.cameraWorldLayer.addChild(
      this.trackRenderer.worldContainer,
      this.dust.container,
      this.bikeRig.root
    );
    container.innerHTML = '';
    container.appendChild(app.canvas);
    app.canvas.style.display = 'block';
    app.canvas.style.width = '100%';
    app.canvas.style.height = '100%';

    app.stage.addChild(this.trackRenderer.backgroundContainer, this.cameraWorldLayer);

    this.resizeObserver?.observe(container);
    this.handleResize();

    this.camera.reset(DESERT_TRACK.startX, DESERT_TRACK.startY);
    const snap = this.physics.step(0, this.input.getState(), false);
    this.renderSnapshot(snap, this.input.getState(), 1 / 60);
    this.pushHud(true);

    this.lastTimestamp = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  public handleResize(): void {
    if (!this.app || !this.hostElement) return;
    const width = this.hostElement.clientWidth || window.innerWidth;
    const height = this.hostElement.clientHeight || window.innerHeight;
    if (width > 0 && height > 0) {
      this.app.renderer.resize(width, height);
      this.camera.setViewport(width, height);
    }
  }

  public startGame(): void {
    if (!this.app) return;
    this.audio.unlock();
    this.resetInternal('playing');
  }

  public restartRun(): void {
    this.audio.unlock();
    this.resetInternal('playing');
  }

  public pause(): void {
    if (this.phase !== 'playing') return;
    this.phase = 'paused';
    this.input.setLocked(true);
    this.input.clearAll();
    this.audio.pause();
    this.pushHud(true);
  }

  public resume(): void {
    if (this.phase !== 'paused') return;
    this.phase = 'playing';
    this.input.setLocked(false);
    this.audio.unlock();
    this.lastTimestamp = performance.now();
    this.pushHud(true);
  }

  public toggleMute(): void {
    this.muted = !this.muted;
    this.audio.setMuted(this.muted);
    if (!this.muted && this.phase === 'playing') {
      this.audio.unlock();
    }
    this.pushHud(true);
  }

  public pauseForPortraitOrBackground(): void {
    if (this.phase === 'playing') {
      this.pause();
    } else {
      this.input.clearAll();
      this.audio.pause();
    }
  }

  private resetInternal(nextPhase: GamePhase): void {
    this.physics.reset();
    this.dust.reset();
    this.audio.resetEngineState();
    this.input.clearAll();
    this.input.setLocked(nextPhase !== 'playing');

    this.phase = nextPhase;
    this.elapsedMs = 0;
    this.timerStarted = false;
    this.isNewRecord = false;
    this.crashReason = null;
    this.progressRatio = 0;
    this.camera.reset(DESERT_TRACK.startX, DESERT_TRACK.startY);

    const snap = this.physics.step(0, this.input.getState(), false);
    this.renderSnapshot(snap, this.input.getState(), 1 / 60);
    this.lastTimestamp = performance.now();
    this.pushHud(true);
  }

  private readonly loop = (now: number): void => {
    if (this.destroyed) return;
    this.rafId = requestAnimationFrame(this.loop);

    const rawDt = Math.max(0, (now - this.lastTimestamp) / 1000);
    this.lastTimestamp = now;
    const clampedDt = Math.min(rawDt, PHYSICS_CONFIG.world.maxFrameDt);

    const controls = this.input.getState();

    if (this.phase === 'playing') {
      if (this.timerStarted) {
        this.elapsedMs += clampedDt * 1000;
      }

      const snap = this.physics.step(clampedDt, controls, true);
      this.progressRatio = snap.progressRatio;

      if (snap.justLandedStrength > 0) {
        this.camera.triggerLandingFeedback(snap.justLandedStrength);
        this.audio.playLandingThud(snap.justLandedStrength);
        this.dust.emitLandingSplash(
          snap.rearWheel.x,
          snap.rearWheel.y - PHYSICS_CONFIG.wheels.radius,
          snap.frontWheel.x,
          snap.frontWheel.y - PHYSICS_CONFIG.wheels.radius,
          snap.chassisVelX,
          snap.justLandedStrength
        );
      }

      this.dust.maybeEmitRollingDust(
        clampedDt,
        snap.rearGrounded,
        snap.rearWheel.x,
        snap.rearWheel.y - PHYSICS_CONFIG.wheels.radius,
        snap.chassisVelX,
        controls.throttle,
        controls.brake
      );
      this.dust.update(clampedDt);
      const audioFeedback = this.audio.updateEngine(
        controls.throttle,
        controls.brake,
        snap.chassisVelX,
        true,
        clampedDt,
        snap.rearGrounded,
        snap.frontGrounded,
        snap.chassisVelY
      );
      if (audioFeedback.justShiftedUp) {
        const tailX = snap.chassis.x - Math.cos(snap.chassis.angle) * 0.68;
        const tailY = snap.chassis.y - Math.sin(snap.chassis.angle) * 0.68 + 0.25;
        this.dust.emitExhaustPuff(tailX, tailY, snap.chassisVelX);
      }

      if (snap.crashedReason) {
        this.phase = 'crashed';
        this.crashReason = snap.crashedReason;
        this.input.setLocked(true);
        this.input.clearAll();
        this.audio.updateEngine(false, false, 0, false, clampedDt);
        this.pushHud(true);
      } else if (snap.finished) {
        this.phase = 'finished';
        this.progressRatio = 1;
        this.input.setLocked(true);
        this.input.clearAll();
        this.audio.updateEngine(false, false, 0, false, clampedDt);
        this.audio.playFinishChime();
        const result = saveBestTimeIfFaster(this.elapsedMs);
        this.bestTimeMs = result.bestTimeMs;
        this.isNewRecord = result.isNewRecord;
        this.pushHud(true);
      } else if (now - this.lastHudPushTime > 50) {
        this.pushHud(false, snap.chassis.x);
        this.lastHudPushTime = now;
      }

      this.renderSnapshot(snap, controls, clampedDt);
    } else {
      // Idle / paused / overlay still renders cleanly and handles viewport resize without advancing physics
      this.audio.updateEngine(false, false, 0, false, clampedDt);
      const snap = this.physics.step(0, controls, false);
      this.renderSnapshot(snap, controls, clampedDt || 1 / 60);
    }
  };

  private renderSnapshot(snap: PhysicsSnapshot, controls: ControlState, dt: number): void {
    if (!this.bikeRig || !this.trackRenderer) return;
    const leanDir: -1 | 0 | 1 =
      controls.leanLeft && !controls.leanRight
        ? -1
        : controls.leanRight && !controls.leanLeft
          ? 1
          : 0;

    this.bikeRig.sync(snap, leanDir, dt);

    const cam = this.camera.update(
      snap.chassis.x,
      snap.chassis.y,
      snap.chassisVelX,
      dt
    );
    const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;

    this.cameraWorldLayer.scale.set(cam.scale);
    this.cameraWorldLayer.position.set(
      cam.viewportWidth * 0.5 - cam.worldX * ppm * cam.scale,
      cam.viewportHeight * 0.54 + cam.worldY * ppm * cam.scale
    );

    this.trackRenderer.updateParallax(cam);
  }

  private resolveHint(chassisX: number): string | null {
    for (const hint of DESERT_TRACK.hints) {
      if (chassisX >= hint.startX && chassisX <= hint.endX) {
        return hint.labelFa;
      }
    }
    return null;
  }

  private pushHud(force: boolean, chassisX = DESERT_TRACK.startX): void {
    if (!force && this.phase !== 'playing') return;
    const hint = this.phase === 'playing' ? this.resolveHint(chassisX) : null;
    this.onHudChange({
      phase: this.phase,
      elapsedMs: this.elapsedMs,
      bestTimeMs: this.bestTimeMs,
      isNewRecord: this.isNewRecord,
      progressRatio: this.progressRatio,
      crashReason: this.crashReason,
      activeHint: hint,
      tutorialVisible: this.phase === 'playing' && !this.timerStarted,
      muted: this.muted,
    });
  }

  public destroy(): void {
    this.destroyed = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.resizeObserver?.disconnect();
    this.audio.destroy();
    if (this.app) {
      this.app.destroy(true);
      this.app = null;
    }
  }
}
