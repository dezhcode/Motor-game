import {
  normalizeUpgradeLevels,
  MAX_UPGRADE_LEVEL,
  upgradePrice,
  type UpgradePart,
  type UpgradeLevels,
} from "../vehicles/vehicleUpgrades";
import {
  isVehicleId,
  VEHICLES,
  type VehicleId,
} from "../vehicles/vehicleCatalog";
import {
  FRIDAY_COMPLETE,
  FRIDAY_GARAGE,
  FRIDAY_RECAP,
  FRIDAY_START_LINE,
  fridayPrize,
  type FridayPlace,
} from "../story/dustyFridays";

export interface GarageProgress {
  version: 1;
  coins: number;
  owned: VehicleId[];
  selected: VehicleId;
  upgrades?: Partial<Record<VehicleId, UpgradeLevels>>;
  friday?: { scene: number; place?: FridayPlace };
}
export const GARAGE_KEY = "kavirsavar_garage_v1";
const fresh = (): GarageProgress => ({
  version: 1,
  coins: 0,
  owned: ["motorcycle"],
  selected: "motorcycle",
});
let memory: GarageProgress | undefined;
let pendingWrite = false;
export function validateGarage(value: unknown): GarageProgress {
  if (!value || typeof value !== "object") return fresh();
  const raw = value as Partial<GarageProgress>;
  if (raw.version !== 1) return fresh();
  const owned = Array.from(
    new Set<VehicleId>([
      "motorcycle",
      ...(Array.isArray(raw.owned) ? raw.owned.filter(isVehicleId) : []),
    ]),
  );
  const friday = raw.friday;
  const place = friday?.place === 1 || friday?.place === 2 ? friday.place : undefined;
  const savedScene = Number.isInteger(friday?.scene) ? friday!.scene : 0;
  const scene = place
    ? Math.max(FRIDAY_RECAP, Math.min(FRIDAY_COMPLETE, savedScene))
    : Math.max(0, Math.min(FRIDAY_START_LINE, savedScene));
  return {
    version: 1,
    coins:
      Number.isSafeInteger(raw.coins) && raw.coins! >= 0
        ? Math.min(raw.coins!, 1_000_000_000)
        : 0,
    owned,
    ...(scene || place ? { friday: { scene, ...(place ? { place } : {}) } } : {}),
    ...(raw.upgrades && typeof raw.upgrades === "object"
      ? {
          upgrades: Object.fromEntries(
            Object.entries(raw.upgrades)
              .filter(([id]) => isVehicleId(id) && owned.includes(id))
              .map(([id, levels]) => [id, normalizeUpgradeLevels(levels)]),
          ),
        }
      : {}),
    selected:
      isVehicleId(raw.selected) && owned.includes(raw.selected)
        ? raw.selected
        : "motorcycle",
  };
}
export function loadGarage(): GarageProgress {
  if (pendingWrite && memory) {
    try {
      window.localStorage.setItem(GARAGE_KEY, JSON.stringify(memory));
      pendingWrite = false;
    } catch {
      /* Keep unsaved session progress. */
    }
    return cloneGarage(memory);
  }
  try {
    memory = validateGarage(
      JSON.parse(window.localStorage.getItem(GARAGE_KEY) ?? "null"),
    );
  } catch {
    memory ??= fresh();
  }
  return cloneGarage(memory ?? fresh());
}
function saveGarage(value: GarageProgress): GarageProgress {
  memory = validateGarage(value);
  try {
    window.localStorage.setItem(GARAGE_KEY, JSON.stringify(memory));
    pendingWrite = false;
  } catch {
    pendingWrite = true;
  }
  return cloneGarage(memory);
}
export function creditRideCoins(amount: number): GarageProgress {
  const state = loadGarage();
  return Number.isSafeInteger(amount) && amount > 0
    ? saveGarage({
        ...state,
        coins: Math.min(1_000_000_000, state.coins + amount),
      })
    : state;
}

export function advanceFridayScene(expected: number): GarageProgress {
  const state = loadGarage();
  if ((state.friday?.scene ?? 0) !== expected ||
      expected === FRIDAY_START_LINE || expected >= FRIDAY_COMPLETE) return state;
  return saveGarage({ ...state, friday: { ...state.friday, scene: expected + 1 } });
}

export function finishFirstFridayRace(place: FridayPlace): GarageProgress {
  const state = loadGarage();
  if (state.friday?.scene !== FRIDAY_START_LINE || state.friday.place) return state;
  return saveGarage({
    ...state,
    coins: Math.min(1_000_000_000, state.coins + fridayPrize(place)),
    friday: { scene: FRIDAY_RECAP, place },
  });
}
export function buyVehicle(id: VehicleId): {
  progress: GarageProgress;
  purchased: boolean;
} {
  const state = loadGarage();
  if (state.owned.includes(id) || state.coins < VEHICLES[id].price)
    return { progress: state, purchased: false };
  return {
    progress: saveGarage({
      ...state,
      coins: state.coins - VEHICLES[id].price,
      owned: [...state.owned, id],
      selected: id,
    }),
    purchased: true,
  };
}
export function selectVehicle(id: VehicleId): GarageProgress {
  const state = loadGarage();
  return state.owned.includes(id)
    ? saveGarage({ ...state, selected: id })
    : state;
}

function cloneGarage(state: GarageProgress): GarageProgress {
  return {
    ...state,
    owned: [...state.owned],
    ...(state.friday ? { friday: { ...state.friday } } : {}),
    ...(state.upgrades
      ? {
          upgrades: Object.fromEntries(
            Object.entries(state.upgrades).map(([id, levels]) => [
              id,
              { ...levels },
            ]),
          ),
        }
      : {}),
  };
}
export function garageLevels(
  state: GarageProgress,
  id: VehicleId,
): UpgradeLevels {
  return normalizeUpgradeLevels(state.upgrades?.[id]);
}
export function buyUpgrade(id: VehicleId, part: UpgradePart, expectedLevel: number) {
  return purchaseUpgrade(id, part, expectedLevel, false);
}

export function buyFridaySuspension(expectedLevel: number) {
  return purchaseUpgrade('motorcycle', 'suspension', expectedLevel, true);
}

function purchaseUpgrade(
  id: VehicleId,
  part: UpgradePart,
  expectedLevel: number,
  finishFriday: boolean,
): {
  progress: GarageProgress;
  purchased: boolean;
  reason?: "locked" | "max" | "funds" | "stale";
} {
  const state = loadGarage(),
    levels = garageLevels(state, id),
    level = levels[part];
  if (finishFriday && state.friday?.scene !== FRIDAY_GARAGE)
    return { progress: state, purchased: false, reason: "stale" };
  if (!state.owned.includes(id))
    return { progress: state, purchased: false, reason: "locked" };
  if (level !== expectedLevel)
    return { progress: state, purchased: false, reason: "stale" };
  if (level >= MAX_UPGRADE_LEVEL)
    return { progress: state, purchased: false, reason: "max" };
  const cost = upgradePrice(part, level);
  if (state.coins < cost)
    return { progress: state, purchased: false, reason: "funds" };
  const progress = saveGarage({
    ...state,
    coins: state.coins - cost,
    upgrades: { ...state.upgrades, [id]: { ...levels, [part]: level + 1 } },
    ...(finishFriday ? { friday: { ...state.friday, scene: FRIDAY_COMPLETE } } : {}),
  });
  return { progress, purchased: true };
}
