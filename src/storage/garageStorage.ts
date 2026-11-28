import {
  isVehicleId,
  VEHICLES,
  type VehicleId,
} from "../vehicles/vehicleCatalog";

export interface GarageProgress {
  version: 1;
  coins: number;
  owned: VehicleId[];
  selected: VehicleId;
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
  return {
    version: 1,
    coins:
      Number.isSafeInteger(raw.coins) && raw.coins! >= 0
        ? Math.min(raw.coins!, 1_000_000_000)
        : 0,
    owned,
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
    return { ...memory, owned: [...memory.owned] };
  }
  try {
    memory = validateGarage(
      JSON.parse(window.localStorage.getItem(GARAGE_KEY) ?? "null"),
    );
  } catch {
    memory ??= fresh();
  }
  return { ...(memory ?? fresh()), owned: [...(memory ?? fresh()).owned] };
}
function saveGarage(value: GarageProgress): GarageProgress {
  memory = validateGarage(value);
  try {
    window.localStorage.setItem(GARAGE_KEY, JSON.stringify(memory));
    pendingWrite = false;
  } catch {
    pendingWrite = true;
  }
  return { ...memory, owned: [...memory.owned] };
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
