import { useMemo } from 'react';
import type { LatLng } from '../types';
import { buildSamples, sunAt } from '../lib/solar';
import { radToDeg } from '../lib/preview';

type Props = {
  center: LatLng;
  time: Date;
};

const SIZE = 130;
const PAD = 10;
const R = SIZE / 2 - PAD;
const CX = SIZE / 2;
const CY = SIZE / 2;

// Project sun (azimuth, altitude) to compass coordinates.
// Altitude 0 → edge of circle; altitude 90° → center.
function project(azRad: number, altRad: number): { x: number; y: number } {
  const r = (1 - Math.max(0, altRad) / (Math.PI / 2)) * R;
  return {
    x: CX + r * Math.sin(azRad),
    y: CY - r * Math.cos(azRad),
  };
}

export function SunCompass({ center, time }: Props) {
  const todayPath = useMemo(() => sunPathForDay(time, center), [time, center]);
  const summerPath = useMemo(() => {
    const d = new Date(time.getFullYear(), 5, 21);
    return sunPathForDay(d, center);
  }, [time, center]);
  const winterPath = useMemo(() => {
    const d = new Date(time.getFullYear(), 11, 21);
    return sunPathForDay(d, center);
  }, [time, center]);

  const sun = sunAt(time, center.lat, center.lng);
  const above = sun.altitudeRad > 0;
  const sunPos = above ? project(sun.azimuthRad, sun.altitudeRad) : null;

  return (
    <div className="sun-compass">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle cx={CX} cy={CY} r={R} className="compass-bg" />
        <line x1={CX} y1={PAD} x2={CX} y2={SIZE - PAD} className="compass-axis" />
        <line x1={PAD} y1={CY} x2={SIZE - PAD} y2={CY} className="compass-axis" />

        <polyline points={pathPoints(summerPath)} className="path summer" />
        <polyline points={pathPoints(winterPath)} className="path winter" />
        <polyline points={pathPoints(todayPath)} className="path today" />

        {sunPos && <circle cx={sunPos.x} cy={sunPos.y} r={5} className="sun-dot" />}

        <text x={CX} y={PAD + 2} className="lbl">N</text>
        <text x={CX} y={SIZE - PAD + 8} className="lbl">S</text>
        <text x={SIZE - PAD + 8} y={CY + 4} className="lbl">E</text>
        <text x={PAD - 2} y={CY + 4} className="lbl" textAnchor="end">W</text>
      </svg>
      <div className="compass-readout">
        {above ? (
          <>
            <div>
              <span className="readout-num">{radToDeg(sun.azimuthRad).toFixed(0)}°</span>
              <span className="readout-label">azimuth</span>
            </div>
            <div>
              <span className="readout-num">{radToDeg(sun.altitudeRad).toFixed(0)}°</span>
              <span className="readout-label">altitude</span>
            </div>
          </>
        ) : (
          <div className="below-horizon">Sun below horizon</div>
        )}
      </div>
    </div>
  );
}

function sunPathForDay(day: Date, center: LatLng): Array<{ x: number; y: number }> {
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const end = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
  const samples = buildSamples(start, end, center.lat, center.lng, 1, 15);
  return samples
    .filter((s) => s.altitudeRad > 0)
    .map((s) => project(s.azimuthRad, s.altitudeRad));
}

function pathPoints(pts: Array<{ x: number; y: number }>): string {
  return pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}
