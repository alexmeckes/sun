import type { Building, Mode, Plant, SimResult, SpeciesId, Tree } from '../types';
import { SPECIES, SPECIES_LIST, verdict } from '../lib/species';
import { lookupHours } from '../lib/lookup';

type Props = {
  mode: Mode;
  setMode: (m: Mode) => void;
  buildings: Building[];
  trees: Tree[];
  plants: Plant[];
  simResult: SimResult | null;
  isSimulating: boolean;
  startMonth: number;
  endMonth: number;
  setStartMonth: (m: number) => void;
  setEndMonth: (m: number) => void;
  hasYard: boolean;
  showHeatmap: boolean;
  setShowHeatmap: (v: boolean) => void;
  showShadows: boolean;
  setShowShadows: (v: boolean) => void;
  placingSpecies: SpeciesId;
  setPlacingSpecies: (s: SpeciesId) => void;
  onUpdatePlant: (id: string, patch: Partial<Plant>) => void;
  onDeletePlant: (id: string) => void;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function Sidebar(props: Props) {
  const {
    mode,
    setMode,
    buildings,
    trees,
    plants,
    simResult,
    isSimulating,
    startMonth,
    endMonth,
    setStartMonth,
    setEndMonth,
    hasYard,
    showHeatmap,
    setShowHeatmap,
    showShadows,
    setShowShadows,
    placingSpecies,
    setPlacingSpecies,
    onDeletePlant,
  } = props;

  const togglePlantMode = (species: SpeciesId) => {
    if (mode === 'place-plant' && placingSpecies === species) {
      setMode('idle');
    } else {
      setPlacingSpecies(species);
      setMode('place-plant');
    }
  };

  return (
    <aside className="sidebar">
      <h2>Sun exposure</h2>

      {!hasYard && (
        <p className="hint">
          Type an address above to start. Then drag the dashed corners to adjust the analysis area.
        </p>
      )}

      {hasYard && (
        <>
          <section>
            <h3>Step 1 — Add obstacles</h3>
            <button
              className={mode === 'place-tree' ? 'active' : ''}
              onClick={() => setMode(mode === 'place-tree' ? 'idle' : 'place-tree')}
            >
              {mode === 'place-tree' ? '✕ Cancel' : '+ Tap to place trees'}
            </button>
            <p className="hint">
              {mode === 'place-tree'
                ? 'Click anywhere on the map to drop a tree. Click the tree to tweak height & canopy.'
                : 'Buildings load automatically. Click a tree or building to edit.'}
            </p>
          </section>

          <section>
            <h3>Step 2 — Place plants</h3>
            <p className="hint" style={{ marginBottom: 8 }}>
              Drop markers where plants are growing (or where you'd like to plant). Each shows
              sun-hours and a verdict for that species.
            </p>
            <div className="species-grid">
              {SPECIES_LIST.map((s) => (
                <button
                  key={s.id}
                  className={`species-btn ${
                    mode === 'place-plant' && placingSpecies === s.id ? 'active' : ''
                  }`}
                  onClick={() => togglePlantMode(s.id)}
                  title={s.notes}
                >
                  <span className="species-emoji">{s.emoji}</span>
                  <span className="species-name">{s.name}</span>
                  <span className="species-thresh">{s.idealHours}h+</span>
                </button>
              ))}
            </div>
            {mode === 'place-plant' && (
              <p className="hint">
                Click on the map to drop a {SPECIES[placingSpecies].name.toLowerCase()} marker.
              </p>
            )}
          </section>

          {plants.length > 0 && (
            <section>
              <h3>My plants</h3>
              <ul className="plant-list">
                {plants.map((p) => {
                  const sp = SPECIES[p.species];
                  const hours = simResult ? lookupHours(simResult, p.pos) : null;
                  const v = hours !== null ? verdict(sp, hours) : null;
                  return (
                    <li key={p.id} className="plant-li">
                      <div className="plant-li-row">
                        <span className="plant-emoji">{sp.emoji}</span>
                        <span className="plant-name">{p.label}</span>
                        <button
                          className="plant-delete"
                          onClick={() => onDeletePlant(p.id)}
                          aria-label="Delete"
                        >
                          ×
                        </button>
                      </div>
                      {hours !== null && v && (
                        <div className="plant-li-row">
                          <span className="plant-hours">{hours.toFixed(1)} h</span>
                          <span className="plant-verdict" style={{ color: v.color }}>
                            {v.label}
                          </span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section>
            <h3>Growing season</h3>
            <div className="row">
              <label>
                From{' '}
                <select value={startMonth} onChange={(e) => setStartMonth(parseInt(e.target.value))}>
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                To{' '}
                <select value={endMonth} onChange={(e) => setEndMonth(parseInt(e.target.value))}>
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section>
            <h3>Layers</h3>
            <label className="toggle">
              <input
                type="checkbox"
                checked={showHeatmap}
                onChange={(e) => setShowHeatmap(e.target.checked)}
              />
              <span>Sun-hours heatmap (season average)</span>
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={showShadows}
                onChange={(e) => setShowShadows(e.target.checked)}
              />
              <span>Live shadows (scrubber time)</span>
            </label>
          </section>

          <section>
            <h3>Heatmap legend</h3>
            <Legend />
            {isSimulating && <p className="hint">Recomputing…</p>}
            {simResult && !isSimulating && (
              <p className="hint">
                Averaged over {simResult.daysSampled} sample day
                {simResult.daysSampled === 1 ? '' : 's'}. Hover the map for exact hours.
              </p>
            )}
          </section>

          <section>
            <h3>Inventory</h3>
            <p className="hint">
              {buildings.length} building{buildings.length === 1 ? '' : 's'} ·{' '}
              {trees.length} tree{trees.length === 1 ? '' : 's'} ·{' '}
              {plants.length} plant{plants.length === 1 ? '' : 's'}
            </p>
          </section>
        </>
      )}

      <footer>
        <p className="footnote">
          Buildings: OpenStreetMap · Imagery: Esri · Sun: SunCalc
        </p>
      </footer>
    </aside>
  );
}

function Legend() {
  const stops = [
    { hours: '0-2h', label: 'Deep shade', color: '#160e46' },
    { hours: '2-4h', label: 'Partial shade', color: '#5e2a93' },
    { hours: '4-6h', label: 'Partial sun', color: '#cf6028' },
    { hours: '6h+', label: 'Full sun', color: '#fde74c' },
  ];
  return (
    <div className="legend">
      {stops.map((s) => (
        <div key={s.hours} className="legend-row">
          <span className="swatch" style={{ background: s.color }} />
          <span className="legend-hours">{s.hours}</span>
          <span className="legend-label">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
