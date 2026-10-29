import type { components } from './schema';

export type Municipality = components['schemas']['MunicipalityOut'];
export type MunicipalityPage = components['schemas']['MunicipalitiesPage'];
export type Observation = components['schemas']['ObservationOut'];
export type Profile = components['schemas']['ProfileOut'];
export type Years = components['schemas']['YearsOut'];
export type Metric = components['schemas']['Metric'];
export type Source = components['schemas']['SourceOut'];
export type Issue = components['schemas']['IssueOut'];

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

const base = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

async function get<T>(path: string, signal: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal.addEventListener('abort', cancel, { once: true });
  if (signal.aborted) controller.abort();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 15_000);
  try {
    const response = await fetch(`${base}${path}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      const message =
        response.status === 404
          ? 'Odabrani grad ili općina nije pronađen.'
          : response.status === 422
            ? 'Odabir iz poveznice nije valjan. Ponovite pretragu.'
            : response.status === 503
              ? 'Podatkovna usluga trenutačno nije dostupna. Pokušajte ponovno.'
              : 'Podatke trenutačno nije moguće učitati. Pokušajte ponovno.';
      throw new ApiError(message, response.status);
    }
    if (!response.headers.get('content-type')?.includes('application/json')) {
      throw new ApiError('Podatkovna usluga vratila je neočekivan odgovor.');
    }
    return (await response.json()) as T;
  } catch (error) {
    if (signal.aborted) throw error;
    if (timedOut)
      throw new ApiError('Učitavanje traje predugo. Provjerite vezu i pokušajte ponovno.');
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      'Nije moguće povezati se s podatkovnom uslugom. Provjerite vezu i pokušajte ponovno.',
    );
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', cancel);
  }
}

export const api = {
  search: (query: string, page: number, signal: AbortSignal) =>
    get<MunicipalityPage>(
      `/municipalities?${new URLSearchParams({ q: query, page: String(page), page_size: '6' })}`,
      signal,
    ),
  profile: (id: string, signal: AbortSignal) =>
    get<Profile>(
      `/municipalities/${encodeURIComponent(id)}/observations?from_year=2021&to_year=2024`,
      signal,
    ),
  years: (id: string, signal: AbortSignal) =>
    get<Years>(`/municipalities/${encodeURIComponent(id)}/years`, signal),
};
