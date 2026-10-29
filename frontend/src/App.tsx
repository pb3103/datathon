import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { api, type Profile, type Years } from './api/client';
import { readSelection, selectionUrl } from './domain';
import { Icon } from './components/Icon';
import { MetricCards } from './components/MetricCards';
import { Quality } from './components/Quality';
import { Search } from './components/Search';
import { Sources } from './components/Sources';
import { ErrorState, Loading } from './components/State';
const Trends = lazy(() =>
  import('./components/Trends').then((module) => ({ default: module.Trends })),
);

type DataState =
  | { status: 'idle' | 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; profile: Profile; years: Years };

export default function App() {
  const [selection, setSelection] = useState(readSelection);
  const [data, setData] = useState<DataState>({ status: 'idle' });
  const [attempt, setAttempt] = useState(0);
  const profileHeading = useRef<HTMLHeadingElement>(null);
  const focusOnLoad = useRef(false);

  const navigate = useCallback((id: string | null, year: string | null, replace = false) => {
    const nextUrl = selectionUrl(id, year);
    if (replace) window.history.replaceState(null, '', nextUrl);
    else window.history.pushState(null, '', nextUrl);
    setSelection({ id, year });
  }, []);

  useEffect(() => {
    const back = () => setSelection(readSelection());
    window.addEventListener('popstate', back);
    return () => window.removeEventListener('popstate', back);
  }, []);

  useEffect(() => {
    if (!selection.id) {
      setData({ status: 'idle' });
      return;
    }
    const controller = new AbortController();
    setData({ status: 'loading' });
    Promise.all([
      api.profile(selection.id, controller.signal),
      api.years(selection.id, controller.signal),
    ])
      .then(([profile, years]) => {
        if (!controller.signal.aborted) setData({ status: 'success', profile, years });
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) setData({ status: 'error', message: error.message });
      });
    return () => controller.abort();
  }, [selection.id, attempt]);

  useEffect(() => {
    if (data.status !== 'success') return;
    if (!selection.year && data.years.years.length) {
      const latest = Math.max(...data.years.years.map((year) => year.year));
      navigate(selection.id, String(latest), true);
    }
    if (focusOnLoad.current && profileHeading.current) {
      profileHeading.current.focus();
      focusOnLoad.current = false;
    }
    document.title = `${data.profile.municipality.name} · Waste Explorer`;
  }, [data, selection.id, selection.year, navigate]);

  const observations = data.status === 'success' ? data.profile.observations : [];
  const selected = observations.find((observation) => String(observation.year) === selection.year);
  const knownYear =
    data.status === 'success' &&
    data.years.years.some((year) => String(year.year) === selection.year);
  const chooseYear = (year: number) => navigate(selection.id, String(year));

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Preskoči na sadržaj
      </a>
      <aside className="sidebar" aria-label="WasteWise navigacija">
        <a className="brand" href="/" aria-label="WasteWise početna">
          <span className="brand-mark">
            <svg viewBox="0 0 40 40" aria-hidden="true">
              <path d="m8 12 5 17 7-11 7 11 5-17" />
            </svg>
          </span>
          <span>
            Waste<span className="brand-light">Wise</span>
            <small>PODACI ZA ODRŽIVIJI PROSTOR</small>
          </span>
        </a>
        <div className="nav-section-label">Radni prostor</div>
        <nav aria-label="Moduli">
          <a className="nav-link active" href="#main-content" aria-current="page">
            <Icon name="chart" />
            Waste Explorer
            <span className="nav-active-dot" />
          </a>
          <button className="nav-link" disabled>
            <Icon name="compare" />
            Waste Compare<span className="coming-soon">U pripremi</span>
          </button>
          <button className="nav-link" disabled>
            <Icon name="flask" />
            Waste Simulator<span className="coming-soon">U pripremi</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Icon name="leaf" />
            <strong>
              Bolji uvid.
              <br />
              Odgovornije odluke.
            </strong>
            <p>Razumjeti podatke prvi je korak prema održivijoj zajednici.</p>
          </div>
          <div className="project-label">
            DATATHON 2026<span>Okoliš i održivi prostor</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span className="breadcrumb">
            Radni prostor <span aria-hidden="true">/</span> <strong>Waste Explorer</strong>
          </span>
          <span className="data-period">
            <span className="status-dot" />
            Podaci 2021.–2024.
          </span>
        </header>
        <main id="main-content" tabIndex={-1}>
          <div className="page-heading">
            <div>
              <p className="eyebrow">ISTRAŽITE SVOJU ZAJEDNICU</p>
              <h1>
                Waste Explorer<span className="heading-dot">.</span>
              </h1>
              <p>
                Komunalni otpad, jasnije. Pronađite grad ili općinu
                <br className="desktop-break" /> i istražite podatke u njihovom kontekstu.
              </p>
            </div>
            <div className="heading-art" aria-hidden="true">
              <span className="orbit orbit-one" />
              <span className="orbit orbit-two" />
              <Icon name="leaf" />
              <span className="art-dot" />
            </div>
          </div>
          <Search
            onSelect={(municipality) => {
              focusOnLoad.current = true;
              setData({ status: 'loading' });
              navigate(municipality.id, null);
              if (municipality.id === selection.id) setAttempt((value) => value + 1);
            }}
          />
          {data.status === 'idle' && (
            <section className="welcome-state">
              <div className="welcome-icon">
                <Icon name="chart" />
              </div>
              <h2>Svaka zajednica ima svoju priču.</h2>
              <p>
                Odaberite grad ili općinu da biste pregledali količine otpada,
                <br className="desktop-break" /> odvojeno sakupljanje i izvore podataka.
              </p>
              <div className="welcome-steps">
                <span>
                  <b>01</b>Pronađite zajednicu
                </span>
                <span>
                  <b>02</b>Odaberite godinu
                </span>
                <span>
                  <b>03</b>Istražite podatke
                </span>
              </div>
            </section>
          )}
          {data.status === 'loading' && (
            <Loading message="Učitavanje profila i dostupnih godina…" />
          )}
          {data.status === 'error' && (
            <ErrorState message={data.message} onRetry={() => setAttempt((value) => value + 1)} />
          )}
          {data.status === 'success' && (
            <div className="profile-content">
              <section className="profile-heading" aria-label="Odabrana zajednica i godina">
                <div>
                  <p className="eyebrow">
                    <Icon name="pin" />
                    {data.profile.municipality.county}
                  </p>
                  <h2 ref={profileHeading} tabIndex={-1}>
                    {data.profile.municipality.name}
                    <span className="badge neutral">Javna usluga</span>
                  </h2>
                </div>
                <div className="year-select">
                  <label htmlFor="selected-year">Godina podataka</label>
                  <select
                    id="selected-year"
                    value={knownYear ? selection.year! : ''}
                    onChange={(event) => chooseYear(Number(event.target.value))}
                    disabled={!data.years.years.length}
                  >
                    <option value="" disabled>
                      {data.years.years.length ? 'Odaberite godinu' : 'Nema dostupnih godina'}
                    </option>
                    {[...data.years.years]
                      .sort((a, b) => b.year - a.year)
                      .map((year) => (
                        <option key={year.year} value={year.year}>
                          {year.year}.
                        </option>
                      ))}
                  </select>
                </div>
              </section>
              <p className="sr-only" role="status" aria-live="polite">
                {selected
                  ? `Prikazani podaci za ${data.profile.municipality.name}, ${selected.year}. godinu.`
                  : 'Za odabranu godinu nema podatka.'}
              </p>
              {selected ? (
                <MetricCards observation={selected} />
              ) : (
                <div className="notice warning" role="status">
                  <Icon name="info" />
                  <div>
                    <strong>Nema podatka za odabranu godinu</strong>
                    <p>
                      {selection.year
                        ? `Godina „${selection.year}” nije dostupna u ovom profilu. Odaberite jednu od dostupnih godina.`
                        : 'Za ovu zajednicu nema dostupnih godišnjih podataka.'}
                    </p>
                  </div>
                </div>
              )}
              {observations.length > 0 ? (
                <>
                  <Quality selected={selected} observations={observations} />
                  <Suspense fallback={<Loading message="Učitavanje godišnjeg pregleda…" />}>
                    <Trends
                      observations={observations}
                      selectedYear={selected?.year ?? null}
                      onYear={chooseYear}
                    />
                  </Suspense>
                  <Sources observations={observations} selectedYear={selected?.year ?? null} />
                </>
              ) : (
                <div className="state-box">
                  <Icon name="database" />
                  <p>Nema dostupnih opažanja za razdoblje 2021.–2024.</p>
                </div>
              )}
            </div>
          )}
          <footer className="page-footer">
            <span>
              WasteWise <span aria-hidden="true">/</span> Podaci s kontekstom.
            </span>
            <span>Odvojeno sakupljanje ≠ recikliranje</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
