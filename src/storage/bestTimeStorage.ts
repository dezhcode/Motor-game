import type { VehicleId } from "../vehicles/vehicleCatalog";
const BEST_TIME_KEY = "kavirsavar_best_time_ms_v1";

export function loadBestTimeMs(
  vehicle: VehicleId = "motorcycle",
): number | null {
  try {
    const raw = window.localStorage.getItem(
      vehicle === "motorcycle" ? BEST_TIME_KEY : `${BEST_TIME_KEY}_${vehicle}`,
    );
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function saveBestTimeIfFaster(
  timeMs: number,
  vehicle: VehicleId = "motorcycle",
): {
  bestTimeMs: number;
  isNewRecord: boolean;
} {
  const currentBest = loadBestTimeMs(vehicle);
  if (currentBest === null || timeMs < currentBest) {
    try {
      window.localStorage.setItem(
        vehicle === "motorcycle"
          ? BEST_TIME_KEY
          : `${BEST_TIME_KEY}_${vehicle}`,
        String(Math.round(timeMs)),
      );
    } catch {
      // Ignore storage quota errors in restricted webviews
    }
    return { bestTimeMs: timeMs, isNewRecord: true };
  }
  return { bestTimeMs: currentBest, isNewRecord: false };
}

export function formatTimeEnglish(ms: number): string {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hundredths = Math.floor((safeMs % 1000) / 10);
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  const hh = String(hundredths).padStart(2, "0");
  return `${mm}:${ss}.${hh}`;
}
