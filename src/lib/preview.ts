import type { Building, LatLng, Tree } from '../types';
import { fromMeters, makeFrame, toMeters } from './geo';
import {
  buildingShadow,
  shadowOffset,
  treeShadow,
  type Vec2,
} from './shadow';
import { sunAt, type SunSample } from './solar';

export type PreviewShadows = {
  sun: SunSample;
  buildingShadows: LatLng[][];
  treeShadows: { center: LatLng; r: number }[];
  belowHorizon: boolean;
};

export function computePreview(
  time: Date,
  center: LatLng,
  buildings: Building[],
  trees: Tree[],
): PreviewShadows {
  const sun = sunAt(time, center.lat, center.lng);
  if (sun.altitudeRad <= 0) {
    return { sun, buildingShadows: [], treeShadows: [], belowHorizon: true };
  }
  const frame = makeFrame(center);
  const buildingShadows: LatLng[][] = buildings.map((b) => {
    const offM = shadowOffset(sun.azimuthRad, sun.altitudeRad, b.heightM);
    const footprintM: Vec2[] = b.polygon.map((p) => toMeters(p, frame));
    const shadowM = buildingShadow(footprintM, offM);
    return shadowM.map((p) => fromMeters(p.x, p.y, frame));
  });
  const treeShadows: { center: LatLng; r: number }[] = [];
  for (const t of trees) {
    const trunkM = toMeters(t.pos, frame);
    const ts = treeShadow(trunkM, t.radiusM, t.heightM, sun.azimuthRad, sun.altitudeRad);
    if (ts) {
      treeShadows.push({
        center: fromMeters(ts.cx, ts.cy, frame),
        r: ts.r,
      });
    }
  }
  return { sun, buildingShadows, treeShadows, belowHorizon: false };
}

export function radToDeg(r: number): number {
  return (r * 180) / Math.PI;
}
