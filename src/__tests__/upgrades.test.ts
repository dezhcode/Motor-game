import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  loadGarage,
  creditRideCoins,
  buyVehicle,
  buyUpgrade,
  garageLevels,
  validateGarage,
  GARAGE_KEY,
} from "../storage/garageStorage";
import { UPGRADE_PARTS } from "../vehicles/vehicleUpgrades";
import { vehiclePhysics, VEHICLE_IDS } from "../vehicles/vehicleCatalog";
import { RideCollectibles } from "../track/RideCollectibles";
import { DESERT_TRACK } from "../track/desertTrackData";
import { nineSliceGrid } from "../artwork/nineSlice";
import { PhysicsWorld } from "../physics/PhysicsWorld";
const idle = {
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
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => map.set(k, v),
    },
  });
});
afterEach(() => vi.unstubAllGlobals());
describe("Vehicle upgrade economy", () => {
  it("migrates legacy saves without losing coins or owned vehicles", () => {
    const state = validateGarage({
      version: 1,
      coins: 743,
      owned: ["motorcycle", "jeep"],
      selected: "jeep",
    });
    expect(state.coins).toBe(743);
    expect(state.selected).toBe("jeep");
    expect(garageLevels(state, "jeep")).toEqual({
      engine: 1,
      tires: 1,
      suspension: 1,
      fuel: 1,
    });
  });
  it("atomically spends once, preserves other levels and rejects a stale double tap", () => {
    creditRideCoins(1000);
    const first = buyUpgrade("motorcycle", "engine", 1);
    expect(first.purchased).toBe(true);
    expect(first.progress.coins).toBe(750);
    expect(garageLevels(first.progress, "motorcycle").engine).toBe(2);
    expect(buyUpgrade("motorcycle", "engine", 1).reason).toBe("stale");
    expect(loadGarage().coins).toBe(750);
    expect(buyUpgrade("jeep", "fuel", 1).reason).toBe("locked");
    const second = buyUpgrade("motorcycle", "fuel", 1);
    expect(second.purchased).toBe(true);
    expect(second.progress.coins).toBe(350);
    expect(garageLevels(loadGarage(), "motorcycle")).toEqual({
      engine: 2,
      tires: 1,
      suspension: 1,
      fuel: 2,
    });
    expect(JSON.parse(window.localStorage.getItem(GARAGE_KEY)!)).toEqual(
      second.progress,
    );
    const detached = loadGarage();
    detached.upgrades!.motorcycle!.engine = 8;
    expect(garageLevels(loadGarage(), "motorcycle").engine).toBe(2);
  });
  it("rejects insufficient coins and caps each part independently at 8", () => {
    expect(buyUpgrade("motorcycle", "engine", 1).reason).toBe("funds");
    creditRideCoins(100000);
    for (const part of UPGRADE_PARTS) {
      for (let level = 1; level < 8; level++)
        expect(buyUpgrade("motorcycle", part, level).purchased).toBe(true);
      const before = loadGarage().coins;
      expect(buyUpgrade("motorcycle", part, 8).reason).toBe("max");
      expect(loadGarage().coins).toBe(before);
    }
    expect(garageLevels(loadGarage(), "jeep").engine).toBe(1);
  });
  it("makes both new vehicle purchases real and persistent", () => {
    creditRideCoins(40000);
    expect(buyVehicle("sport").purchased).toBe(true);
    expect(buyVehicle("buggy").purchased).toBe(true);
    expect(loadGarage().coins).toBe(7000);
    expect(loadGarage().selected).toBe("buggy");
    expect(buyVehicle("buggy").purchased).toBe(false);
  });
});
describe("Upgrade mechanics", () => {
  it("changes torque, grip and damping without mutating base physics", () => {
    const base = vehiclePhysics("motorcycle"),
      up = vehiclePhysics("motorcycle", {
        engine: 3,
        tires: 2,
        suspension: 4,
        fuel: 1,
      });
    expect(up.drive.maxMotorTorque).toBeGreaterThan(base.drive.maxMotorTorque);
    expect(up.wheels.friction).toBeGreaterThan(base.wheels.friction);
    expect(up.suspension.rearDampingRatio).toBeGreaterThan(
      base.suspension.rearDampingRatio,
    );
    expect(vehiclePhysics("motorcycle")).toEqual(base);
  });
  it("makes larger tanks consume a smaller fraction for identical riding", () => {
    const a = new RideCollectibles(DESERT_TRACK),
      b = new RideCollectibles(DESERT_TRACK);
    b.setFuelCapacity(1.7);
    a.update(10, -100, 100, true, true);
    b.update(10, -100, 100, true, true);
    expect(b.fuel).toBeGreaterThan(a.fuel);
    expect(a.coins).toBe(0);
    expect(b.coins).toBe(0);
  });
  it.each(VEHICLE_IDS)(
    "settles and accelerates the real %s configuration",
    (id) => {
      const flat = {
        ...DESERT_TRACK,
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
      const world = new PhysicsWorld(flat, vehiclePhysics(id));
      let state = world.step(0, idle, false);
      for (let i = 0; i < 120; i++) {
        state = world.step(1 / 60, idle, true);
        expect(state.crashedReason).toBeNull();
      }
      for (let i = 0; i < 180; i++)
        state = world.step(
          1 / 60,
          { ...idle, throttle: true, anyActive: true },
          true,
        );
      expect(state.chassisVelX).toBeGreaterThan(3);
      expect(state.crashedReason).toBeNull();
    },
  );
});
describe("9-Slice raster geometry", () => {
  it.each([
    [2172, 724, 320, 80, 360, 39],
    [1536, 1024, 400, 300, 190, 36],
    [1254, 1254, 72, 72, 360, 20],
  ])(
    "covers %dx%d source with nine contiguous non-overlapping regions",
    (sw, sh, w, h, cut, corner) => {
      const grid = nineSliceGrid(sw, sh, w, h, cut, corner);
      expect(grid).toHaveLength(9);
      const pixels = new Uint8Array(w * h);
      for (const r of grid) {
        expect(r.dw).toBeGreaterThan(0);
        expect(r.dh).toBeGreaterThan(0);
        for (let y = r.dy; y < r.dy + r.dh; y++)
          for (let x = r.dx; x < r.dx + r.dw; x++) pixels[y * w + x]++;
      }
      expect([...pixels].every((count) => count === 1)).toBe(true);
      for (const i of [0, 2, 6, 8]) {
        const r = grid[i];
        expect(r.sw).toBe(r.sh);
        expect(r.dw).toBe(r.dh);
      }
    },
  );
});
