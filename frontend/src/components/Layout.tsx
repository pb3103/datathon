import { moduleUrl } from '../navigation';
import { useEffect, useRef, useState } from 'react';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const context = window.location.search;
  useEffect(() => {
    if (!menuOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !sidebarRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [menuOpen]);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 761px)');
    const close = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    desktop.addEventListener('change', close);
    return () => desktop.removeEventListener('change', close);
  }, []);
  useEffect(() => {
    document.title = `${title} — ${module === 'home' ? 'Otvoreni podaci o otpadu' : 'WasteWise'}`;
    document.getElementById('page-title')?.focus({ preventScroll: true });
  }, [title, module]);
  return (
    <div className={`app-shell module-${module}`}>
      <a className="skip-link" href="#main-content">
        Preskoči na sadržaj
      </a>
      <aside
        ref={sidebarRef}
        className={`sidebar ${menuOpen ? 'mobile-menu-open' : ''}`}
        aria-label="WasteWise navigacija"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false);
        }}
      >
        <button
          ref={menuButtonRef}
          className="mobile-menu-toggle"
          type="button"
          aria-label={menuOpen ? 'Zatvori izbornik' : 'Otvori izbornik'}
          aria-expanded={menuOpen}
          aria-controls="workspace-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d={menuOpen ? 'M6 6l12 12M18 6 6 18' : 'M4 6h16M4 12h16M4 18h16'} />
          </svg>
        </button>
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
        <nav
          id="workspace-navigation"
          aria-label="Moduli"
          onClick={(event) => {
            if (event.target instanceof Element && event.target.closest('a')) setMenuOpen(false);
          }}
        >
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
                    ? 'Praktične upute za smanjenje i odvajanje otpada.'
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
