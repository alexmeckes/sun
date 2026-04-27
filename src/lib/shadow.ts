// Shadow geometry in local meter coordinates.
// All inputs/outputs are in flat 2D ENU meters (x = east, y = north).

export type Vec2 = { x: number; y: number };

// Given sun azimuth (radians, 0 = north, clockwise) and altitude (radians above horizon),
// return the 2D offset on the ground for an object of height h.
// Sun comes FROM the azimuth; shadow falls in the opposite direction.
export function shadowOffset(azimuthRad: number, altitudeRad: number, heightM: number): Vec2 {
  if (altitudeRad <= 0) return { x: 0, y: 0 };
  const len = heightM / Math.tan(altitudeRad);
  return {
    x: -Math.sin(azimuthRad) * len,
    y: -Math.cos(azimuthRad) * len,
  };
}

// Convex hull (Andrew's monotone chain) of a list of 2D points.
export function convexHull(points: Vec2[]): Vec2[] {
  if (points.length < 3) return points.slice();
  const pts = points.slice().sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  const cross = (o: Vec2, a: Vec2, b: Vec2) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower: Vec2[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: Vec2[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

// Build the shadow polygon for an extruded vertical prism (e.g. a building).
// Returns convex hull of the footprint + the footprint translated by the shadow offset.
export function buildingShadow(footprint: Vec2[], offset: Vec2): Vec2[] {
  const all: Vec2[] = [];
  for (const p of footprint) all.push(p);
  for (const p of footprint) all.push({ x: p.x + offset.x, y: p.y + offset.y });
  return convexHull(all);
}

// Point-in-convex-polygon test (assumes vertices in CCW or CW order, consistent winding).
export function pointInConvex(px: number, py: number, poly: Vec2[]): boolean {
  if (poly.length < 3) return false;
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const cross = (b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x);
    if (cross !== 0) {
      const s = cross > 0 ? 1 : -1;
      if (sign === 0) sign = s;
      else if (sign !== s) return false;
    }
  }
  return true;
}

// Axis-aligned bounding box of a polygon, useful as a fast reject.
export function bbox(poly: Vec2[]): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const p of poly) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY };
}

// Tree shadow: a circle (canopy) projected. We approximate with a circle at the
// projected center, radius equal to canopy radius. Center height is taken as
// (treeHeight - radius), so canopy hangs just below the top.
export function treeShadow(
  trunkXY: Vec2,
  radiusM: number,
  heightM: number,
  azimuthRad: number,
  altitudeRad: number,
): { cx: number; cy: number; r: number } | null {
  if (altitudeRad <= 0) return null;
  const centerH = Math.max(radiusM, heightM - radiusM);
  const off = shadowOffset(azimuthRad, altitudeRad, centerH);
  return {
    cx: trunkXY.x + off.x,
    cy: trunkXY.y + off.y,
    r: radiusM,
  };
}
