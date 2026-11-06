import { moduleUrl } from '../navigation';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';

type Module = 'home' | 'explorer' | 'compare' | 'simulator' | 'guide';
export function WorkspaceLayout({
  module,
  children,
  heading,
}: {
  module: Module;
  children: ReactNode;
  heading?: ReactNode;
}) {
  const title =
    module === 'home'
      ? 'WasteWise'
      : module === 'explorer'
        ? 'Waste Explorer'
        : module === 'compare'
          ? 'Waste Compare'
          : module === 'guide'
            ? 'Waste Guide'
            : 'Waste Simulator';
  const context = window.location.search;
  useEffect(() => {
    document.title = `${title} — ${module === 'home' ? 'Otvoreni podaci o otpadu' : 'WasteWise'}`;
    document.getElementById('page-title')?.focus({ preventScroll: true });
  }, [title, module]);
  return (
    <div className={`app-shell module-${module}`}>
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
            <small>PODACI O KOMUNALNOM OTPADU</small>
          </span>
        </a>
        <nav aria-label="Moduli">
          <a
            className={`nav-link ${module === 'home' ? 'active' : ''}`}
            href="/"
            aria-current={module === 'home' ? 'page' : undefined}
          >
            <Icon name="leaf" />
            Početna
          </a>
          <a
            className={`nav-link ${module === 'explorer' ? 'active' : ''}`}
            href={moduleUrl('explorer', context)}
            aria-current={module === 'explorer' ? 'page' : undefined}
          >
            <Icon name="explore" />
            Waste Explorer
          </a>
          <a
            className={`nav-link ${module === 'compare' ? 'active' : ''}`}
            href={moduleUrl('compare', context)}
            aria-current={module === 'compare' ? 'page' : undefined}
          >
            <Icon name="compare" />
            Waste Compare
          </a>
          <a
            className={`nav-link ${module === 'simulator' ? 'active' : ''}`}
            href={moduleUrl('simulator', context)}
            aria-current={module === 'simulator' ? 'page' : undefined}
          >
            <Icon name="flask" />
            Waste Simulator
          </a>
          <a
            className={`nav-link ${module === 'guide' ? 'active' : ''}`}
            href="/guide"
            aria-current={module === 'guide' ? 'page' : undefined}
          >
            <Icon name="book" />
            Waste Guide
          </a>
        </nav>
        <div className="sidebar-bottom">
          <div className="project-label">
            DATATHON 2026<span>Okoliš i održivi prostor</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span className="breadcrumb">
            <strong>{module === 'home' ? 'Početna' : title}</strong>
          </span>
          <span className="data-period">
            <span className="status-dot" />
            Podaci 2017.–2024.
          </span>
        </header>
        <main id="main-content" tabIndex={-1}>
          {heading ?? (
            <div className="page-heading">
              <div>
                <h1 id="page-title" tabIndex={-1}>
                  {title}
                  <span className="heading-dot">.</span>
                </h1>
                <p>
                  {module === 'guide'
                    ? 'Sadržaj je u pripremi.'
                    : module === 'compare'
                      ? 'Usporedba pokazatelja komunalnog otpada među gradovima i općinama.'
                      : module === 'simulator'
                        ? 'Izračun scenarija preusmjeravanja i prevencije otpada.'
                        : 'Količine i sastav komunalnog otpada po godinama.'}
                </p>
              </div>
              <div className="heading-art" aria-hidden="true">
                <span className="orbit orbit-one" />
                <span className="orbit orbit-two" />
                <Icon
                  name={
                    module === 'guide'
                      ? 'book'
                      : module === 'compare'
                        ? 'compare'
                        : module === 'simulator'
                          ? 'flask'
                          : 'explore'
                  }
                />
                <span className="art-dot" />
              </div>
            </div>
          )}
          {children}
          <footer className="page-footer">
            <span>
              WasteWise <span aria-hidden="true">/</span> Komunalni otpad u Hrvatskoj
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
