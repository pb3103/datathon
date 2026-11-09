import { formatMetric } from '../domain';
import type { Observation } from '../api/client';

export function RateEvidence({
  records,
}: {
  records: { name: string; observation: Observation }[];
}) {
  const historical = records.filter(({ observation: o }) => o.year < 2021);
  if (!historical.length) return null;
  return (
    <div className="rate-method-note rate-evidence-compact">
      <details>
        <summary>Kako se izračunava udio?</summary>
        <p>
          Za sve godine s izračunatim udjelom koristi se ista formula: ((ukupno − miješano) /
          ukupno) × 100. Taj udio nije službeno objavljena stopa odvojenog sakupljanja.
        </p>
        <ul>
          {historical.map(({ name, observation: o }) => (
            <li key={`${o.id}-${name}`}>
              <strong>
                {name} · {o.year}.
              </strong>{' '}
              Ukupno: {formatMetric(o.metrics.total_t)} t; miješano:{' '}
              {formatMetric(o.metrics.mixed_t)} t; izračunato:{' '}
              {formatMetric(o.metrics.calculated_nonmixed_share_pct)} %. Izvor: {o.source.path},{' '}
              {o.source.sheet}, redak {o.source_row}.
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
