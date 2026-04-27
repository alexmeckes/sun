import type { LatLng, SimResult } from '../types';

function cellIndex(simResult: SimResult, pos: LatLng): number | null {
  const { bounds, cellsX, cellsY } = simResult;
  if (
    pos.lat < bounds.sw.lat ||
    pos.lat > bounds.ne.lat ||
    pos.lng < bounds.sw.lng ||
    pos.lng > bounds.ne.lng
  ) {
    return null;
  }
  const fx = (pos.lng - bounds.sw.lng) / (bounds.ne.lng - bounds.sw.lng);
  const fy = (pos.lat - bounds.sw.lat) / (bounds.ne.lat - bounds.sw.lat);
  const i = Math.min(cellsX - 1, Math.max(0, Math.floor(fx * cellsX)));
  const j = Math.min(cellsY - 1, Math.max(0, Math.floor(fy * cellsY)));
  return j * cellsX + i;
}

export function lookupHours(simResult: SimResult, pos: LatLng): number | null {
  const idx = cellIndex(simResult, pos);
  if (idx === null) return null;
  return simResult.hoursPerDay[idx];
}

export function lookupMonthly(
  simResult: SimResult,
  pos: LatLng,
): { monthIndex: number; hours: number }[] {
  const idx = cellIndex(simResult, pos);
  if (idx === null) return [];
  return simResult.monthly.map((m) => ({
    monthIndex: m.monthIndex,
    hours: m.hoursPerDay[idx],
  }));
}
