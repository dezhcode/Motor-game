import type { ControlAction, ControlState } from '../input/InputManager';
import { resolveEffectiveControls } from '../input/InputManager';
import type { PhysicsSnapshot } from '../physics/PhysicsWorld';

export type TutorialStepId = 'throttle' | 'brake' | 'balance' | 'jump';

export type TutorialStatus = 'active' | 'step_failed' | 'completed';

export interface TutorialSnapshot {
  status: TutorialStatus;
  stepId: TutorialStepId;
  stepIndex: number; // 0..3
  totalSteps: number; // 4
  instructionFa: string;
  feedbackFa: string | null;
  failReasonFa: string | null;
  highlightControls: readonly ControlAction[];
}

export interface StepRetrySpawn {
  startX: number;
  startVx: number;
}

export const TUTORIAL_STEP_ORDER: readonly TutorialStepId[] = [
  'throttle',
  'brake',
  'balance',
  'jump',
];

const FEEDBACK_DURATION_SEC = 1.05;

export class TutorialController {
  private stepIndex = 0;
  private status: TutorialStatus = 'active';
  private feedbackFa: string | null = null;
  private feedbackTimerSec = 0;
  private failReasonFa: string | null = null;

  // Per-step physical/input trackers
  private stepStartX = 4;
  private stepInitialized = false;
  private throttleHoldSec = 0;
  private peakSpeedX = 0;
  private brakeHoldSec = 0;
  private balanceActiveSec = 0;
  private balanceStableSec = 0;
  private jumpAirborneSec = 0;
  private jumpClearedAir = false;
  private jumpStableLandSec = 0;
  private currentBikeX = 4;
  private currentAirborne = false;

  constructor(initialStepIndex = 0) {
    this.resetAll(initialStepIndex);
  }

  public resetAll(stepIdx = 0): void {
    this.stepIndex = Math.max(0, Math.min(TUTORIAL_STEP_ORDER.length - 1, stepIdx));
    this.status = 'active';
    this.feedbackFa = null;
    this.feedbackTimerSec = 0;
    this.failReasonFa = null;
    this.resetStepTrackers();
  }

  public retryCurrentStep(startX?: number): StepRetrySpawn {
    this.status = 'active';
    this.feedbackFa = null;
    this.feedbackTimerSec = 0;
    this.failReasonFa = null;
    this.resetStepTrackers();
    const spawn = this.getRetrySpawnForStep(this.getCurrentStepId());
    if (startX !== undefined) {
      this.stepStartX = startX;
      this.stepInitialized = true;
    } else {
      this.stepStartX = spawn.startX;
      this.stepInitialized = true;
    }
    return spawn;
  }

  public getCurrentStepId(): TutorialStepId {
    return TUTORIAL_STEP_ORDER[this.stepIndex];
  }

  public getRetrySpawnForStep(step: TutorialStepId = this.getCurrentStepId()): StepRetrySpawn {
    switch (step) {
      case 'throttle':
        return { startX: 4, startVx: 0 };
      case 'brake':
        return { startX: 24, startVx: 7.5 };
      case 'balance':
        return { startX: 60, startVx: 7.5 };
      case 'jump':
        return { startX: 112, startVx: 7.0 };
    }
  }

  private resetStepTrackers(): void {
    this.stepInitialized = false;
    this.throttleHoldSec = 0;
    this.peakSpeedX = 0;
    this.brakeHoldSec = 0;
    this.balanceActiveSec = 0;
    this.balanceStableSec = 0;
    this.jumpAirborneSec = 0;
    this.jumpClearedAir = false;
    this.jumpStableLandSec = 0;
  }

  private completeCurrentStep(feedback: string, snap: PhysicsSnapshot): void {
    this.feedbackFa = feedback;
    this.feedbackTimerSec = FEEDBACK_DURATION_SEC;

    if (this.stepIndex >= TUTORIAL_STEP_ORDER.length - 1) {
      this.status = 'completed';
      return;
    }

    this.stepIndex += 1;
    this.resetStepTrackers();
    this.stepStartX = snap.chassis.x;
    this.stepInitialized = true;
    // Carry instantaneous forward speed into Step 2 (brake) seamlessly
    this.peakSpeedX = Math.max(0, snap.chassisVelX);
  }

  public update(dt: number, controls: ControlState, snap: PhysicsSnapshot): TutorialSnapshot {
    if (this.status !== 'active') {
      return this.getSnapshot();
    }

    const safeDt = Math.max(0, dt);
    this.currentBikeX = snap.chassis.x;
    this.currentAirborne = !snap.rearGrounded && !snap.frontGrounded;

    if (!this.stepInitialized) {
      this.stepStartX = snap.chassis.x;
      this.stepInitialized = true;
    }

    if (this.feedbackTimerSec > 0) {
      this.feedbackTimerSec = Math.max(0, this.feedbackTimerSec - safeDt);
      if (this.feedbackTimerSec === 0) {
        this.feedbackFa = null;
      }
    }

    if (snap.crashedReason) {
      this.status = 'step_failed';
      this.feedbackFa = null;
      this.failReasonFa = 'تعادل موتور به هم خورد! همین بخش را دوباره امتحان کن.';
      return this.getSnapshot();
    }

    const { throttleActive, brakeActive, leanDir } = resolveEffectiveControls(controls);
    const step = this.getCurrentStepId();

    // Prevent soft-lock if player rolls all the way to end without completing current step
    if (snap.finished || snap.chassis.x >= 178) {
      if (step !== 'jump' || !this.jumpClearedAir) {
        this.status = 'step_failed';
        this.feedbackFa = null;
        this.failReasonFa =
          step === 'jump'
            ? 'سرعت یا زمان پرش کافی نبود؛ از پشت سکو دوباره امتحان کن.'
            : 'به انتهای مسیر تمرینی رسیدی؛ همین بخش را دوباره امتحان کن.';
        return this.getSnapshot();
      }
    }

    if (step === 'throttle') {
      if (throttleActive) {
        this.throttleHoldSec += safeDt;
      } else {
        this.throttleHoldSec = Math.max(0, this.throttleHoldSec - safeDt * 1.5);
      }

      const distanceMoved = snap.chassis.x - this.stepStartX;
      if (this.throttleHoldSec >= 0.65 && snap.chassisVelX >= 5.5 && distanceMoved >= 8.0) {
        this.completeCurrentStep('عالی! موتور با قدرت حرکت کرد', snap);
      }
    } else if (step === 'brake') {
      if (snap.chassisVelX > this.peakSpeedX) {
        this.peakSpeedX = snap.chassisVelX;
      }

      if (brakeActive && snap.chassisVelX > 0.25) {
        this.brakeHoldSec += safeDt;
      }

      const hasEntrySpeed = this.peakSpeedX >= 4.5;
      const slowedEnough =
        snap.chassisVelX <= Math.min(this.peakSpeedX * 0.45, this.peakSpeedX - 2.6) &&
        snap.chassisVelX <= 3.2;

      if (hasEntrySpeed && this.brakeHoldSec >= 0.25 && slowedEnough) {
        this.completeCurrentStep('آفرین! کنترل سرعت عالی بود', snap);
      }
    } else if (step === 'balance') {
      const inBalanceZoneOrAttitude =
        snap.chassis.x >= 68 ||
        Math.abs(snap.chassis.angle) >= 0.08 ||
        !snap.rearGrounded ||
        !snap.frontGrounded;

      if (inBalanceZoneOrAttitude && snap.chassisVelX >= 2.0 && leanDir !== 0) {
        this.balanceActiveSec += safeDt;
      }

      if (this.balanceActiveSec >= 0.24 && Math.abs(snap.chassis.angle) < 0.46) {
        this.balanceStableSec += safeDt;
      } else {
        this.balanceStableSec = 0;
      }

      if (this.balanceActiveSec >= 0.24 && this.balanceStableSec >= 0.28) {
        this.completeCurrentStep('خوب بود! تعادل موتور حفظ شد', snap);
      }
    } else if (step === 'jump') {
      const bothAirborne = !snap.rearGrounded && !snap.frontGrounded;
      const pastRampApproach = snap.chassis.x >= 131;

      if (pastRampApproach && bothAirborne) {
        this.jumpAirborneSec += safeDt;
        if (this.jumpAirborneSec >= 0.2) {
          this.jumpClearedAir = true;
        }
      }

      const grounded = snap.rearGrounded || snap.frontGrounded;
      if (this.jumpClearedAir && grounded && snap.chassis.x >= 143) {
        if (Math.abs(snap.chassis.angle) < 0.65) {
          this.jumpStableLandSec += safeDt;
        } else {
          this.jumpStableLandSec = 0;
        }
      }

      if (this.jumpClearedAir && this.jumpStableLandSec >= 0.38) {
        this.completeCurrentStep('تبریک! پرش و فرودت موفق بود', snap);
      }
    }

    return this.getSnapshot();
  }

  public getSnapshot(): TutorialSnapshot {
    const step = this.getCurrentStepId();

    let instructionFa = '';
    let highlightControls: readonly ControlAction[] = [];

    switch (step) {
      case 'throttle':
        instructionFa = 'پدال گاز را نگه دار تا موتور حرکت کند';
        highlightControls = ['throttle'];
        break;
      case 'brake':
        if (this.peakSpeedX < 4.2 && this.brakeHoldSec === 0) {
          instructionFa = 'اول کمی گاز بده و بعد پدال ترمز را نگه دار';
          highlightControls = ['throttle', 'brake'];
        } else {
          instructionFa = 'پدال ترمز را نگه دار تا سرعت کم شود';
          highlightControls = ['brake'];
        }
        break;
      case 'balance':
        instructionFa = 'در مسیر شیب‌دار با عقب و جلو تعادل را نگه دار';
        highlightControls = ['leanLeft', 'leanRight'];
        break;
      case 'jump':
        instructionFa = 'با گاز از سکو بپر و روی چرخ‌ها فرود بیا';
        highlightControls =
          this.currentAirborne || this.jumpClearedAir || this.currentBikeX >= 139
            ? ['leanLeft', 'leanRight']
            : ['throttle'];
        break;
    }

    return {
      status: this.status,
      stepId: step,
      stepIndex: this.stepIndex,
      totalSteps: TUTORIAL_STEP_ORDER.length,
      instructionFa,
      feedbackFa: this.feedbackFa,
      failReasonFa: this.failReasonFa,
      highlightControls,
    };
  }
}
