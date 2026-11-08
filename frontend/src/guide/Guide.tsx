import { useEffect, useRef, useState } from 'react';
import { WorkspaceLayout } from '../components/Layout';
import { Icon } from '../components/Icon';
import { checkedDate, items, sources, type SourceId, type Item } from './data';
import { relatedItems, searchItems } from './domain';
import { Source } from './GuideSources';
import { FoodStatistic, PackagingRegulation } from './GuideUpdates';
import { facts, hierarchy, questions, topics } from './content';
import { QuizIntro, TopicPhoto, factVisuals, topicPhotos } from './GuideVisuals';
import './guide.css';

const sections = [
  ['odvajanje', 'Gdje ovo baciti?'],
  ['prevencija', 'Smanjite otpad'],
  ['ciljevi', 'EU ciljevi'],
  ['cinjenice', 'Zanimljivosti'],
  ['kviz', 'Kviz'],
] as const;
type Section = (typeof sections)[number][0];
function readSection(): Section {
  const id = window.location.hash.slice(1);
  return sections.find(([key]) => key === id)?.[0] ?? 'odvajanje';
}
function readItem() {
  return (
    items.find((item) => item.id === new URLSearchParams(window.location.search).get('predmet')) ??
    null
  );
}

function Quiz() {
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const done = step === questions.length;
  const question = questions[Math.min(step, questions.length - 1)];
  function next() {
    setStep(step + 1);
    setAnswer(null);
    setSubmitted(false);
    requestAnimationFrame(() => heading.current?.focus());
  }
  return (
    <div className={`guide-quiz ${done ? 'is-complete' : ''}`}>
      <p className="guide-eyebrow">
        {done ? 'Rezultat' : `Pitanje ${step + 1} od ${questions.length}`}
      </p>
      <progress
        className="guide-quiz-progress"
        max={questions.length}
        value={done ? questions.length : step}
        aria-label="Napredak kviza"
      />
      <h3 ref={heading} tabIndex={-1}>
        {done ? `${score} od ${questions.length} točnih odgovora` : question.text}
      </h3>
      {done ? (
        <>
          <p>Svaki odgovor prilika je da naučite nešto korisno za sljedeće odvajanje otpada.</p>
          <button
            onClick={() => {
              setStep(0);
              setScore(0);
              setAnswer(null);
              setSubmitted(false);
              requestAnimationFrame(() => heading.current?.focus());
            }}
          >
            Pokušaj ponovno
          </button>
        </>
      ) : (
        <>
          <fieldset disabled={submitted}>
            <legend className="sr-only">Odaberite jedan odgovor</legend>
            {question.options.map((option, index) => (
              <label
                className={`guide-answer ${answer === index ? 'is-selected' : ''}`}
                key={option}
              >
                <input
                  type="radio"
                  name={`question-${step}`}
                  checked={answer === index}
                  onChange={() => setAnswer(index)}
                />
                {option}
              </label>
            ))}
          </fieldset>
          {!submitted ? (
            <button
              disabled={answer === null}
              onClick={() => {
                setSubmitted(true);
                if (answer === question.correct) setScore(score + 1);
              }}
            >
              Provjeri odgovor
            </button>
          ) : (
            <>
              <div
                role="status"
                className={`guide-feedback ${answer === question.correct ? 'is-correct' : 'is-incorrect'}`}
              >
                <strong>
                  {answer === question.correct
                    ? 'Točno.'
                    : 'Točan odgovor: ' + question.options[question.correct] + '.'}
                </strong>
                <p>{question.explanation}</p>
                <Source id={question.source} />
              </div>
              <button onClick={next}>
                {step === questions.length - 1 ? 'Prikaži rezultat' : 'Sljedeće pitanje'}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
export default function Guide() {
  const [active, setActive] = useState<Section>(readSection);
  const [selected, setSelected] = useState<Item | null>(readItem);
  const [query, setQuery] = useState(() => readItem()?.name ?? '');
  const [level, setLevel] = useState(0);
  const detail = useRef<HTMLHeadingElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const matches = searchItems(query);
  const related = selected ? relatedItems(selected.id) : [];
  useEffect(() => {
    const restore = () => {
      setActive(readSection());
      const item = readItem();
      setSelected(item);
      if (item) setQuery(item.name);
    };
    window.addEventListener('popstate', restore);
    window.addEventListener('hashchange', restore);
    return () => {
      window.removeEventListener('popstate', restore);
      window.removeEventListener('hashchange', restore);
    };
  }, []);
  function openSection(id: Section, focusTab = false) {
    if (id !== active) {
      const url = new URL(window.location.href);
      url.hash = id;
      window.history.pushState(null, '', url);
      setActive(id);
    } else if (window.location.hash !== `#${id}`) {
      const url = new URL(window.location.href);
      url.hash = id;
      window.history.replaceState(null, '', url);
    }
    if (focusTab) requestAnimationFrame(() => document.getElementById(`guide-tab-${id}`)?.focus());
  }
  function select(id: string) {
    openSection('odvajanje');
    const item = items.find((entry) => entry.id === id);
    if (!item) return;
    setSelected(item);
    setQuery(item.name);
    const url = new URL(window.location.href);
    url.searchParams.set('predmet', id);
    window.history.replaceState(null, '', url);
    requestAnimationFrame(() => detail.current?.focus());
  }
  function clear() {
    setQuery('');
    setSelected(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('predmet');
    window.history.replaceState(null, '', url);
    input.current?.focus();
  }
  return (
    <WorkspaceLayout
      module="guide"
      heading={
        <div className="guide-hero">
          <div className="guide-hero-copy">
            <p className="guide-eyebrow">WASTEWISE · EKO VODIČ</p>
            <h1 id="page-title" tabIndex={-1}>
              Male navike. <span>Velike promjene.</span>
            </h1>
            <p>
              Saznajte kako smanjiti nastanak otpada, pravilno odvajati materijale i donositi
              odgovornije svakodnevne odluke.
            </p>
          </div>
          <span className="guide-compact-mark" aria-hidden="true">
            <Icon name="book" />
          </span>
        </div>
      }
    >
      <div className="guide-page">
        <nav className="guide-nav" aria-label="Dijelovi vodiča">
          <div role="tablist" aria-label="Teme vodiča">
            {sections.map(([id, label], index) => (
              <button
                type="button"
                role="tab"
                id={`guide-tab-${id}`}
                aria-selected={active === id}
                aria-controls={id}
                tabIndex={active === id ? 0 : -1}
                key={id}
                onClick={() => openSection(id)}
                onKeyDown={(event) => {
                  let next: number | undefined;
                  if (event.key === 'ArrowRight') next = (index + 1) % sections.length;
                  if (event.key === 'ArrowLeft')
                    next = (index + sections.length - 1) % sections.length;
                  if (event.key === 'Home') next = 0;
                  if (event.key === 'End') next = sections.length - 1;
                  if (next !== undefined) {
                    event.preventDefault();
                    openSection(sections[next][0], true);
                  }
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </nav>
        <section
          id="odvajanje"
          role="tabpanel"
          hidden={active !== 'odvajanje'}
          className="guide-section"
          aria-labelledby="guide-tab-odvajanje"
          tabIndex={0}
        >
          <p className="guide-eyebrow">01 / Odvajanje u praksi</p>
          <h2 id="sort-title">Gdje ovo baciti?</h2>
          <p>Upišite predmet i provjerite kako ga pripremiti i kome ga predati.</p>
          <div className="guide-search-grid">
            <div>
              <label htmlFor="item-search">Predmet ili materijal</label>
              <div className="guide-search-input">
                <Icon name="search" />
                <input
                  ref={input}
                  id="item-search"
                  type="search"
                  value={query}
                  placeholder="Npr. mobitel, baterija, staklenka…"
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setSelected(null);
                    const url = new URL(window.location.href);
                    url.searchParams.delete('predmet');
                    window.history.replaceState(null, '', url);
                  }}
                />
                <button type="button" onClick={clear}>
                  Očisti
                </button>
              </div>
              <p className="guide-small">
                {query.trim() ? 'Rezultati pretrage' : 'Česti predmeti'}
              </p>
              <p className="sr-only" role="status">
                {query.trim()
                  ? `${matches.length} rezultata`
                  : 'Odaberite primjer ili pretražite katalog.'}
              </p>
              <ul className={`guide-results ${query.trim() ? '' : 'is-popular'}`}>
                {(query.trim()
                  ? matches
                  : items.filter((item) =>
                      ['mobitel', 'baterija', 'staklenka', 'majica', 'kore', 'lijekovi'].includes(
                        item.id,
                      ),
                    )
                ).map((item) => (
                  <li key={item.id}>
                    <button onClick={() => select(item.id)} aria-pressed={selected?.id === item.id}>
                      <span>
                        {item.name}
                        <small>{item.category}</small>
                      </span>
                      <span aria-hidden="true">{selected?.id === item.id ? 'Odabrano' : '→'}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {query.trim() && matches.length === 0 && (
                <p>
                  Nema rezultata za „{query}”. Pokušajte s drugim nazivom ili provjerite upute
                  svojeg komunalnog društva.
                </p>
              )}
              {selected && related.length > 0 && (
                <div className="guide-related" role="group" aria-labelledby="related-title">
                  <h3 id="related-title">Možda vas zanima i</h3>
                  <ul>
                    {related.map((item) => (
                      <li key={item.id}>
                        <button type="button" onClick={() => select(item.id)}>
                          {item.name}
                          <span aria-hidden="true">→</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="guide-small">
                Katalog sadrži {items.length} čestih predmeta. Uvjeti predaje i prihvaćene vrste
                otpada razlikuju se među mjestima.
              </p>
            </div>
            <article className="guide-item" aria-labelledby="item-title">
              <span className="guide-eyebrow">{selected?.category ?? 'Odaberite predmet'}</span>
              <h3 ref={detail} tabIndex={-1} id="item-title">
                {selected?.name ?? 'Uputa na jednom mjestu'}
              </h3>
              {selected ? (
                <>
                  <dl>
                    <dt>Gdje odložiti</dt>
                    <dd>
                      {selected.route}
                      {!selected.details.startsWith('Uputa se temelji na lokalnom primjeru;') && (
                        <p className="guide-small">{selected.details}</p>
                      )}
                    </dd>
                    <dt>Prije odlaganja</dt>
                    <dd>{selected.preparation}</dd>
                    <dt>Važno</dt>
                    <dd>{selected.warning}</dd>
                  </dl>
                  {selected.local && (
                    <p className="guide-local">
                      Način predaje i boju spremnika provjerite kod svojeg davatelja usluge.
                    </p>
                  )}
                  {selected.map && (
                    <>
                      <a className="guide-map-link" href="/#waste-map">
                        <Icon name="pin" /> Pronađi mjesto za odlaganje →
                      </a>
                      <p className="guide-small">
                        Karta prikazuje lokacije iz dostupnih izvora, ali ne potvrđuje da pojedina
                        lokacija prihvaća ovaj predmet. Prije dolaska provjerite prihvat i radno
                        vrijeme.
                      </p>
                    </>
                  )}
                  <p className="guide-small">
                    Izvor:{' '}
                    {selected.sources.map((id) => (
                      <span key={id}>
                        <Source id={id} />{' '}
                      </span>
                    ))}
                    <br />
                    Provjereno: {selected.checkedDate.split('-').reverse().join('. ')}.
                  </p>
                </>
              ) : (
                <p>
                  Ovdje ćete pronaći način predaje, pripremu i važne napomene, zajedno s izvorom
                  upute.
                </p>
              )}
            </article>
          </div>
        </section>
        <section
          id="prevencija"
          role="tabpanel"
          hidden={active !== 'prevencija'}
          tabIndex={0}
          className="guide-section guide-section--prevention"
          aria-labelledby="guide-tab-prevencija"
        >
          <p className="guide-eyebrow">02 / Prije nego bacite</p>
          <h2 id="prevention-title">Najbolji otpad je onaj koji ne nastane.</h2>
          <p>
            Kružni pristup produljuje uporabu proizvoda i zadržava materijale u uporabi. Odvajanje
            je važno, a prvi korak često je manja potrošnja, popravak ili ponovna uporaba.
          </p>
          <div className="guide-hierarchy">
            <div role="group" aria-label="Razine hijerarhije otpada">
              {hierarchy.map(([title], index) => (
                <button
                  aria-pressed={level === index}
                  aria-controls="hierarchy-detail"
                  onClick={() => setLevel(index)}
                  key={title}
                >
                  <span>0{index + 1}</span>
                  {title}
                </button>
              ))}
            </div>
            <div id="hierarchy-detail" aria-live="polite">
              <p className="guide-small">Od najpoželjnijeg postupka prema posljednjoj mogućnosti</p>
              <h3>{hierarchy[level][0]}</h3>
              <p>{hierarchy[level][1]}</p>
              <strong>Primjer</strong>
              <p>{hierarchy[level][2]}</p>
              <Source id="hierarchy" />
            </div>
          </div>
          <div className="guide-topic-grid">
            {topics.map((topic) => (
              <article key={topic.title}>
                <TopicPhoto name={topicPhotos[topic.source]} className="guide-topic-photo" />
                <div className="guide-topic-body">
                  <span className="guide-topic-symbol">
                    <Icon
                      name={
                        topic.source === 'date'
                          ? 'leaf'
                          : topic.source === 'ee'
                            ? 'refresh'
                            : topic.source === 'textile'
                              ? 'community'
                              : 'database'
                      }
                    />
                  </span>
                  <h3>{topic.title}</h3>
                  <p>
                    {topic.source === 'date'
                      ? 'Jestiva hrana ne mora postati otpad.'
                      : topic.source === 'textile'
                        ? 'Odjeća može poslužiti dulje ili drugome.'
                        : topic.source === 'ee'
                          ? 'Najprije popravak, a zatim odvojena predaja otpada.'
                          : 'Izbjegnite ambalažu koja vam ne treba.'}
                  </p>
                  <ul>
                    {topic.tips.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                  <a
                    href="#odvajanje"
                    onClick={(event) => {
                      event.preventDefault();
                      select(topic.item);
                    }}
                  >
                    Provjeri odlaganje →
                  </a>
                  <Source id={topic.source} />
                </div>
              </article>
            ))}
          </div>
        </section>
        <section
          id="ciljevi"
          role="tabpanel"
          hidden={active !== 'ciljevi'}
          tabIndex={0}
          className="guide-section guide-section--targets"
          aria-labelledby="guide-tab-ciljevi"
        >
          <p className="guide-eyebrow">03 / Europski ciljevi</p>
          <h2 id="targets-title">Prema većoj uporabi materijala</h2>
          <p>
            Ciljevi za države članice EU-a: priprema za ponovnu uporabu i recikliranje komunalnog
            otpada, izraženo udjelom mase.
          </p>
          <div className="guide-targets">
            {[
              [2025, 55],
              [2030, 60],
              [2035, 65],
            ].map(([year, value]) => (
              <article key={year}>
                <span>{year}.</span>
                <strong>≥ {value} %</strong>
                <p>Priprema za ponovnu uporabu i recikliranje</p>
                <Source id="eu" />
              </article>
            ))}
            <article className="guide-target-landfill">
              <span>2035.</span>
              <strong>≤ 10 %</strong>
              <p>Komunalni otpad odložen na odlagališta</p>
              <Source id="landfill" />
            </article>
          </div>
          <p className="guide-local">
            <strong>Različiti pokazatelji.</strong> Ovo nisu ciljevi stope odvojenog sakupljanja.
            Stope u Exploreru i Compareu ne prikazuju koliko je otpada stvarno reciklirano i ne
            uspoređuju se izravno s ovim ciljevima.
          </p>
          <Source id="eu" /> · <Source id="landfill" />
          <PackagingRegulation />
        </section>
        <section
          id="cinjenice"
          role="tabpanel"
          hidden={active !== 'cinjenice'}
          tabIndex={0}
          className="guide-section guide-section--facts"
          aria-labelledby="guide-tab-cinjenice"
        >
          <p className="guide-eyebrow">04 / Jeste li znali?</p>
          <h2 id="facts-title">Korisno pri sljedećem odvajanju</h2>
          <div className="guide-facts">
            <FoodStatistic />
            {facts.map(([title, text, action, source], index) => {
              const visual = factVisuals[index];
              return (
                <details key={title} className={`guide-fact guide-fact--${index}`}>
                  <summary>
                    <span className="guide-fact-topic">{visual.topic}</span>
                    <h3>{title}</h3>
                    <span className="guide-fact-toggle" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <div className="guide-fact-body">
                    <p>{text}</p>
                    <p className="guide-action">{action}</p>
                    <Source id={source} />
                  </div>
                </details>
              );
            })}
          </div>
        </section>
        <section
          id="kviz"
          role="tabpanel"
          hidden={active !== 'kviz'}
          tabIndex={0}
          className="guide-section guide-section--quiz"
          aria-labelledby="guide-tab-kviz"
        >
          <QuizIntro />
          <Quiz />
        </section>
        <footer className="guide-maintenance">
          <h2>O vodiču i izvorima</h2>
          <p>
            Vodič je sažetak edukativnih materijala mentora i provjerenih javnih uputa. Ne
            zamjenjuje aktualne upute lokalnog davatelja usluge. Provjera izvora:{' '}
            {checkedDate.split('-').reverse().join('. ')}.
          </p>
          <details>
            <summary>Pregled svih izvora</summary>
            <ul>
              {Object.keys(sources).map((id) => (
                <li key={id}>
                  <Source id={id as SourceId} />
                </li>
              ))}
            </ul>
          </details>
        </footer>
      </div>
    </WorkspaceLayout>
  );
}
