import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  buyVehicle,
  creditRideCoins,
  GARAGE_KEY,
  loadGarage,
  selectVehicle,
  validateGarage,
} from "../storage/garageStorage";
import { vehiclePhysics } from "../vehicles/vehicleCatalog";
import { PhysicsWorld } from "../physics/PhysicsWorld";
import { DESERT_TRACK, type TrackDefinition } from "../track/desertTrackData";
import type { ControlState } from "../input/InputManager";
import {
  loadBestTimeMs,
  saveBestTimeIfFaster,
} from "../storage/bestTimeStorage";
const idle: ControlState = {
  throttle: false,
  brake: false,
  leanLeft: false,
  leanRight: false,
  anyActive: false,
};
beforeEach(() => {
  const map = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => {
        map.set(key, value);
      },
    },
  });
});
afterEach(() => vi.unstubAllGlobals());
describe("Garage economy", () => {
  it("keeps the starter free, rejects invalid ownership and restores only an owned selection", () => {
    expect(loadGarage()).toEqual({
      version: 1,
      coins: 0,
      owned: ["motorcycle"],
      selected: "motorcycle",
    });
    expect(
      validateGarage({
        version: 1,
        coins: -20,
        owned: ["alien"],
        selected: "jeep",
      }),
    ).toEqual(loadGarage());
    expect(
      validateGarage({
        version: 1,
        coins: Infinity,
        owned: ["jeep", "jeep"],
        selected: "jeep",
      }),
    ).toEqual({
      version: 1,
      coins: 0,
      owned: ["motorcycle", "jeep"],
      selected: "jeep",
    });
    expect(
      validateGarage({
        version: 7,
        coins: 9000,
        owned: ["jeep"],
        selected: "jeep",
      }),
    ).toEqual(loadGarage());
  });
  it("refuses an unaffordable purchase or a locked vehicle selection without spending", () => {
    creditRideCoins(299);
    expect(buyVehicle("jeep").purchased).toBe(false);
    expect(selectVehicle("jeep").selected).toBe("motorcycle");
    expect(loadGarage().coins).toBe(299);
  });
  it("credits collected coins, purchases exactly once, persists and switches between owned vehicles", () => {
    creditRideCoins(320);
    const purchase = buyVehicle("jeep");
    expect(purchase.purchased).toBe(true);
    expect(purchase.progress).toEqual({
      version: 1,
      coins: 20,
      owned: ["motorcycle", "jeep"],
      selected: "jeep",
    });
    expect(JSON.parse(window.localStorage.getItem(GARAGE_KEY)!)).toEqual(
      purchase.progress,
    );
    expect(buyVehicle("jeep").purchased).toBe(false);
    expect(loadGarage().coins).toBe(20);
    expect(selectVehicle("motorcycle").selected).toBe("motorcycle");
    expect(selectVehicle("jeep").selected).toBe("jeep");
    expect(creditRideCoins(-20).coins).toBe(20);
    expect(creditRideCoins(1.5).coins).toBe(20);
  });
  it("keeps motorcycle and jeep time records independent and preserves the legacy bike record", () => {
    saveBestTimeIfFaster(25000);
    saveBestTimeIfFaster(27000, "jeep");
    expect(loadBestTimeMs()).toBe(25000);
    expect(loadBestTimeMs("jeep")).toBe(27000);
  });
  it("retains earned coins in the session if writes fail, then persists them when storage recovers", () => {
    creditRideCoins(10);
    const original = window.localStorage.setItem;
    window.localStorage.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    expect(creditRideCoins(7).coins).toBe(17);
    expect(loadGarage().coins).toBe(17);
    window.localStorage.setItem = original;
    expect(loadGarage().coins).toBe(17);
    expect(JSON.parse(window.localStorage.getItem(GARAGE_KEY)!).coins).toBe(17);
  });
});
describe("Playable jeep physics", () => {
  it("settles without a false rider head collision, accelerates and brakes with independent wheels", () => {
    const flat: TrackDefinition = {
      points: [
        { x: -20, y: 0 },
        { x: 250, y: 0 },
      ],
      startX: 4,
      startY: 1.1,
      finishX: 220,
      minX: -20,
      maxX: 250,
      hints: [],
    };
    const world = new PhysicsWorld(flat, vehiclePhysics("jeep"));
    for (let i = 0; i < 120; i++)
      expect(world.step(1 / 60, idle, true).crashedReason).toBeNull();
    let last = world.step(0, idle, false);
    for (let i = 0; i < 240; i++) {
      last = world.step(
        1 / 60,
        { ...idle, throttle: true, anyActive: true },
        true,
      );
      expect(last.crashedReason).toBeNull();
    }
    expect(last.chassisVelX).toBeGreaterThan(7);
    expect(last.frontWheel.x - last.rearWheel.x).toBeGreaterThan(1.8);
    const speed = last.chassisVelX;
    for (let i = 0; i < 90; i++)
      last = world.step(
        1 / 60,
        { ...idle, brake: true, anyActive: true },
        true,
      );
    expect(last.chassisVelX).toBeLessThan(speed * 0.5);
  });
  it("can complete the actual desert course with the existing two-pedal controls", () => {
    const world = new PhysicsWorld(DESERT_TRACK, vehiclePhysics("jeep"));
    let last = world.step(0, idle, false),
      finished = false;
    for (let i = 0; i < 60 * 90; i++) {
      const air = !last.frontGrounded && !last.rearGrounded;
      const throttle = air ? last.chassis.angle < 0.04 : true,
        brake = air && last.chassis.angle > 0.16;
      last = world.step(
        1 / 60,
        { ...idle, throttle, brake, anyActive: throttle || brake },
        true,
      );
      expect(
        last.crashedReason,
        `Jeep crashed at ${last.chassis.x.toFixed(1)}m`,
      ).toBeNull();
      if (last.finished) {
        finished = true;
        break;
      }
    }
    expect(finished).toBe(true);
  });
});
