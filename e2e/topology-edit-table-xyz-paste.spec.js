import { expect, test } from '@playwright/test';

test('TSV paste drafts direct XYZ cells atomically before certified endpoint staging', async ({ page }) => {
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

  const row = table.locator('tbody tr').filter({ has: table.locator('[data-table-cell-edit="NODE_POSITION"]') }).first();
  await expect(row).toBeVisible();
  const fromInputs = row.locator('[data-table-cell-edit="NODE_POSITION"][data-table-cell-endpoint="FROM"]');
  await expect(fromInputs).toHaveCount(3);
  const meta = await fromInputs.evaluateAll((nodes) => nodes.map((node) => ({
    draftKey: node.dataset.tableCellDraftKey,
    axis: node.dataset.tableCellAxis,
    value: Number(node.value),
    canonicalId: node.dataset.tableCellCanonicalId,
  })));
  expect(meta.map((item) => item.axis)).toEqual(['X', 'Y', 'Z']);
  expect(new Set(meta.map((item) => item.canonicalId)).size).toBe(1);
  expect(meta.every((item) => Number.isFinite(item.value))).toBe(true);

  const before = await authorityEvidence(page);
  const pasted = meta.map((item, index) => item.value + ((index + 1) * 10));
  await dispatchPaste(fromInputs.first(), pasted.join('\t'));
  await expect(table).toHaveAttribute('data-table-xyz-paste-assignment-count', '3');
  await expect(table).toHaveAttribute('data-table-xyz-paste-rows', '1');
  await expect(table).toHaveAttribute('data-table-xyz-paste-columns', '3');
  expectAuthorityNoop(await authorityEvidence(page), before);
  expect(await host.getAttribute('data-topology-edit-table-batch-hash')).toBe('');
  expect(await host.getAttribute('data-topology-edit-table-preview-hash')).toBe('');

  const draftEvidence = await page.evaluate((keys) => {
    const runtime = document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController?.tableAdapter?.runtime;
    return {
      values: keys.map((key) => runtime?.cellDrafts?.get(key) ?? null),
      intentCount: runtime?.intents?.length ?? 0,
      hasBatch: Boolean(runtime?.batch),
      hasPreview: Boolean(runtime?.preview),
    };
  }, meta.map((item) => item.draftKey));
  expect(draftEvidence.values).toEqual(pasted.map(String));
  expect(draftEvidence.intentCount).toBe(0);
  expect(draftEvidence.hasBatch).toBe(false);
  expect(draftEvidence.hasPreview).toBe(false);

  const refreshedFrom = row.locator('[data-table-cell-edit="NODE_POSITION"][data-table-cell-endpoint="FROM"]');
  await refreshedFrom.first().press('Enter');
  await expect.poll(() => host.getAttribute('data-topology-edit-table-batch-hash')).toBeTruthy();
  await expect.poll(() => host.getAttribute('data-topology-edit-table-preview-hash')).toBeTruthy();
  expectAuthorityNoop(await authorityEvidence(page), before);
  const staged = await page.evaluate((canonicalId) => {
    const runtime = document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController?.tableAdapter?.runtime;
    const intent = runtime?.intents?.find((candidate) => (
      candidate.intentKind === 'NODE_POSITION'
      && candidate.target?.canonicalId === canonicalId
      && candidate.requestedValue?.endpoint === 'FROM'
    ));
    return intent ? intent.requestedValue.position : null;
  }, meta[0].canonicalId);
  expect(staged).toEqual({ x: pasted[0], y: pasted[1], z: pasted[2] });

  await page.locator('[data-table-action="discard"]').click();
  await expect.poll(() => host.getAttribute('data-topology-edit-table-batch-hash')).toBe('');
  expectAuthorityNoop(await authorityEvidence(page), before);

  const toInputs = row.locator('[data-table-cell-edit="NODE_POSITION"][data-table-cell-endpoint="TO"]');
  await expect(toInputs).toHaveCount(3);
  const last = toInputs.nth(2);
  const lastKey = await last.getAttribute('data-table-cell-draft-key');
  await dispatchPaste(last, '123\t456');
  await expect(table.locator('[data-table-error]')).toContainText('not an editable XYZ cell');
  const rejected = await page.evaluate((draftKey) => {
    const runtime = document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController?.tableAdapter?.runtime;
    return {
      hasDraft: runtime?.cellDrafts?.has(draftKey) ?? false,
      intentCount: runtime?.intents?.length ?? 0,
      hasBatch: Boolean(runtime?.batch),
    };
  }, lastKey);
  expect(rejected.hasDraft).toBe(false);
  expect(rejected.intentCount).toBe(0);
  expect(rejected.hasBatch).toBe(false);
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
  await expect.poll(() => Boolean(host.getAttribute('data-topology-edit-table-projection-hash'))).toBeTruthy();
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
