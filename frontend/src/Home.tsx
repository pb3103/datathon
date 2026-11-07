import { useState } from 'react';
import { WorkspaceLayout } from './components/Layout';
import AreaSearch from './components/AreaSearch';
import type { AreaSelection } from './recycling';
import RecyclingMap from './components/RecyclingMap';
import { Icon } from './components/Icon';

const steps = [
  {
    path: 'explorer',
    name: 'Waste Explorer',
    verb: 'Istražite',
    icon: 'explore' as const,
    text: 'Odaberite grad ili općinu i pregledajte dostupne podatke o komunalnom otpadu.',
  },
  {
    path: 'compare',
    name: 'Waste Compare',
    verb: 'Usporedite',
    icon: 'compare' as const,
    text: 'Usporedite pokazatelje više zajednica i istražite njihove razlike.',
  },
  {
    path: 'simulator',
    name: 'Waste Simulator',
    verb: 'Simulirajte',
    icon: 'flask' as const,
    text: 'Izračunajte promjene količina otpada za odabrani scenarij.',
  },
  {
    path: 'guide',
    name: 'Waste Guide',
    verb: 'Saznajte',
    icon: 'book' as const,
    text: 'Savjeti o pravilnom odvajanju otpada, ciljevi i provjera znanja. Sadržaj je u pripremi.',
  },
];

export default function Home() {
  const [mapSearch, setMapSearch] = useState<AreaSelection>(null);
  const hero = (
    <section className="home-hero" aria-labelledby="page-title">
      <div className="home-hero-copy">
        <p className="home-eyebrow">KOMUNALNI OTPAD · HRVATSKA</p>
        <h1 id="page-title" tabIndex={-1}>
          Od podataka do <span>pametnijih odluka.</span>
        </h1>
        <p className="home-lead">
          Istražite gospodarenje otpadom u hrvatskim gradovima i općinama, usporedite rezultate i
          simulirajte moguće promjene.
        </p>
        <ul className="home-hero-facts" aria-label="Obuhvat podataka">
          <li>556 gradova i općina</li>
          <li>2017.–2024.</li>
          <li>Otvoreni podaci</li>
        </ul>
        <a
          className="mobile-map-shortcut"
          href="#waste-map"
          onClick={(event) => {
            event.preventDefault();
            if (window.location.hash !== '#waste-map')
              window.history.pushState(null, '', '#waste-map');
            document.getElementById('map-search-title')?.focus({ preventScroll: true });
            document.getElementById('waste-map')?.scrollIntoView({ block: 'start' });
          }}
        >
          <Icon name="pin" />
          <span>Pronađi lokacije na karti</span>
          <span aria-hidden="true">↓</span>
        </a>
      </div>
      <div className="heading-art home-heading-art" aria-hidden="true">
        <span className="orbit orbit-one" />
        <span className="orbit orbit-two" />
        <Icon name="leaf" />
        <span className="art-dot" />
      </div>
    </section>
  );
  return (
    <WorkspaceLayout module="home" heading={hero}>
      <section className="home-workflow" aria-labelledby="home-workflow-title">
        <div className="home-section-heading">
          <div>
            <p className="home-eyebrow">OD PREGLEDA DO SCENARIJA</p>
            <h2 id="home-workflow-title">Kako funkcionira?</h2>
          </div>
        </div>
        <ol className="home-steps">
          {steps.map((step, i) => (
            <li key={step.path} className="home-step">
              <a
                className="home-step-card"
                href={`/${step.path}`}
                aria-label={`Otvori ${step.name}`}
              >
                <div className="home-step-top">
                  <span className="home-step-number">
                    0{i + 1}
                    <span aria-hidden="true"> — </span>
                    <span>{step.verb}</span>
                  </span>
                  <span className="home-step-icon" aria-hidden="true">
                    <Icon name={step.icon} />
                  </span>
                </div>
                <h3>{step.name}</h3>
                <p>{step.text}</p>
                <span className="home-step-link">
                  {step.path === 'guide' ? 'U pripremi' : `Otvori ${step.name}`}
                  <span aria-hidden="true">↗</span>
                </span>
              </a>
            </li>
          ))}
        </ol>
      </section>
      <section
        className="home-discovery"
        id="waste-map"
        aria-label="Istražite svoju zajednicu i reciklažna dvorišta"
      >
        <div className="home-start">
          <div className="home-start-heading">
            <span className="home-start-icon" aria-hidden="true">
              <Icon name="pin" />
            </span>
            <div>
              <p>Započnite ovdje</p>
              <h2 id="map-search-title" tabIndex={-1}>
                Pronađite svoj grad ili općinu
              </h2>
            </div>
          </div>
          <AreaSearch
            onChoose={(area) =>
              setMapSearch((old) => ({ id: area.id, attempt: (old?.attempt ?? 0) + 1 }))
            }
          />
        </div>
        <RecyclingMap selection={mapSearch} />
      </section>
      <section className="home-data-note" aria-labelledby="home-data-title">
        <div className="home-data-icon" aria-hidden="true">
          <Icon name="database" />
        </div>
        <div>
          <h2 id="home-data-title">Odakle dolaze podaci?</h2>
          <div className="home-data-sources">
            <div className="home-data-source">
              <h3>Komunalni otpad · 2017.–2024.</h3>
              <p>
                Službena godišnja izvješća i pripadajuće XLSX tablice s podacima po gradovima i
                općinama. Izvori i metodološka ograničenja navedeni su uz pokazatelje u modulima.
              </p>
            </div>
            <div className="home-data-source">
              <h3>Reciklažna dvorišta i zeleni otoci</h3>
              <p>
                Dostavljeni skupovi s Portala otvorenih podataka Republike Hrvatske —{' '}
                <a
                  href="https://data.gov.hr/ckan/hr/dataset/reciklazna-dvorista-grada-zagreba1/resource/36ca7d0d-4e86-42a1-88e3-826acf4ce8a7?inner_span=True"
                  target="_blank"
                  rel="noreferrer"
                >
                  data.gov.hr (zagrebački skup)
                </a>
                . Karta obuhvaća Zagreb i druge gradove i općine prema dostupnim izvorima. Popis
                nije potpun.
              </p>
            </div>
            <div className="home-data-source">
              <h3>Dodatne lokacije · OpenStreetMap</h3>
              <p>
                <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
                  © OpenStreetMap suradnici, ODbL
                </a>
                . Podaci su preuzeti 1. studenoga 2026. i prikazani kao zaseban, zajednički
                uređivani sloj, odvojen od podataka s data.gov.hr. Nisu potpun službeni registar
                niti potvrda aktualnosti lokacija.
              </p>
            </div>
          </div>
        </div>
        <span className="home-data-period">
          2017<span aria-hidden="true">—</span>2024
        </span>
      </section>
    </WorkspaceLayout>
  );
}
