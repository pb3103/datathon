import type { Comparison } from '../api/client';
import { SourceList } from '../components/Sources';

export function CompareSources({ data }: { data: Comparison }) {
  const sources = data.members.flatMap((member) => [
    ...member.history.map((observation) => observation.source),
    ...Object.values(member.material_history).flatMap((materials) =>
      materials.map((material) => material.source),
    ),
  ]);
  return <SourceList sources={sources} selectedYear={data.year} />;
}
