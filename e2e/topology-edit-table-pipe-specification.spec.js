import { expect, test } from '@playwright/test';

test('Specification profile stages one exact PIPE record and keeps OD/wall derived', async ({ page }) => {
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

  await page.locator('[data-table-profile="SPECIFICATION"]').click();
  await expect(host).toHaveAttribute('data-topology-edit-table-profile', 'SPECIFICATION');
  const table = page.locator('[data-role="topology-edit-table"]');
  for (const key of [
    'dnInMm', 'dnOutMm', 'outsideDiameterMm', 'wallThicknessMm', 'insideDiameterMm',
    'schedule', 'material', 'pipingClass', 'pressureClass', 'catalogueRecordId',
  ]) {
    await expect(table.locator(`thead [data-table-column-key="${key}"]`)).toBeAttached();
  }

  const target = await choosePipeWithSpecificationCandidate(page);
  expect(target.recordId).toBeTruthy();
  const filter = page.locator('[data-table-filter]');
  await filter.fill(target.canonicalId);
  const row = table.locator(`tbody tr[data-canonical-id="${target.canonicalId}"]`);
  await expect(row).toBeVisible();
  await row.locator('[data-table-select]').click();
  await expect.poll(() => host.getAttribute('data-topology-edit-selection-primary-id')).toBe(target.canonicalId);

  const recordSelect = page.locator('[data-table-edit-pipe-catalogue-record]');
  await expect(recordSelect).toBeVisible();
  await expect(recordSelect).toHaveAttribute('data-table-pipe-catalogue-hash', target.catalogueHash);
  await expect(page.locator('[data-table-edit-outside-diameter]')).toHaveCount(0);
  await expect(page.locator('[data-table-edit-wall-thickness]')).toHaveCount(0);
  await expect(page.locator('[data-table-pipe-specification-consequences]')).toContainText('OD');
  await expect(page.locator('[data-table-pipe-specification-consequences]')).toContainText('Wall');
  await expect(page.locator('[data-table-pipe-specification-consequences]')).toContainText('ID');

  const before = await authorityEvidence(page);
  await recordSelect.selectOption(target.recordId);
  await page.locator('[data-table-action="stage-pipe-specification"]').click();
  await expect.poll(() => host.getAttribute('data-topology-edit-table-batch-hash')).toBeTruthy();
  await expect.poll(() => host.getAttribute('data-topology-edit-table-preview-hash')).toBeTruthy();
  expect(await host.getAttribute('data-topology-edit-table-validation-hash')).toBe('');
  expectAuthorityNoop(await authorityEvidence(page), before);

  const staged = await page.evaluate(() => {
    const runtime = document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController?.tableAdapter?.runtime;
    const intent = runtime?.intents?.find((candidate) => candidate.intentKind === 'PIPE_SPECIFICATION') ?? null;
    const command = runtime?.batchPlan?.operationPlan?.commandIntents?.find(
      (candidate) => candidate.commandType === 'REBIND_PIPE_SPECIFICATION',
    ) ?? null;
    const edgeId = intent?.target?.canonicalId ?? null;
    const current = runtime?.controller?.session?.currentTopology?.();
    const candidate = runtime?.preview?.candidate?.canonicalTopology;
    const beforeEdge = current?.edges?.find((edge) => edge.id === edgeId) ?? null;
    const afterEdge = candidate?.edges?.find((edge) => edge.id === edgeId) ?? null;
    return intent && command && beforeEdge && afterEdge ? {
      intentKind: intent.intentKind,
      recordId: intent.requestedValue?.catalogueBinding?.recordId ?? null,
      bindingHash: intent.requestedValue?.catalogueBinding?.bindingHash ?? null,
      commandType: command.commandType,
      commandRecordId: command.payload?.catalogueBinding?.recordId ?? null,
      beforeNodeIds: [beforeEdge.fromNodeId, beforeEdge.toNodeId],
      afterNodeIds: [afterEdge.fromNodeId, afterEdge.toNodeId],
      afterSchedule: afterEdge.schedule ?? null,
      afterWallThicknessMm: afterEdge.wallThicknessMm ?? null,
      afterMaterialSpecification: afterEdge.materialSpecification ?? null,
      afterPipingClass: afterEdge.pipingClass ?? null,
      afterRecordHash: afterEdge.catalogueRecordHash ?? null,
      previewPlanHash: runtime.preview?.batchPlanHash ?? null,
      currentPlanHash: runtime.batchPlan?.planHash ?? null,
    } : null;
  });
  expect(staged).not.toBeNull();
  expect(staged.intentKind).toBe('PIPE_SPECIFICATION');
  expect(staged.recordId).toBe(target.recordId);
  expect(staged.commandType).toBe('REBIND_PIPE_SPECIFICATION');
  expect(staged.commandRecordId).toBe(target.recordId);
  expect(staged.bindingHash).toBeTruthy();
  expect(staged.afterNodeIds).toEqual(staged.beforeNodeIds);
  expect(staged.afterRecordHash).toBeTruthy();
  expect(staged.previewPlanHash).toBe(staged.currentPlanHash);

  await page.locator('[data-table-action="validate"]').click();
  await expect.poll(() => host.getAttribute('data-topology-edit-table-validation-hash')).toBeTruthy();
  const validationStatus = await host.getAttribute('data-topology-edit-table-validation-status');
  const blockers = await host.getAttribute('data-topology-edit-table-validation-blockers');
  expect(validationStatus, `unexpected PIPE specification blockers: ${blockers || '(none)'}`).toBe('READY_TO_APPLY');
  await expect(page.locator('[data-table-action="apply"]')).toBeEnabled();
  expectAuthorityNoop(await authorityEvidence(page), before);

  await page.locator('[data-table-action="apply"]').click();
  await expect.poll(() => authorityEvidence(page).then((value) => value.canonicalHash)).not.toBe(before.canonicalHash);
  const applied = await authorityEvidence(page);
  const appliedSpec = await page.evaluate((edgeId) => {
    const controller = document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController;
    const edge = controller?.session?.currentTopology?.()?.edges?.find((candidate) => candidate.id === edgeId);
    return edge ? {
      recordId: edge.catalogueRecordId ?? null,
      recordHash: edge.catalogueRecordHash ?? null,
      operation: edge.topologyOperation ?? null,
      fromNodeId: edge.fromNodeId,
      toNodeId: edge.toNodeId,
    } : null;
  }, target.canonicalId);
  expect(appliedSpec?.recordId).toBe(target.recordId);
  expect(appliedSpec?.recordHash).toBeTruthy();
  expect(appliedSpec?.operation).toBe('REBIND_PIPE_SPECIFICATION');
  expect(applied.activeCommandCount).toBe(before.activeCommandCount + 1);

  await page.locator('[data-action="undo"]').click();
  await expect.poll(() => authorityEvidence(page).then((value) => value.canonicalHash)).toBe(before.canonicalHash);
  const undone = await authorityEvidence(page);
  expect(undone.activeLedgerHash).toBe(before.activeLedgerHash);
  expect(undone.activeCommandIds).toEqual(before.activeCommandIds);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors.filter((message) => !message.includes('favicon'))).toEqual([]);
});

async function choosePipeWithSpecificationCandidate(page) {
  const table = page.locator('[data-role="topology-edit-table"]');
  const filter = page.locator('[data-table-filter]');
  await filter.fill('PIPE');
  const ids = await table.locator('tbody tr[data-element-type="PIPE"][data-canonical-id]').evaluateAll(
    (rows) => rows.map((row) => row.getAttribute('data-canonical-id')).filter(Boolean),
  );
  for (const canonicalId of ids) {
    await filter.fill(canonicalId);
    const row = table.locator(`tbody tr[data-canonical-id="${canonicalId}"]`);
    if (!(await row.count())) continue;
    await row.locator('[data-table-select]').click();
    const select = page.locator('[data-table-edit-pipe-catalogue-record]');
    if (!(await select.count())) continue;
    const options = await select.locator('option').evaluateAll((nodes) => (
      nodes.slice(1).map((option) => option.value).filter(Boolean)
    ));
    if (!options.length) continue;
    return {
      canonicalId,
      recordId: options[0],
      catalogueHash: await select.getAttribute('data-table-pipe-catalogue-hash'),
    };
  }
  throw new Error('No production PIPE row exposes a command-certifiable exact specification record.');
}

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
  await expect.poll(() => page.evaluate(() => Boolean(
    document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController?.professionalRuntime?.catalogue?.catalogueHash,
  ))).toBe(true);
  return host;
}

async function authorityEvidence(page) {
  return page.evaluate(() => {
    const host = document.querySelector('[data-role="topology-edit-render-host"]');
    const controller = host?.__topologyEditAuthoringController;
    const session = controller?.session;
    const topology = session?.currentTopology?.();
    const journal = session?.journal;
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
