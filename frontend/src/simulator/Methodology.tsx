import { useId } from 'react';

export function Methodology({ print = false }: { print?: boolean }) {
  const symbolsId = useId();
  return (
    <details
      className={`formula-details ${print ? 'print-methodology' : ''}`}
      open={print || undefined}
    >
      <summary>Formule i metodološka objašnjenja</summary>
      <div className="methodology-content">
        <section className="formula-symbols" aria-labelledby={symbolsId}>
          <h3 id={symbolsId}>Što znače oznake?</h3>
          <dl>
            {[
              ['T', 'Ukupno sakupljeni otpad (t)'],
              ['M', 'Miješani otpad (t)'],
              ['S', 'Odvojeno sakupljeni otpad u modelu (t)'],
              ['D', 'Količina koja se preusmjerava ili čiji se nastanak sprječava (t)'],
              ['g', 'Željeni postotak odvojenog sakupljanja (%)'],
              ['P', 'Broj stanovnika obuhvaćenih uslugom'],
            ].map(([symbol, meaning]) => (
              <div key={symbol}>
                <dt>{symbol}</dt>
                <dd>{meaning}</dd>
              </div>
            ))}
          </dl>
          <p>Oznaka ′ označava stanje nakon promjene: primjerice, T′ je nova ukupna količina.</p>
        </section>
        <div className="formula-card-grid">
          <section className="formula-card">
            <h3>Početno stanje</h3>
            <p>Od ukupne količine oduzima se miješani otpad.</p>
            <div className="formula-equation">S = T − M</div>
            <div className="formula-equation">Postotak = 100 × S / T</div>
          </section>
          <section className="formula-card">
            <h3>Po stanovniku</h3>
            <p>Količina u tonama pretvara se u kilograme i dijeli brojem obuhvaćenih stanovnika.</p>
            <div className="formula-equation">kg/stan. = 1.000 × masa / P</div>
            <p>
              Broj stanovnika ostaje isti. Ako nije pouzdan ili nedostaje, ovaj izračun nije
              dostupan.
            </p>
          </section>
          <section className="formula-card">
            <h3>Preusmjeravanje</h3>
            <p>Miješani otpad prelazi u odvojeno sakupljanje. Ukupna količina ostaje ista.</p>
            <div className="formula-equation">
              T′ = T<br />
              M′ = M − D<br />
              S′ = S + D
            </div>
            <h4>Količina potrebna za željeni postotak</h4>
            <div className="formula-equation">D = g × T / 100 − S</div>
          </section>
          <section className="formula-card">
            <h3>Prevencija</h3>
            <p>Sprječava se nastanak miješanog otpada. Odvojeno sakupljena količina ostaje ista.</p>
            <div className="formula-equation">
              T′ = T − D<br />
              M′ = M − D<br />
              S′ = S
            </div>
            <h4>Količina potrebna za željeni postotak</h4>
            <div className="formula-equation">D = T − 100 × S / g</div>
            <p>
              Za povećanje postotka prevencijom mora postojati početna odvojeno sakupljena količina
              (S &gt; 0).
            </p>
          </section>
        </div>
        <section className="methodology-limits">
          <h3>Uvjeti izračuna</h3>
          <ul>
            <li>Promjena ne može biti veća od početne količine miješanog otpada: 0 ≤ D ≤ M.</li>
            <li>
              Ako je željeni postotak već dosegnut, potrebna promjena je nula. Ako ukupnog otpada
              nakon promjene nema, postotak nije moguće izračunati.
            </li>
            <li>
              Računa se iz nezaokruženih količina, za isti obuhvat usluge i nepromijenjen broj
              stanovnika. Scenariji se ne dijele po vrstama materijala.
            </li>
            <li>
              Ovo je matematički scenarij, bez procjene troškova, roka ili izvedivosti. Odvojeno
              sakupljanje ne znači recikliranje.
            </li>
          </ul>
        </section>
      </div>
    </details>
  );
}
