import { moduleUrl } from './navigation';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { api, type Profile, type Years } from './api/client';
import { readSelection, selectionUrl } from './domain';
import { Icon } from './components/Icon';
import { WorkspaceLayout } from './components/Layout';
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

function Explorer() {
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
      profileHeading.current.focus({ preventScroll: true });
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
    <WorkspaceLayout module="explorer">
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
            <Icon name="explore" />
          </div>
          <h2>Odaberite grad ili općinu</h2>
          <p>Prikažite količine otpada po dostupnim godinama.</p>
        </section>
      )}
      {data.status === 'loading' && <Loading message="Učitavanje profila i dostupnih godina…" />}
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
                <span className="badge neutral">
                  {selected?.scope.startsWith('historical_') ? 'Povijesni obuhvat' : 'Javna usluga'}
                </span>
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
            <>
              <MetricCards observation={selected} />
              <div className="context-actions no-print">
                <a className="button primary" href={moduleUrl('compare')}>
                  Usporedi ovu zajednicu →
                </a>
                {selected.target_rate_available && (
                  <a className="button secondary" href={moduleUrl('simulator')}>
                    Istraži scenarij →
                  </a>
                )}
              </div>
            </>
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
              <div className="explorer-history">
                <Quality compact selected={selected} observations={observations} />
                <Suspense fallback={<Loading message="Učitavanje godišnjeg pregleda…" />}>
                  <Trends
                    municipalityName={data.profile.municipality.name}
                    observations={observations}
                    selectedYear={selected?.year ?? null}
                    onYear={chooseYear}
                  />
                </Suspense>
              </div>
              <Sources observations={observations} selectedYear={selected?.year ?? null} />
            </>
          ) : (
            <div className="state-box">
              <Icon name="database" />
              <p>Nema dostupnih opažanja za razdoblje 2017.–2024.</p>
            </div>
          )}
        </div>
      )}
    </WorkspaceLayout>
  );
}

const Home = lazy(() => import('./Home'));
const Compare = lazy(() => import('./compare/Compare'));
const Simulator = lazy(() => import('./simulator/Simulator'));
export default function App() {
  // Old profile links remain valid while '/' becomes the product home.
  if (window.location.pathname === '/' && new URLSearchParams(window.location.search).has('jls')) {
    window.history.replaceState(null, '', `/explorer${window.location.search}`);
  }
  if (window.location.pathname === '/')
    return (
      <Suspense fallback={<Loading />}>
        <Home />
      </Suspense>
    );
  if (window.location.pathname === '/compare')
    return (
      <Suspense fallback={<Loading />}>
        <Compare />
      </Suspense>
    );
  if (window.location.pathname === '/simulator')
    return (
      <Suspense fallback={<Loading />}>
        <Simulator />
      </Suspense>
    );
  return <Explorer />;
}
