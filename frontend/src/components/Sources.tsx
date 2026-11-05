import type { Observation, Source } from '../api/client';
import verifiedLinks from '../data/source-links.json';

const links: Record<
  string,
  { title: string; url: string; format: string; reportUrl: string | null }
> = verifiedLinks;

function safeLink(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function SourceList({
  sources,
  selectedYear,
}: {
  sources: Source[];
  selectedYear?: number | null;
}) {
  const unique = [...new Map(sources.map((source) => [source.sha256, source])).values()];
  const years = [...new Set(unique.map((source) => source.year))].sort((a, b) => b - a);
  return (
    <section className="panel sources-panel" id="sources" aria-labelledby="sources-heading">
      <h2 id="sources-heading">Izvori podataka</h2>
      <ul className="simple-source-list">
        {years.map((year) => (
          <li
            id={`source-${year}`}
            key={year}
            className={year === selectedYear ? 'selected-source' : undefined}
          >
            <span className="source-year">{year}.</span>
            <ul>
              {unique
                .filter((source) => source.year === year)
                .map((source) => {
                  const verified = links[source.sha256];
                  const resource = safeLink(verified?.url) ?? safeLink(source.resource_url);
                  const catalog = safeLink(source.catalog_url);
                  return (
                    <li key={source.id}>
                      <span>
                        Podaci o komunalnom otpadu po gradovima i općinama za {year}. godinu
                      </span>
                      {resource ? (
                        <span className="source-document-links">
                          <a href={resource} target="_blank" rel="noreferrer">
                            {verified?.format === 'XLSX'
                              ? 'Preuzmi tablicu (XLSX)'
                              : 'Otvori dokument (PDF)'}{' '}
                            ↗
                          </a>
                          {verified?.reportUrl && (
                            <a href={verified.reportUrl} target="_blank" rel="noreferrer">
                              Izvješće (PDF) ↗
                            </a>
                          )}
                        </span>
                      ) : catalog ? (
                        <a href={catalog} target="_blank" rel="noreferrer">
                          Otvori izvor ↗
                        </a>
                      ) : null}
                    </li>
                  );
                })}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Sources({
  observations,
  selectedYear,
}: {
  observations: Observation[];
  selectedYear: number | null;
}) {
  return (
    <SourceList
      sources={observations.map((observation) => observation.source)}
      selectedYear={selectedYear}
    />
  );
}
