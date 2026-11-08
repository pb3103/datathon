import { Icon } from '../components/Icon';
import { foodStatistic } from './content';
import { Source } from './GuideSources';

export function PackagingRegulation() {
  return (
    <details className="guide-ppwr guide-eu-accordion">
      <summary>
        <div>
          <span className="guide-ppwr-kicker">EU UREDBA · AMBALAŽA</span>
          <h3 id="ppwr-title">PPWR: nova pravila za ambalažu</h3>
          <p>Manje ambalažnog otpada, više ponovne uporabe i bolja mogućnost recikliranja.</p>
        </div>
        <span className="guide-ppwr-control" aria-hidden="true">
          <span className="guide-ppwr-open-label">Saznaj više</span>
          <span className="guide-ppwr-close-label">Sažmi</span>
          <svg className="guide-eu-expand" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="m5 7.5 5 5 5-5"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </summary>
      <div className="guide-eu-accordion-body">
        <div className="guide-ppwr-main">
          <div className="guide-ppwr-intro">
            <svg
              className="guide-packaging-art"
              viewBox="0 0 180 140"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M17 94C3 65 37 65 41 40c4-32 55-31 72-3 15 23 58 23 55 55-2 32-45 34-77 31-33 6-66 2-74-29Z"
                fill="#edf3e5"
              />
              <g stroke="#3f6042" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round">
                <path
                  d="M124 37V24h13v13l7 12v56c0 4-4 6-7 6h-17c-4 0-7-2-7-6V49l11-12Z"
                  fill="#e0e9d7"
                />
                <path
                  d="M124 24v-9h13v9M30 72l39-18 39 18-39 19-39-19Zm0 0v35l39 18 39-18V72M69 91v34"
                  fill="#fafcf6"
                />
                <path d="m49 63 39 19v13l-8-3V80L59 59" fill="#abc394" />
                <path d="m25 35 7 7m8-20 4 10m12-14 1 11" stroke="#88a46f" />
              </g>
            </svg>
            <div>
              <h4>Što se mijenja?</h4>
              <p>
                Uredba (EU) 2025/40 uvodi pravila za smanjenje ambalažnog otpada, poticanje ponovne
                uporabe i poboljšanje mogućnosti recikliranja ambalaže.
              </p>
            </div>
          </div>
          <div className="guide-ppwr-ideas">
            <div>
              <div>
                <Icon name="leaf" />
                <h4>Manje nepotrebne ambalaže</h4>
                <p>Manje materijala i sprječavanje nastanka otpada.</p>
              </div>
            </div>
            <div>
              <div>
                <Icon name="refresh" />
                <h4>Više ponovne uporabe</h4>
                <p>Višekratna rješenja gdje je primjenjivo.</p>
              </div>
            </div>
            <div>
              <div>
                <Icon name="database" />
                <h4>Bolja mogućnost recikliranja</h4>
                <p>Dizajn ambalaže koji olakšava obradu.</p>
              </div>
            </div>
          </div>
          <p className="guide-ppwr-practical">
            <Icon name="info" />
            <span>
              Pravila postupno utječu na ambalažu proizvoda koje kupujemo, njezino označavanje i
              mogućnosti ponovne uporabe.
            </span>
          </p>
        </div>
        <div className="guide-ppwr-timing">
          <p className="guide-ppwr-section-label">Ključni datumi</p>
          <dl className="guide-ppwr-dates">
            <div>
              <dt>Stupanje na snagu</dt>
              <dd>
                <time dateTime="2025-02-11">11. veljače 2025.</time>
              </dd>
            </div>
            <div>
              <dt>Početak opće primjene</dt>
              <dd>
                <time dateTime="2026-08-12">12. kolovoza 2026.</time>
              </dd>
            </div>
          </dl>
          <p className="guide-small">
            Pojedine obveze imaju zasebne rokove i uvode se postupno, ovisno o odredbi.
          </p>
        </div>
        <div className="guide-ppwr-sources">
          <Source id="ppwr" />
          <Source id="packagingEu" />
        </div>
      </div>
    </details>
  );
}

export function FoodStatistic() {
  return (
    <article className="guide-food-statistic" aria-labelledby="food-statistic-title">
      <header className="guide-stat-heading">
        <div>
          <h3 id="food-statistic-title">Otpad od hrane u Hrvatskoj</h3>
          <span className="guide-stat-year">{foodStatistic.referenceYear}. · kućanstva</span>
        </div>
        <Icon name="leaf" />
      </header>
      <p className="guide-stat-number">
        <strong>
          {foodStatistic.value} <small>kg</small>
        </strong>
        <span>{foodStatistic.unit.replace(/^kg /, '')}</span>
      </p>
      <div className="guide-stat-copy">
        <p>{foodStatistic.scope}</p>
      </div>
      <p className="guide-stat-tip">
        <Icon name="info" />
        <span>{foodStatistic.tip}</span>
      </p>
      <div className="guide-stat-footer">
        <Source id={foodStatistic.source} />
        <details className="guide-stat-details">
          <summary>Obuhvat istraživanja</summary>
          <p>
            {foodStatistic.methodology} Izvješće je objavljeno {foodStatistic.publicationYear}.
          </p>
        </details>
      </div>
    </article>
  );
}

function GreenSymbol({ kind }: { kind: 'climate' | 'cart' | 'repair' | 'bin' | 'recycle' }) {
  const paths = {
    climate: 'M6 18h12a4 4 0 0 0 0-8 6 6 0 0 0-11-2 5 5 0 0 0-1 10Z',
    cart: 'M2 3h3l3 12h11l3-9H6M9 19h.01M18 19h.01',
    repair: 'm14 6 4-4a6 6 0 0 1-7 8L4 20a2 2 0 0 1-3-3l10-7a6 6 0 0 1 8-7l-4 4Z',
    bin: 'M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7',
    recycle: 'm9 4 3-3 5 8m-4-1 4 1 1-4M20 12l3 4-5 5h-5m2-3-2 3 3 2M8 21H3l-2-5 5-8m-1 4 1-4 4 1',
  };
  return (
    <svg
      className="icon guide-green-symbol"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[kind]} />
    </svg>
  );
}

export function GreenDeal() {
  return (
    <details className="guide-green-deal guide-eu-accordion">
      <summary>
        <div>
          <span className="guide-ppwr-kicker">EU STRATEGIJA · ODRŽIVOST</span>
          <h3>Europski zeleni plan</h3>
          <p>
            Europska strategija za klimatski neutralno gospodarstvo, učinkovitiju uporabu resursa i
            manje otpada.
          </p>
        </div>
        <span className="guide-ppwr-control" aria-hidden="true">
          <span className="guide-ppwr-open-label">Saznaj više</span>
          <span className="guide-ppwr-close-label">Sažmi</span>
          <svg className="guide-eu-expand" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="m5 7.5 5 5 5-5"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </summary>
      <div className="guide-eu-accordion-body guide-green-body">
        <div className="guide-green-intro">
          <div className="guide-green-year">
            <Icon name="leaf" />
            <strong>2050.</strong>
            <span>Klimatska neutralnost</span>
          </div>
          <div>
            <h4>Što je Europski zeleni plan?</h4>
            <p>
              Europski zeleni plan pokrenut je 2019. za prijelaz na klimatski neutralno
              gospodarstvo, učinkovitiju uporabu resursa i zaštitu okoliša. Riječ je o strateškom
              okviru, a ne o jednom propisu.
            </p>
          </div>
          <svg
            className="guide-green-landscape"
            viewBox="0 0 320 150"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M0 150c49-50 70-64 113-42 34-76 67-100 111-67 32-31 62-24 96 1v108Z"
              fill="#edf3e5"
            />
            <path d="M0 150c63-27 95-57 152-40 55-41 112-37 168-12v52Z" fill="#dce8cb" />
            <path d="M61 150c88-46 161-48 259-17v17Z" fill="#cbdcb6" />
            <path d="M217 119V49m-37 73V68m77 62V68" stroke="#b2c49d" strokeWidth="4" />
            <ellipse cx="217" cy="58" rx="20" ry="44" fill="#a9bf96" fillOpacity=".78" />
            <path d="M217 14c-10 18-10 63 0 88Z" fill="#95af80" fillOpacity=".55" />
            <ellipse cx="180" cy="77" rx="16" ry="32" fill="#c0d2ad" fillOpacity=".8" />
            <ellipse cx="257" cy="83" rx="17" ry="31" fill="#aec69a" fillOpacity=".8" />
            <path d="M257 52c-6 15-6 46 0 62Z" fill="#9cb787" fillOpacity=".45" />
          </svg>
        </div>
        <h4 className="guide-green-areas-title">Tri glavna područja</h4>
        <div className="guide-green-goals" aria-label="Ključni ciljevi Zelenog plana">
          <div>
            <GreenSymbol kind="climate" />
            <h4>Klima</h4>
            <p>
              Smanjenje emisija stakleničkih plinova i prijelaz prema klimatski neutralnom
              gospodarstvu.
            </p>
          </div>
          <div className="guide-green-circular">
            <span className="guide-ppwr-kicker">POSEBNO VAŽNO ZA WASTEWISE</span>
            <Icon name="refresh" />
            <h4>Kružno gospodarstvo</h4>
            <p>
              Proizvodi se dulje koriste, popravljaju, ponovno upotrebljavaju i recikliraju, čime se
              smanjuje otpad i štede resursi.
            </p>
          </div>
          <div>
            <Icon name="leaf" />
            <h4>Čišći i zdraviji okoliš</h4>
            <p>Smanjenje onečišćenja i zaštita prirode i zdravlja ljudi.</p>
          </div>
        </div>
        <div className="guide-green-practice">
          <h4>Kružno gospodarstvo u svakodnevici</h4>
          <p>Manje kupujte, dulje koristite, pravilno odvajajte i omogućite oporabu materijala.</p>
          <ol className="guide-green-steps">
            <li>
              <GreenSymbol kind="cart" />
              <strong>Smanjite</strong>
              <span>Izbjegnite nepotrebnu potrošnju.</span>
            </li>
            <li>
              <GreenSymbol kind="repair" />
              <strong>Popravite</strong>
              <span>Produljite vijek proizvoda i ponovno ih upotrijebite.</span>
            </li>
            <li>
              <GreenSymbol kind="bin" />
              <strong>Odvojite</strong>
              <span>Pravilno razvrstajte otpad.</span>
            </li>
            <li>
              <GreenSymbol kind="recycle" />
              <strong>Omogućite oporabu</strong>
              <span>Predajte materijale na odgovarajuću obradu i recikliranje.</span>
            </li>
          </ol>
          <p className="guide-small">
            Četiri praktična načela, a ne obvezan slijed za svaki predmet. Samo odvajanje otpada ne
            jamči recikliranje.
          </p>
        </div>
        <div className="guide-ppwr-sources">
          <Source id="greenDeal" />
        </div>
      </div>
    </details>
  );
}
