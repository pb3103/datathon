import { useEffect, useRef, useState } from 'react';
import { WorkspaceLayout } from '../components/Layout';
import { Icon } from '../components/Icon';
import { items, sources, type SourceId, type Item } from './data';
import { relatedItems, searchItems } from './domain';
import { Source } from './GuideSources';
import { FoodStatistic, GreenDeal, PackagingRegulation } from './GuideUpdates';
import { facts, hierarchy, questions, topics } from './content';
import { FactIcon, QuizIntro, TopicPhoto, factVisuals, topicPhotos } from './GuideVisuals';
import { ItemSymbol, SortingIllustration } from './SortingVisuals';
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

function FactCard({ index }: { index: number }) {
  const [title, text, action, source] = facts[index];
  return (
    <details className={`guide-fact guide-fact--${index}`}>
      <summary>
        <FactIcon index={index} />
        <span className="guide-fact-topic">{factVisuals[index].topic}</span>
        <h3>{title}</h3>
        <svg className="guide-fact-toggle" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="m5 7.5 5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>
      <div className="guide-fact-body">
        <p>{text}</p>
        <p className="guide-action">{action}</p>
        <Source id={source} />
      </div>
    </details>
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
          <p>Primijenite naučeno pri sljedećem odvajanju otpada.</p>
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
                className={`guide-answer ${answer === index ? 'is-selected' : ''} ${submitted ? (index === question.correct ? 'is-correct' : 'is-incorrect') : ''}`}
                key={option}
              >
                <input
                  type="radio"
                  name={`question-${step}`}
                  checked={answer === index}
                  onChange={() => {
                    setAnswer(index);
                    setSubmitted(true);
                    if (index === question.correct) setScore(score + 1);
                  }}
                />
                <span>{option}</span>
                {(
                  <>
                    <span className={`guide-answer-mark ${submitted ? '' : 'is-pending'}`} aria-hidden="true">
                      {index === question.correct ? '✓' : '×'}
                    </span>
                    <span className="sr-only">
                      {index === question.correct ? 'Točan odgovor' : 'Netočan odgovor'}
                    </span>
                  </>
                )}
              </label>
            ))}
          </fieldset>
          <div
            role={submitted ? 'status' : undefined}
            aria-hidden={!submitted}
            className={`guide-feedback guide-feedback--explanation ${submitted ? '' : 'is-pending'}`}
          >
            <p>{question.explanation}</p>
            <Source id={question.source} />
          </div>
          <button onClick={next} disabled={!submitted} className={submitted ? '' : 'is-pending'} aria-hidden={!submitted}>
            {step === questions.length - 1 ? 'Prikaži rezultat' : 'Sljedeće pitanje'}
          </button>
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
            <p className="guide-eyebrow">EKO VODIČ · ODRŽIVOST</p>
            <h1 id="page-title" tabIndex={-1}>
              Male navike. <span>Velike promjene.</span>
            </h1>
            <p>
              Naučite kako pravilno odvajati otpad, smanjiti njegov nastanak i svakodnevnim odlukama
              pridonijeti održivijoj budućnosti.
            </p>
          </div>
          <div className="heading-art guide-heading-art" aria-hidden="true">
            <span className="orbit orbit-one" />
            <span className="orbit orbit-two" />
            <Icon name="book" />
            <span className="art-dot" />
          </div>
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
          <p>Pronađite upute za pravilno odvajanje i predaju otpada.</p>
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
                      <ItemSymbol item={item} />
                      <span className="guide-result-copy">
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
                          <ItemSymbol item={item} />
                          <span>
                            {item.name}
                            <small>{item.category}</small>
                          </span>
                          <span aria-hidden="true">→</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <article
              className={`guide-item ${selected ? 'has-selection' : 'is-empty'}`}
              aria-labelledby="item-title"
            >
              {!selected && <SortingIllustration />}
              <header className="guide-item-heading">
                <div>
                  <span className="guide-eyebrow">{selected?.category ?? 'Odaberite predmet'}</span>
                  <h3 ref={detail} tabIndex={-1} id="item-title">
                    {selected?.name ?? 'Pronađite pravo mjesto za svoj otpad'}
                  </h3>
                </div>
                {selected && <ItemSymbol item={selected} />}
              </header>
              {selected ? (
                <>
                  <dl>
                    <dt>
                      <Icon name="pin" />
                      Gdje odložiti
                    </dt>
                    <dd>
                      {selected.route}
                      {!selected.details.startsWith('Uputa se temelji na lokalnom primjeru;') && (
                        <p className="guide-small">{selected.details}</p>
                      )}
                    </dd>
                    <dt>
                      <Icon name="refresh" />
                      Prije odlaganja
                    </dt>
                    <dd>{selected.preparation}</dd>
                    <dt>
                      <Icon name="info" />
                      Važno
                    </dt>
                    <dd>{selected.warning}</dd>
                  </dl>
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
                </>
              ) : (
                <>
                  <p className="guide-empty-copy">
                    Odaberite predmet s popisa ili ga upišite u tražilicu. Ovdje će se prikazati
                    gdje ga predati, kako ga pripremiti i važne napomene.
                  </p>
                  <ul className="guide-empty-features">
                    <li>
                      <Icon name="pin" />
                      Gdje predati
                    </li>
                    <li>
                      <Icon name="refresh" />
                      Kako pripremiti
                    </li>
                    <li>
                      <Icon name="info" />
                      Na što pripaziti
                    </li>
                  </ul>
                </>
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
          <p className="guide-hierarchy-intro">
            Pet razina postupanja s otpadom, poredanih prema njihovoj poželjnosti.
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
              {hierarchy.map(([title, description, example], index) => (
                <div
                  key={title}
                  className={`guide-hierarchy-copy ${level === index ? 'is-active' : ''}`}
                  aria-hidden={level !== index}
                >
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <strong>Primjer</strong>
                  <p>{example}</p>
                </div>
              ))}
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
          <h2 id="targets-title">Europski ciljevi gospodarenja otpadom</h2>
          <div className="guide-eu-overview">
            <p className="guide-eu-description">
              Koliki dio komunalnog otpada trebamo reciklirati?
            </p>
            <p className="guide-eu-context">
              Minimalni ciljevi EU-a za ponovnu uporabu i recikliranje komunalnog otpada, na razini
              država članica i izraženi udjelom mase. Nisu ostvareni rezultati.
            </p>
            <ol
              className="guide-eu-timeline"
              aria-label="Ciljevi pripreme za ponovnu uporabu i recikliranja"
            >
              {[
                [2025, 55],
                [2030, 60],
                [2035, 65],
              ].map(([year, value]) => (
                <li key={year}>
                  <span className="guide-eu-year">{year}.</span>
                  <span className="guide-eu-threshold">najmanje</span>
                  <strong>
                    {value} <span>%</span>
                  </strong>
                </li>
              ))}
            </ol>
            <div className="guide-eu-landfill">
              <span className="guide-eu-year">2035.</span>
              <div>
                <strong>
                  <span className="sr-only">najviše </span>≤ 10 %
                </strong>
                <span>
                  {' '}
                  nastalog komunalnog otpada odloženo na odlagališta, na razini države članice.
                </span>
              </div>
            </div>
            <div className="guide-eu-sources">
              <Source id="eu" />
              <Source id="landfill" />
            </div>
          </div>
          <PackagingRegulation />
          <GreenDeal />
          <aside className="guide-eu-context-note" aria-label="Povezanost Zelenog plana i PPWR-a">
            <Icon name="info" />
            <p>
              Europski zeleni plan postavlja širi smjer prema održivijem gospodarstvu, dok PPWR
              donosi konkretna pravila za smanjenje ambalažnog otpada i poticanje ponovne uporabe i
              recikliranja.
            </p>
          </aside>
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
          <h2 id="facts-title">Jeste li znali?</h2>
          <FoodStatistic />
          <p className="guide-facts-intro">
            Šest činjenica koje mijenjaju način na koji gledamo na otpad.
          </p>
          <div className="guide-facts">
            {[0, 1].map((column) => (
              <div className="guide-fact-column" key={column}>
                {facts.map((_, index) =>
                  index % 2 === column ? <FactCard index={index} key={index} /> : null,
                )}
              </div>
            ))}
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
