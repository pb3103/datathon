import { useEffect, useRef, useState } from 'react';
import { api, type Municipality } from '../api/client';
import { normalizePlace } from '../placeSearch';
import { PlaceAutocomplete } from './PlaceAutocomplete';

type Result =
  | { status: 'idle' | 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; items: Municipality[] };
export function Search({ onSelect }: { onSelect: (municipality: Municipality) => void }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<Result>({ status: 'idle' });
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  const chosen = useRef<Municipality | null>(null);
  const pendingSubmit = useRef('');
  const callback = useRef(onSelect);
  callback.current = onSelect;
  function select(place: Municipality) {
    chosen.current = place;
    pendingSubmit.current = '';
    setQuery(place.name);
    setMessage('');
    setResult({ status: 'idle' });
    callback.current(place);
  }
  useEffect(() => {
    const value = query.trim();
    if (!value || chosen.current?.name === query) return;
    const abort = new AbortController();
    const timer = setTimeout(() => {
      api
        .search(value, 1, abort.signal)
        .then((data) => {
          if (abort.signal.aborted) return;
          setResult({ status: 'success', items: data.items });
          if (pendingSubmit.current === value) {
            pendingSubmit.current = '';
            const exact = data.items.filter(
              (place) => normalizePlace(place.name) === normalizePlace(value),
            );
            const candidates = exact.length ? exact : data.items;
            if (candidates.length === 1) select(candidates[0]);
            else
              setMessage(
                data.items.length
                  ? 'Odaberite područje iz prijedloga.'
                  : 'Nema rezultata za uneseni naziv.',
              );
          }
        })
        .catch((error: Error) => {
          if (!abort.signal.aborted) {
            pendingSubmit.current = '';
            setResult({ status: 'error', message: error.message });
          }
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [query, attempt]);
  const options =
    chosen.current?.name === query
      ? [chosen.current]
      : result.status === 'success'
        ? result.items
        : [];
  return (
    <section className="search-panel panel area-search" aria-label="Pretraga gradova i općina">
      <PlaceAutocomplete
        selectedId={chosen.current?.id}
        value={query}
        onChange={(value) => {
          chosen.current = null;
          pendingSubmit.current = '';
          setQuery(value);
          setMessage('');
          setResult({ status: value.trim() ? 'loading' : 'idle' });
        }}
        options={options}
        onChoose={select}
        loading={result.status === 'loading'}
        buttonLabel="Odaberi područje"
        onUnresolved={() => {
          if (result.status === 'loading') pendingSubmit.current = query.trim();
          else if (result.status === 'error') {
            pendingSubmit.current = query.trim();
            setResult({ status: 'loading' });
            setAttempt((old) => old + 1);
          } else
            setMessage(
              options.length
                ? 'Odaberite područje iz prijedloga.'
                : 'Nema rezultata za uneseni naziv.',
            );
        }}
      />
      <p className="area-search-status" role="status" aria-live="polite">
        {result.status === 'loading'
          ? 'Pretraživanje…'
          : message ||
            (result.status === 'success' && !result.items.length
              ? 'Nema rezultata za uneseni naziv.'
              : '')}
      </p>
      {result.status === 'error' && (
        <div className="search-error" role="alert">
          <p>{result.message}</p>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setResult({ status: 'loading' });
              setAttempt((old) => old + 1);
            }}
          >
            Ponovi pretragu
          </button>
        </div>
      )}
    </section>
  );
}
