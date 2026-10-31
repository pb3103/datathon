import type { CompareMember } from '../api/client';
import { explainReason } from '../domain';

export function unitLabel(unit: string) {
  return (
    (
      {
        'kg/covered_person': 'kg/obuhv. stan.',
        'kg/person': 'kg/stan. · objavljeno',
        pp: 'pb',
        '%': '%',
        t: 't',
      } as Record<string, string>
    )[unit] ?? unit
  );
}
export function compareReason(reason?: string | null) {
  const messages: Record<string, string> = {
    material_denominator_not_verified:
      'Nazivnik materijalnog pokazatelja nije potvrđen; objavljena vrijednost ostaje u izvorima.',
    no_comparison_values: 'Nema dostupnih pokazatelja za usporedbu početne JLS.',
    materials_not_imported: 'Materijalni podaci nisu učitani za ovaj zapis.',
    scope_or_methodology_mismatch: 'Obuhvat ili metodološka skupina nisu usklađeni s početnom JLS.',
    missing_year: 'Za odabranu godinu nema zapisa. Nije zamijenjen drugom godinom.',
    quality_requires_review:
      'Najmanje jedna od vrijednosti zahtijeva provjeru; razlika nije izračunata.',
    material_cross_year_unverified:
      'Kontinuitet obuhvata i nazivnika materijala među godinama nije potvrđen. Nema povezujuće linije ni godišnjih promjena.',
    population_range_expanded:
      'Nema dovoljno kandidata u rasponu 0,5–2. Dodani su najbliži kandidati izvan raspona, uz isti filtar županije.',
    fewer_candidates_available: 'Dostupno je manje od pet prihvatljivih kandidata.',
    comparability_provisional:
      'Usporedba je uvjetna: lokalni obuhvat i kontinuitet granica još nisu potvrđeni.',
  };
  return reason ? (messages[reason] ?? explainReason(reason)) : explainReason(reason);
}
export function historyMetric(member: CompareMember, year: number, key: string) {
  return member.history_metrics[year]?.[key];
}
