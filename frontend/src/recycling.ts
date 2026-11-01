import { normalizePlace as normalizeArea } from './placeSearch';
import data from './data/recycling-map.json';

export const recyclingLocations = data.locations;
export const recyclingUnmapped = data.unmapped;
export const recyclingAreas = data.areas;
export const recyclingSummary = data.summary;
export type RecyclingArea = (typeof recyclingAreas)[number];
export type AreaSelection = { id: string; attempt: number } | null;

export { normalizePlace as normalizeArea } from './placeSearch';
export function suggestAreas(query: string) {
  const value = normalizeArea(query);
  if (!value) return [];
  return recyclingAreas
    .filter((area) => normalizeArea(area.name).includes(value))
    .sort(
      (a, b) =>
        Number(normalizeArea(b.name).startsWith(value)) -
          Number(normalizeArea(a.name).startsWith(value)) ||
        a.name.localeCompare(b.name, 'hr') ||
        a.county.localeCompare(b.county, 'hr'),
    );
}
