import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Circle,
  ImageOverlay,
  MapContainer,
  Marker,
  Polygon,
  Popup,
  Rectangle,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import type { Bounds, Building, LatLng, Mode, Plant, SimResult, Tree } from '../types';
import { renderHeatmap } from '../lib/heatmap';
import { computePreview } from '../lib/preview';
import { PlantMarker } from './PlantMarker';

import 'leaflet/dist/leaflet.css';

const TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const TILE_ATTRIB =
  'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community';

const handleIcon = L.divIcon({
  className: 'corner-handle',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const treeIcon = L.divIcon({
  className: 'tree-marker',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const pinIcon = L.divIcon({
  className: 'addr-pin',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const placeCursorIcon = L.divIcon({
  className: 'place-cursor',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

type Props = {
  center: LatLng | null;
  bounds: Bounds | null;
  buildings: Building[];
  trees: Tree[];
  plants: Plant[];
  mode: Mode;
  simResult: SimResult | null;
  showHeatmap: boolean;
  showShadows: boolean;
  previewTime: Date;
  onBoundsChange: (b: Bounds) => void;
  onPlaceTree: (pos: LatLng) => void;
  onPlacePlant: (pos: LatLng) => void;
  onUpdateTree: (id: string, patch: Partial<Tree>) => void;
  onDeleteTree: (id: string) => void;
  onUpdatePlant: (id: string, patch: Partial<Plant>) => void;
  onDeletePlant: (id: string) => void;
  onUpdateBuilding: (id: string, patch: Partial<Building>) => void;
  onDeleteBuilding: (id: string) => void;
};

function FlyTo({ pos }: { pos: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.flyTo([pos.lat, pos.lng], 19, { duration: 0.6 });
  }, [pos, map]);
  return null;
}

function ClickHandler({
  mode,
  onPlaceTree,
  onPlacePlant,
}: {
  mode: Mode;
  onPlaceTree: (p: LatLng) => void;
  onPlacePlant: (p: LatLng) => void;
}) {
  useMapEvents({
    click: (e) => {
      const pos = { lat: e.latlng.lat, lng: e.latlng.lng };
      if (mode === 'place-tree') onPlaceTree(pos);
      else if (mode === 'place-plant') onPlacePlant(pos);
    },
  });
  return null;
}

function CursorLock({ mode }: { mode: Mode }) {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const placing = mode === 'place-tree' || mode === 'place-plant';
    el.style.cursor = placing ? 'crosshair' : '';
    return () => {
      el.style.cursor = '';
    };
  }, [map, mode]);
  return null;
}

function PlaceCursor({ mode }: { mode: Mode }) {
  const [pos, setPos] = useState<LatLng | null>(null);
  useMapEvents({
    mousemove: (e) => setPos({ lat: e.latlng.lat, lng: e.latlng.lng }),
    mouseout: () => setPos(null),
  });
  const placing = mode === 'place-tree' || mode === 'place-plant';
  if (!placing || !pos) return null;
  if (mode === 'place-tree') {
    return (
      <>
        <Circle
          center={[pos.lat, pos.lng]}
          radius={4}
          pathOptions={{
            color: '#4caf50',
            weight: 2,
            dashArray: '4 4',
            fill: false,
          }}
          interactive={false}
        />
        <Marker position={[pos.lat, pos.lng]} icon={placeCursorIcon} interactive={false} />
      </>
    );
  }
  // place-plant: small pin
  return <Marker position={[pos.lat, pos.lng]} icon={placeCursorIcon} interactive={false} />;
}

function HeatmapHover({
  simResult,
  onHover,
}: {
  simResult: SimResult | null;
  onHover: (info: { x: number; y: number; hours: number } | null) => void;
}) {
  const map = useMap();
  useMapEvents({
    mousemove: (e) => {
      if (!simResult) {
        onHover(null);
        return;
      }
      const { bounds, cellsX, cellsY, hoursPerDay } = simResult;
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      if (
        lat < bounds.sw.lat ||
        lat > bounds.ne.lat ||
        lng < bounds.sw.lng ||
        lng > bounds.ne.lng
      ) {
        onHover(null);
        return;
      }
      const fx = (lng - bounds.sw.lng) / (bounds.ne.lng - bounds.sw.lng);
      const fy = (lat - bounds.sw.lat) / (bounds.ne.lat - bounds.sw.lat);
      const i = Math.min(cellsX - 1, Math.max(0, Math.floor(fx * cellsX)));
      const j = Math.min(cellsY - 1, Math.max(0, Math.floor(fy * cellsY)));
      const hours = hoursPerDay[j * cellsX + i];
      const pt = map.latLngToContainerPoint(e.latlng);
      onHover({ x: pt.x, y: pt.y, hours });
    },
    mouseout: () => onHover(null),
  });
  return null;
}

function ShadowPreview({
  center,
  buildings,
  trees,
  time,
}: {
  center: LatLng;
  buildings: Building[];
  trees: Tree[];
  time: Date;
}) {
  const preview = useMemo(
    () => computePreview(time, center, buildings, trees),
    [center, buildings, trees, time],
  );
  if (preview.belowHorizon) return null;
  return (
    <>
      {preview.buildingShadows.map((poly, i) => (
        <Polygon
          key={`bs-${i}`}
          positions={poly.map((p) => [p.lat, p.lng]) as [number, number][]}
          pathOptions={{
            color: '#000000',
            weight: 1,
            opacity: 0.5,
            fillColor: '#000000',
            fillOpacity: 0.45,
          }}
          interactive={false}
        />
      ))}
      {preview.treeShadows.map((c, i) => (
        <Circle
          key={`ts-${i}`}
          center={[c.center.lat, c.center.lng]}
          radius={c.r}
          pathOptions={{
            color: '#000000',
            weight: 1,
            opacity: 0.5,
            fillColor: '#000000',
            fillOpacity: 0.45,
          }}
          interactive={false}
        />
      ))}
    </>
  );
}

export function MapView(props: Props) {
  const {
    center,
    bounds,
    buildings,
    trees,
    plants,
    mode,
    simResult,
    showHeatmap,
    showShadows,
    previewTime,
    onBoundsChange,
    onPlaceTree,
    onPlacePlant,
    onUpdateTree,
    onDeleteTree,
    onUpdatePlant,
    onDeletePlant,
    onUpdateBuilding,
    onDeleteBuilding,
  } = props;

  const heatmapUrl = useMemo(() => (simResult ? renderHeatmap(simResult) : null), [simResult]);
  const initialCenter = center ?? { lat: 40.7128, lng: -74.006 };
  const initialZoom = center ? 19 : 13;

  const [hover, setHover] = useState<{ x: number; y: number; hours: number } | null>(null);

  return (
    <div className="map-inner">
      <MapContainer
        center={[initialCenter.lat, initialCenter.lng]}
        zoom={initialZoom}
        maxZoom={21}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer attribution={TILE_ATTRIB} url={TILE_URL} maxZoom={21} maxNativeZoom={19} />
        <FlyTo pos={center} />
        <ClickHandler mode={mode} onPlaceTree={onPlaceTree} onPlacePlant={onPlacePlant} />
        <CursorLock mode={mode} />
        <PlaceCursor mode={mode} />
        <HeatmapHover simResult={simResult} onHover={setHover} />

        {center && <Marker position={[center.lat, center.lng]} icon={pinIcon} />}

        {bounds && heatmapUrl && simResult && showHeatmap && (
          <ImageOverlay
            url={heatmapUrl}
            bounds={[
              [simResult.bounds.sw.lat, simResult.bounds.sw.lng],
              [simResult.bounds.ne.lat, simResult.bounds.ne.lng],
            ]}
            opacity={0.65}
            interactive={false}
          />
        )}

        {center && showShadows && (
          <ShadowPreview
            center={center}
            buildings={buildings}
            trees={trees}
            time={previewTime}
          />
        )}

        {bounds && (
          <>
            <Rectangle
              bounds={[
                [bounds.sw.lat, bounds.sw.lng],
                [bounds.ne.lat, bounds.ne.lng],
              ]}
              pathOptions={{ color: '#fff', weight: 2, fill: false, dashArray: '6 6' }}
              interactive={false}
            />
            <CornerHandle
              pos={bounds.sw}
              onDrag={(p) => onBoundsChange(normalizeBounds({ ...bounds, sw: p }))}
            />
            <CornerHandle
              pos={bounds.ne}
              onDrag={(p) => onBoundsChange(normalizeBounds({ ...bounds, ne: p }))}
            />
            <CornerHandle
              pos={{ lat: bounds.sw.lat, lng: bounds.ne.lng }}
              onDrag={(p) =>
                onBoundsChange(
                  normalizeBounds({
                    sw: { lat: p.lat, lng: bounds.sw.lng },
                    ne: { lat: bounds.ne.lat, lng: p.lng },
                  }),
                )
              }
            />
            <CornerHandle
              pos={{ lat: bounds.ne.lat, lng: bounds.sw.lng }}
              onDrag={(p) =>
                onBoundsChange(
                  normalizeBounds({
                    sw: { lat: bounds.sw.lat, lng: p.lng },
                    ne: { lat: p.lat, lng: bounds.ne.lng },
                  }),
                )
              }
            />
          </>
        )}

        {buildings.map((b) => (
          <Polygon
            key={b.id}
            positions={b.polygon.map((p) => [p.lat, p.lng]) as [number, number][]}
            pathOptions={{ color: '#ff7043', weight: 1.5, fillOpacity: 0.2 }}
          >
            <Tooltip sticky direction="top" opacity={0.95}>
              <div className="map-tooltip-inner">
                <strong>{b.heightM.toFixed(1)} m</strong>
                <span className="hint-small">
                  ≈ {Math.max(1, Math.round(b.heightM / 3))} stor
                  {Math.max(1, Math.round(b.heightM / 3)) === 1 ? 'y' : 'ies'} · click to edit
                </span>
              </div>
            </Tooltip>
            <Popup>
              <BuildingPopup
                building={b}
                onChange={(patch) => onUpdateBuilding(b.id, patch)}
                onDelete={() => onDeleteBuilding(b.id)}
              />
            </Popup>
          </Polygon>
        ))}

        {trees.map((t) => (
          <TreeRender
            key={t.id}
            tree={t}
            onUpdate={(patch) => onUpdateTree(t.id, patch)}
            onDelete={() => onDeleteTree(t.id)}
          />
        ))}

        {plants.map((p) => (
          <PlantMarker
            key={p.id}
            plant={p}
            simResult={simResult}
            onUpdate={(patch) => onUpdatePlant(p.id, patch)}
            onDelete={() => onDeletePlant(p.id)}
          />
        ))}
      </MapContainer>

      {hover && (
        <div
          className="hover-readout"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          <strong>{hover.hours.toFixed(1)} h</strong>
          <span>avg sun / day</span>
        </div>
      )}
    </div>
  );
}

function normalizeBounds(b: Bounds): Bounds {
  const sw: LatLng = { lat: Math.min(b.sw.lat, b.ne.lat), lng: Math.min(b.sw.lng, b.ne.lng) };
  const ne: LatLng = { lat: Math.max(b.sw.lat, b.ne.lat), lng: Math.max(b.sw.lng, b.ne.lng) };
  return { sw, ne };
}

function CornerHandle({ pos, onDrag }: { pos: LatLng; onDrag: (p: LatLng) => void }) {
  const ref = useRef<L.Marker | null>(null);
  return (
    <Marker
      position={[pos.lat, pos.lng]}
      icon={handleIcon}
      draggable
      eventHandlers={{
        drag: () => {
          const m = ref.current;
          if (!m) return;
          const ll = m.getLatLng();
          onDrag({ lat: ll.lat, lng: ll.lng });
        },
      }}
      ref={ref}
    />
  );
}

function TreeRender({
  tree,
  onUpdate,
  onDelete,
}: {
  tree: Tree;
  onUpdate: (patch: Partial<Tree>) => void;
  onDelete: () => void;
}) {
  return (
    <>
      <Circle
        center={[tree.pos.lat, tree.pos.lng]}
        radius={tree.radiusM}
        pathOptions={{ color: '#4caf50', weight: 1.5, fillOpacity: 0.3 }}
      >
        <Tooltip sticky direction="top" opacity={0.95}>
          <div className="map-tooltip-inner">
            <strong>{tree.heightM.toFixed(1)} m tall</strong>
            <span className="hint-small">
              {tree.radiusM.toFixed(1)} m canopy · click to edit
            </span>
          </div>
        </Tooltip>
        <Popup>
          <TreePopup tree={tree} onChange={onUpdate} onDelete={onDelete} />
        </Popup>
      </Circle>
      <Marker position={[tree.pos.lat, tree.pos.lng]} icon={treeIcon} interactive={false} />
    </>
  );
}

function TreePopup({
  tree,
  onChange,
  onDelete,
}: {
  tree: Tree;
  onChange: (patch: Partial<Tree>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="popup">
      <label>
        Height: {tree.heightM.toFixed(1)} m
        <input
          type="range"
          min={2}
          max={25}
          step={0.5}
          value={tree.heightM}
          onChange={(e) => onChange({ heightM: parseFloat(e.target.value) })}
        />
      </label>
      <label>
        Canopy radius: {tree.radiusM.toFixed(1)} m
        <input
          type="range"
          min={1}
          max={12}
          step={0.5}
          value={tree.radiusM}
          onChange={(e) => onChange({ radiusM: parseFloat(e.target.value) })}
        />
      </label>
      <button onClick={onDelete}>Delete tree</button>
    </div>
  );
}

function BuildingPopup({
  building,
  onChange,
  onDelete,
}: {
  building: Building;
  onChange: (patch: Partial<Building>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="popup">
      <label>
        Height: {building.heightM.toFixed(1)} m
        <input
          type="range"
          min={2}
          max={60}
          step={0.5}
          value={building.heightM}
          onChange={(e) => onChange({ heightM: parseFloat(e.target.value) })}
        />
      </label>
      <button onClick={onDelete}>Remove building</button>
    </div>
  );
}

