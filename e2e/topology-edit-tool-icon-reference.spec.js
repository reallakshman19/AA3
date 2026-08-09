import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1050 });
  await page.addInitScript(() => globalThis.localStorage?.clear());
});

test('3D Edit repairs broken runtime SVG fragments without changing production bindings', async ({ page }) => {
  const host = await openTopologyEdit(page);

  const initialReferences = await host.locator('svg use, use').evaluateAll((uses) => uses.map((use) => (
    use.getAttribute('href')
      ?? use.getAttributeNS('http://www.w3.org/1999/xlink', 'href')
      ?? ''
  )));
  expect(initialReferences.filter((reference) => reference.endsWith('-broken'))).toEqual([]);
  expect(initialReferences.length).toBeGreaterThanOrEqual(42);
  await expect(host).toHaveAttribute('data-topology-edit-icon-broken-reference-count', '0');
  await expect(host).toHaveAttribute('data-topology-edit-icon-unresolved-reference-count', '0');
  await expect(page.locator('svg[data-role="topology-edit-icon-sprite"]')).toHaveCount(1);

  const undo = host.locator('[data-action="undo"]');
  await expect(undo).toHaveCount(1);
  await expect(undo).toHaveAttribute('data-action', 'undo');
  await expect(undo).toHaveAttribute('data-topology-edit-icon-symbol', 'icon-undo');

  await host.evaluate((element) => {
    const documentRef = element.ownerDocument;
    const svgNamespace = 'http://www.w3.org/2000/svg';
    const xlinkNamespace = 'http://www.w3.org/1999/xlink';
    const probe = documentRef.createElement('span');
    probe.dataset.iconRepairProbe = 'true';

    const firstSvg = documentRef.createElementNS(svgNamespace, 'svg');
    const firstUse = documentRef.createElementNS(svgNamespace, 'use');
    firstUse.dataset.iconRepairProbeUse = 'href';
    firstUse.setAttribute('href', '#icon-undo-broken');
    firstSvg.append(firstUse);

    const secondSvg = documentRef.createElementNS(svgNamespace, 'svg');
    const secondUse = documentRef.createElementNS(svgNamespace, 'use');
    secondUse.dataset.iconRepairProbeUse = 'xlink';
    secondUse.setAttributeNS(xlinkNamespace, 'xlink:href', '#icon-redo-broken');
    secondSvg.append(secondUse);

    probe.append(firstSvg, secondSvg);
    element.append(probe);
  });

  const hrefUse = host.locator('[data-icon-repair-probe-use="href"]');
  const xlinkUse = host.locator('[data-icon-repair-probe-use="xlink"]');
  await expect.poll(() => hrefUse.getAttribute('href')).toBe('#icon-undo');
  await expect.poll(() => xlinkUse.evaluate((use) => (
    use.getAttributeNS('http://www.w3.org/1999/xlink', 'href')
  ))).toBe('#icon-redo');
  await expect(host).toHaveAttribute('data-topology-edit-icon-broken-reference-count', '0');
  await expect(host).toHaveAttribute('data-topology-edit-icon-unresolved-reference-count', '0');
  await expect(host).toHaveAttribute('data-topology-edit-icon-reference-status', 'RESOLVED');
  await expect.poll(async () => Number(
    await host.getAttribute('data-topology-edit-icon-repaired-reference-count'),
  )).toBeGreaterThanOrEqual(2);

  await hrefUse.evaluate((use) => use.setAttribute('href', '#icon-undo-broken'));
  await expect.poll(() => hrefUse.getAttribute('href')).toBe('#icon-undo');
  await expect.poll(async () => Number(
    await host.getAttribute('data-topology-edit-icon-repaired-reference-count'),
  )).toBeGreaterThanOrEqual(3);

  await expect(undo).toHaveAttribute('data-action', 'undo');
  await expect(undo.locator(':scope > svg use')).toHaveAttribute('href', '#icon-undo');
  await expect(page.locator('svg[data-role="topology-edit-icon-sprite"]')).toHaveCount(1);
});

async function openTopologyEdit(page) {
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
  await expect(host).toHaveAttribute('data-topology-edit-clean-shell', 'true');
  await expect(host).toHaveAttribute('data-topology-edit-icon-presentation-status', 'BOUND');
  await expect(host).toHaveAttribute('data-topology-edit-icon-reference-status', 'RESOLVED');
  return host;
}
