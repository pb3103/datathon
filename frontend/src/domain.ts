import { changedSelection } from './navigation.ts';
import type { Issue, Metric, Observation } from './api/client';

export function numeric(metric?: Metric): number | null {
  if (metric?.value == null || metric.value.trim() === '') return null;
  const value = Number(metric.value);
  return Number.isFinite(value) ? value : null;
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('hr-HR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatMetric(metric?: Metric, decimals = 2): string {
  const value = numeric(metric);
  return value === null ? 'Nema podatka' : formatNumber(value, decimals);
}

const reasons: Record<string, string> = {
  historical_rate_not_published:
    'U ovoj povijesnoj tablici nije objavljena službena stopa odvojenog sakupljanja.',
  historical_ratio_not_official_rate:
    'Kontrolni omjer (T−M)/T izračunat je iz masa. Obuhvat nije potvrđen za službenu stopu odvojenog sakupljanja.',
  historical_scope_unverified:
    'Povijesni obuhvat prikupljanja nije potvrđen kao istovjetan novijoj javnoj usluzi. Godine se ne povezuju u trend.',

  population_requires_review:
    'Obuhvaćena populacija zahtijeva provjeru. Izračun po stanovniku nije dostupan.',
  population_requires_review_or_missing: 'Obuhvaćena populacija nedostaje ili zahtijeva provjeru.',
  missing_covered_population: 'Nedostaje podatak o broju stanovnika obuhvaćenih uslugom.',
  missing_total: 'Nedostaje ukupna masa sakupljenog otpada.',
  missing_mixed: 'Nedostaje masa miješanog otpada.',
  missing_published_value: 'Vrijednost nije objavljena u izvoru.',
  missing_published_rate: 'Stopa odvojenog sakupljanja nije objavljena u izvoru.',
  missing_total_or_mixed: 'Nedostaje ukupna ili miješana masa otpada.',
  zero_or_missing_total_or_missing_mixed: 'Ukupna masa je nula ili nedostaje potreban podatak.',
  local_scope_and_boundary_continuity_not_verified:
    'Kontinuitet lokalnog obuhvata usluge i granica grada ili općine još nije potvrđen.',
  covered_population_changed:
    'Broj stanovnika obuhvaćenih uslugom promijenio se u odnosu na prethodnu dostupnu godinu.',
  nonconsecutive_years:
    'Dostupne godine nisu uzastopne; između njih se ne prikazuje povezan trend.',
  methodology_group_changed: 'Promijenila se metodološka skupina; godine se ne povezuju u trend.',
  source_aggregate_mismatch: 'Zbrojevi XLSX podataka razlikuju se od agregata PDF izvještaja.',
};

export function explainReason(reason?: string | null): string {
  return reason
    ? (reasons[reason] ?? 'Za ovaj podatak postoji dodatna napomena za provjeru.')
    : 'Podatak nije dostupan u odabranom izvoru.';
}

export function isVerified(observation: Observation): boolean {
  return (
    observation.comparability.status === 'verified' ||
    observation.comparability.status === 'comparable'
  );
}

export function mayConnect(a: Observation, b: Observation): boolean {
  return (
    isVerified(a) &&
    isVerified(b) &&
    b.year === a.year + 1 &&
    b.comparability.previous_year === a.year &&
    a.scope === b.scope &&
    a.comparability.methodology_group === b.comparability.methodology_group &&
    !b.comparability.reasons.some((reason) =>
      [
        'local_scope_and_boundary_continuity_not_verified',
        'nonconsecutive_years',
        'methodology_group_changed',
      ].includes(reason),
    )
  );
}

export function readSelection(search = window.location.search) {
  const params = new URLSearchParams(search);
  return { id: params.get('jls'), year: params.get('godina') };
}

export function selectionUrl(
  id: string | null,
  year: string | null,
  current = window.location.href,
) {
  const url = new URL(current);
  const params = changedSelection(id, year, url.search);
  return `${url.pathname}?${params}`;
}

export function explainIssue(issue: Issue): string {
  if (issue.code === 'pdf_verified_correction') {
    const names: Record<string, string> = {
      county: 'Županija',
      published_kg_per_capita: 'Objavljeni kg/stan.',
      total_t: 'Ukupno (t)',
      mixed_t: 'Miješano (t)',
      covered_population: 'Obuhvaćena populacija',
    };
    const changes = Object.entries(issue.details).flatMap(([key, value]) => {
      if (value && typeof value === 'object' && 'csv' in value && 'pdf' in value)
        return [`${names[key] ?? key}: CSV ${String(value.csv)} → PDF ${String(value.pdf)}`];
      return [];
    });
    return `Korekcija potvrđena izvornim PDF-om: ${changes.join('; ')}. Izvorni CSV ostaje nepromijenjen.`;
  }

  if (issue.code === 'kg_per_capita_mismatch')
    return 'Objavljeni kg po obuhvaćenom stanovniku ne odgovaraju ukupnoj masi i prijavljenom broju obuhvaćenih stanovnika unutar preciznosti izvora. Broj stanovnika zahtijeva provjeru, pa je izračunati pokazatelj nedostupan.';
  if (issue.code === 'separate_collection_rate_mismatch')
    return 'Objavljena stopa ne odgovara kontrolnom odnosu ukupne i miješane mase unutar preciznosti izvora. Prikazana je izvorna vrijednost uz oznaku za provjeru.';
  return issue.description;
}

// Presentation only: raw API issues and validation evidence remain unchanged.
export function visibleSourceIssues(issues: Issue[] = []): Issue[] {
  return issues.filter((issue) => issue.code !== 'source_aggregate_mismatch');
}

export function sourceDisplayName(source: { year: number; path: string }): string {
  const extension = source.path.toLowerCase().endsWith('.csv') ? 'csv' : 'xlsx';
  return `Prikaz odabranih podataka_JLS za ${source.year}.${extension}`;
}
