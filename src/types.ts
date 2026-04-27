export type LatLng = { lat: number; lng: number };

export type Building = {
  id: string;
  polygon: LatLng[];
  heightM: number;
};

export type Tree = {
  id: string;
  pos: LatLng;
  radiusM: number;
  heightM: number;
};

export type SpeciesId =
  | 'blueberry'
  | 'grape'
  | 'tomato'
  | 'pepper'
  | 'lettuce'
  | 'hosta'
  | 'custom';

export type Plant = {
  id: string;
  pos: LatLng;
  species: SpeciesId;
  label: string;
};

export type Bounds = {
  sw: LatLng;
  ne: LatLng;
};

export type Mode = 'idle' | 'place-tree' | 'place-plant';

export type SimInput = {
  center: LatLng;
  bounds: Bounds;
  buildings: Building[];
  trees: Tree[];
  startMonth: number;
  endMonth: number;
  cellsPerSide: number;
};

export type MonthlyBreakdown = {
  monthIndex: number;
  daysSampled: number;
  hoursPerDay: Float32Array;
};

export type SimResult = {
  bounds: Bounds;
  cellsX: number;
  cellsY: number;
  hoursPerDay: Float32Array;
  daysSampled: number;
  monthly: MonthlyBreakdown[];
};
