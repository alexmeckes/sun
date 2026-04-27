import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AddressBar } from './components/AddressBar';
import { MapView } from './components/MapView';
import { Sidebar } from './components/Sidebar';
import { Welcome } from './components/Welcome';
import { TimeScrubber } from './components/TimeScrubber';
import { SunCompass } from './components/SunCompass';
import { fetchBuildings } from './lib/osm';
import { geocode } from './lib/geocode';
import { squareBounds } from './lib/geo';
import { defaultGrowingSeason } from './lib/solar';
import { SPECIES } from './lib/species';
import type {
  Bounds,
  Building,
  LatLng,
  Mode,
  Plant,
  SimInput,
  SimResult,
  SpeciesId,
  Tree,
} from './types';
import SimWorker from './workers/sim.worker?worker';
import './App.css';

const ANALYSIS_SIDE_M = 40;
const CELLS_PER_SIDE = 60;

function defaultPreviewTime(): Date {
  const d = new Date();
  d.setSeconds(0, 0);
  return d;
}

export default function App() {
  const [center, setCenter] = useState<LatLng | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [trees, setTrees] = useState<Tree[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [mode, setMode] = useState<Mode>('idle');
  const [placingSpecies, setPlacingSpecies] = useState<SpeciesId>('blueberry');
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewTime, setPreviewTime] = useState<Date>(defaultPreviewTime);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showShadows, setShowShadows] = useState(true);

  const initialSeason = useMemo(
    () => defaultGrowingSeason(center?.lat ?? 40, new Date().getFullYear()),
    [center?.lat],
  );
  const [startMonth, setStartMonth] = useState(initialSeason.start.getMonth());
  const [endMonth, setEndMonth] = useState(initialSeason.end.getMonth());

  useEffect(() => {
    if (!center) return;
    const s = defaultGrowingSeason(center.lat, new Date().getFullYear());
    setStartMonth(s.start.getMonth());
    setEndMonth(s.end.getMonth());
  }, [center?.lat]);

  const workerRef = useRef<Worker | null>(null);
  const simTokenRef = useRef(0);
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    setIsLoadingAddress(true);
    setError(null);
    try {
      const hit = await geocode(query);
      if (!hit) {
        setError('No results for that address.');
        return;
      }
      setCenter(hit.pos);
      setDisplayName(hit.displayName);
      const b = squareBounds(hit.pos, ANALYSIS_SIDE_M);
      setBounds(b);
      setTrees([]);
      setPlants([]);
      setSimResult(null);
      try {
        const bs = await fetchBuildings(b);
        setBuildings(bs);
      } catch (e) {
        console.error(e);
        setBuildings([]);
        setError('Buildings could not be loaded — you can still simulate without them.');
      }
    } catch (e) {
      console.error(e);
      setError('Address lookup failed.');
    } finally {
      setIsLoadingAddress(false);
    }
  }, []);

  const handleBoundsChange = useCallback((b: Bounds) => {
    setBounds(b);
  }, []);

  const lastFetchedBoundsRef = useRef<Bounds | null>(null);
  useEffect(() => {
    if (!bounds || !center) return;
    if (lastFetchedBoundsRef.current === bounds) return;
    const id = setTimeout(() => {
      lastFetchedBoundsRef.current = bounds;
      fetchBuildings(bounds)
        .then((bs) => setBuildings(bs))
        .catch((e) => console.error('Overpass refresh failed', e));
    }, 700);
    return () => clearTimeout(id);
  }, [bounds, center]);

  const handlePlaceTree = useCallback((pos: LatLng) => {
    const id = `tree-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setTrees((prev) => [...prev, { id, pos, radiusM: 4, heightM: 6 }]);
  }, []);

  const handleUpdateTree = useCallback((id: string, patch: Partial<Tree>) => {
    setTrees((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const handleDeleteTree = useCallback((id: string) => {
    setTrees((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handlePlacePlant = useCallback(
    (pos: LatLng) => {
      const id = `plant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const sp = SPECIES[placingSpecies];
      setPlants((prev) => [
        ...prev,
        { id, pos, species: placingSpecies, label: sp.name },
      ]);
    },
    [placingSpecies],
  );

  const handleUpdatePlant = useCallback((id: string, patch: Partial<Plant>) => {
    setPlants((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const handleDeletePlant = useCallback((id: string) => {
    setPlants((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleUpdateBuilding = useCallback((id: string, patch: Partial<Building>) => {
    setBuildings((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }, []);

  const handleDeleteBuilding = useCallback((id: string) => {
    setBuildings((prev) => prev.filter((b) => b.id !== id));
  }, []);

  useEffect(() => {
    if (!center || !bounds) return;
    const id = setTimeout(() => {
      const token = ++simTokenRef.current;
      if (!workerRef.current) {
        workerRef.current = new SimWorker();
      }
      const worker = workerRef.current;
      const onMessage = (e: MessageEvent<SimResult>) => {
        if (token !== simTokenRef.current) return;
        setSimResult(e.data);
        setIsSimulating(false);
        worker.removeEventListener('message', onMessage);
      };
      worker.addEventListener('message', onMessage);
      const input: SimInput = {
        center,
        bounds,
        buildings,
        trees,
        startMonth,
        endMonth,
        cellsPerSide: CELLS_PER_SIDE,
      };
      setIsSimulating(true);
      worker.postMessage(input);
    }, 300);
    return () => clearTimeout(id);
  }, [center, bounds, buildings, trees, startMonth, endMonth]);

  const handleResetTime = useCallback(() => setPreviewTime(defaultPreviewTime()), []);

  return (
    <div className="app">
      <header className="topbar">
        <AddressBar onSearch={handleSearch} loading={isLoadingAddress} />
        {displayName && <span className="addr-display">{displayName}</span>}
        {error && <span className="error">{error}</span>}
      </header>
      <div className="body">
        <div className="map-wrap">
          <MapView
            center={center}
            bounds={bounds}
            buildings={buildings}
            trees={trees}
            plants={plants}
            mode={mode}
            simResult={simResult}
            showHeatmap={showHeatmap}
            showShadows={showShadows}
            previewTime={previewTime}
            onBoundsChange={handleBoundsChange}
            onPlaceTree={handlePlaceTree}
            onPlacePlant={handlePlacePlant}
            onUpdateTree={handleUpdateTree}
            onDeleteTree={handleDeleteTree}
            onUpdatePlant={handleUpdatePlant}
            onDeletePlant={handleDeletePlant}
            onUpdateBuilding={handleUpdateBuilding}
            onDeleteBuilding={handleDeleteBuilding}
          />

          {!center && <Welcome />}

          {center && (
            <>
              <div className="map-overlay corner-tl">
                <SunCompass center={center} time={previewTime} />
              </div>
              <div className="map-overlay corner-bottom">
                <TimeScrubber
                  time={previewTime}
                  setTime={setPreviewTime}
                  onResetToNow={handleResetTime}
                />
              </div>
              {isSimulating && (
                <div className="map-overlay corner-tr sim-pill">Simulating…</div>
              )}
            </>
          )}
        </div>
        <Sidebar
          mode={mode}
          setMode={setMode}
          buildings={buildings}
          trees={trees}
          plants={plants}
          simResult={simResult}
          isSimulating={isSimulating}
          startMonth={startMonth}
          endMonth={endMonth}
          setStartMonth={setStartMonth}
          setEndMonth={setEndMonth}
          hasYard={bounds !== null}
          showHeatmap={showHeatmap}
          setShowHeatmap={setShowHeatmap}
          showShadows={showShadows}
          setShowShadows={setShowShadows}
          placingSpecies={placingSpecies}
          setPlacingSpecies={setPlacingSpecies}
          onUpdatePlant={handleUpdatePlant}
          onDeletePlant={handleDeletePlant}
        />
      </div>
    </div>
  );
}
