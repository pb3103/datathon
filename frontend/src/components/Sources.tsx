import { sourceDisplayName, visibleSourceIssues } from '../domain';
import type { Observation } from '../api/client';
import { Icon } from './Icon';

function safeLink(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function Sources({
  observations,
  selectedYear,
}: {
  observations: Observation[];
  selectedYear: number | null;
}) {
  return (
    <section className="panel sources-panel" id="sources" aria-labelledby="sources-heading">
      <div className="sources-heading">
        <div>
          <div className="section-kicker">03 / Podrijetlo podataka</div>
          <h2 id="sources-heading">Izvori kojima možete pratiti trag</h2>
        </div>
        <Icon name="database" />
      </div>
      <p className="small-muted">
        Prikazane vrijednosti dolaze iz godišnjih XLSX priloga ili pregledanih CSV prijepisa PDF
        tablica. Svaki je zapis povezan s izvornom datotekom, listom i retkom.
      </p>
      <div className="source-list">
        {[...observations]
          .sort((a, b) => b.year - a.year)
          .map((observation) => {
            const source = observation.source;
            const historical = observation.raw_values.historical as
              | { pdf_path?: string; pdf_page?: number; pdf_sha256?: string }
              | undefined;
            const link = safeLink(source.resource_url) ?? safeLink(source.catalog_url);
            return (
              <details
                id={`source-${observation.year}`}
                className={`source-entry ${selectedYear === observation.year ? 'selected-source' : ''}`}
                key={observation.year}
              >
                <summary>
                  <span className="source-year">{observation.year}.</span>
                  <span className="source-summary">
                    <strong>{sourceDisplayName(source)}</strong>
                    <small>
                      {source.sheet} · redak {observation.source_row} ·{' '}
                      {source.path.endsWith('.csv') ? 'CSV iz PDF-a' : 'XLSX'}
                      {visibleSourceIssues(source.issues).length > 0 ? ' · Napomena izvora' : ''}
                    </small>
                  </span>
                  <span className="source-expand" aria-hidden="true">
                    +
                  </span>
                </summary>
                <div className="source-details">
                  <dl>
                    <dt>Datoteka</dt>
                    <dd>{source.path}</dd>
                    <dt>List i redak</dt>
                    <dd>
                      {source.sheet}, redak {observation.source_row}
                    </dd>
                    <dt>Obuhvat</dt>
                    <dd>
                      {observation.scope === 'public_service'
                        ? 'Komunalni otpad u okviru javne usluge'
                        : observation.scope}
                    </dd>
                    <dt>Izdavač</dt>
                    <dd>{source.publisher ?? 'Nije potvrđen u metapodacima izvora'}</dd>
                    <dt>Licenca</dt>
                    <dd>{source.license ?? 'Nije potvrđena'}</dd>
                    <dt>Preuzeto</dt>
                    <dd>
                      {source.downloaded_at
                        ? new Intl.DateTimeFormat('hr-HR', { timeZone: 'Europe/Zagreb' }).format(
                            new Date(source.downloaded_at),
                          )
                        : 'Datum nije zabilježen'}
                    </dd>
                    <dt>Verzija metodologije</dt>
                    <dd>
                      {source.methodology_group} ·{' '}
                      {source.methodology_verified ? 'potvrđena' : 'još nije potvrđena'}
                    </dd>
                    <dt>SHA-256 datoteke</dt>
                    <dd className="checksum">{source.sha256}</dd>
                  </dl>
                  {link ? (
                    <a className="source-external" href={link} target="_blank" rel="noreferrer">
                      Otvori službeni izvor
                      <Icon name="external" />
                    </a>
                  ) : (
                    <p className="small-muted">
                      Poveznica službenog izvora još nije potvrđena. Datoteka je evidentirana
                      lokalno.
                    </p>
                  )}
                  {historical && (
                    <p className="small-muted">
                      Izvorni PDF: {String(historical.pdf_path)} · stranica{' '}
                      {String(historical.pdf_page)} · SHA-256 {String(historical.pdf_sha256)}. CSV
                      korekcije potvrđene su prema PDF-u; kontrolni omjer nije objavljena stopa.
                    </p>
                  )}
                  {historical && (
                    <p className="small-muted">
                      {observation.year === 2019
                        ? '2019.: ukupna masa obuhvaća organizaciju JLS (javnu i povezanu uslugu), a miješani tok prijavljen je na SO-1. Razlika daje široki udio izvan miješanog toka, ne užu stopu prema Uredbi. Izravna usporedivost s novijim godinama nije potvrđena.'
                        : observation.year === 2020
                          ? '2020.: oba stupca navode organizaciju JLS; mase su objavljene u cijelim tonama. U ovoj tablici nije objavljena službena stopa.'
                          : 'Povijesna tablica sadrži ukupno sakupljeni otpad, miješani otpad (20 03 01), obuhvaćenu populaciju i objavljene kg/stan. Istovjetnost novijoj javnoj usluzi nije potvrđena.'}
                    </p>
                  )}
                  {visibleSourceIssues(source.issues).map((issue, i) => (
                    <p className="source-warning" key={`${issue.code}-${i}`}>
                      <Icon name="alert" />
                      {issue.description}
                    </p>
                  ))}
                </div>
              </details>
            );
          })}
      </div>
    </section>
  );
}
