import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript(() => {
    globalThis.localStorage?.clear();
    globalThis.__WORKSPACE_VIEWPORT_BACKEND__ = 'canvas2d';
  });
});

test('3D Edit TopoFix auto-applies a certified 3 mm SNAP_GAP and remains undoable', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const navigation = page.getByRole('navigation', { name: 'Application views' });
  await navigation.getByRole('button', { name: 'Workspace', exact: true }).click();
  await page.locator('[data-action="load-topology-edit-demo"]').click();
  await expect.poll(() => page.evaluate(() => {
    const snapshot = globalThis.AnalysisWorkspace?.getSnapshot?.();
    return snapshot?.dataset?.entities?.length ?? 0;
  })).toBe(20);

  await page.getByRole('button', { name: '3D Edit', exact: true }).click();
  const host = page.locator('[data-role="topology-edit-render-host"]');
  await expect(host).toBeVisible();

  await selectPort(page, 'P-001:port:end', false);
  await selectPort(page, 'E-001:port:start', true);
  await page.locator('[data-command-action="set-gap-3"]').click();

  const snap = page.locator('[data-issue-kind="SNAP_GAP"]').filter({ hasText: '3.00mm' });
  await expect(snap).toHaveCount(1);
  const topoFix = page.locator('[data-action="autofix-high-confidence-gaps"]');
  await expect(topoFix).toHaveText(/TopoFix.*AutoFix.*<6 mm gaps \(1\)/u);
  await topoFix.click();

  await expect(snap).toHaveCount(0);
  await expect(host).toHaveAttribute('data-topology-edit-active-command-count', '2');
  await expect(page.locator('[data-role="topology-edit-status"]'))
    .toContainText('TopoFix accepted 1 high-confidence gap merge');

  await page.locator('[data-action="undo"]').click();
  await expect(snap).toHaveCount(1);
  await expect(host).toHaveAttribute('data-topology-edit-active-command-count', '1');
});

async function selectPort(page, portKey, additive) {
  const input = page.locator('[data-role="topology-edit-search-input"]');
  await input.fill(portKey);
  const result = page.locator('[data-search-object-kind="node"]');
  await expect(result).toHaveCount(1);
  await result.click({ modifiers: additive ? ['Shift'] : [] });
}
