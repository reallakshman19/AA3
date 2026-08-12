import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const REPORT = 'reports/qualification/topology-edit-table-support-restraint.json';

test.beforeEach(async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1720, height: 1080 });
  await page.addInitScript(() => globalThis.localStorage?.clear());
});

test('S-007 restraint follows the certified Table lifecycle without moving support authority', async ({ page }, testInfo) => {
  const diagnostics = collectDiagnostics(page);
  const host = await openXyzTable(page);
  const baseline = await authorityEvidence(page);
  const supportId = await selectTableSupport(page, 'S-007');
  const before = await supportEvidence(page, supportId);
  expect(before.override).toBeNull();
  expect(before.restraintAuthority).not.toBe('CERTIFIED_TABLE_OVERRIDE');

  const editor = page.locator(`[data-table-support-restraint-editor="${supportId}"]`);
  await expect(editor).toBeVisible();
  const family = editor.locator('[data-table-edit-support-family]');
  const direction = editor.locator('[data-table-edit-support-direction]');
  const gap = editor.locator('[data-table-edit-support-gap]');
  const travel = editor.locator('[data-table-edit-support-travel]');

  const requested = {
    family: (await family.inputValue()) === 'GUIDE' ? 'LINE_STOP' : 'GUIDE',
    direction: (await direction.inputValue()) === '+X' ? '+Y' : '+X',
    gapMm: Number(await gap.inputValue()) === 5 ? 6 : 5,
    travelMm: Number(await travel.inputValue()) === 20 ? 25 : 20,
  };
  await family.selectOption(requested.family);
  await direction.selectOption(requested.direction);
  await gap.fill(String(requested.gapMm));
  await travel.fill(String(requested.travelMm));
  expectAuthorityNoop(await authorityEvidence(page), baseline);
  expect((await supportEvidence(page, supportId)).override).toBeNull();

  await editor.locator('[data-table-support-restraint-stage]').click();
  await expect.poll(() => authorityEvidence(page).then((row) => row.intentCount)).toBe(1);
  const staged = await authorityEvidence(page);
  expectAuthorityNoop(staged, baseline);
  expect(staged.batchHash).not.toBe('');

  await page.locator('[data-table-action="preview"]').click();
  await expect.poll(() => authorityEvidence(page).then((row) => row.previewHash)).toBeTruthy();
  const previewed = await authorityEvidence(page);
  expectAuthorityNoop(previewed, baseline);
  expect(previewed.ghostChildCount).toBeGreaterThan(0);
  const preview = await supportEvidence(page, supportId);
  expect(preview.override).toBeNull();
  expect(preview.declaredRestraint).toEqual(before.declaredRestraint);
  expect(preview.previewOverride).toMatchObject({
    type: requested.family,
    direction: requested.direction,
    gapMm: requested.gapMm,
    travelMm: requested.travelMm,
    authority: 'CERTIFIED_TABLE_OVERRIDE',
  });
  expect(preview.importedRestraints).toEqual(before.importedRestraints);

  await page.locator('[data-table-action="validate"]').click();
  await expect(host).toHaveAttribute('data-topology-edit-table-validation-status', 'READY_TO_APPLY');
  const validated = await authorityEvidence(page);
  expectAuthorityNoop(validated, baseline);

  await page.locator('[data-table-action="apply"]').click();
  await expect.poll(() => authorityEvidence(page).then((row) => row.canonicalHash))
    .not.toBe(baseline.canonicalHash);
  const applied = await authorityEvidence(page);
  const after = await supportEvidence(page, supportId);
  expect(after.restraintAuthority).toBe('CERTIFIED_TABLE_OVERRIDE');
  expect(after.override).toMatchObject({
    type: requested.family,
    direction: requested.direction,
    gapMm: requested.gapMm,
    travelMm: requested.travelMm,
    authority: 'CERTIFIED_TABLE_OVERRIDE',
  });
  expect(after.importedRestraints).toEqual(before.importedRestraints);
  expect(after.tableFields).toMatchObject({
    supportType: requested.family,
    direction: requested.direction,
    gapMm: requested.gapMm,
    travelMm: requested.travelMm,
  });
  expect(after.hostEntityId).toBe(before.hostEntityId);
  expect(after.stationMm).toBe(before.stationMm);
  expect(applied.sourceHash).toBe(baseline.sourceHash);
  expect(applied.sourceByteHash).toBe(baseline.sourceByteHash);
  expect(applied.rendererCount).toBe(1);
  expect(applied.activeCommandCount).toBe(baseline.activeCommandCount + 1);

  await page.locator('[data-action="undo"]').click();
  await expect.poll(() => authorityEvidence(page).then((row) => row.canonicalHash))
    .toBe(baseline.canonicalHash);
  const undone = await authorityEvidence(page);
  const undoSupport = await supportEvidence(page, supportId);
  expect(undone.activeLedgerHash).toBe(baseline.activeLedgerHash);
  expect(undone.activeCommandIds).toEqual(baseline.activeCommandIds);
  expect(undoSupport.override).toBeNull();
  expect(undoSupport.declaredRestraint).toEqual(before.declaredRestraint);
  expect(undoSupport.importedRestraints).toEqual(before.importedRestraints);
  expect(undoSupport.hostEntityId).toBe(before.hostEntityId);
  expect(undoSupport.stationMm).toBe(before.stationMm);

  await page.locator('[data-action="redo"]').click();
  await expect.poll(() => authorityEvidence(page).then((row) => row.canonicalHash))
    .toBe(applied.canonicalHash);
  const redone = await authorityEvidence(page);
  const redoSupport = await supportEvidence(page, supportId);
  expect(redone.activeLedgerHash).toBe(applied.activeLedgerHash);
  expect(redone.activeCommandIds).toEqual(applied.activeCommandIds);
  expect(redoSupport.override).toEqual(after.override);
  expect(redoSupport.importedRestraints).toEqual(before.importedRestraints);

  await assertDiagnostics(diagnostics);
  await testInfo.attach('support-restraint-s007', {
    body: await page.screenshot({ fullPage: true }), contentType: 'image/png',
  });
  await mkdir('reports/qualification', { recursive: true });
  await writeFile(REPORT, `${JSON.stringify({
    schema: 'TopologyEditTableSupportRestraintQualification.v1',
    candidateHead: process.env.TOPOLOGY_EDIT_TARGET_HEAD_SHA || null,
    fixture: 'public/fixtures/topology-edit-20-element-demo.staged.json#XYZ-10-COMPONENT-BRANCH',
    supportTag: 'S-007', supportId, requested,
    baseline, staged, previewed, validated, applied, undone, redone, before, after,
  }, null, 2)}\n`);
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
  const tableWindow = page.locator('[data-role="topology-edit-table-window"]');
  await expect(tableWindow).toBeAttached();
  const trigger = page.locator('[data-action="open-engineering-table"]');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('[data-role="topology-edit-table"]')).toBeVisible();
  return host;
}

async function selectTableSupport(page, tag) {
  const filter = page.locator('[data-table-filter]');
  await filter.fill(tag);
  await expect(filter).toHaveValue(tag);
  const row = page.locator(
    '[data-role="topology-edit-table"] tbody tr[data-canonical-id][data-element-type="SUPPORT"]',
  );
  await expect(row).toHaveCount(1);
  await expect(row).toBeVisible();
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
    const runtime = controller?.tableAdapter?.runtime;
    const journal = controller?.session?.journal;
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
      batchHash: runtime?.batch?.batchHash ?? '',
      previewHash: runtime?.preview?.previewHash ?? '',
      validationStatus: runtime?.validation?.status ?? '',
      intentCount: runtime?.batch?.intentCount ?? 0,
    };
  });
}

async function supportEvidence(page, supportId) {
  return page.evaluate((id) => {
    const controller = document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController;
    const topology = controller?.session?.currentTopology?.();
    const support = topology?.supports?.find((row) => row.id === id);
    const previewSupport = controller?.tableAdapter?.runtime?.preview?.candidate?.canonicalTopology
      ?.supports?.find((row) => row.id === id);
    const tableRow = controller?.tableAdapter?.runtime?.projection?.rows?.find(
      (row) => row.identity.canonicalId === id,
    );
    const isOverride = support?.restraintAuthority === 'CERTIFIED_TABLE_OVERRIDE';
    const previewIsOverride = previewSupport?.restraintAuthority === 'CERTIFIED_TABLE_OVERRIDE';
    return {
      override: isOverride ? structuredClone(support.restraint) : null,
      previewOverride: previewIsOverride ? structuredClone(previewSupport.restraint) : null,
      declaredRestraint: structuredClone(support?.restraint ?? null),
      restraintAuthority: support?.restraintAuthority ?? null,
      importedRestraints: structuredClone(support?.restraints ?? []),
      hostEntityId: support?.hostEntityId ?? null,
      stationMm: support?.stationMm ?? null,
      tableFields: {
        supportType: tableRow?.fields?.supportType ?? null,
        direction: tableRow?.fields?.direction ?? null,
        gapMm: tableRow?.fields?.gapMm ?? null,
        travelMm: tableRow?.fields?.travelMm ?? null,
      },
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
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  return { pageErrors, consoleErrors };
}
async function assertDiagnostics(diagnostics) {
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.consoleErrors.filter((message) => !message.includes('favicon'))).toEqual([]);
}
