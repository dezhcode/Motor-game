import { Application, Container } from 'pixi.js';
import { loadGameArtwork, type GameArtwork } from '../artwork/GameArtwork';
import { BikeRig } from '../bike/BikeRig';
import { FollowCamera } from '../camera/FollowCamera';
import { FIRST_STAGE_PHYSICS_CONFIG, PHYSICS_CONFIG } from '../config/physicsConfig';
import { renderResolution } from '../config/renderBudget';
import { DesertAudio, DustSystem } from '../effects/DustAndAudio';
import { HapticController, type HapticButtonKind } from '../effects/Haptics';
import { PickupFlightSystem } from '../effects/PickupFlightSystem';
import type { PickupTargets } from '../effects/PickupFlightModel';
import { InputManager, resolveEffectiveControls, type ControlState } from '../input/InputManager';
import { PhysicsWorld, type CrashReason, type PhysicsSnapshot } from '../physics/PhysicsWorld';
import { loadBestTimeMs, saveBestTimeIfFaster } from '../storage/bestTimeStorage';
import {
  isTutorialFinishedOrSkipped,
  loadGameSettings,
  loadTutorialProgress,
  saveGameSettings,
  saveTutorialProgress,
  type GameSettings,
  type TutorialProgress,
} from '../storage/settingsStorage';
import { ContactShadowSprite, sampleTrackSlopeRad } from '../track/contactShadow';
import { DESERT_TRACK, type TrackDefinition } from '../track/desertTrackData';
import { RideCollectibles } from '../track/RideCollectibles';
import { TrackRenderer } from '../track/TrackBuilder';
import { TUTORIAL_TRACK } from '../track/tutorialTrackData';
import { TutorialController, type TutorialSnapshot } from '../tutorial/TutorialController';

export type GameMode = 'race' | 'tutorial';
export type GamePhase =
  | 'start'
  | 'playing'
  | 'paused'
  | 'crashed'
  | 'finished'
  | 'tutorial_failed'
  | 'tutorial_completed';

export interface HudSnapshot {
  mode: GameMode;
  phase: GamePhase;
  elapsedMs: number;
  bestTimeMs: number | null;
  isNewRecord: boolean;
  progressRatio: number;
  crashReason: CrashReason | null;
  activeHint: string | null;
  tutorialVisible: boolean;
  tutorialDone: boolean;
  tutorialState: TutorialSnapshot | null;
  hasPausedRaceProgress: boolean;
  muted: boolean;
  hapticsEnabled: boolean;
  speedKmh: number;
  distanceM: number;
  coins: number;
  fuelRatio: number;
  coinPulse: number;
  fuelPulse: number;
}

export class GameEngine {
  private readonly input: InputManager;
  private activeTrack: TrackDefinition = DESERT_TRACK;
  private physics: PhysicsWorld;
  private readonly camera = new FollowCamera();
  private readonly audio = new DesertAudio();
  private readonly dust = new DustSystem(64);
  private readonly haptics: HapticController;
  private readonly tutorial = new TutorialController();

  private collectibles = new RideCollectibles(DESERT_TRACK);
  private readonly pickupEffects = new PickupFlightSystem();
  private pickupTargets: PickupTargets = {coin:{x:43,y:29},fuel:{x:43,y:72}};
  private coinPulse = 0;
  private fuelPulse = 0;
  private lastCoinAt = -10;
  private coinStreak = 0;
  private speedKmh = 0;
  private distanceM = 0;
  private artwork: GameArtwork | null = null;
  private bikeRig: BikeRig | null = null;
  private trackRenderer: TrackRenderer | null = null;
  private readonly contactShadow = new ContactShadowSprite();

  private app: Application | null = null;
  private readonly cameraWorldLayer = new Container();

  private settings: GameSettings;
  private tutorialProgress: TutorialProgress;
  private mode: GameMode = 'race';
  private phase: GamePhase = 'start';
  private elapsedMs = 0;
  private animSec = 0;
  private timerStarted = false;
  private bestTimeMs: number | null = loadBestTimeMs();
  private isNewRecord = false;
  private crashReason: CrashReason | null = null;
  private progressRatio = 0;
  private muted: boolean;

  private lastTimestamp = 0;
  private rafId: number | null = null;
  private lastHudPushTime = 0;
  private destroyed = false;

  private readonly onHudChange: (snapshot: HudSnapshot) => void;
  private readonly onSettingsSync?: (settings: GameSettings) => void;
  private readonly resizeObserver: ResizeObserver | null = null;
  private hostElement: HTMLElement | null = null;

  constructor(
    input: InputManager,
    onHudChange: (snapshot: HudSnapshot) => void,
    onSettingsSync?: (settings: GameSettings) => void
  ) {
    this.input = input;
    this.onHudChange = onHudChange;
    this.onSettingsSync = onSettingsSync;

    // Apply persisted audio/haptic settings immediately from frame 0
    this.settings = loadGameSettings();
    this.tutorialProgress = loadTutorialProgress();
    this.muted = !this.settings.soundEnabled;
    this.audio.setMuted(this.muted);
    this.haptics = new HapticController(this.settings.hapticsEnabled);

    this.physics = new PhysicsWorld(this.activeTrack, FIRST_STAGE_PHYSICS_CONFIG);

    this.input.setCallbacks({
      onPauseToggleRequested: () => {
        if (this.phase === 'playing') {
          this.pause();
        } else if (this.phase === 'paused') {
          this.resume();
        }
      },
      onRestartRequested: () => {
        if (this.mode === 'tutorial') {
          if (this.phase === 'playing' || this.phase === 'paused' || this.phase === 'tutorial_failed') {
            this.retryTutorialStep();
          }
          return;
        }
        if (
          this.phase === 'playing' ||
          this.phase === 'paused' ||
          this.phase === 'crashed' ||
          this.phase === 'finished'
        ) {
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

  public async mount(container: HTMLElement, onArtworkProgress?: (ratio: number) => void, pickupHost?: HTMLElement | null): Promise<void> {
    this.hostElement = container;
    const app = new Application();
    await app.init({
      width: container.clientWidth || window.innerWidth,
      height: container.clientHeight || window.innerHeight,
      antialias: true,
      autoDensity: true,
      autoStart: false,
      resolution: renderResolution(container.clientWidth,container.clientHeight,window.devicePixelRatio||1),
      backgroundColor: 0xbde0f5,
    });

    const artwork = await loadGameArtwork(onArtworkProgress);

    if (this.destroyed) {
      app.destroy(true);
      return;
    }

    this.app = app;
    this.artwork = artwork;
    this.bikeRig = new BikeRig(artwork);
    this.mountTrackRenderer(this.activeTrack);

    container.innerHTML = '';
    container.appendChild(app.canvas);
    if (pickupHost) this.pickupEffects.mount(pickupHost);
    app.canvas.style.display = 'block';
    app.canvas.style.width = '100%';
    app.canvas.style.height = '100%';

    this.resizeObserver?.observe(container);
    this.handleResize();

    this.camera.reset(this.activeTrack.startX, this.activeTrack.startY);
    const snap = this.physics.step(0, this.input.getState(), false);
    this.renderSnapshot(snap, this.input.getState(), 1 / 60);
    app.renderer.render(app.stage);
    this.pushHud(true);

    this.lastTimestamp = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  private mountTrackRenderer(track: TrackDefinition): void {
    if (!this.app || !this.artwork || !this.bikeRig) return;

    this.cameraWorldLayer.removeChildren();
    this.app.stage.removeChildren();
    this.trackRenderer?.dispose();
    this.trackRenderer?.backgroundContainer.destroy({ children: true });
    this.trackRenderer?.worldContainer.destroy({ children: true });

    this.trackRenderer = new TrackRenderer(track, this.artwork);
    this.collectibles = new RideCollectibles(track);
    this.trackRenderer.setPickups(this.collectibles.pickups);
    this.cameraWorldLayer.addChild(
      this.trackRenderer.worldContainer,
      this.contactShadow.graphic,
      this.dust.container,
      this.bikeRig.root
    );
    this.pickupEffects.clear();
    this.app.stage.addChild(this.trackRenderer.backgroundContainer, this.cameraWorldLayer);
  }

  public setPickupTargets(targets: PickupTargets): void { this.pickupTargets = targets; }

  private pickupArrived(kind: 'coin' | 'fuel'): void {
    if (kind === 'coin') this.coinPulse++; else this.fuelPulse++;
  }

  private switchActiveTrack(track: TrackDefinition): void {
    if (this.activeTrack === track) return;
    this.activeTrack = track;
    this.physics = new PhysicsWorld(track, FIRST_STAGE_PHYSICS_CONFIG);
    this.mountTrackRenderer(track);
    this.handleResize();
  }

  public handleResize(): void {
    if (!this.app || !this.hostElement) return;
    const width = this.hostElement.clientWidth || window.innerWidth;
    const height = this.hostElement.clientHeight || window.innerHeight;
    if (width > 0 && height > 0) {
      this.app.renderer.resize(width, height,renderResolution(width,height,window.devicePixelRatio||1));
      this.camera.setViewport(width, height);
      this.pickupEffects.resize(width, height);
      if (this.phase !== 'playing' && this.bikeRig && this.trackRenderer) {
        // A resize clears the framebuffer; redraw once even when the run is paused.
        this.renderSnapshot(this.physics.step(0, this.input.getState(), false), this.input.getState(), 0);
        this.app.renderer.render(this.app.stage);
      }
    }
  }

  public startGame(): void {
    if (!this.app) return;
    if (!isTutorialFinishedOrSkipped(this.tutorialProgress)) {
      this.startTutorial();
      return;
    }
    this.startMainRace();
  }

  public startMainRace(): void {
    if (!this.app) return;
    this.audio.unlock();
    this.haptics.tapButton('ui');
    this.mode = 'race';
    this.switchActiveTrack(DESERT_TRACK);
    this.resetInternal('playing');
  }

  public startTutorial(): void {
    if (!this.app) return;
    this.audio.unlock();
    this.haptics.tapButton('ui');
    this.mode = 'tutorial';
    this.switchActiveTrack(TUTORIAL_TRACK);
    this.tutorial.resetAll(0);
    this.resetInternal('playing');
  }

  public retryTutorialStep(): void {
    if (!this.app || this.mode !== 'tutorial') return;
    this.audio.unlock();
    this.haptics.tapButton('ui');
    const spawn = this.tutorial.retryCurrentStep();
    this.resetInternal('playing', spawn);
  }

  public skipTutorial(startRaceImmediately = true): void {
    this.haptics.tapButton('ui');
    this.tutorialProgress = saveTutorialProgress({ skipped: true });
    if (startRaceImmediately) {
      this.startMainRace();
    } else {
      this.mode = 'race';
      this.switchActiveTrack(DESERT_TRACK);
      this.resetInternal('start');
    }
  }

  public exitToStartMenu(): void {
    this.haptics.tapButton('ui');
    this.mode = 'race';
    this.switchActiveTrack(DESERT_TRACK);
    this.resetInternal('start');
  }

  public restartRun(): void {
    if (this.mode === 'tutorial') {
      this.retryTutorialStep();
      return;
    }
    this.audio.unlock();
    this.haptics.tapButton('ui');
    this.resetInternal('playing');
  }

  public pause(): void {
    if (this.phase !== 'playing') return;
    this.phase = 'paused';
    this.input.setLocked(true);
    this.input.clearAll();
    this.audio.pause();
    this.haptics.stopAll();
    this.pushHud(true);
  }

  public resume(): void {
    if (this.phase !== 'paused') return;
    this.phase = 'playing';
    this.input.setLocked(false);
    this.audio.unlock();
    this.haptics.tapButton('ui');
    this.lastTimestamp = performance.now();
    this.pushHud(true);
  }

  public applySettings(nextSettings: GameSettings, options?: { silent?: boolean }): void {
    this.settings = saveGameSettings(nextSettings);
    const nextMuted = !this.settings.soundEnabled;
    if (nextMuted !== this.muted) {
      this.muted = nextMuted;
      this.audio.setMuted(this.muted);
      if (!this.muted && this.phase === 'playing') {
        this.audio.unlock();
      }
    }
    if (this.haptics.isEnabled() !== this.settings.hapticsEnabled) {
      if (options?.silent) {
        this.haptics.setEnabledSilent(this.settings.hapticsEnabled);
      } else {
        this.haptics.setEnabled(this.settings.hapticsEnabled);
      }
    }
    this.onSettingsSync?.(this.settings);
    this.pushHud(true);
  }

  public toggleMute(): void {
    const nextSound = this.muted;
    this.haptics.tapButton('ui');
    this.applySettings(
      {
        ...this.settings,
        soundEnabled: nextSound,
      },
      { silent: true }
    );
  }

  public toggleHaptics(): void {
    const nextHaptics = !this.haptics.isEnabled();
    this.applySettings({
      ...this.settings,
      hapticsEnabled: nextHaptics,
    });
  }

  public tapControlHaptic(kind: HapticButtonKind): void {
    this.haptics.tapButton(kind);
  }

  public pauseForPortraitOrBackground(): void {
    this.haptics.stopAll();
    if (this.phase === 'playing') {
      this.pause();
    } else {
      this.input.clearAll();
      this.audio.pause();
    }
  }

  private resetInternal(
    nextPhase: GamePhase,
    spawnOverride?: { startX?: number; startVx?: number }
  ): void {
    this.physics.reset(spawnOverride);
    this.collectibles.reset();
    this.pickupEffects.clear();
    this.coinPulse = this.fuelPulse = this.coinStreak = 0;
    this.lastCoinAt = -10;
    this.speedKmh = this.distanceM = 0;
    this.trackRenderer?.syncPickups(this.collectibles.pickups);
    this.bikeRig?.reset();
    this.contactShadow.reset();
    this.dust.reset();
    this.audio.resetEngineState();
    this.haptics.resetRunState();
    this.input.clearAll();
    this.input.setLocked(nextPhase !== 'playing');

    this.phase = nextPhase;
    this.elapsedMs = 0;
    this.timerStarted = false;
    this.isNewRecord = false;
    this.crashReason = null;
    this.progressRatio = 0;

    const camStartX = spawnOverride?.startX ?? this.activeTrack.startX;
    const camStartY =
      spawnOverride?.startX !== undefined
        ? sampleTrackSlopeRad(this.activeTrack, camStartX) * 0 + this.activeTrack.startY
        : this.activeTrack.startY;
    this.camera.reset(camStartX, camStartY);

    const snap = this.physics.step(0, this.input.getState(), false);
    this.camera.reset(snap.chassis.x, snap.chassis.y);
    this.renderSnapshot(snap, this.input.getState(), 1 / 60);
    this.app?.renderer.render(this.app.stage);
    this.lastTimestamp = performance.now();
    this.pushHud(true, snap.chassis.x);
  }

  private readonly loop = (now: number): void => {
    if (this.destroyed) return;
    this.rafId = requestAnimationFrame(this.loop);

    const rawDt = Math.max(0, (now - this.lastTimestamp) / 1000);
    this.lastTimestamp = now;
    const clampedDt = Math.min(rawDt, PHYSICS_CONFIG.world.maxFrameDt);
    // One owned render loop. Menus/paused runs need no physics, audio automation or GPU redraw.
    if(this.phase!=='playing') {this.pickupEffects.setVisible(false);return;}

    const rawControls = this.input.getState();
    const controls = this.mode === 'race' && this.collectibles.fuel <= 0 ? { ...rawControls, throttle: false } : rawControls;

    if (this.phase === 'playing') {
      this.animSec += clampedDt;
      if (this.mode === 'race' && this.timerStarted) {
        this.elapsedMs += clampedDt * 1000;
      }

      const snap = this.physics.step(clampedDt, controls, true);
      this.progressRatio = snap.progressRatio;
      this.speedKmh = Math.hypot(snap.chassisVelX, snap.chassisVelY) * 3.6;
      this.distanceM = Math.max(0, snap.chassis.x - this.activeTrack.startX);
      const collected = this.collectibles.update(clampedDt, snap.chassis.x, snap.chassis.y, resolveEffectiveControls(controls).throttleActive, this.mode === 'race' && this.timerStarted);
      collected.forEach((pickup, index) => {
        const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;
        const start = this.cameraWorldLayer.toGlobal({x:pickup.x*ppm,y:-pickup.y*ppm});
        const size = (pickup.kind === 'coin' ? 28 : 38) * this.cameraWorldLayer.scale.x;
        if (!this.artwork || !this.pickupEffects.add(pickup, start, size, this.artwork)) this.pickupArrived(pickup.kind);
        if (pickup.kind === 'coin') {
          this.coinStreak = this.animSec - this.lastCoinAt < .8 ? (this.coinStreak + 1) % 6 : 0;
          this.lastCoinAt = this.animSec;
        }
        this.audio.playPickup(pickup.kind, this.coinStreak, index * .025);
      });
      const arrived = this.pickupEffects.update(clampedDt, this.pickupTargets);
      if (arrived.length) {
        arrived.forEach(pickup => this.pickupArrived(pickup.kind));
        this.pushHud(true, snap.chassis.x);
        this.lastHudPushTime = now;
      }

      const rWheel = PHYSICS_CONFIG.wheels.radius;
      const rearSlope = snap.rearGrounded ? sampleTrackSlopeRad(this.activeTrack, snap.rearWheel.x) : 0;
      const frontSlope = snap.frontGrounded ? sampleTrackSlopeRad(this.activeTrack, snap.frontWheel.x) : 0;
      const rearContactX = snap.rearWheel.x + Math.sin(rearSlope) * rWheel;
      const rearContactY = snap.rearWheel.y - Math.cos(rearSlope) * rWheel;
      const frontContactX = snap.frontWheel.x + Math.sin(frontSlope) * rWheel;
      const frontContactY = snap.frontWheel.y - Math.cos(frontSlope) * rWheel;

      if (snap.justLandedStrength > 0) {
        this.camera.triggerLandingFeedback(snap.justLandedStrength);
        this.audio.playLandingThud(snap.justLandedStrength);
        this.haptics.onLanding(snap.justLandedStrength);
        this.dust.emitLandingSplash(
          rearContactX,
          rearContactY,
          frontContactX,
          frontContactY,
          snap.chassisVelX,
          snap.justLandedStrength,
          snap.rearGrounded,
          snap.frontGrounded
        );
      }

      if (snap.justHitObstacleStrength > 0) {
        this.haptics.onObstacleHit(snap.justHitObstacleStrength);
        this.audio.playObstacleCollision(snap.justHitObstacleStrength);
        this.dust.emitObstacleBurst(
          snap.frontWheel.x + 0.35,
          frontContactY,
          snap.chassisVelX,
          snap.justHitObstacleStrength
        );
      }

      const { throttleActive, brakeActive, leanDir } = resolveEffectiveControls(controls);
      const carvingOnSand = (snap.rearGrounded || snap.frontGrounded) && leanDir !== 0;

      this.dust.maybeEmitRollingDust({
        dt: clampedDt,
        rearGrounded: snap.rearGrounded,
        frontGrounded: snap.frontGrounded,
        rearX: rearContactX,
        rearY: rearContactY,
        frontX: frontContactX,
        frontY: frontContactY,
        speedX: snap.chassisVelX,
        throttle: throttleActive,
        brake: brakeActive,
        leanInput: leanDir,
      });
      this.dust.update(clampedDt);
      const audioFeedback = this.audio.updateEngine(
        throttleActive,
        brakeActive,
        snap.chassisVelX,
        true,
        clampedDt,
        snap.rearGrounded,
        snap.frontGrounded,
        snap.chassisVelY,
        carvingOnSand
      );
      if (audioFeedback.justShiftedUp) {
        this.haptics.onUpshift(audioFeedback.gear);
        const tailX = snap.chassis.x - Math.cos(snap.chassis.angle) * 0.68;
        const tailY = snap.chassis.y - Math.sin(snap.chassis.angle) * 0.68 + 0.25;
        this.dust.emitExhaustPuff(tailX, tailY, snap.chassisVelX);
      }

      this.haptics.updateRideFeedback({
        nowMs: now,
        throttle: throttleActive,
        brake: brakeActive,
        speedX: snap.chassisVelX,
        rpm: audioFeedback.rpm,
        grounded: snap.rearGrounded || snap.frontGrounded,
        compressionMax: Math.max(snap.suspensionCompressionRear, snap.suspensionCompressionFront),
      });

      if (this.mode === 'tutorial') {
        const tutState = this.tutorial.update(clampedDt, controls, snap);
        if (tutState.status === 'step_failed') {
          this.phase = 'tutorial_failed';
          this.input.setLocked(true);
          this.input.clearAll();
          this.audio.updateEngine(false, false, 0, false, clampedDt);
          if (snap.crashedReason) {
            this.audio.playCrashCollision(snap.crashedReason);
            this.haptics.onCrash();
          }
          this.haptics.stopAll();
          this.pushHud(true, snap.chassis.x);
        } else if (tutState.status === 'completed') {
          this.phase = 'tutorial_completed';
          this.tutorialProgress = saveTutorialProgress({ completed: true });
          this.input.setLocked(true);
          this.input.clearAll();
          this.audio.updateEngine(false, false, 0, false, clampedDt);
          this.audio.playFinishChime();
          this.haptics.stopAll();
          this.haptics.onFinish();
          this.pushHud(true, snap.chassis.x);
        } else if (now - this.lastHudPushTime > 50) {
          this.pushHud(false, snap.chassis.x);
          this.lastHudPushTime = now;
        }
      } else if (snap.crashedReason) {
        this.phase = 'crashed';
        this.crashReason = snap.crashedReason;
        this.input.setLocked(true);
        this.input.clearAll();
        this.audio.updateEngine(false, false, 0, false, clampedDt);
        this.audio.playCrashCollision(snap.crashedReason);
        this.haptics.stopAll();
        this.haptics.onCrash();
        this.pushHud(true);
      } else if (snap.finished) {
        this.phase = 'finished';
        this.progressRatio = 1;
        this.input.setLocked(true);
        this.input.clearAll();
        this.audio.updateEngine(false, false, 0, false, clampedDt);
        this.audio.playFinishChime();
        this.haptics.stopAll();
        this.haptics.onFinish();
        const result = saveBestTimeIfFaster(this.elapsedMs);
        this.bestTimeMs = result.bestTimeMs;
        this.isNewRecord = result.isNewRecord;
        this.pushHud(true);
      } else if (now - this.lastHudPushTime > 50) {
        this.pushHud(false, snap.chassis.x);
        this.lastHudPushTime = now;
      }

      this.renderSnapshot(snap, controls, clampedDt);
    }
    this.app?.renderer.render(this.app.stage);
    this.pickupEffects.setVisible(this.phase === 'playing');
  };

  private renderSnapshot(snap: PhysicsSnapshot, controls: ControlState, dt: number): void {
    if (!this.bikeRig || !this.trackRenderer) return;
    const { throttleActive, brakeActive, leanDir } = resolveEffectiveControls(controls);

    this.bikeRig.sync(snap, leanDir, dt, {
      throttle: throttleActive,
      brake: brakeActive,
    });
    this.contactShadow.update(this.activeTrack, snap.chassis.x, snap.chassis.y, snap.chassis.angle);

    const cam = this.camera.update(
      snap.chassis.x,
      snap.chassis.y,
      snap.chassisVelX,
      dt,
      snap.chassisVelY,
      snap.rearGrounded || snap.frontGrounded
    );
    const ppm = PHYSICS_CONFIG.world.pixelsPerMeter;

    this.cameraWorldLayer.scale.set(cam.scale);
    this.cameraWorldLayer.position.set(
      cam.viewportWidth * 0.5 - cam.worldX * ppm * cam.scale,
      cam.viewportHeight * 0.54 + cam.worldY * ppm * cam.scale
    );

    this.trackRenderer.syncObstacles(snap.dynamicProps, this.animSec);
    this.trackRenderer.updateParallax(cam);
  }

  private resolveHint(chassisX: number): string | null {
    if (this.collectibles.fuel <= 0) return 'بنزین تمام شد؛ به قوطی بعدی برس یا دوباره شروع کن';
    for (const hint of this.activeTrack.hints) {
      if (chassisX >= hint.startX && chassisX <= hint.endX) {
        return hint.labelFa;
      }
    }
    return null;
  }

  private pushHud(force: boolean, chassisX = this.activeTrack.startX): void {
    if (!force && this.phase !== 'playing') return;
    // Finish/crash transitions settle pending display credits instead of losing them.
    if (this.phase !== 'playing' && this.phase !== 'paused') {
      this.pickupEffects.queue.flights.forEach(flight => this.pickupArrived(flight.pickup.kind));
      this.pickupEffects.clear();
    }
    const tutorialState = this.mode === 'tutorial' ? this.tutorial.getSnapshot() : null;
    const hint =
      this.phase === 'playing'
        ? this.mode === 'tutorial'
          ? tutorialState?.instructionFa ?? null
          : this.resolveHint(chassisX)
        : null;

    this.onHudChange({
      mode: this.mode,
      phase: this.phase,
      elapsedMs: this.elapsedMs,
      bestTimeMs: this.bestTimeMs,
      isNewRecord: this.isNewRecord,
      progressRatio: this.progressRatio,
      crashReason: this.crashReason,
      activeHint: hint,
      tutorialVisible: this.mode === 'race' && this.phase === 'playing' && !this.timerStarted,
      tutorialDone: isTutorialFinishedOrSkipped(this.tutorialProgress),
      tutorialState,
      hasPausedRaceProgress:
        this.mode === 'race' &&
        this.phase === 'paused' &&
        (this.elapsedMs > 0 || this.progressRatio > 0.01),
      muted: this.muted,
      hapticsEnabled: this.haptics.isEnabled(),
      speedKmh: this.speedKmh, distanceM: this.distanceM,
      coins: this.collectibles.coins - this.pickupEffects.queue.pending('coin'),
      fuelRatio: Math.max(0, this.collectibles.fuel - this.pickupEffects.queue.pending('fuel')),
      coinPulse: this.coinPulse, fuelPulse: this.fuelPulse,
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
    this.pickupEffects.destroy();
    this.haptics.stopAll();
    if (this.app) {
      this.trackRenderer?.dispose();
      this.app.destroy(true);
      this.app = null;
    }
  }
}
