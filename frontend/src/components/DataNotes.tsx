import type { Observation } from '../api/client';
import { explainIssue, visibleSourceIssues } from '../domain';
import { Icon } from './Icon';

export function DataNotes({
  selected,
  observations,
}: {
  selected?: Observation;
  observations: Observation[];
}) {
  const year = selected?.year;
  const context =
    year && year < 2021
      ? 'Udio izvan miješanog toka izračunat je iz ukupne i miješane mase.'
      : 'Obuhvat podataka može se razlikovati među godinama.';
  const years = [...new Set(observations.map((o) => o.year))].sort();
  const local = selected?.issues.filter((i) => i.severity !== 'info') ?? [];
  const sourceWarnings = observations.flatMap((o) =>
    visibleSourceIssues(o.source.issues)
      .filter((i) => i.code !== 'historical_scope_unverified')
      .map((issue) => ({ year: o.year, issue })),
  );
  return (
    <section id="data-notes" className="data-notes" aria-label="O podacima i usporedivosti">
      {local.length > 0 && (
        <div className="notice warning">
          <Icon name="alert" />
          <div>
            <strong>{year}. · Potrebna provjera lokalnog zapisa</strong>
            <ul>
              {local.map((issue, i) => (
                <li key={i}>{explainIssue(issue)}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {sourceWarnings.map(({ year, issue }, i) => (
        <p className="notice warning" key={i}>
          {year}. · {issue.description}
        </p>
      ))}
      <div className="data-notes-card">
        <Icon name="info" />
        <div>
          <strong>O podacima i usporedivosti</strong>
          <p>{context}</p>
          <details>
            <summary>Saznaj više</summary>
            <div className="data-notes-details">
              <p>
                Udio izvan miješanog toka = (ukupno − miješano) / ukupno × 100. Za 2021.–2024.
                prikazuje se objavljena stopa odvojenog sakupljanja. Odvojeno sakupljanje ne znači
                da je otpad recikliran.
              </p>
              <p>
                Podaci različitih godina nisu uvijek izravno usporedivi. Ako podatak nedostaje u
                izvoru, prikazuje se „Nije dostupno”.
              </p>
              {year === 2019 && <p>Podaci za 2019. uključuju javnu i povezanu uslugu.</p>}
              <div className="historical-source-links">
                {years.map((year) => (
                  <a key={year} href={`#source-${year}`}>
                    Izvor za {year}.
                  </a>
                ))}
              </div>
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}
