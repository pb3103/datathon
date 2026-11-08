import { sources, type SourceId } from './data';

export function Source({ id }: { id: SourceId }) {
  const source = sources[id];
  return (
    <a className="guide-source" href={source.url} target="_blank" rel="noopener noreferrer">
      {source.title} ↗<span className="sr-only"> (otvara novu karticu)</span>
    </a>
  );
}
