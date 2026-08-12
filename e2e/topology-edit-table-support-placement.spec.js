import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const REPORT = 'reports/qualification/topology-edit-table-support-placement.json';

test.beforeEach(async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1720, height: 1080 });
  await page.addInitScript(() => globalThis.localStorage?.clear());
});

test('S-007 support station follows the full certified Table lifecycle and keeps P-011 movement blocked', async ({ page }, testInfo) => {
  const diagnostics = collectDiagnostics(page);
  const host = await openXyzTable(page);
  const baseline = await authorityEvidence(page);
  const supportId = await selectTableRowByTag(page, 'S-007', 'SUPPORT');

  const editor = page.locator(`[data-table-support-placement-editor="${supportId}"]`);
  await expect(editor).toBeVisible();
  await expect(editor).toHaveAttribute('data-table-support-placement-status', 'NEEDS_INPUT');
  const station = editor.locator('[data-table-edit-support-station]');
  await expect(station).toBeEnabled();
  const currentStation = Number(await station.inputValue());
  const hostLength = Number(await station.getAttribute('max'));
  expect(Number.isFinite(currentStation)).toBe(true);
  expect(Number.isFinite(hostLength)).toBe(true);
  expect(currentStation).toBeGreaterThanOrEqual(0);
  expect(currentStation).toBeLessThan(hostLength);
  const requestedStation = Math.min(hostLength, currentStation + Math.min(100, (hostLength - currentStation) / 2));
  expect(requestedStation).toBeGreaterThan(currentStation);

  await station.fill(String(requestedStation));
  expectAuthorityNoop(await authorityEvidence(page), baseline);

  await editor.locator('[data-table-support-placement-stage]').click();
  await expect.poll(() => authorityEvidence(page).then((row) => row.intentCount)).toBe(1);
  const staged = await authorityEvidence(page);
  expectAuthorityNoop(staged, baseline);
  expect(staged.batchHash).not.toBe('');

  await page.locator('[data-table-action="preview"]').click();
  await expect.poll(() => authorityEvidence(page).then((row) => row.previewHash)).toBeTruthy();
  const previewed = await authorityEvidence(page);
  expectAuthorityNoop(previewed, baseline);
  expect(previewed.ghostChildCount).toBeGreaterThan(0);
  const previewPlacement = await supportEvidence(page, supportId);
  expect(previewPlacement.canonicalPlacementOverride).toBeNull();

  await page.locator('[data-table-action="validate"]').click();
  await expect(host).toHaveAttribute('data-topology-edit-table-validation-status', 'READY_TO_APPLY');
  const validated = await authorityEvidence(page);
  expectAuthorityNoop(validated, baseline);

  await page.locator('[data-table-action="apply"]').click();
  await expect.poll(() => authorityEvidence(page).then((row) => row.canonicalHash))
    .not.toBe(baseline.canonicalHash);
  const applied = await authorityEvidence(page);
  const placement = await supportEvidence(page, supportId);
  expect(placement.canonicalPlacementOverride?.authority).toBe('CERTIFIED_TABLE_OVERRIDE');
  expect(placement.canonicalPlacementOverride?.stationMm).toBeCloseTo(requestedStation, 9);
  expect(placement.tableStationMm).toBeCloseTo(requestedStation, 9);
  expect(placement.tableStationAuthority).toBe('CERTIFIED_TABLE_OVERRIDE');
  expect(applied.sourceHash).toBe(baseline.sourceHash);
  expect(applied.sourceByteHash).toBe(baseline.sourceByteHash);
  expect(applied.rendererCount).toBe(1);
  expect(applied.activeCommandCount).toBe(baseline.activeCommandCount + 1);

  await page.locator('[data-action="undo"]').click();
  await expect.poll(() => authorityEvidence(page).then((row) => row.canonicalHash))
    .toBe(baseline.canonicalHash);
  const undone = await authorityEvidence(page);
  expect(undone.activeLedgerHash).toBe(baseline.activeLedgerHash);
  expect(undone.activeCommandIds).toEqual(baseline.activeCommandIds);
  expect((await supportEvidence(page, supportId)).canonicalPlacementOverride).toBeNull();

  await page.locator('[data-action="redo"]').click();
  await expect.poll(() => authorityEvidence(page).then((row) => row.canonicalHash))
    .toBe(applied.canonicalHash);
  const redone = await authorityEvidence(page);
  expect(redone.activeLedgerHash).toBe(applied.activeLedgerHash);
  expect(redone.activeCommandIds).toEqual(applied.activeCommandIds);

  const pipeId = await selectTableRowByTag(page, 'P-011', 'PIPE');
  const pipeEditor = page.locator('[data-table-node-endpoint="FROM"]');
  await expect(pipeEditor.locator('[data-table-node-capability="FROM"]'))
    .toHaveAttribute('data-table-capability-status', 'UNREPRESENTABLE');
  await expect(pipeEditor.locator('[data-table-node-capability="FROM"]'))
    .toContainText('support movement policy must be certified');
  await expect(pipeEditor.locator('[data-table-node-position-stage="FROM"]')).toBeDisabled();
  expect(pipeId).toBeTruthy();

  await assertDiagnostics(diagnostics);
  await testInfo.attach('support-placement-s007', {
    body: await page.screenshot({ fullPage: true }), contentType: 'image/png',
  });
  const evidence = {
    schema: 'TopologyEditTableSupportPlacementQualification.v1',
    status: 'SOURCE_ASSERTIONS_AUTHORED',
    candidateHead: process.env.TOPOLOGY_EDIT_TARGET_HEAD_SHA || null,
    fixture: 'public/fixtures/topology-edit-20-element-demo.staged.json#XYZ-10-COMPONENT-BRANCH',
    supportTag: 'S-007', hostTag: 'P-011', supportId, pipeId,
    currentStation, requestedStation, hostLength,
    baseline, staged, previewed, validated, applied, undone, redone, placement,
  };
  await mkdir('reports/qualification', { recursive: true });
  await writeFile(REPORT, `${JSON.stringify(evidence, null, 2)}\n`);
});

async function openXyzTable(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('navigation', { name: 'Application views' })
    .getByRole('button', { name: 'Workspace', exact: true }).click();
  await page.locator('[data-action="load-topology-edit-xyz-branch-demo"]').click();
  await expect(page.locator('[data-role="summary-supports"]')).toContainText('7');
  await page.getByRole('button', { name: '3D Edit', exact: true }).click();
  const host = page.locator('[data-role="topology-edit-render-host"]');
  await expect(host).toBeVisible();
  await expect.poll(() => host.getAttribute('data-topology-edit-canonical-hash')).toBeTruthy();
  await page.locator('[data-action="open-engineering-table"]').click();
  await expect(page.locator('[data-role="topology-edit-table"]')).toBeVisible();
  return host;
}

async function selectTableRowByTag(page, tag, expectedElementType) {
  const filter = page.locator('[data-table-filter]');
  await filter.fill(tag);
  await expect(filter).toHaveValue(tag);
  const rows = page.locator('[data-role="topology-edit-table"] tbody tr[data-canonical-id]');
  await expect(rows).toHaveCount(1);
  const row = rows.first();
  await expect(row).toBeVisible();
  await expect(row).toHaveAttribute('data-element-type', expectedElementType);
  const canonicalId = await row.getAttribute('data-canonical-id');
  expect(canonicalId).toBeTruthy();
  await row.locator('[data-table-select]').click();
  await expect(page.locator('[data-table-all-properties]')).toBeVisible();
  return canonicalId;
}

async function authorityEvidence(page) {
  return page.evaluate(() => {
    const host = document.querySelector('[data-role="topology-edit-render-host"]');
    const controller = host?.__topologyEditAuthoringController;
    const runtime = controller?.tableAdapter?.runtime; const journal = controller?.session?.journal;
    return {
      canonicalHash: controller?.session?.currentTopology?.()?.canonicalTopologyHash ?? null,
      sourceHash: controller?.workspaceDataset?.sourceSnapshot?.sourceSemanticHash ?? null,
      sourceByteHash: controller?.workspaceDataset?.sourceSnapshot?.sourceByteHash ?? null,
      journalHash: journal?.journalHash ?? null,
      activeLedgerHash: journal?.activeLedgerHash ?? null,
      activeCommandIds: [...(journal?.activeCommandIds ?? [])],
      activeCommandCount: journal?.activeCommandIds?.length ?? 0,
      sessionVersion: journal?.sessionVersion ?? null,
      rendererCount: controller?.viewportBackend?.renderer?.domElement ? 1 : 0,
      ghostChildCount: controller?.viewportBackend?.groups?.ghostGroup?.children?.length ?? 0,
      batchHash: runtime?.batch?.batchHash ?? '', previewHash: runtime?.preview?.previewHash ?? '',
      validationStatus: runtime?.validation?.status ?? '', intentCount: runtime?.batch?.intentCount ?? 0,
    };
  });
}

async function supportEvidence(page, supportId) {
  return page.evaluate((id) => {
    const controller = document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController;
    const support = controller.session.currentTopology().supports.find((row) => row.id === id);
    const tableRow = controller.tableAdapter.runtime.projection.rows.find(
      (row) => row.identity.canonicalId === id,
    );
    return {
      canonicalPlacementOverride: support?.placementOverride ?? null,
      importedOrigin: support?.origin ?? null,
      attachmentId: support?.attachmentId ?? null,
      attachmentSegmentParameter: support?.attachmentSegmentParameter ?? null,
      tableStationMm: Number(tableRow?.fields?.stationMm),
      tableStationAuthority: tableRow?.fieldAuthority?.stationMm ?? null,
    };
  }, supportId);
}

function expectAuthorityNoop(actual, expected) {
  expect(actual.canonicalHash).toBe(expected.canonicalHash);
  expect(actual.journalHash).toBe(expected.journalHash);
  expect(actual.activeLedgerHash).toBe(expected.activeLedgerHash);
  expect(actual.activeCommandIds).toEqual(expected.activeCommandIds);
  expect(actual.activeCommandCount).toBe(expected.activeCommandCount);
  expect(actual.sessionVersion).toBe(expected.sessionVersion);
  expect(actual.sourceHash).toBe(expected.sourceHash);
  expect(actual.sourceByteHash).toBe(expected.sourceByteHash);
  expect(actual.rendererCount).toBe(expected.rendererCount);
}
function collectDiagnostics(page) {
  const pageErrors = []; const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  return { pageErrors, consoleErrors };
}
async function assertDiagnostics(diagnostics) {
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.consoleErrors.filter((message) => !message.includes('favicon'))).toEqual([]);
}
