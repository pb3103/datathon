import type { Observation } from '../api/client';
import { explainIssue, explainReason, isVerified } from '../domain';
import { Icon } from './Icon';

export function Quality({
  selected,
  observations,
}: {
  selected?: Observation;
  observations: Observation[];
}) {
  const warnings = observations.flatMap((observation) =>
    (observation.source.issues ?? []).map((issue) => ({ year: observation.year, issue })),
  );
  return (
    <section className="quality-section" aria-labelledby="quality-heading">
      <div className="section-title">
        <h2 id="quality-heading">Prije tumačenja podataka</h2>
        <span className="small-muted">Transparentnost na prvom mjestu</span>
      </div>
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
      {selected && selected.issues.length > 0 && (
        <div className="notice warning">
          <Icon name="alert" />
          <div>
            <strong>{selected.year}. · Potrebna provjera lokalnog zapisa</strong>
            <ul>
              {selected.issues.map((issue, i) => (
                <li key={`${issue.code}-${i}`}>{explainIssue(issue)}</li>
              ))}
            </ul>
          </div>
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
