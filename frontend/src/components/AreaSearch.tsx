import { useState } from 'react';
import { suggestAreas, type RecyclingArea } from '../recycling';
import { PlaceAutocomplete } from './PlaceAutocomplete';

export default function AreaSearch({ onChoose }: { onChoose: (area: RecyclingArea) => void }) {
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<RecyclingArea | null>(null);
  const [message, setMessage] = useState('');
  const matches = suggestAreas(query);
  return (
    <section className="search-panel panel area-search" aria-label="Pretraga područja na karti">
      <PlaceAutocomplete
        selectedId={chosen?.id}
        value={query}
        onChange={(value) => {
          setQuery(value);
          setChosen(null);
          setMessage('');
        }}
        options={matches}
        onChoose={(area) => {
          setQuery(area.name);
          setChosen(area);
          setMessage('');
          onChoose(area);
        }}
        onUnresolved={() =>
          setMessage(
            matches.length
              ? 'Odaberite jedno od ponuđenih područja. Za istoimena mjesta provjerite županiju.'
              : 'Nema područja s tim nazivom.',
          )
        }
        buttonLabel="Prikaži na karti"
        meta={(area) => (area.count ? `${area.count} lokacija` : 'Bez lokacija u skupu')}
      />
      <p role="status" aria-live="polite" className="area-search-status">
        {message}
      </p>
      {chosen && (
        <a
          className="area-explorer-link"
          href={`/explorer?${new URLSearchParams({ jls: chosen.id })}`}
        >
          Podaci o otpadu za {chosen.name} <span aria-hidden="true">↗</span>
        </a>
      )}
    </section>
  );
}
