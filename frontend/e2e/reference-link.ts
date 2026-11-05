import type { Page } from '@playwright/test';

// Existing reference URLs remain supported; the Compare UI no longer offers this action.
export async function openReferenceScenario(page: Page) {
  const params = new URL(page.url()).searchParams;
  const ids = [params.get('jls')!, ...(params.get('usporedi') || '').split(',').filter(Boolean)];
  const query = new URLSearchParams({ year: params.get('godina') || '2024', baseline_id: ids[0] });
  ids.forEach((id) => query.append('ids', id));
  const response = await page.request.get(`/api/v1/comparisons?${query}`);
  if (!response.ok()) throw new Error('Comparison API failed');
  const data = await response.json();
  const member = data.members.find(
    (item: { simulation_url: string | null }) => item.simulation_url,
  );
  if (!member) throw new Error('No supported reference scenario');
  await page.goto(member.simulation_url);
}
