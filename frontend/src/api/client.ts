import { beginPageUpdate } from '../scrollPosition';
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

export async function get<T>(path: string, signal: AbortSignal): Promise<T> {
  const finishPageUpdate = beginPageUpdate();
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
    finishPageUpdate();
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
      `/municipalities/${encodeURIComponent(id)}/observations?from_year=2017&to_year=2024`,
      signal,
    ),
  years: (id: string, signal: AbortSignal) =>
    get<Years>(`/municipalities/${encodeURIComponent(id)}/years`, signal),
};

export type Comparison = components['schemas']['ComparisonOut'];
export type Peers = components['schemas']['PeersOut'];
export type CompareMember = components['schemas']['CompareMember'];
export type Material = components['schemas']['MaterialOut'];
export const compareApi = {
  peers: (id: string, year: number, county: string, signal: AbortSignal) =>
    get<Peers>(
      `/municipalities/${encodeURIComponent(id)}/peers?${new URLSearchParams({ year: String(year), county_scope: county, limit: '5' })}`,
      signal,
    ),
  comparison: (ids: string[], year: number, signal: AbortSignal) => {
    const query = new URLSearchParams({ year: String(year), baseline_id: ids[0] });
    ids.forEach((id) => query.append('ids', id));
    return get<Comparison>(`/comparisons?${query}`, signal);
  },
};

export type SimulationContext = components['schemas']['SimulationContext'];
export type ScenarioInput = components['schemas']['ScenarioInput-Input'];
export type SimulationInput = components['schemas']['SimulationInput'];
export type SimulationOutput = components['schemas']['SimulationOutput'];
export const simulationApi = {
  context: (id: string, year: string, signal: AbortSignal) =>
    get<SimulationContext>(
      `/municipalities/${encodeURIComponent(id)}/simulation-context?year=${encodeURIComponent(year)}`,
      signal,
    ),
  calculate: async (input: SimulationInput, signal: AbortSignal): Promise<SimulationOutput> => {
    const finishPageUpdate = beginPageUpdate();
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) controller.abort();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(`${base}/simulations`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new ApiError(
          typeof body?.detail?.message === 'string'
            ? body.detail.message
            : 'Scenarij nije valjan ili usluga nije dostupna.',
          response.status,
        );
      }
      return await response.json();
    } catch (error) {
      if (signal.aborted || error instanceof ApiError) throw error;
      throw new ApiError(
        controller.signal.aborted
          ? 'Izračun traje predugo. Pokušajte ponovno.'
          : 'Nije moguće povezati se s podatkovnom uslugom. Pokušajte ponovno.',
      );
    } finally {
      finishPageUpdate();
      clearTimeout(timeout);
      signal.removeEventListener('abort', cancel);
    }
  },
};
