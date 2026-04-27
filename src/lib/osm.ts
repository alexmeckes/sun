import type { Bounds, Building, LatLng } from '../types';

type OverpassWay = {
  type: 'way';
  id: number;
  geometry?: Array<{ lat: number; lon: number }>;
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements: OverpassWay[];
};

const ENDPOINT = 'https://overpass-api.de/api/interpreter';

export async function fetchBuildings(b: Bounds): Promise<Building[]> {
  const bbox = `${b.sw.lat},${b.sw.lng},${b.ne.lat},${b.ne.lng}`;
  const query = `[out:json][timeout:25];way["building"](${bbox});out geom;`;
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`Overpass failed: ${res.status}`);
  const data = (await res.json()) as OverpassResponse;
  const out: Building[] = [];
  for (const el of data.elements) {
    if (el.type !== 'way' || !el.geometry || el.geometry.length < 3) continue;
    const polygon: LatLng[] = el.geometry.map((g) => ({ lat: g.lat, lng: g.lon }));
    out.push({
      id: `osm-${el.id}`,
      polygon,
      heightM: inferHeight(el.tags),
    });
  }
  return out;
}

function inferHeight(tags: Record<string, string> | undefined): number {
  if (!tags) return 3;
  if (tags.height) {
    const n = parseFloat(tags.height);
    if (!isNaN(n)) return n;
  }
  if (tags['building:levels']) {
    const n = parseFloat(tags['building:levels']);
    if (!isNaN(n)) return n * 3;
  }
  return 3; // single story default
}
