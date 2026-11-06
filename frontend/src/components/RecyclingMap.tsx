import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { recyclingLocations as yards, recyclingAreas, type AreaSelection } from '../recycling';

const labels: Record<string, string> = {
  fixed: 'Stalno reciklažno dvorište',
  mobile: 'Mobilno reciklažno dvorište',
  island: 'Zeleni otok',
  collection: 'Lokacija za prikupljanje otpada',
};

export default function RecyclingMap({ selection }: { selection?: AreaSelection }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const group = useRef<L.MarkerClusterGroup | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const [kind, setKind] = useState('all');
  const [areaId, setAreaId] = useState('all');
  const [source, setSource] = useState('all');
  const [tileError, setTileError] = useState(false);
  const [viewport, setViewport] = useState<L.LatLngBounds | null>(null);
  const area = recyclingAreas.find((item) => item.id === areaId);
  const visible = yards.filter(
    (yard) =>
      (kind === 'all' || yard.kind === kind) &&
      (areaId === 'all' || yard.areaId === areaId) &&
      (source === 'all' || yard.sourceGroup === source),
  );
  const listed = visible.filter((yard) => !viewport || viewport.contains([yard.lat, yard.lon]));
  const view = useRef<{ points: L.LatLngExpression[]; bounds?: L.LatLngBoundsExpression }>({
    points: [],
  });

  function fitView() {
    const instance = map.current;
    if (!instance) return;
    if (view.current.points.length)
      instance.fitBounds(L.latLngBounds(view.current.points), {
        padding: [32, 32],
        maxZoom: 13,
        animate: false,
      });
    else if (view.current.bounds)
      instance.fitBounds(view.current.bounds, { padding: [24, 24], maxZoom: 12, animate: false });
  }

  useEffect(() => {
    if (selection) {
      setAreaId(selection.id);
      setKind('all');
      setSource('all');
    }
  }, [selection]);

  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, {
      scrollWheelZoom: false,
      fadeAnimation: false,
      zoomAnimation: false,
      markerZoomAnimation: false,
    });
    map.current = instance;
    const updateViewport = () => setViewport(instance.getBounds());
    instance.on('moveend zoomend', updateViewport);
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · <a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL</a>',
      maxZoom: 19,
    }).addTo(instance);
    tiles.on('tileerror', () => setTileError(true));
    group.current = L.markerClusterGroup({
      maxClusterRadius: 45,
      showCoverageOnHover: false,
      disableClusteringAtZoom: 13,
      animate: false,
      spiderfyOnMaxZoom: true,
    }).addTo(instance);
    const observer = new ResizeObserver(() => {
      instance.invalidateSize();
      instance.closePopup();
      fitView();
    });
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      instance.off('moveend zoomend', updateViewport);
      instance.remove();
      map.current = null;
      group.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !group.current) return;
    instance.closePopup();
    group.current.clearLayers();
    markers.current.clear();
    visible.forEach((yard) => {
      const popup = document.createElement('div');
      const title = document.createElement('strong');
      const hasName = yard.name.trim() && !yard.name.includes('naziv nije naveden');
      const address =
        yard.address && !yard.address.startsWith('Adresa nije navedena') ? yard.address : '';
      const complete = hasName && address && yard.hours;
      title.textContent = complete ? yard.name : labels[yard.kind];
      popup.append(title);
      const details = complete
        ? [address, `Radno vrijeme: ${yard.hours}`]
        : [`${yard.municipality}, ${yard.county}`];
      details.forEach((text) => {
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
      const marker = L.marker([yard.lat, yard.lon], {
        icon,
        title: yard.name,
        alt: yard.name,
      }).bindPopup(popup, { maxWidth: 240, maxHeight: 220 });
      group.current!.addLayer(marker);
      markers.current.set(yard.id, marker);
    });
    const b = area?.bounds;
    view.current = {
      points: visible.map((yard) => [yard.lat, yard.lon] as L.LatLngTuple),
      bounds: b
        ? [
            [b[1], b[0]],
            [b[3], b[2]],
          ]
        : undefined,
    };
    fitView();
  }, [kind, areaId, source, selection]);

  return (
    <div className="recycling-explorer">
      <div className="recycling-heading">
        <div>
          <p className="home-eyebrow">MJESTA ZA ODGOVORNO ODLAGANJE</p>
          <h2>Reciklažna dvorišta i zeleni otoci</h2>
        </div>
        <span className="badge neutral" data-testid="map-count">
          {visible.length} lokacija
        </span>
      </div>
      <div className="recycling-area-heading">
        <strong>
          {area ? `${area.name} · ${area.county}` : 'Hrvatska · sva dostupna područja'}
        </strong>
        {area && (
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setAreaId('all');
              setKind('all');
              setSource('all');
            }}
          >
            Prikaži cijelu Hrvatsku
          </button>
        )}
      </div>
      <div className="recycling-toolbar">
        <label htmlFor="yard-kind">Prikaži</label>
        <select id="yard-kind" value={kind} onChange={(event) => setKind(event.target.value)}>
          <option value="all">Sve lokacije</option>
          <option value="fixed">Stalna dvorišta</option>
          <option value="mobile">Mobilna dvorišta</option>
          <option value="island">Zeleni otoci</option>
          <option value="collection">Ostale lokacije</option>
        </select>
        <span className="yard-legend">
          <span className="yard-legend-item">
            <i /> Stalno
          </span>
          <span className="yard-legend-item">
            <i className="mobile" /> Mobilno
          </span>
          <span className="yard-legend-item">
            <i className="island" /> Zeleni otok
          </span>
          <span className="yard-legend-item">
            <i className="collection" /> Ostalo
          </span>
        </span>
      </div>
      <div className="recycling-sources" role="group" aria-label="Izvor lokacija">
        {[
          ['all', 'Svi izvori'],
          ['portal', 'data.gov.hr'],
          ['osm', 'OpenStreetMap'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={source === value}
            onClick={() => setSource(value)}
          >
            {label}
          </button>
        ))}
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
      {!visible.length && (
        <p role="status">
          Za {area?.name ?? 'odabrano područje'} nema lokacija koje odgovaraju odabranim filtrima u
          našem skupu. To ne znači da lokacije ne postoje.
          {area?.bounds
            ? ' Karta prikazuje područje.'
            : ' Granice područja nisu dostupne u ovom izvoru.'}
        </p>
      )}
      <details className="recycling-list">
        <summary>Pregledajte popis lokacija ({listed.length})</summary>
        {!listed.length && <p>Nema lokacija u trenutačnom prikazu karte.</p>}
        <ul>
          {listed.map((yard) => (
            <li key={yard.id}>
              <button
                type="button"
                onClick={() => {
                  const marker = markers.current.get(yard.id);
                  if (marker) group.current?.zoomToShowLayer(marker, () => marker.openPopup());
                  container.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              >
                {yard.name.includes('naziv nije naveden') ? labels[yard.kind] : yard.name}
              </button>
              <span>
                {yard.address.startsWith('Adresa nije navedena')
                  ? yard.municipality
                  : `${yard.address} · ${yard.municipality}`}
              </span>
              <small>{[labels[yard.kind], yard.hours].filter(Boolean).join(' · ')}</small>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
