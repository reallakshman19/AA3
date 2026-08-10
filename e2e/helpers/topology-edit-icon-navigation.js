import { expect } from '@playwright/test';
import { TOPOLOGY_EDIT_ICON_SURFACE } from '../../src/workspace/viewport-productivity/topology-edit-icon-manifest.js';

const PANEL_BY_SURFACE = Object.freeze({
  [TOPOLOGY_EDIT_ICON_SURFACE.VIEWS]: 'views',
  [TOPOLOGY_EDIT_ICON_SURFACE.ENGINEERING_COMMAND]: 'commands',
  [TOPOLOGY_EDIT_ICON_SURFACE.DRAFT_AUDIT]: 'draft',
  [TOPOLOGY_EDIT_ICON_SURFACE.DISPLAY]: 'display',
});

export async function openTopologyEdit(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const navigation = page.getByRole('navigation', { name: 'Application views' });
  await navigation.getByRole('button', { name: 'Workspace', exact: true }).click();
  await page.locator('[data-action="load-topology-edit-demo"]').click();
  await expect.poll(() => page.evaluate(() => (
    globalThis.AnalysisWorkspace?.getSnapshot?.()?.dataset?.entities?.length ?? 0
  ))).toBe(20);
  await page.getByRole('button', { name: '3D Edit', exact: true }).click();
  const host = page.locator('[data-role="topology-edit-render-host"]');
  await expect(host).toBeVisible({ timeout: 60_000 });
  await expect(host).toHaveAttribute('data-topology-edit-clean-shell', 'true');
  await expect(host).toHaveAttribute('data-topology-edit-icon-presentation-status', 'BOUND');
  await expect(host).toHaveAttribute('data-topology-edit-icon-reference-status', 'RESOLVED');
  return host;
}

export async function openApplicableSurface(host, entry) {
  const kind = PANEL_BY_SURFACE[entry.surface];
  if (kind) await openPanel(host, kind);
  if (entry.key === 'display.apply-section' || entry.key === 'display.clear-section') {
    await openSectionControls(host);
  }
}

export async function expectToolbarHitTargetsSeparated(host) {
  const views = host.locator(
    '.topology-edit-clean-shell__navigation > details[data-panel-kind="views"] > summary',
  );
  const history = host.locator('.topology-edit-clean-shell__history');
  await expect(views).toHaveCount(1);
  await expect(history).toHaveCount(1);
  await expect.poll(async () => {
    const viewsBox = await views.boundingBox();
    const historyBox = await history.boundingBox();
    if (!viewsBox || !historyBox) return false;
    return viewsBox.x + viewsBox.width <= historyBox.x;
  }).toBe(true);
}

export async function openPanel(host, kind) {
  const details = host.locator(`details[data-panel-kind="${kind}"]`);
  await expect(details).toHaveCount(1);
  if (!(await details.evaluate((element) => element.open))) {
    await details.locator(':scope > summary').click();
  }
  await expect(details).toHaveAttribute('open', '');
}

export async function closePanel(host, kind) {
  const details = host.locator(`details[data-panel-kind="${kind}"]`);
  await expect(details).toHaveCount(1);
  if (await details.evaluate((element) => element.open)) {
    await details.locator(':scope > summary').click();
  }
  await expect(details).not.toHaveAttribute('open', '');
}

export async function openSectionControls(host) {
  const section = host.locator(
    'details[data-panel-kind="display"] .topology-edit-section-controls',
  );
  await expect(section).toHaveCount(1);
  if (!(await section.evaluate((element) => element.open))) {
    await section.locator(':scope > summary').click();
  }
  await expect(section).toHaveAttribute('open', '');
}

export async function selectFirstNodeThroughObjectTree(host) {
  await openPanel(host, 'topology-edit-object-tree');
  const tree = host.locator('[data-role="topology-edit-object-tree"]');
  const group = tree.locator('details[data-object-tree-group="nodes"]');
  if (!(await group.evaluate((element) => element.open))) {
    await group.locator(':scope > summary').click();
  }
  await group.locator('[data-object-tree-select]').first().click();
  await expect.poll(async () => Number(
    await host.getAttribute('data-topology-edit-selection-count'),
  )).toBeGreaterThan(0);
}
