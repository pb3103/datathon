import { DataNotes } from './DataNotes';
import type { Observation } from '../api/client';

export function Quality({
  selected,
  observations,
}: {
  compact?: boolean;
  selected?: Observation;
  observations: Observation[];
}) {
  return <DataNotes selected={selected} observations={observations} />;
}
