import { Icon } from '../components/Icon';

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
      <span className="guide-quiz-mark" aria-hidden="true">
        <Icon name="book" />
      </span>
    </div>
  );
}
