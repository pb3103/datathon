import { Icon } from '../components/Icon';
import { foodStatistic } from './content';
import { Source } from './GuideSources';

export function PackagingRegulation() {
  return (
    <article className="guide-ppwr" aria-labelledby="ppwr-title">
      <p className="guide-eyebrow">EU REGULATIVA · AMBALAŽA</p>
      <h3 id="ppwr-title">PPWR — nova europska pravila za ambalažu</h3>
      <p>
        Uredba (EU) 2025/40 uvodi pravila za smanjenje ambalažnog otpada, poticanje ponovne uporabe
        i poboljšanje mogućnosti recikliranja ambalaže.
      </p>
      <div className="guide-ppwr-ideas">
        <div>
          <Icon name="leaf" />
          <div>
            <h4>Manje nepotrebne ambalaže</h4>
            <p>Manje materijala i sprječavanje nastanka otpada.</p>
          </div>
        </div>
        <div>
          <Icon name="refresh" />
          <div>
            <h4>Više ponovne uporabe</h4>
            <p>Višekratna rješenja gdje je primjenjivo.</p>
          </div>
        </div>
        <div>
          <Icon name="database" />
          <div>
            <h4>Bolja mogućnost recikliranja</h4>
            <p>Dizajn ambalaže koji olakšava obradu.</p>
          </div>
        </div>
      </div>
      <p>
        Pravila postupno utječu na ambalažu proizvoda koje kupujemo, njezino označavanje i
        mogućnosti ponovne uporabe.
      </p>
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
      <div className="guide-ppwr-sources">
        <Source id="ppwr" />
        <Source id="packagingEu" />
      </div>
    </article>
  );
}

export function FoodStatistic() {
  return (
    <article className="guide-food-statistic" aria-labelledby="food-statistic-title">
      <div>
        <h3 id="food-statistic-title">Otpad od hrane u Hrvatskoj</h3>
        <p className="guide-stat-number">
          <strong>{foodStatistic.value}</strong>
          <span>{foodStatistic.unit}</span>
        </p>
        <span className="guide-stat-year">{foodStatistic.referenceYear}. · kućanstva</span>
      </div>
      <div className="guide-stat-copy">
        <p>{foodStatistic.scope}</p>
        <p className="guide-action">
          <span aria-hidden="true">↳</span> {foodStatistic.tip}
        </p>
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
