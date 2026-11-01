export function normalizePlace(value: string) {
  return value
    .toLocaleLowerCase('hr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/^(grad|opcina)\s+/, '')
    .trim();
}
