# Sun

A web app that simulates sun exposure across a yard over a growing season. Type an address, place obstacles (buildings auto-load from OpenStreetMap; tap to add trees), drop plant markers for blueberries / grapes / tomatoes / etc., and get a per-spot verdict on whether the sun-hours support that crop — including a monthly breakdown for diagnosing fruiting timing.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Falexmeckes%2Fsun)

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Deploy on Vercel

1. Click the **Deploy with Vercel** button above (or visit [vercel.com/new](https://vercel.com/new) and import this repo).
2. No environment variables are required.
3. Vercel auto-detects Vite; build command is `npm run build`, output directory is `dist`.

The included `vercel.json` pins the framework and adds long-cache headers for hashed assets.

## How it works

- **Address geocoding** — [Nominatim](https://nominatim.org) (OpenStreetMap)
- **Satellite imagery** — [Esri World Imagery](https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9)
- **Building footprints** — [OpenStreetMap](https://www.openstreetmap.org/) via the Overpass API
- **Sun position** — [SunCalc](https://github.com/mourner/suncalc)
- **Simulation** — Web Worker projects shadows from buildings + tree canopies every 30 minutes on representative days across the growing season; per-cell sun-hours are bucketed by month so plant markers can show seasonal variation, not just the season average.

## Caveats

- OSM building heights default to one story (3 m) when missing — adjust tall buildings manually by clicking them.
- Tree canopies are treated as opaque circles; deciduous leaf-out timing isn't modeled.
- Ground is assumed flat.

## License

MIT
