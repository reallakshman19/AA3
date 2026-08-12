import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1720, height: 1080 });
  await page.addInitScript(() => globalThis.localStorage?.clear());
});

test('Engineering Table row/detail divider is pointer and keyboard adjustable without engineering mutation', async ({ page }) => {
  const diagnostics = collectDiagnostics(page);
  await openEngineeringTable(page);
  const table = page.locator('[data-role="topology-edit-table"]');
  const surface = table.locator('.topology-edit-table--populated');
  const upper = table.locator('[data-table-upper-region]');
  const splitter = table.locator('[data-table-splitter]');
  const lower = table.locator('[data-table-lower-region]');
  await expect(surface).toBeVisible();
  await expect(upper).toBeVisible();
  await expect(splitter).toBeVisible();
  await expect(lower).toBeVisible();
  await expect(splitter).toHaveAttribute('role', 'separator');
  await expect(splitter).toHaveAttribute('aria-orientation', 'horizontal');

  const edgeRows = table.locator('tbody tr[data-canonical-id]');
  const edgeIndex = await edgeRows.evaluateAll((rows) => rows.findIndex((row) => (
    ['PIPE', 'VALVE', 'REDUCER', 'ELBOW'].includes(row.getAttribute('data-element-type'))
  )));
  expect(edgeIndex).toBeGreaterThanOrEqual(0);
  await edgeRows.nth(edgeIndex).locator('[data-table-select]').click();
  await expect(lower).toContainText('MOVE_NODE / CONNECTED_RUN');
  const windowNotice = table.locator('[data-table-window-notice]');
  if (await windowNotice.count()) {
    await expect(upper.locator('[data-table-window-notice]')).toHaveCount(1);
  }
  const order = await table.evaluate(() => {
    const surfaceNode = document.querySelector('[data-role="topology-edit-table"] .topology-edit-table--populated');
    return [...surfaceNode.children].map((node) => (
      node.matches('[data-table-upper-region]') ? 'upper'
        : node.matches('[data-table-splitter]') ? 'splitter'
          : node.matches('[data-table-lower-region]') ? 'lower' : 'other'
    ));
  });
  expect(order.indexOf('upper')).toBeLessThan(order.indexOf('splitter'));
  expect(order.indexOf('splitter')).toBeLessThan(order.indexOf('lower'));

  const baseline = await authorityEvidence(page);
  const before = await paneGeometry(upper, lower);
  const box = await splitter.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box.x + (box.width / 2), box.y + (box.height / 2));
  await page.mouse.down();
  await page.mouse.move(box.x + (box.width / 2), box.y - 72, { steps: 8 });
  await page.mouse.up();

  const dragged = await paneGeometry(upper, lower);
  expect(dragged.lowerHeight).toBeGreaterThan(before.lowerHeight + 40);
  expect(dragged.upperHeight).toBeLessThan(before.upperHeight - 40);
  const ariaHeight = Number(await splitter.getAttribute('aria-valuenow'));
  expect(Math.abs(ariaHeight - dragged.lowerHeight)).toBeLessThan(4);
  expectAuthorityNoop(await authorityEvidence(page), baseline);

  await splitter.focus();
  const beforeKey = await paneGeometry(upper, lower);
  await splitter.press('ArrowDown');
  const afterKey = await paneGeometry(upper, lower);
  expect(afterKey.lowerHeight).toBeLessThan(beforeKey.lowerHeight);
  expect(afterKey.upperHeight).toBeGreaterThan(beforeKey.upperHeight);
  await expect(splitter).toHaveAttribute('aria-valuemin', /\d+/);
  await expect(splitter).toHaveAttribute('aria-valuemax', /\d+/);
  await expect(splitter).toHaveAttribute('aria-valuenow', /\d+/);
  expectAuthorityNoop(await authorityEvidence(page), baseline);

  const retainedHeight = afterKey.lowerHeight;
  const secondIndex = edgeIndex === 0 ? 1 : 0;
  await edgeRows.nth(secondIndex).locator('[data-table-select]').click();
  await expect.poll(() => paneGeometry(upper, lower).then((value) => (
    Math.abs(value.lowerHeight - retainedHeight)
  ))).toBeLessThan(2);
  expectAuthorityNoop(await authorityEvidence(page), baseline);

  const scroll = table.locator('[data-table-scroll-region]');
  const scrollable = await scroll.evaluate((node) => node.scrollHeight > node.clientHeight);
  if (scrollable) {
    await scroll.evaluate((node) => { node.scrollTop = Math.min(120, node.scrollHeight - node.clientHeight); });
    expect(await scroll.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  }
  expectAuthorityNoop(await authorityEvidence(page), baseline);
  await assertDiagnostics(diagnostics);
});

async function openEngineeringTable(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('navigation', { name: 'Application views' })
    .getByRole('button', { name: 'Workspace', exact: true }).click();
  await page.locator('[data-action="load-topology-edit-demo"]').click();
  await expect.poll(() => page.evaluate(() => (
    globalThis.AnalysisWorkspace?.getSnapshot?.()?.dataset?.entities?.length ?? 0
  ))).toBe(20);
  await page.getByRole('button', { name: '3D Edit', exact: true }).click();
  const host = page.locator('[data-role="topology-edit-render-host"]');
  await expect(host).toBeVisible();
  await expect.poll(() => host.getAttribute('data-topology-edit-canonical-hash')).toBeTruthy();
  await page.locator('[data-action="open-engineering-table"]').click();
  await expect(page.locator('[data-role="topology-edit-table"]')).toBeVisible();
  await expect.poll(() => host.getAttribute('data-topology-edit-table-projection-hash')).toBeTruthy();
}

async function paneGeometry(upper, lower) {
  const upperBox = await upper.boundingBox();
  const lowerBox = await lower.boundingBox();
  expect(upperBox).not.toBeNull();
  expect(lowerBox).not.toBeNull();
  return { upperHeight: upperBox.height, lowerHeight: lowerBox.height };
}

async function authorityEvidence(page) {
  return page.evaluate(() => {
    const host = document.querySelector('[data-role="topology-edit-render-host"]');
    const controller = host?.__topologyEditAuthoringController;
    const runtime = controller?.tableAdapter?.runtime;
    const journal = controller?.session?.journal;
    return {
      canonicalHash: controller?.session?.currentTopology?.()?.canonicalTopologyHash ?? null,
      sourceHash: controller?.workspaceDataset?.sourceSnapshot?.sourceSemanticHash ?? null,
      sourceByteHash: controller?.workspaceDataset?.sourceSnapshot?.sourceByteHash ?? null,
      journalHash: journal?.journalHash ?? null,
      activeLedgerHash: journal?.activeLedgerHash ?? null,
      activeCommandIds: [...(journal?.activeCommandIds ?? [])],
      sessionVersion: journal?.sessionVersion ?? null,
      batchHash: runtime?.batch?.batchHash ?? '',
      planHash: runtime?.batchPlan?.planHash ?? '',
      previewHash: runtime?.preview?.previewHash ?? '',
      validationHash: runtime?.validation?.tableValidationHash ?? '',
      intentCount: runtime?.intents?.length ?? 0,
    };
  });
}

function expectAuthorityNoop(actual, expected) {
  expect(actual.canonicalHash).toBe(expected.canonicalHash);
  expect(actual.sourceHash).toBe(expected.sourceHash);
  expect(actual.sourceByteHash).toBe(expected.sourceByteHash);
  expect(actual.journalHash).toBe(expected.journalHash);
  expect(actual.activeLedgerHash).toBe(expected.activeLedgerHash);
  expect(actual.activeCommandIds).toEqual(expected.activeCommandIds);
  expect(actual.sessionVersion).toBe(expected.sessionVersion);
  expect(actual.batchHash).toBe(expected.batchHash);
  expect(actual.planHash).toBe(expected.planHash);
  expect(actual.previewHash).toBe(expected.previewHash);
  expect(actual.validationHash).toBe(expected.validationHash);
  expect(actual.intentCount).toBe(expected.intentCount);
}

function collectDiagnostics(page) {
  const pageErrors = []; const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  return { pageErrors, consoleErrors };
}
async function assertDiagnostics(diagnostics) {
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.consoleErrors.filter((message) => !message.includes('favicon'))).toEqual([]);
}
