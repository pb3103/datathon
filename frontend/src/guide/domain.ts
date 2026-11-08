import { items } from './data.ts';
export function normalize(value: string) {
  return value
    .toLocaleLowerCase('hr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}
export function searchItems(query: string) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return items.filter((item) =>
    words.every((word) =>
      normalize(
        [
          item.name,
          item.category,
          ...item.aliases,
          item.source === 'ee' ? 'EE otpad elektronika' : '',
        ].join(' '),
      ).includes(word),
    ),
  );
}

const relatedIds: Record<string, readonly string[]> = {
  mobitel: ['punjac', 'baterija', 'laptop'],
  laptop: ['punjac', 'kabel', 'mobitel'],
  punjac: ['mobitel', 'kabel', 'baterija'],
  'staklena-boca': ['staklenka', 'boca', 'limenka'],
  baterija: ['gumbasta', 'mobitel', 'punjac'],
  gumbasta: ['baterija', 'mobitel'],
};

export function relatedItems(id: string) {
  const selected = items.find((item) => item.id === id);
  if (!selected) return [];
  const candidates =
    relatedIds[id] ??
    items.filter((item) => item.category === selected.category).map((item) => item.id);
  return [...new Set(candidates)]
    .filter((candidate) => candidate !== id)
    .flatMap((candidate) => {
      const item = items.find((entry) => entry.id === candidate);
      return item ? [item] : [];
    })
    .slice(0, 3);
}
