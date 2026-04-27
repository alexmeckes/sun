import SunCalc from 'suncalc';

export type SunSample = {
  date: Date;
  azimuthRad: number; // 0 = north, clockwise (we adjust SunCalc's convention)
  altitudeRad: number; // above horizon
};

// SunCalc returns azimuth measured from south, clockwise (so south=0, west=PI/2).
// We convert to "from north, clockwise" so that:
//   north = 0, east = PI/2, south = PI, west = 3*PI/2
// matching standard compass bearings used in shadowOffset().
function toCompassAzimuth(suncalcAz: number): number {
  let a = suncalcAz + Math.PI; // south=0 -> north=0 after +PI
  a = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return a;
}

export function sunAt(date: Date, lat: number, lng: number): SunSample {
  const p = SunCalc.getPosition(date, lat, lng);
  return {
    date,
    azimuthRad: toCompassAzimuth(p.azimuth),
    altitudeRad: p.altitude,
  };
}

// Build a list of sample timestamps across a date range.
// Samples one representative day every `dayStrideDays` days, every `stepMinutes` from sunrise to sunset.
export function buildSamples(
  startDate: Date,
  endDate: Date,
  lat: number,
  lng: number,
  dayStrideDays: number,
  stepMinutes: number,
): SunSample[] {
  const samples: SunSample[] = [];
  const oneDay = 24 * 60 * 60 * 1000;
  for (let t = startDate.getTime(); t <= endDate.getTime(); t += dayStrideDays * oneDay) {
    const day = new Date(t);
    const times = SunCalc.getTimes(day, lat, lng);
    const sunrise = times.sunrise;
    const sunset = times.sunset;
    if (!sunrise || !sunset || isNaN(sunrise.getTime()) || isNaN(sunset.getTime())) continue;
    for (let m = sunrise.getTime(); m <= sunset.getTime(); m += stepMinutes * 60 * 1000) {
      samples.push(sunAt(new Date(m), lat, lng));
    }
  }
  return samples;
}

// Default growing season for a given latitude (very rough, US-centric for now).
export function defaultGrowingSeason(lat: number, year: number): { start: Date; end: Date } {
  // Northern hemisphere: May–Sept; Southern: Nov–Mar (skipping year boundary nuance).
  if (lat >= 0) {
    return { start: new Date(year, 4, 1), end: new Date(year, 8, 30) };
  }
  return { start: new Date(year, 10, 1), end: new Date(year + 1, 2, 31) };
}
