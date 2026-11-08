export function normalizePlace(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('hr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/dj/g, 'd')
    .replace(/^(grad|opcina)\s+/, '')
    .trim();
}
