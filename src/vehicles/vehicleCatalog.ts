import { normalizeUpgradeLevels, type UpgradeLevels } from "./vehicleUpgrades";
import {
  FIRST_STAGE_PHYSICS_CONFIG,
  type PhysicsConfig,
} from "../config/physicsConfig";

export type VehicleId = "motorcycle" | "sport" | "jeep" | "buggy";
export const VEHICLES = {
  motorcycle: {
    name: "موتور کویری",
    kind: "موتور",
    price: 0,
    description: "سبک و چابک؛ مناسب پرش و کنترل در هوا",
    stats: [55, 65, 45, 50],
  },
  sport: {
    name: "موتور اسپرت",
    kind: "موتور",
    price: 8000,
    description: "چابک و پرقدرت برای شیب‌های کویری",
    stats: [68, 70, 54, 50],
  },
  buggy: {
    name: "باگی کویر",
    kind: "ماشین",
    price: 25000,
    description: "شاسی سبک و تعلیق بلند برای ناهمواری‌ها",
    stats: [85, 80, 82, 60],
  },
  jeep: {
    name: "جیپ کویر",
    kind: "ماشین",
    price: 300,
    description: "پایدار و پرقدرت؛ با چرخ‌های بزرگ و کمک‌فنر نرم",
    stats: [72, 82, 78, 50],
  },
} as const;
export const VEHICLE_IDS: VehicleId[] = [
  "motorcycle",
  "sport",
  "jeep",
  "buggy",
];
export const isVehicleId = (value: unknown): value is VehicleId =>
  VEHICLE_IDS.includes(value as VehicleId);

export const isCar = (id: VehicleId) => VEHICLES[id].kind === "ماشین";

function baseVehiclePhysics(id: VehicleId): PhysicsConfig {
  const base = FIRST_STAGE_PHYSICS_CONFIG;
  if (!isCar(id))
    return id === "sport"
      ? {
          ...base,
          drive: {
            ...base.drive,
            maxMotorTorque: base.drive.maxMotorTorque * 1.12,
          },
        }
      : base;
  return {
    ...base,
    vehicleShape: "jeep",
    chassis: {
      ...base.chassis,
      massKg: 46,
      inertia: 22,
      centerOfMassY: 0.02,
      angularDamping: 0.6,
    },
    wheels: {
      ...base.wheels,
      radius: 0.43,
      rearOffsetX: id === "buggy" ? -1.125 : -1.02,
      frontOffsetX: id === "buggy" ? 1.125 : 1.02,
      rearOffsetY: -0.3,
      frontOffsetY: -0.3,
      density: 15,
      friction: 3.3,
    },
    suspension: {
      ...base.suspension,
      rearFrequencyHz: 5.3,
      frontFrequencyHz: 5.3,
      rearDampingRatio: 0.9,
      frontDampingRatio: 0.9,
    },
    drive: {
      ...base.drive,
      maxMotorTorque: 165,
      targetWheelOmega: 29,
      brakeTorque: 240,
      speedGovernorMps: 12.2,
    },
    crash: { ...base.crash, upsideDownGraceSeconds: 1.3 },
  };
}

/** Registration measured in the original generated canvases; shared by DOM and Pixi. */
export const JEEP_SPRITE = {
  width: 1721,
  height: 914,
  rearAxle: { x: 448, y: 768 },
  frontAxle: { x: 1336, y: 768 },
  wheelCenter: { x: 627, y: 627 },
  wheelRadius: 556,
} as const;
export const garageAsset = (name: string) =>
  new URL(`./assets/art/garage/${name}.webp`, document.baseURI).href;

export function vehiclePhysics(
  id: VehicleId,
  rawLevels?: UpgradeLevels,
): PhysicsConfig {
  const base = baseVehiclePhysics(id),
    l = normalizeUpgradeLevels(rawLevels);
  return {
    ...base,
    drive: {
      ...base.drive,
      maxMotorTorque: base.drive.maxMotorTorque * (1 + 0.08 * (l.engine - 1)),
      targetWheelOmega:
        base.drive.targetWheelOmega * (1 + 0.025 * (l.engine - 1)),
      ...(base.drive.speedGovernorMps
        ? {
            speedGovernorMps:
              base.drive.speedGovernorMps * (1 + 0.025 * (l.engine - 1)),
          }
        : {}),
    },
    wheels: {
      ...base.wheels,
      friction: base.wheels.friction * (1 + 0.04 * (l.tires - 1)),
    },
    suspension: {
      ...base.suspension,
      rearFrequencyHz:
        base.suspension.rearFrequencyHz * (1 + 0.025 * (l.suspension - 1)),
      frontFrequencyHz:
        base.suspension.frontFrequencyHz * (1 + 0.025 * (l.suspension - 1)),
      rearDampingRatio: Math.min(
        0.98,
        base.suspension.rearDampingRatio + 0.01 * (l.suspension - 1),
      ),
      frontDampingRatio: Math.min(
        0.98,
        base.suspension.frontDampingRatio + 0.01 * (l.suspension - 1),
      ),
    },
  };
}
export const BUGGY_SPRITE = {
  width: 1536,
  height: 1024,
  rearAxle: { x: 260, y: 740 },
  frontAxle: { x: 1270, y: 740 },
  wheelCenter: { x: 627, y: 627 },
  wheelRadius: 556,
} as const;
export const carSprite = (id: VehicleId) =>
  id === "buggy" ? BUGGY_SPRITE : JEEP_SPRITE;
