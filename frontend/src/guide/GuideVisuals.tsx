export const topicPhotos: Record<string, string> = {
  date: 'editorial-food-7267039',
  textile: 'editorial-textile-11482132',
  ee: 'editorial-electronics-F3t-AzyTbyU',
  pack: 'editorial-pack-7262723',
};

// Presentation only: these images illustrate topics, not disposal routes or locations.
export const factVisuals = [
  { topic: 'Odvajanje', photo: null, featured: true },
  { topic: 'Hrana', photo: null, featured: false },
  { topic: 'Staklo', photo: null, featured: false },
  { topic: 'Elektronika', photo: null, featured: true },
  { topic: 'Baterije', photo: null, featured: false },
  { topic: 'Ponovna uporaba', photo: null, featured: true },
] as const;

export function TopicPhoto({
  name,
  className = '',
  eager = false,
}: {
  name: string;
  className?: string;
  eager?: boolean;
}) {
  return (
    <img
      className={className}
      src={`/images/guide/${name}.jpg`}
      width={960}
      height={
        name.includes('textile') || name.includes('pack-')
          ? 1440
          : name.includes('electronics-')
            ? 1200
            : 640
      }
      alt={
        name.includes('editorial-food')
          ? 'Kupnja voća na lokalnoj tržnici'
          : name.includes('editorial-textile')
            ? 'Ruke koje iglom i koncem popravljaju odjeću'
            : name.includes('editorial-electronics')
              ? 'Rad na popravku otvorenog prijenosnog računala'
              : name.includes('editorial-pack')
                ? 'Višekratne platnene vrećice za namirnice'
                : 'Odvojeno razvrstavanje papira u spremnik'
      }
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}

export function FactSymbol({ battery = false }: { battery?: boolean }) {
  return (
    <span className="guide-fact-symbol" aria-hidden="true">
      <svg
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {battery ? (
          <>
            <rect x="14" y="10" width="20" height="32" rx="4" />
            <path d="M20 10V6h8v4M19 20h10m-5-5v10m-5 10h10" />
          </>
        ) : (
          <>
            <path d="M17 5h14v7l5 8v20a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3V20l5-8V5ZM17 10h14M12 24h24M12 34h24" />
            <path d="m19 28 3 3 6-4" />
          </>
        )}
      </svg>
    </span>
  );
}

export function QuizIntro() {
  return (
    <div className="guide-quiz-intro">
      <p className="guide-eyebrow">05 / Provjerite znanje</p>
      <h2 id="quiz-title">Što biste odabrali?</h2>
      <p>Šest kratkih pitanja s objašnjenjem nakon svakog odgovora.</p>
    </div>
  );
}

export function FactIcon({ index }: { index: number }) {
  const shapes = [
    <>
      <path d="m8 5 4-2 4 7M12 3l-2 5M19 10l3 4-4 7h-7M22 14l-5-1M8 20H3l-2-7 4-6M3 20l3-4" />
    </>,
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 3v4m10-4v4M3 11h18M7 15h1m4 0h1m4 0h1M7 18h1m4 0h1" />
    </>,
    <>
      <path d="M9 3h6v5l3 4v8a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-8l3-4V3ZM9 6h6M6 14h12" />
    </>,
    <>
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <path d="M10 5h4" />
      <circle cx="12" cy="18.5" r=".6" />
    </>,
    <>
      <rect x="2" y="7" width="18" height="10" rx="2" />
      <path d="M22 10v4M11 8l-3 5h6l-3 4" />
    </>,
    <>
      <path d="M20 7a8 8 0 0 0-14-1L3 9m0-5v5h5M4 17a8 8 0 0 0 14 1l3-3m0 5v-5h-5" />
    </>,
  ];
  return (
    <svg
      className="guide-fact-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {shapes[index]}
    </svg>
  );
}
