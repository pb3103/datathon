/** Presentation guards only: never repairs or rewrites source records. */
export function locationHours(value: string) {
  const text = value.trim();
  return text === '24/7' || /\b(?:[01]?\d|2[0-3]):[0-5]\d\b/.test(text) ? text : '';
}
export function locationWebsite(value: string) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}
export function locationNavigation(lat: number, lon: number) {
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`
    : '';
}
