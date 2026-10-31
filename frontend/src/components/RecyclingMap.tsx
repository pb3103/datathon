import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import data from '../data/recycling-locations.json';
const yards = data.locations;
const areas = [...new Set(yards.map((yard) => yard.municipality))].sort((a, b) =>
  a.localeCompare(b, 'hr'),
);
const labels: Record<string, string> = {
  fixed: 'Stalno reciklažno dvorište',
  mobile: 'Mobilno reciklažno dvorište',
  island: 'Zeleni otok',
  collection: 'Lokacija za prikupljanje — vrsta nije navedena',
};

function normalizeArea(value: string) {
  return value
    .toLocaleLowerCase('hr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^(grad|opcina)\s+/, '')
    .trim();
}

export default function RecyclingMap({
  searchRequest,
}: {
  searchRequest?: { query: string; attempt: number } | null;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const [kind, setKind] = useState('all');
  const [area, setArea] = useState('all');
  const [tileError, setTileError] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const visible = yards.filter(
    (yard) =>
      (kind === 'all' || yard.kind === kind) && (area === 'all' || yard.municipality === area),
  );
  const unmapped = data.unmapped.filter(
    (yard) =>
      (kind === 'all' || yard.kind === kind) && (area === 'all' || yard.municipality === area),
  );

  useEffect(() => {
    if (!searchRequest) return;
    const query = normalizeArea(searchRequest.query);
    const exact = areas.find((name) => normalizeArea(name) === query);
    const matches = areas.filter((name) => normalizeArea(name).includes(query));
    const match = exact ?? (matches.length === 1 ? matches[0] : undefined);
    if (match) {
      setArea(match);
      setKind('all');
      setSearchMessage(`Karta prikazuje lokacije za područje ${match}.`);
    } else {
      setSearchMessage(
        matches.length > 1
          ? 'Više područja odgovara pretrazi. Odaberite područje u izborniku karte.'
          : `Za područje „${searchRequest.query}” još nemamo lokacije na karti. Prethodni prikaz karte ostaje dostupan; podatke o otpadu možete otvoriti iz rezultata pretrage.`,
      );
    }
  }, [searchRequest]);

  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, { scrollWheelZoom: false, fadeAnimation: false });
    map.current = instance;
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(instance);
    tiles.on('tileerror', () => setTileError(true));
    const observer = new ResizeObserver(() => {
      instance.invalidateSize();
      instance.closePopup();
      const points = [...markers.current.values()].map((marker) => marker.getLatLng());
      if (points.length)
        instance.fitBounds(L.latLngBounds(points), { padding: [30, 30], maxZoom: 12 });
    });
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      instance.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    markers.current.forEach((marker) => marker.remove());
    markers.current.clear();
    visible.forEach((yard) => {
      const popup = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = yard.name;
      popup.append(title);
      [
        labels[yard.kind],
        `Područje izvora: ${yard.municipality}`,
        yard.address,
        yard.hours ? `Radno vrijeme prema izvoru: ${yard.hours}` : '',
        yard.phone ? `Telefon: ${yard.phone}` : '',
        yard.materials.length
          ? `Prihvaćeni materijali prema izvoru: ${yard.materials.join(', ')}`
          : 'Prihvaćeni materijali nisu navedeni u izvoru.',
        yard.note,
      ]
        .filter(Boolean)
        .forEach((text) => {
          const p = document.createElement('p');
          p.textContent = text;
          popup.append(p);
        });
      const icon = L.divIcon({
        className: 'yard-marker-wrapper',
        html: `<span class="yard-marker ${yard.kind}"><span></span></span>`,
        iconSize: [30, 38],
        iconAnchor: [15, 36],
        popupAnchor: [0, -30],
      });
      const marker = L.marker([yard.lat, yard.lon], { icon, title: yard.name, alt: yard.name })
        .addTo(instance)
        .bindPopup(popup, { maxWidth: 240, maxHeight: 220 });
      markers.current.set(yard.id, marker);
    });
    if (visible.length)
      instance.fitBounds(L.latLngBounds(visible.map((yard) => [yard.lat, yard.lon])), {
        padding: [30, 30],
        maxZoom: 12,
      });
  }, [kind, area, searchRequest]);

  return (
    <div className="recycling-explorer">
      <div className="recycling-heading">
        <div>
          <p className="home-eyebrow">MJESTA ZA ODGOVORNO ODLAGANJE</p>
          <h2>Reciklažna dvorišta i zeleni otoci</h2>
        </div>
        <span className="badge neutral">{visible.length} lokacija</span>
      </div>
      {searchMessage && (
        <p className="recycling-source" role="status">
          {searchMessage}
        </p>
      )}
      <div className="recycling-toolbar">
        <label htmlFor="yard-area">Područje</label>
        <select
          id="yard-area"
          value={area}
          onChange={(event) => {
            setArea(event.target.value);
            setSearchMessage('');
          }}
        >
          <option value="all">Sva područja ({areas.length})</option>
          {areas.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <label htmlFor="yard-kind">Prikaži</label>
        <select
          id="yard-kind"
          value={kind}
          onChange={(event) => {
            setKind(event.target.value);
            setSearchMessage('');
          }}
        >
          <option value="all">Sve lokacije</option>
          <option value="fixed">Stalna dvorišta</option>
          <option value="mobile">Mobilna dvorišta</option>
          <option value="island">Zeleni otoci</option>
          <option value="collection">Ostale lokacije</option>
        </select>
        <span className="yard-legend">
          <i /> Stalno <i className="mobile" /> Mobilno <i className="island" /> Zeleni otok{' '}
          <i className="collection" /> Ostalo
        </span>
      </div>
      <div
        ref={container}
        className="recycling-map"
        role="region"
        aria-label="Karta reciklažnih dvorišta i zelenih otoka"
      />
      {tileError && (
        <p role="status">Podloga karte nije dostupna. Lokacije možete pregledati u popisu ispod.</p>
      )}
      {visible.length === 0 && (
        <p role="status">Za odabrane filtre nema lokacija s koordinatama.</p>
      )}
      <p className="recycling-source">
        Izvori: dostavljeni GeoJSON, CSV i PDF skupovi s portala data.gov.hr. Prikazano je{' '}
        {yards.length} lokacija iz {areas.length} područja izvora; pokrivenost nije potpuna. Radno
        vrijeme, prihvaćeni otpad i raspored mobilnih dvorišta provjerite kod lokalnog upravitelja.
        Izvorna datoteka navedena je uz svaku lokaciju u popisu.
      </p>
      {unmapped.length > 0 && (
        <details className="recycling-list">
          <summary>Lokacije bez koordinata — nisu prikazane na karti ({unmapped.length})</summary>
          <ul>
            {unmapped.map((yard) => (
              <li key={yard.id}>
                <strong>{yard.name}</strong>
                <span>
                  {yard.address} · {yard.municipality}
                </span>
                <small>Izvor: {yard.source}</small>
              </li>
            ))}
          </ul>
        </details>
      )}
      <details className="recycling-list">
        <summary>Pregledajte popis lokacija ({visible.length})</summary>
        <ul>
          {visible.map((yard) => (
            <li key={yard.id}>
              <button
                type="button"
                onClick={() => {
                  map.current?.setView([yard.lat, yard.lon], 15);
                  markers.current.get(yard.id)?.openPopup();
                  container.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              >
                {yard.name}
              </button>
              <span>
                {yard.address} · {yard.municipality}
              </span>
              <small>
                {[labels[yard.kind], yard.hours, yard.phone].filter(Boolean).join(' · ')}
              </small>
              <small>Izvor: {yard.source}</small>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
