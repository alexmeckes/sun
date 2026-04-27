import L from 'leaflet';
import { Marker, Popup, Tooltip } from 'react-leaflet';
import type { Plant, SimResult, SpeciesId } from '../types';
import { SPECIES, SPECIES_LIST, verdict } from '../lib/species';
import { lookupHours, lookupMonthly } from '../lib/lookup';
import { MonthlyChart } from './MonthlyChart';

type Props = {
  plant: Plant;
  simResult: SimResult | null;
  onUpdate: (patch: Partial<Plant>) => void;
  onDelete: () => void;
};

function plantIcon(species: SpeciesId): L.DivIcon {
  const sp = SPECIES[species];
  return L.divIcon({
    className: 'plant-marker',
    html: `<span>${sp.emoji}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

export function PlantMarker({ plant, simResult, onUpdate, onDelete }: Props) {
  const sp = SPECIES[plant.species];
  const hours = simResult ? lookupHours(simResult, plant.pos) : null;
  const v = hours !== null ? verdict(sp, hours) : null;
  const monthly = simResult ? lookupMonthly(simResult, plant.pos) : [];

  return (
    <Marker position={[plant.pos.lat, plant.pos.lng]} icon={plantIcon(plant.species)}>
      <Tooltip direction="top" offset={[0, -12]} opacity={0.95}>
        <div className="map-tooltip-inner">
          <strong>
            {sp.emoji} {plant.label}
          </strong>
          {hours !== null && v && (
            <span className="hint-small" style={{ color: v.color }}>
              {hours.toFixed(1)} h/day · {v.label}
            </span>
          )}
        </div>
      </Tooltip>
      <Popup minWidth={240}>
        <div className="popup plant-popup">
          <input
            type="text"
            className="plant-label"
            value={plant.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
          />
          <label>
            Species
            <select
              value={plant.species}
              onChange={(e) => onUpdate({ species: e.target.value as SpeciesId })}
            >
              {SPECIES_LIST.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.emoji} {s.name}
                </option>
              ))}
            </select>
          </label>
          {hours !== null && v && (
            <div className="verdict" style={{ borderColor: v.color }}>
              <div className="verdict-row">
                <span className="verdict-num">{hours.toFixed(1)} h/day</span>
                <span className="verdict-label" style={{ color: v.color }}>
                  {v.label}
                </span>
              </div>
              <p className="hint-small">{sp.notes}</p>
            </div>
          )}
          {monthly.length > 0 && (
            <>
              <div className="chart-title">Sun by month (hours/day)</div>
              <MonthlyChart
                data={monthly}
                minHours={sp.minHours}
                idealHours={sp.idealHours}
              />
            </>
          )}
          <button onClick={onDelete}>Delete plant</button>
        </div>
      </Popup>
    </Marker>
  );
}
