import type { SpeciesId } from '../types';

export type Species = {
  id: SpeciesId;
  name: string;
  emoji: string;
  // Hours/day bands. Anything below `min` is poor. Between `min` and `ideal` is marginal.
  minHours: number;
  idealHours: number;
  notes: string;
};

export const SPECIES: Record<SpeciesId, Species> = {
  blueberry: {
    id: 'blueberry',
    name: 'Blueberry',
    emoji: '🫐',
    minHours: 4,
    idealHours: 6,
    notes: '6+ hrs gives best fruit; tolerates dappled afternoon shade.',
  },
  grape: {
    id: 'grape',
    name: 'Grape',
    emoji: '🍇',
    minHours: 6,
    idealHours: 7.5,
    notes: 'Wants full sun. Late-summer light is critical for sugar development.',
  },
  tomato: {
    id: 'tomato',
    name: 'Tomato',
    emoji: '🍅',
    minHours: 5,
    idealHours: 7,
    notes: 'Heat-loving; fruit set drops below 6 hrs.',
  },
  pepper: {
    id: 'pepper',
    name: 'Pepper',
    emoji: '🌶️',
    minHours: 5,
    idealHours: 7,
    notes: 'Similar to tomatoes; needs warm sun for capsaicin/flavor.',
  },
  lettuce: {
    id: 'lettuce',
    name: 'Lettuce',
    emoji: '🥬',
    minHours: 3,
    idealHours: 5,
    notes: 'Tolerates partial shade — afternoon shade slows bolting.',
  },
  hosta: {
    id: 'hosta',
    name: 'Hosta',
    emoji: '🌿',
    minHours: 0,
    idealHours: 3,
    notes: 'Shade plant — too much sun scorches leaves. 2-4 hrs ideal.',
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    emoji: '🌱',
    minHours: 4,
    idealHours: 6,
    notes: 'Generic mid-light requirement.',
  },
};

export type Verdict = 'thriving' | 'marginal' | 'insufficient' | 'too-much';

export function verdict(species: Species, hours: number): {
  level: Verdict;
  label: string;
  color: string;
} {
  // Hosta is special — shade plant, gets unhappy with too much sun.
  if (species.id === 'hosta' && hours > species.idealHours + 3) {
    return { level: 'too-much', label: 'Too much sun (will scorch)', color: '#f85149' };
  }
  if (hours >= species.idealHours) {
    return { level: 'thriving', label: 'Thriving', color: '#3fb950' };
  }
  if (hours >= species.minHours) {
    return { level: 'marginal', label: 'Marginal — expect lower yield', color: '#d29922' };
  }
  return { level: 'insufficient', label: 'Insufficient sun', color: '#f85149' };
}

export const SPECIES_LIST: Species[] = [
  SPECIES.blueberry,
  SPECIES.grape,
  SPECIES.tomato,
  SPECIES.pepper,
  SPECIES.lettuce,
  SPECIES.hosta,
  SPECIES.custom,
];
