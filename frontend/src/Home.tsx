import { WorkspaceLayout } from './components/Layout';
import { Search } from './components/Search';
import { Icon } from './components/Icon';

const steps = [
  {
    path: 'explorer',
    name: 'Waste Explorer',
    verb: 'Istražite',
    icon: 'chart' as const,
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
    text: 'Istražite hipotetske promjene u količinama otpada i stopi odvojenog sakupljanja.',
  },
];

export default function Home() {
  const hero = (
    <section className="home-hero" aria-labelledby="page-title">
      <div className="home-hero-copy">
        <p className="home-product">
          <span aria-hidden="true" className="home-product-mark">
            <Icon name="leaf" />
          </span>
          WasteWise<span className="home-product-dot">.</span>
        </p>
        <p className="home-eyebrow">KOMUNALNI OTPAD · HRVATSKA</p>
        <h1 id="page-title" tabIndex={-1}>
          Od podataka do <span>održivijih odluka.</span>
        </h1>
        <p className="home-lead">
          Istražite podatke o komunalnom otpadu u hrvatskim gradovima i općinama, usporedite
          rezultate i istražite moguće scenarije promjena.
        </p>
        <p className="home-audience">Za građane i jedinice lokalne samouprave.</p>
      </div>
      <div className="home-start">
        <div className="home-start-heading">
          <span className="home-start-icon" aria-hidden="true">
            <Icon name="pin" />
          </span>
          <div>
            <p>Započnite ovdje</p>
            <h2>Pronađite svoj grad ili općinu</h2>
          </div>
        </div>
        <Search
          onSelect={(m) => {
            window.location.href = `/explorer?${new URLSearchParams({ jls: m.id })}`;
          }}
        />
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
                  Otvori {step.name}
                  <span aria-hidden="true">↗</span>
                </span>
              </a>
            </li>
          ))}
        </ol>
      </section>
      <section className="home-data-note" aria-labelledby="home-data-title">
        <div className="home-data-icon" aria-hidden="true">
          <Icon name="database" />
        </div>
        <div>
          <h2 id="home-data-title">Odakle dolaze podaci?</h2>
          <p>
            WasteWise se temelji na javno dostupnim izvješćima o komunalnom otpadu i pripadajućim
            XLSX podacima po gradovima i općinama za <strong>2017.–2024.</strong> Izvori i
            metodološka ograničenja dostupni su uz pokazatelje u modulima.
          </p>
          <p className="home-data-caveat">
            Rezultati Simulatora hipotetski su matematički scenariji, a ne prognoze ili preporuke.
            Odvojeno sakupljanje nije recikliranje.
          </p>
        </div>
        <span className="home-data-period">
          2017<span aria-hidden="true">—</span>2024
        </span>
      </section>
    </WorkspaceLayout>
  );
}
