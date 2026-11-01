import {
  useEffect,
  useId,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { normalizePlace } from '../placeSearch';
import { Icon } from './Icon';

type Place = { id: string; name: string; county: string };
export function PlaceAutocomplete<T extends Place>({
  value,
  onChange,
  options,
  onChoose,
  onUnresolved,
  buttonLabel,
  loading = false,
  meta,
  selectedId,
}: {
  value: string;
  onChange: (value: string) => void;
  options: T[];
  onChoose: (place: T) => void;
  onUnresolved: () => void;
  buttonLabel: string;
  loading?: boolean;
  selectedId?: string | null;
  meta?: (place: T) => ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const suggestions = options.slice(0, 8);
  const expanded = open && !!value.trim() && suggestions.length > 0;
  useEffect(() => {
    if (selectedId) {
      setOpen(false);
      setActive(-1);
    }
  }, [selectedId]);
  useEffect(() => {
    if (expanded && active >= 0)
      document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, expanded, id]);
  function choose(place: T) {
    setOpen(false);
    setActive(-1);
    onChoose(place);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (expanded && active >= 0 && suggestions[active]) {
      choose(suggestions[active]);
      return;
    }
    const exact = options.filter((place) => normalizePlace(place.name) === normalizePlace(value));
    const candidates = exact.length ? exact : options;
    if (!loading && candidates.length === 1) choose(candidates[0]);
    else {
      setOpen(true);
      setActive(-1);
      onUnresolved();
    }
  }
  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && suggestions.length) {
      event.preventDefault();
      setOpen(true);
      setActive((old) =>
        event.key === 'ArrowDown'
          ? (old + 1) % suggestions.length
          : old <= 0
            ? suggestions.length - 1
            : old - 1,
      );
    }
  }
  return (
    <form onSubmit={submit} role="search" aria-label="Pretraga gradova i općina">
      <div className="area-autocomplete">
        <div className="search-field">
          <Icon name="search" />
          <label htmlFor={`${id}-input`} className="sr-only">
            Grad ili općina
          </label>
          <input
            id={`${id}-input`}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={`${id}-options`}
            aria-busy={loading}
            aria-activedescendant={
              expanded && active >= 0 && suggestions[active] ? `${id}-option-${active}` : undefined
            }
            autoComplete="off"
            maxLength={200}
            placeholder="Upišite grad ili općinu…"
            value={value}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={keyDown}
            onChange={(event) => {
              setActive(-1);
              setOpen(true);
              onChange(event.target.value);
            }}
          />
        </div>
        {expanded && (
          <ul
            id={`${id}-options`}
            role="listbox"
            aria-label="Prijedlozi područja"
            className="area-options"
          >
            {suggestions.map((place, index) => (
              <li key={place.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  id={`${id}-option-${index}`}
                  aria-selected={active === index}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(place)}
                >
                  <span>
                    <strong>{place.name}</strong>
                    <small>{place.county}</small>
                  </span>
                  {meta && <span className="area-count">{meta(place)}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button type="submit" className="button primary" disabled={!value.trim()}>
        {buttonLabel}
        <Icon name="arrow" />
      </button>
    </form>
  );
}
