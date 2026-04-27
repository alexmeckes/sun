import type { LatLng } from '../types';

export type GeocodeResult = {
  pos: LatLng;
  displayName: string;
};

export async function geocode(query: string): Promise<GeocodeResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      'Accept-Language': 'en',
    },
  });
  if (!res.ok) throw new Error(`Geocode failed: ${res.status}`);
  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  if (!data.length) return null;
  const hit = data[0];
  return {
    pos: { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) },
    displayName: hit.display_name,
  };
}
