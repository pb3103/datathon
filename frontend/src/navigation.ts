/** Cross-module navigation carries selection, never a stale scenario/source reference. */
export type ModuleRoute = 'explorer' | 'compare' | 'simulator';
const common = ['jls', 'godina', 'usporedi'];
export function moduleUrl(module: ModuleRoute, search = window.location.search) {
  const source = new URLSearchParams(search);
  const params = new URLSearchParams();
  const keys =
    module === 'compare' ? [...common, 'zupanija', 'metrika', 'prikaz', 'razdoblje'] : common;
  keys.forEach((key) => {
    const value = source.get(key);
    if (value) params.set(key, value);
  });
  return `/${module}${params.size ? `?${params}` : ''}`;
}
export function changedSelection(
  id: string | null,
  year: string | null,
  current = window.location.search,
) {
  const old = new URLSearchParams(current);
  const params = new URLSearchParams();
  if (id) params.set('jls', id);
  if (year) params.set('godina', year);
  if (old.get('usporedi')) {
    const members = [...new Set([old.get('jls'), ...old.get('usporedi')!.split(',')])].filter(
      (v): v is string => Boolean(v) && v !== id,
    );
    if (members.length) params.set('usporedi', members.slice(0, 4).join(','));
  }
  return params;
}
