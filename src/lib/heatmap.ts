import type { SimResult } from '../types';

// Map sun-hours/day to an RGBA color.
// Below 2h: deep shade; 2-4h: partial shade; 4-6h: partial sun; 6+: full sun.
function color(h: number): [number, number, number, number] {
  // Smooth gradient approximating an inferno-ish colormap, capped at 12h.
  const t = Math.max(0, Math.min(1, h / 10));
  // Stops: 0 indigo, .25 magenta, .55 orange, 1 yellow.
  const stops: Array<[number, [number, number, number]]> = [
    [0.0, [22, 14, 70]],
    [0.25, [120, 28, 109]],
    [0.55, [237, 105, 37]],
    [1.0, [253, 231, 76]],
  ];
  let r = stops[0][1][0],
    g = stops[0][1][1],
    b = stops[0][1][2];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (t >= t0 && t <= t1) {
      const k = (t - t0) / (t1 - t0);
      r = Math.round(c0[0] + (c1[0] - c0[0]) * k);
      g = Math.round(c0[1] + (c1[1] - c0[1]) * k);
      b = Math.round(c0[2] + (c1[2] - c0[2]) * k);
      break;
    }
  }
  return [r, g, b, 200];
}

export function renderHeatmap(result: SimResult): string {
  const { cellsX, cellsY, hoursPerDay } = result;
  const canvas = document.createElement('canvas');
  canvas.width = cellsX;
  canvas.height = cellsY;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D context');
  const img = ctx.createImageData(cellsX, cellsY);

  // Image rows go top-to-bottom (north to south); grid rows go bottom-to-top.
  for (let j = 0; j < cellsY; j++) {
    const imgRow = cellsY - 1 - j;
    for (let i = 0; i < cellsX; i++) {
      const v = hoursPerDay[j * cellsX + i];
      const [r, g, b, a] = color(v);
      const idx = (imgRow * cellsX + i) * 4;
      img.data[idx] = r;
      img.data[idx + 1] = g;
      img.data[idx + 2] = b;
      img.data[idx + 3] = a;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}
