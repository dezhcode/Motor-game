import {
  FIRST_STAGE_PHYSICS_CONFIG,
  type PhysicsConfig,
} from "../config/physicsConfig";

export type VehicleId = "motorcycle" | "jeep";
export const VEHICLES = {
  motorcycle: {
    name: "موتور کویری",
    kind: "موتور",
    price: 0,
    description: "سبک و چابک؛ مناسب پرش و کنترل در هوا",
    stats: [55, 65, 45, 50],
  },
  jeep: {
    name: "جیپ کویر",
    kind: "ماشین",
    price: 300,
    description: "پایدار و پرقدرت؛ با چرخ‌های بزرگ و کمک‌فنر نرم",
    stats: [72, 82, 78, 50],
  },
} as const;
export const VEHICLE_IDS: VehicleId[] = ["motorcycle", "jeep"];
export const isVehicleId = (value: unknown): value is VehicleId =>
  value === "motorcycle" || value === "jeep";

export function vehiclePhysics(id: VehicleId): PhysicsConfig {
  const base = FIRST_STAGE_PHYSICS_CONFIG;
  if (id === "motorcycle") return base;
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
      rearOffsetX: -1.02,
      frontOffsetX: 1.02,
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
