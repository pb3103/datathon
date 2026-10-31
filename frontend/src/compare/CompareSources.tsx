import { sourceDisplayName, visibleSourceIssues } from '../domain';
import type { Comparison } from '../api/client';

export function CompareSources({ data }: { data: Comparison }) {
  const years = [...new Set(data.members.flatMap((m) => m.history.map((o) => o.year)))].sort(
    (a, b) => b - a,
  );
  return (
    <section className="panel sources-panel" id="sources" aria-labelledby="compare-sources-title">
      <div className="section-kicker">Podrijetlo usporedbe</div>
      <h2 id="compare-sources-title">Izvori po godinama</h2>
      <p className="small-muted">
        Svaka vrijednost pripada konkretnoj JLS, godini, listu i retku. Nepotvrđena licenca ili
        poveznica nisu zamijenjene pretpostavkom.
      </p>
      {years.map((year) => {
        const entries = data.members
          .map((member) => ({ member, observation: member.history.find((o) => o.year === year) }))
          .filter((entry) => entry.observation);
        const source = entries[0].observation!.source;
        const material = data.members.flatMap((m) => m.material_history[year] ?? [])[0];
        return (
          <details className="source-entry" id={`source-${year}`} key={year}>
            <summary>
              <span className="source-year">{year}.</span>
              <span className="source-summary">
                <strong>{sourceDisplayName(source)}</strong>
                <small>
                  {source.sheet} · {entries.length} JLS ·{' '}
                  {visibleSourceIssues(source.issues).length ? 'Napomena izvora' : 'Lokalni izvor'}
                </small>
              </span>
              <span className="source-expand" aria-hidden="true">
                +
              </span>
            </summary>
            <div className="source-details">
              <p>
                Izvorna datoteka: {source.path} ·{' '}
                {source.path.endsWith('.csv') ? 'CSV iz PDF-a' : 'XLSX'}
              </p>
              <p className="checksum">SHA-256 glavne datoteke: {source.sha256}</p>
              <ul>
                {entries.map(({ member, observation }) => (
                  <li key={member.municipality.id}>
                    {member.municipality.name}: {observation!.source.sheet}, redak{' '}
                    {observation!.source_row}
                  </li>
                ))}
              </ul>
              {material && (
                <>
                  <p>
                    <strong>Materijali:</strong> {material.source.sheet}, objavljeno kg/stan.
                  </p>
                  <p className="checksum">SHA-256: {material.source.sha256}</p>
                  <ul>
                    {data.members.map((member) => {
                      const value = member.material_history[year]?.[0];
                      return value ? (
                        <li key={member.municipality.id}>
                          {member.municipality.name}: redak {value.source_row}
                        </li>
                      ) : null;
                    })}
                  </ul>
                </>
              )}
              <p>
                Licenca: {source.license ?? 'nije potvrđena'}. Poveznica izvora:{' '}
                {source.resource_url ?? source.catalog_url ?? 'nije potvrđena'}. Izdavač:{' '}
                {source.publisher ?? 'nije potvrđen u metapodacima'}.
              </p>
              {visibleSourceIssues(source.issues).map((issue, i) => (
                <p className="source-warning" key={i}>
                  {issue.description}
                </p>
              ))}
            </div>
          </details>
        );
      })}
    </section>
  );
}
