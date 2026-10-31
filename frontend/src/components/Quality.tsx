import { DataNotes } from './DataNotes';
import type { Observation } from '../api/client';
import { explainIssue, explainReason, isVerified, visibleSourceIssues } from '../domain';
import { Icon } from './Icon';

export function Quality({
  selected,
  observations,
  compact = false,
}: {
  compact?: boolean;
  selected?: Observation;
  observations: Observation[];
}) {
  if (compact) return <DataNotes selected={selected} observations={observations} />;
  const warnings = observations.flatMap((observation) =>
    visibleSourceIssues(observation.source.issues)
      .filter((issue) => issue.code !== 'historical_scope_unverified')
      .map((issue) => ({ year: observation.year, issue })),
  );
  const historicalYears = [
    ...new Set(observations.filter((o) => o.year >= 2017 && o.year <= 2020).map((o) => o.year)),
  ].sort();
  return (
    <section className="quality-section" aria-labelledby="quality-heading">
      <div className="section-title">
        <h2 id="quality-heading">Prije tumačenja podataka</h2>
        <span className="small-muted">Transparentnost na prvom mjestu</span>
      </div>
      {selected && selected.issues.some((i) => i.severity !== 'info') && (
        <div className="notice warning">
          <Icon name="alert" />
          <div>
            <strong>{selected.year}. · Potrebna provjera lokalnog zapisa</strong>
            <ul>
              {selected.issues
                .filter((i) => i.severity !== 'info')
                .map((issue, i) => (
                  <li key={`${issue.code}-${i}`}>{explainIssue(issue)}</li>
                ))}
            </ul>
          </div>
        </div>
      )}
      {historicalYears.length > 0 && (
        <div className="historical-method-note">
          <Icon name="info" />
          <div>
            <strong>Usporedivost povijesnih podataka (2017.–2020.)</strong>
            <p>
              Podaci dolaze iz službenih godišnjih izvješća. Usporedbe s novijim godinama tumačite s
              oprezom.
            </p>
            <details>
              <summary>Saznaj više</summary>
              <p>
                Metodologija starijih i novijih godina nije nužno potpuno usporediva. Izračunati
                kontrolni omjer (T−M)/T nije službeno objavljena stopa odvojenog sakupljanja.
              </p>
              <div className="historical-source-links">
                {historicalYears.map((year) => (
                  <a key={year} href={`#source-${year}`}>
                    Izvor za {year}.
                  </a>
                ))}
              </div>
            </details>
          </div>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="source-warnings" aria-label="Upozorenja izvora po godinama">
          {warnings.map(({ year, issue }, index) => (
            <div className="notice warning" key={`${year}-${issue.code}-${index}`}>
              <Icon name="alert" />
              <div>
                <strong>
                  {year}. ·{' '}
                  {issue.code === 'source_aggregate_mismatch'
                    ? 'Razlika između XLSX-a i PDF-a'
                    : 'Napomena izvora'}
                </strong>
                <p>
                  {issue.code === 'source_aggregate_mismatch'
                    ? 'Zbrojevi XLSX podataka razlikuju se od agregata PDF izvještaja. Prikazane su vrijednosti iz XLSX-a; zbroj nije potvrđen kao nacionalna vrijednost.'
                    : issue.description}
                </p>
                <a href={`#source-${year}`}>
                  Pogledaj izvor za {year}. <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
      <details className="quality-details">
        <summary>
          <Icon name="info" />
          Što znače oznake kvalitete i usporedivosti?
        </summary>
        <div>
          <dl>
            <dt>Uvjetna usporedivost</dt>
            <dd>
              Godišnje vrijednosti dostupne su za pregled, ali kontinuitet obuhvata nije potvrđen.
              Ne tumačite ih kao potvrđeni povezani trend.
            </dd>
            <dt>Potrebna provjera</dt>
            <dd>
              Izvor sadrži nesklad ili sporni ulaz. Objavljena vrijednost ostaje vidljiva s oznakom;
              izračun koji ovisi o spornom ulazu može biti nedostupan.
            </dd>
            <dt>Nema podatka</dt>
            <dd>
              Pokazatelj nedostaje ili se ne može valjano izračunati. Nije zamijenjen nulom. Nula se
              prikazuje samo kada je vraća API.
            </dd>
          </dl>
          {selected?.issues
            .filter((i) => i.severity === 'info')
            .map((issue, i) => <p key={i}>{explainIssue(issue)}</p>)}
          {selected && (
            <>
              <h3>Napomene za {selected.year}.</h3>
              <p>
                {isVerified(selected)
                  ? 'Usporedivost za odabranu godinu je potvrđena.'
                  : 'Usporedivost za odabranu godinu još nije potvrđena.'}
              </p>
              <ul>
                {selected.comparability.reasons.map((reason) => (
                  <li key={reason}>{explainReason(reason)}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </details>
    </section>
  );
}
