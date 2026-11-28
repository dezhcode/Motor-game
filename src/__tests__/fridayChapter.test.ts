import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  advanceFridayScene, buyFridaySuspension, creditRideCoins, finishFirstFridayRace,
  garageLevels, loadGarage,
} from '../storage/garageStorage';
import { FRIDAY_COMPLETE, FRIDAY_GARAGE, FRIDAY_RECAP, FRIDAY_START_LINE } from '../story/dustyFridays';
import { FridayRival } from '../story/fridayRival';
import { FRIDAY_TRACK } from '../story/fridayTrack';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { vehiclePhysics } from '../vehicles/vehicleCatalog';

beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal('window', {
    localStorage: { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) },
  });
});
afterEach(() => vi.unstubAllGlobals());

function reachStart() {
  for (let scene = 0; scene < FRIDAY_START_LINE; scene++) advanceFridayScene(scene);
}

describe('Dusty Fridays', () => {
  it('resumes at the saved scene and credits the first prize once after finishing the race', () => {
    expect(finishFirstFridayRace(1).coins).toBe(0);
    reachStart();
    expect(loadGarage().friday).toEqual({ scene: FRIDAY_START_LINE });
    expect(advanceFridayScene(FRIDAY_START_LINE).friday?.scene).toBe(FRIDAY_START_LINE);
    expect(finishFirstFridayRace(1).coins).toBe(400);
    expect(loadGarage().friday).toEqual({ scene: FRIDAY_RECAP, place: 1 });
    expect(finishFirstFridayRace(2).coins).toBe(400);
  });

  it('makes either final choice durable and only buys the suspension once', () => {
    reachStart();
    finishFirstFridayRace(2);
    expect(buyFridaySuspension(1).purchased).toBe(false);
    advanceFridayScene(FRIDAY_RECAP);
    advanceFridayScene(FRIDAY_RECAP + 1);
    creditRideCoins(1000);
    expect(buyFridaySuspension(1).purchased).toBe(true);
    expect(buyFridaySuspension(2).purchased).toBe(false);
    const saved = loadGarage();
    expect(saved.friday).toEqual({ scene: FRIDAY_COMPLETE, place: 2 });
    expect(saved.coins).toBe(1000);
    expect(garageLevels(saved, 'motorcycle').suspension).toBe(2);
    expect(advanceFridayScene(FRIDAY_GARAGE).friday).toEqual(saved.friday);
  });

  it('gives a starter rider an actual jump and lets both racers finish', () => {
    const player = new PhysicsWorld(FRIDAY_TRACK, vehiclePhysics('motorcycle'));
    const rival = new FridayRival();
    const gas = { throttle: true, brake: false, leanLeft: false, leanRight: false, anyActive: true };
    for (let frame = 0; frame < 30; frame++) rival.step(1 / 60, false);
    expect(rival.pose.chassis.x).toBeCloseTo(FRIDAY_TRACK.startX - 1.3, 1);
    let snap = player.step(0, gas, false);
    let jumped = false;
    for (let frame = 0; frame < 1350; frame++) {
      if (!snap.finished) snap = player.step(1 / 60, gas, true);
      if (snap.chassis.x > 133 && snap.chassis.x < 149 && !snap.rearGrounded && !snap.frontGrounded)
        jumped = true;
      rival.step(1 / 60, true);
      if (snap.finished && rival.pose.finished) break;
    }
    expect(jumped).toBe(true);
    expect(snap.finished).toBe(true);
    expect(rival.pose.finished).toBe(true);
  });
});
