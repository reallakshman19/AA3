import { expect, test } from '@playwright/test';

test('PIPE length paste requires visible explicit geometry policy and stages without canonical mutation', async ({ page }) => {
  test.setTimeout(180_000);
  const diagnostics = collectDiagnostics(page);
  await page.setViewportSize({ width: 1720, height: 1080 });
  await page.addInitScript(() => globalThis.localStorage?.clear());
  const host = await openProductionController(page);
  const panel = page.locator('details[data-panel-kind="table"]');
  if (!(await panel.evaluate((node) => node.open))) {
    await panel.locator(':scope > summary').click();
  }
  const table = page.locator('[data-role="topology-edit-table"]');
  await page.locator('[data-table-profile="GEOMETRY"]').click();
  await page.locator('[data-table-filter]').fill('PIPE');

  const lengthInput = table.locator('tbody [data-table-cell-edit="PIPE_LENGTH"]').first();
  await expect(lengthInput).toBeVisible();
  const row = lengthInput.locator('xpath=ancestor::tr[1]');
  const canonicalId = await lengthInput.getAttribute('data-table-cell-canonical-id');
  expect(canonicalId).toBeTruthy();
  const select = row.locator('[data-table-select]');
  if ((await select.getAttribute('aria-pressed')) !== 'true') await select.click();
  await expect(table.locator('[data-table-editor-id] [data-table-edit-length]')).toBeVisible();

  const anchor = table.locator('[data-table-edit-anchor]');
  const propagation = table.locator('[data-table-edit-propagation]');
  await anchor.selectOption('FROM');
  await propagation.selectOption('DOWNSTREAM');
  const before = await authorityEvidence(page);
  const priorLength = Number(await lengthInput.inputValue());
  expect(Number.isFinite(priorLength)).toBe(true);
  const requestedLength = priorLength + 125;

  await dispatchPaste(lengthInput, String(requestedLength));
  await expect(table).toHaveAttribute('data-table-pipe-length-paste-assignment-count', '1');
  await expect(table).toHaveAttribute('data-table-pipe-length-paste-anchor', 'FROM');
  await expect(table).toHaveAttribute('data-table-pipe-length-paste-propagation', 'DOWNSTREAM');
  await expect.poll(() => host.getAttribute('data-topology-edit-table-batch-hash')).toBeTruthy();
  await expect.poll(() => host.getAttribute('data-topology-edit-table-preview-hash')).toBeTruthy();
  expectAuthorityNoop(await authorityEvidence(page), before);

  const staged = await page.evaluate((id) => {
    const runtime = document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController?.tableAdapter?.runtime;
    const intent = runtime?.intents?.find((candidate) => (
      candidate.intentKind === 'PIPE_LENGTH' && candidate.target?.canonicalId === id
    ));
    return intent ? {
      lengthMm: intent.requestedValue?.lengthMm,
      anchor: intent.geometryPolicy?.anchor,
      propagation: intent.geometryPolicy?.propagation,
      intentCount: runtime?.batch?.intentCount ?? 0,
    } : null;
  }, canonicalId);
  expect(staged).toEqual({
    lengthMm: requestedLength,
    anchor: 'FROM',
    propagation: 'DOWNSTREAM',
    intentCount: 1,
  });

  await page.locator('[data-table-action="discard"]').click();
  await expect.poll(() => host.getAttribute('data-topology-edit-table-batch-hash')).toBe('');
  expectAuthorityNoop(await authorityEvidence(page), before);

  const refreshedRow = table.locator(`tbody tr[data-canonical-id="${canonicalId}"]`);
  const refreshedLengthInput = refreshedRow.locator('[data-table-cell-edit="PIPE_LENGTH"]');
  await table.locator('[data-table-edit-anchor]').selectOption('FROM');
  await table.locator('[data-table-edit-propagation]').selectOption('UPSTREAM');
  await dispatchPaste(refreshedLengthInput, String(requestedLength + 50));
  await expect(table.locator('.topology-edit-table__status')).toContainText('explicit policy FROM / UPSTREAM is unsupported');
  expect(await host.getAttribute('data-topology-edit-table-batch-hash')).toBe('');
  expectAuthorityNoop(await authorityEvidence(page), before);

  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.consoleErrors.filter((message) => !message.includes('favicon'))).toEqual([]);
});

async function dispatchPaste(locator, text) {
  await locator.evaluate((node, clipboardText) => {
    const data = new DataTransfer();
    data.setData('text/plain', clipboardText);
    node.dispatchEvent(new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: data,
    }));
  }, text);
}

async function openProductionController(page) {
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
  await expect.poll(() => host.getAttribute('data-topology-edit-table-projection-hash')).toBeTruthy();
  return host;
}

async function authorityEvidence(page) {
  return page.evaluate(() => {
    const host = document.querySelector('[data-role="topology-edit-render-host"]');
    const controller = host?.__topologyEditAuthoringController;
    const topology = controller?.session?.currentTopology?.();
    const journal = controller?.session?.journal;
    return {
      canonicalHash: topology?.canonicalTopologyHash ?? null,
      journalHash: journal?.journalHash ?? null,
      activeLedgerHash: journal?.activeLedgerHash ?? null,
      activeCommandIds: [...(journal?.activeCommandIds ?? [])],
      sessionVersion: journal?.sessionVersion ?? null,
      sourceHash: controller?.workspaceDataset?.sourceSnapshot?.sourceSemanticHash ?? null,
      sourceByteHash: controller?.workspaceDataset?.sourceSnapshot?.sourceByteHash ?? null,
      activeCommandCount: journal?.activeCommandIds?.length ?? 0,
      rendererCount: controller?.viewportBackend?.renderer?.domElement ? 1 : 0,
    };
  });
}
function expectAuthorityNoop(actual, expected) {
  expect(actual.canonicalHash).toBe(expected.canonicalHash);
  expect(actual.journalHash).toBe(expected.journalHash);
  expect(actual.activeLedgerHash).toBe(expected.activeLedgerHash);
  expect(actual.activeCommandIds).toEqual(expected.activeCommandIds);
  expect(actual.sessionVersion).toBe(expected.sessionVersion);
  expect(actual.sourceHash).toBe(expected.sourceHash);
  expect(actual.sourceByteHash).toBe(expected.sourceByteHash);
  expect(actual.activeCommandCount).toBe(expected.activeCommandCount);
  expect(actual.rendererCount).toBe(expected.rendererCount);
}
function collectDiagnostics(page) {
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  return { pageErrors, consoleErrors };
}
