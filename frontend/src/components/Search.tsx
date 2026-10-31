import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api, type Municipality, type MunicipalityPage } from '../api/client';
import { Icon } from './Icon';

type Result =
  | { status: 'idle' | 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: MunicipalityPage };
export function Search({
  onSelect,
  onSearch,
}: {
  onSelect: (municipality: Municipality) => void;
  onSearch?: (query: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState<{
    query: string;
    page: number;
    attempt: number;
  } | null>(null);
  const [result, setResult] = useState<Result>({ status: 'idle' });
  const controller = useRef<AbortController | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!submitted) return;
    const abort = new AbortController();
    controller.current = abort;
    setResult({ status: 'loading' });
    api
      .search(submitted.query, submitted.page, abort.signal)
      .then((data) => {
        if (!abort.signal.aborted) setResult({ status: 'success', data });
      })
      .catch((error: Error) => {
        if (!abort.signal.aborted) setResult({ status: 'error', message: error.message });
      });
    return () => abort.abort();
  }, [submitted]);

  function search(value: string, page = 1) {
    if (!value.trim()) return;
    controller.current?.abort();
    if (page === 1) onSearch?.(value.trim());
    setQuery(value);
    setResult({ status: 'loading' });
    setSubmitted((old) => ({ query: value.trim(), page, attempt: (old?.attempt ?? 0) + 1 }));
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    search(query);
  }
  function select(municipality: Municipality) {
    controller.current?.abort();
    setSubmitted(null);
    setQuery(municipality.name);
    setResult({ status: 'idle' });
    onSelect(municipality);
  }
  return (
    <section className="search-panel panel" aria-labelledby="search-heading">
      <div className="section-kicker" id="search-heading">
        01 / Odaberite svoju zajednicu
      </div>
      <form onSubmit={submit} role="search" aria-label="Pretraga gradova i općina">
        <div className="search-field">
          <Icon name="search" />
          <label htmlFor="municipality-search" className="sr-only">
            Grad ili općina
          </label>
          <input
            id="municipality-search"
            type="search"
            placeholder="Upišite grad ili općinu…"
            value={query}
            maxLength={200}
            autoComplete="off"
            aria-describedby="search-hint"
            onChange={(event) => {
              controller.current?.abort();
              setQuery(event.target.value);
              setSubmitted(null);
              setResult({ status: 'idle' });
            }}
          />
        </div>
        <button className="button primary" disabled={!query.trim()} type="submit">
          Pretraži
          <Icon name="arrow" />
        </button>
      </form>
      <p className="field-hint" id="search-hint">
        Pretražujte po nazivu. Županija pomaže razlikovati istoimene gradove i općine.
      </p>
      {result.status === 'idle' && !query && (
        <div className="suggestion">
          Za početak{' '}
          <button type="button" onClick={() => search('Bjelovar')}>
            istražite Bjelovar <span aria-hidden="true">↗</span>
          </button>
        </div>
      )}
      <div className="search-announcement sr-only" role="status" aria-live="polite">
        {result.status === 'loading'
          ? 'Pretraživanje…'
          : result.status === 'success'
            ? `Pronađeno rezultata: ${result.data.total}.`
            : ''}
      </div>
      {result.status === 'loading' && (
        <p className="inline-loading">
          <span className="spinner" aria-hidden="true" />
          Pretraživanje…
        </p>
      )}
      {result.status === 'error' && (
        <div className="search-error" role="alert">
          <p>{result.message}</p>
          <button className="text-button" onClick={() => search(query)}>
            Ponovi pretragu
          </button>
        </div>
      )}
      {result.status === 'success' && (
        <div className="search-results" ref={resultsRef}>
          <div className="results-heading">
            <span>
              {result.data.total ? `Rezultati za „${submitted?.query}”` : 'Nema rezultata'}
            </span>
            <span>{result.data.total} pronađeno</span>
          </div>
          {!result.data.total ? (
            <p>Nismo pronašli grad ili općinu s tim nazivom. Pokušajte s kraćim nazivom.</p>
          ) : (
            <>
              <ul>
                {result.data.items.map((municipality) => (
                  <li key={municipality.id}>
                    <button
                      type="button"
                      onClick={() => select(municipality)}
                      aria-label={`Otvori ${municipality.name}, ${municipality.county}`}
                    >
                      <span className="result-icon">
                        <Icon name="pin" />
                      </span>
                      <span>
                        <strong>{municipality.name}</strong>
                        <small>{municipality.county}</small>
                      </span>
                      <Icon name="arrow" />
                    </button>
                  </li>
                ))}
              </ul>
              {result.data.total > result.data.page_size && (
                <div className="pagination">
                  <button
                    className="text-button"
                    disabled={result.data.page === 1}
                    onClick={() => search(submitted!.query, result.data.page - 1)}
                  >
                    Prethodna
                  </button>
                  <span>
                    Stranica {result.data.page} /{' '}
                    {Math.ceil(result.data.total / result.data.page_size)}
                  </span>
                  <button
                    className="text-button"
                    disabled={result.data.page * result.data.page_size >= result.data.total}
                    onClick={() => search(submitted!.query, result.data.page + 1)}
                  >
                    Sljedeća
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
