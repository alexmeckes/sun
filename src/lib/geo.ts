import type { LatLng, Bounds } from '../types';

// Local ENU (East-North-Up in meters) projection around an origin lat/lng.
// Good for areas <~1km, which is plenty for a yard.
export function metersPerDegLat(): number {
  return 111320;
}

export function metersPerDegLng(latDeg: number): number {
  return 111320 * Math.cos((latDeg * Math.PI) / 180);
}

export type LocalFrame = {
  origin: LatLng;
  mPerLat: number;
  mPerLng: number;
};

export function makeFrame(origin: LatLng): LocalFrame {
  return {
    origin,
    mPerLat: metersPerDegLat(),
    mPerLng: metersPerDegLng(origin.lat),
  };
}

export function toMeters(p: LatLng, f: LocalFrame): { x: number; y: number } {
  return {
    x: (p.lng - f.origin.lng) * f.mPerLng,
    y: (p.lat - f.origin.lat) * f.mPerLat,
  };
}

export function fromMeters(x: number, y: number, f: LocalFrame): LatLng {
  return {
    lat: f.origin.lat + y / f.mPerLat,
    lng: f.origin.lng + x / f.mPerLng,
  };
}

// Build a default analysis square around a center, sideMeters wide.
export function squareBounds(center: LatLng, sideMeters: number): Bounds {
  const half = sideMeters / 2;
  const dLat = half / metersPerDegLat();
  const dLng = half / metersPerDegLng(center.lat);
  return {
    sw: { lat: center.lat - dLat, lng: center.lng - dLng },
    ne: { lat: center.lat + dLat, lng: center.lng + dLng },
  };
}

export function boundsCenter(b: Bounds): LatLng {
  return {
    lat: (b.sw.lat + b.ne.lat) / 2,
    lng: (b.sw.lng + b.ne.lng) / 2,
  };
}
