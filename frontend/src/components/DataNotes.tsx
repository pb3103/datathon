import type { Observation } from '../api/client';
import { explainIssue, explainReason, visibleSourceIssues } from '../domain';
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
      ? 'Prikazani udio izračunat je iz objavljenih masa i nije službeno objavljena stopa odvojenog sakupljanja.'
      : 'Stope su službeno objavljene. Usporedivost obuhvata među godinama nije potpuno potvrđena.';
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
                Podaci dolaze iz službenih godišnjih izvješća i pripadajućih tablica. Povijesni i
                noviji podaci mogu se razlikovati prema obuhvatu i metodologiji; ne treba ih
                tumačiti kao potvrđen povezani trend.
              </p>
              <p>
                Za 2017.–2020. prikazuje se izračunati udio izvan miješanog toka: (T−M)/T × 100,
                gdje je T ukupna, a M miješana masa. To nije službeno objavljena stopa odvojenog
                sakupljanja. Službene stope za 2021.–2024. ostaju zasebni podaci. Odvojeno
                sakupljanje nije recikliranje.
              </p>
              <p>
                Za 2019. javna i povezana usluga zajedno čine organizaciju JLS. Prikazani udio
                obuhvaća sve tokove osim miješanog otpada; nije uža stopa prema Uredbi. Nedostupna
                vrijednost nije nula.
              </p>
              <dl>
                <dt>Uvjetna usporedivost</dt>
                <dd>
                  Vrijednosti se mogu pregledavati, ali kontinuitet obuhvata i lokalnih granica nije
                  potvrđen.
                </dd>
                <dt>Potrebna provjera</dt>
                <dd>
                  Konkretan ulaz ili pokazatelj zahtijeva provjeru. Izračuni koji ovise o njemu mogu
                  ostati nedostupni, dok objavljena vrijednost ostaje vidljiva.
                </dd>
                <dt>Nije dostupno</dt>
                <dd>
                  Pokazatelj nedostaje ili nije opravdano izračunati ga. Nije zamijenjen nulom.
                </dd>
              </dl>
              {selected?.issues
                .filter((i) => i.severity === 'info')
                .map((issue, i) => <p key={i}>{explainIssue(issue)}</p>)}
              {selected && (
                <>
                  <h3>Napomene za {year}.</h3>
                  <ul>
                    {selected.comparability.reasons.map((reason) => (
                      <li key={reason}>{explainReason(reason)}</li>
                    ))}
                  </ul>
                </>
              )}
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
