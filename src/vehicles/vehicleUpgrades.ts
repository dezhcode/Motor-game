export const UPGRADE_PARTS = ["engine", "tires", "suspension", "fuel"] as const;
export type UpgradePart = (typeof UPGRADE_PARTS)[number];
export type UpgradeLevels = Record<UpgradePart, number>;
export const MAX_UPGRADE_LEVEL = 8;
export const UPGRADE_INFO = {
  engine: {
    label: "قدرت موتور",
    icon: "engine",
    cost: 250,
    base: 13,
    step: 3,
    unit: "",
    benefit: "قدرت بیشتر",
  },
  tires: {
    label: "لاستیک‌ها",
    icon: "wheel",
    cost: 250,
    base: 155,
    step: 5,
    unit: "",
    benefit: "چسبندگی بیشتر",
  },
  suspension: {
    label: "کمک‌فنر",
    icon: "shock",
    cost: 325,
    base: 95,
    step: 5,
    unit: "",
    benefit: "فرود نرم‌تر",
  },
  fuel: {
    label: "باک بنزین",
    icon: "fuel",
    cost: 400,
    base: 5,
    step: 0.5,
    unit: "لیتر",
    benefit: "مسافت بیشتر",
  },
} as const;
export function normalizeUpgradeLevels(value?: unknown): UpgradeLevels {
  const raw =
    value && typeof value === "object" ? (value as Partial<UpgradeLevels>) : {};
  return Object.fromEntries(
    UPGRADE_PARTS.map((part) => [
      part,
      Number.isInteger(raw[part]) ? Math.min(8, Math.max(1, raw[part]!)) : 1,
    ]),
  ) as UpgradeLevels;
}
export function upgradePrice(part: UpgradePart, level: number): number {
  return UPGRADE_INFO[part].cost * Math.max(1, Math.min(8, level));
}
export function upgradeValue(part: UpgradePart, level: number): number {
  return UPGRADE_INFO[part].base + (level - 1) * UPGRADE_INFO[part].step;
}
export function fuelCapacityMultiplier(levels: UpgradeLevels): number {
  return 1 + (levels.fuel - 1) * 0.1;
}
