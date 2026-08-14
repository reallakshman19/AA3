import { expect, test } from '@playwright/test';

test('direct XYZ cell stages certified NODE_POSITION without canonical mutation', async ({ page }) => {
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.setViewportSize({ width: 1720, height: 1080 });
  await page.addInitScript(() => globalThis.localStorage?.clear());
  const host = await openProductionController(page);
  const panel = page.locator('details[data-panel-kind="table"]');
  if (!(await panel.evaluate((node) => node.open))) {
    await panel.locator(':scope > summary').click();
  }
  await expect.poll(() => host.getAttribute('data-topology-edit-table-projection-hash')).toBeTruthy();

  const table = page.locator('[data-role="topology-edit-table"]');
  await page.locator('[data-table-filter]').fill('PIPE');
  const input = table.locator('[data-table-cell-edit="NODE_POSITION"]').first();
  await expect(input).toBeAttached();
  await input.scrollIntoViewIfNeeded();

  const meta = await input.evaluate((node) => ({
    canonicalId: node.dataset.tableCellCanonicalId,
    endpoint: node.dataset.tableCellEndpoint,
    axis: node.dataset.tableCellAxis,
    value: Number(node.value),
  }));
  expect(meta.canonicalId).toBeTruthy();
  expect(['FROM', 'TO']).toContain(meta.endpoint);
  expect(['X', 'Y', 'Z']).toContain(meta.axis);
  expect(Number.isFinite(meta.value)).toBe(true);

  const beforeHash = await canonicalHash(page);
  const nextValue = meta.value + 25;
  await input.fill(String(nextValue));
  await expect(input.locator('xpath=..')).toHaveAttribute('data-table-cell-state', 'draft');
  expect(await canonicalHash(page)).toBe(beforeHash);
  expect(await host.getAttribute('data-topology-edit-table-batch-hash')).toBe('');

  await input.press('Enter');
  await expect.poll(() => host.getAttribute('data-topology-edit-table-batch-hash')).toBeTruthy();
  expect(await canonicalHash(page)).toBe(beforeHash);

  const staged = await page.evaluate(() => {
    const runtime = document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController?.tableAdapter?.runtime;
    const intent = runtime?.intents?.find((candidate) => candidate.intentKind === 'NODE_POSITION') ?? null;
    return intent ? {
      canonicalId: intent.target?.canonicalId ?? null,
      endpoint: intent.requestedValue?.endpoint ?? null,
      position: intent.requestedValue?.position ?? null,
      movementMode: intent.geometryPolicy?.movementMode ?? null,
    } : null;
  });
  expect(staged).not.toBeNull();
  expect(staged.canonicalId).toBe(meta.canonicalId);
  expect(staged.endpoint).toBe(meta.endpoint);
  expect(staged.movementMode).toBe('NODE_ONLY');
  expect(staged.position[meta.axis.toLowerCase()]).toBe(nextValue);

  await page.locator('[data-table-action="discard"]').click();
  await expect.poll(() => host.getAttribute('data-topology-edit-table-batch-hash')).toBe('');
  expect(await canonicalHash(page)).toBe(beforeHash);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors.filter((message) => !message.includes('favicon'))).toEqual([]);
});

async function openProductionController(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const navigation = page.getByRole('navigation', { name: 'Application views' });
  await navigation.getByRole('button', { name: 'Workspace', exact: true }).click();
  await page.locator('[data-action="load-topology-edit-demo"]').click();
  await expect.poll(() => page.evaluate(() => (
    globalThis.AnalysisWorkspace?.getSnapshot?.()?.dataset?.entities?.length ?? 0
  ))).toBe(20);
  await page.getByRole('button', { name: '3D Edit', exact: true }).click();
  const host = page.locator('[data-role="topology-edit-render-host"]');
  await expect(host).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(
    document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController?.session,
  ))).toBe(true);
  await expect.poll(() => page.evaluate(() => Boolean(
    document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController?.tableAdapter?.runtime,
  ))).toBe(true);
  return host;
}

async function canonicalHash(page) {
  return page.evaluate(() => document.querySelector('[data-role="topology-edit-render-host"]')
    ?.__topologyEditAuthoringController?.session?.currentTopology?.()?.canonicalTopologyHash ?? null);
}
