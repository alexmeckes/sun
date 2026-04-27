/// <reference lib="webworker" />
import type { MonthlyBreakdown, SimInput, SimResult } from '../types';
import { makeFrame, toMeters } from '../lib/geo';
import { buildSamples } from '../lib/solar';
import {
  bbox,
  buildingShadow,
  pointInConvex,
  shadowOffset,
  treeShadow,
  type Vec2,
} from '../lib/shadow';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

const STEP_MINUTES = 30;
const DAY_STRIDE = 14;

ctx.onmessage = (e: MessageEvent<SimInput>) => {
  const result = simulate(e.data);
  const transfers: ArrayBuffer[] = [result.hoursPerDay.buffer];
  for (const m of result.monthly) transfers.push(m.hoursPerDay.buffer);
  ctx.postMessage(result, transfers);
};

function simulate(input: SimInput): SimResult {
  const { center, bounds, buildings, trees, startMonth, endMonth, cellsPerSide } = input;
  const frame = makeFrame(center);

  const swM = toMeters(bounds.sw, frame);
  const neM = toMeters(bounds.ne, frame);
  const xMin = Math.min(swM.x, neM.x);
  const xMax = Math.max(swM.x, neM.x);
  const yMin = Math.min(swM.y, neM.y);
  const yMax = Math.max(swM.y, neM.y);
  const dx = (xMax - xMin) / cellsPerSide;
  const dy = (yMax - yMin) / cellsPerSide;

  const buildingsM: Vec2[][] = buildings.map((b) => b.polygon.map((p) => toMeters(p, frame)));
  const buildingHeights = buildings.map((b) => b.heightM);
  const treesM = trees.map((t) => ({
    pos: toMeters(t.pos, frame),
    radius: t.radiusM,
    height: t.heightM,
  }));

  const year = new Date().getFullYear();
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, endMonth + 1, 0);
  const samples = buildSamples(start, end, center.lat, center.lng, DAY_STRIDE, STEP_MINUTES);

  const cellsX = cellsPerSide;
  const cellsY = cellsPerSide;
  const cellCount = cellsX * cellsY;

  // Per-month accumulators.
  const monthSunMinutes: Record<number, Float32Array> = {};
  const monthDays: Record<number, Set<string>> = {};
  const totalDays = new Set<string>();

  for (const s of samples) {
    const m = s.date.getMonth();
    if (!monthSunMinutes[m]) {
      monthSunMinutes[m] = new Float32Array(cellCount);
      monthDays[m] = new Set();
    }
    const dayKey = `${s.date.getFullYear()}-${m}-${s.date.getDate()}`;
    monthDays[m].add(dayKey);
    totalDays.add(dayKey);
  }

  const sunMinutes = new Float32Array(cellCount);

  for (const s of samples) {
    if (s.altitudeRad <= 0) continue;
    const monthArr = monthSunMinutes[s.date.getMonth()];

    const buildingShadows: Vec2[][] = [];
    const buildingShadowBBoxes: ReturnType<typeof bbox>[] = [];
    for (let i = 0; i < buildingsM.length; i++) {
      const off = shadowOffset(s.azimuthRad, s.altitudeRad, buildingHeights[i]);
      const shadow = buildingShadow(buildingsM[i], off);
      buildingShadows.push(shadow);
      buildingShadowBBoxes.push(bbox(shadow));
    }

    const treeShadows: { cx: number; cy: number; r: number; r2: number }[] = [];
    for (const t of treesM) {
      const ts = treeShadow(t.pos, t.radius, t.height, s.azimuthRad, s.altitudeRad);
      if (ts) treeShadows.push({ ...ts, r2: ts.r * ts.r });
    }

    for (let j = 0; j < cellsY; j++) {
      const cy = yMin + (j + 0.5) * dy;
      for (let i = 0; i < cellsX; i++) {
        const cx = xMin + (i + 0.5) * dx;
        let shadowed = false;
        for (let k = 0; k < buildingShadows.length; k++) {
          const bb = buildingShadowBBoxes[k];
          if (cx < bb.minX || cx > bb.maxX || cy < bb.minY || cy > bb.maxY) continue;
          if (pointInConvex(cx, cy, buildingShadows[k])) {
            shadowed = true;
            break;
          }
        }
        if (!shadowed) {
          for (let k = 0; k < treeShadows.length; k++) {
            const ts = treeShadows[k];
            const ddx = cx - ts.cx;
            const ddy = cy - ts.cy;
            if (ddx * ddx + ddy * ddy <= ts.r2) {
              shadowed = true;
              break;
            }
          }
        }
        if (!shadowed) {
          const idx = j * cellsX + i;
          sunMinutes[idx] += STEP_MINUTES;
          monthArr[idx] += STEP_MINUTES;
        }
      }
    }
  }

  const totalDaysSampled = Math.max(1, totalDays.size);
  const hoursPerDay = new Float32Array(cellCount);
  for (let i = 0; i < cellCount; i++) {
    hoursPerDay[i] = sunMinutes[i] / (totalDaysSampled * 60);
  }

  const monthly: MonthlyBreakdown[] = [];
  const monthIndices = Object.keys(monthSunMinutes)
    .map((k) => parseInt(k))
    .sort((a, b) => a - b);
  for (const m of monthIndices) {
    const days = Math.max(1, monthDays[m].size);
    const arr = monthSunMinutes[m];
    const out = new Float32Array(cellCount);
    for (let i = 0; i < cellCount; i++) {
      out[i] = arr[i] / (days * 60);
    }
    monthly.push({
      monthIndex: m,
      daysSampled: days,
      hoursPerDay: out,
    });
  }

  return {
    bounds,
    cellsX,
    cellsY,
    hoursPerDay,
    daysSampled: totalDays.size,
    monthly,
  };
}
