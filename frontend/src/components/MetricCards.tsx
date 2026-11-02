import type { Metric, Observation } from '../api/client';
import { explainReason, formatMetric, numeric } from '../domain';
import { Icon } from './Icon';

function Value({ metric, decimals = 2 }: { metric?: Metric; decimals?: number }) {
  return <>{formatMetric(metric, decimals)}</>;
}

export function MetricCards({ observation }: { observation: Observation }) {
  const m = observation.metrics;
  const computed = m.total_kg_per_covered_person;
  const published = m.published_kg_per_covered_person;
  const mismatch = observation.issues.some((issue) => issue.code === 'kg_per_capita_mismatch');
  const cards = [
    {
      key: 'total_t',
      label: 'Ukupno sakupljeno',
      unit: 't',
      hint: observation.scope.startsWith('historical_')
        ? 'Komunalni otpad prema povijesnom obuhvatu izvora'
        : 'Komunalni otpad u javnoj usluzi',
      index: '01',
      className: '',
    },
    {
      key: 'mixed_t',
      label: 'Miješani otpad',
      unit: 't',
      hint: 'Miješani komunalni otpad',
      index: '02',
      className: '',
    },
    {
      key: 'total_kg_per_covered_person',
      label: 'Po obuhvaćenom stanovniku',
      unit: 'kg/stan.',
      hint: 'Izračunato iz ukupne mase i obuhvaćene populacije',
      index: '03',
      className: '',
    },
    {
      key: observation.year < 2021 ? 'calculated_nonmixed_share_pct' : 'separate_collection_pct',
      label: observation.year < 2021 ? 'Udio izvan miješanog toka' : 'Odvojeno sakupljanje',
      unit: '%',
      hint:
        observation.year < 2021 ? 'Izračunato iz objavljenih masa' : 'Službeno objavljena stopa',
      index: '04',
      className: 'accent-card',
    },
  ];
  return (
    <>
      <div className="metric-grid" aria-label={`Pokazatelji za ${observation.year}. godinu`}>
        {cards.map((card) => {
          const value = m[card.key];
          const missing = numeric(value) === null;
          return (
            <article
              className={`metric-card ${card.className}`}
              key={card.key}
              aria-labelledby={`metric-${card.key}`}
            >
              <div className="metric-top">
                <span className="metric-index">{card.index}</span>
                <span className="metric-year">{observation.year}.</span>
              </div>
              <h3 id={`metric-${card.key}`}>{card.label}</h3>
              <p className={`metric-value ${missing ? 'missing-value' : ''}`}>
                {missing && card.key === 'calculated_nonmixed_share_pct' ? (
                  'Nije dostupno'
                ) : (
                  <Value metric={value} />
                )}
                {!missing && <span className="metric-unit">{card.unit}</span>}
              </p>
              {missing && card.key !== 'calculated_nonmixed_share_pct' && (
                <p className="metric-reason">{explainReason(value?.reason)}</p>
              )}
              <p className="metric-hint">{card.hint}</p>
              {card.key === 'calculated_nonmixed_share_pct' && !missing && (
                <span className="badge neutral indicator-origin">Izračunato</span>
              )}
              {card.key === 'total_kg_per_covered_person' && mismatch && (
                <p className="metric-reason">
                  <Icon name="alert" />
                  Nesklad s izvornom vrijednosti · potrebna provjera
                </p>
              )}
              {value?.quality_status === 'review_required' &&
                card.key !== 'total_kg_per_covered_person' && (
                  <p className="metric-reason">
                    <Icon name="alert" />
                    Vrijednost zahtijeva provjeru.
                  </p>
                )}
            </article>
          );
        })}
      </div>
      <div className="coverage-strip">
        <span>
          <Icon name="pin" />
          Stanovnici obuhvaćeni uslugom <strong>{formatMetric(m.covered_population, 0)}</strong>
          {!observation.population_usable && (
            <span className="badge warning">Potrebna provjera</span>
          )}
        </span>
        <span>
          Miješano po obuhvaćenom stanovniku{' '}
          <strong>
            {formatMetric(m.mixed_kg_per_covered_person)}
            {numeric(m.mixed_kg_per_covered_person) !== null && ' kg/stan.'}
          </strong>
        </span>
      </div>
      {numeric(computed) === null && numeric(published) !== null && (
        <p className="notice warning">
          <Icon name="alert" />
          <span>
            Objavljeni kg/stanovnik zadržani su kao izvorni podatak. Izračunati pokazatelj nije
            dostupan jer nazivnik zahtijeva provjeru ili nedostaje potreban ulaz.
          </span>
        </p>
      )}
    </>
  );
}
