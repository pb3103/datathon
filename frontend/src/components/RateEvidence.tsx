import type { Observation } from '../api/client';
import { explainReason, formatMetric } from '../domain';

export function RateEvidence({
  records,
}: {
  records: { name: string; observation: Observation }[];
}) {
  const historical = records.filter(({ observation: o }) => o.year < 2021);
  if (!historical.length) return null;
  return (
    <div className="rate-method-note rate-evidence-compact">
      <a className="rate-notes-link" href="#data-notes">
        O udjelima, stopama i usporedivosti ↑
      </a>
      <details>
        <summary>Izračun, ulazne mase i izvori</summary>
        <p>
          Formula: ((ukupno − miješano) / ukupno) × 100. Izračunati udio nije službeno objavljena
          stopa odvojenog sakupljanja.
        </p>
        <ul>
          {historical.map(({ name, observation: o }) => (
            <li key={`${name}-${o.year}`}>
              <strong>
                {name} · {o.year}.
              </strong>{' '}
              Ukupno: {formatMetric(o.metrics.total_t)} t; miješano:{' '}
              {formatMetric(o.metrics.mixed_t)} t.{' '}
              {o.metrics.calculated_nonmixed_share_pct?.value != null ? (
                <>Izračunato: {formatMetric(o.metrics.calculated_nonmixed_share_pct)} %.</>
              ) : (
                explainReason(o.metrics.calculated_nonmixed_share_pct?.reason)
              )}{' '}
              <a href={`#source-${o.year}`}>Izvor za {o.year}.</a> {o.source.path}, redak{' '}
              {o.source_row}.
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
