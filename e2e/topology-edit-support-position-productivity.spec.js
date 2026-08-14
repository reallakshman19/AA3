import { expect, test } from '@playwright/test';

test('3D support marker selection stages host-constrained support position through Table authority', async ({ page }) => {
  test.setTimeout(180_000);
  const diagnostics = collectDiagnostics(page);
  await page.setViewportSize({ width: 1720, height: 1080 });
  await page.addInitScript(() => globalThis.localStorage?.clear());
  const host = await openProductionController(page);
  const baseline = await authorityEvidence(page);

  const picked = await page.evaluate(() => {
    const controller = document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController;
    const topology = controller?.session?.currentTopology?.();
    const supports = (topology?.supports ?? []).filter((support) => support.hostEntityId === 'P-011');
    if (supports.length !== 1) {
      throw new Error(`Expected one exact P-011 support; resolved ${supports.length}.`);
    }
    const support = supports[0];
    let pickTarget = null;
    controller?.viewportBackend?.groups?.supportGroup?.traverse?.((object) => {
      if (pickTarget) return;
      const direct = object?.userData?.pickTarget;
      if (direct?.objectKind === 'support' && direct?.supportId === support.id) {
        pickTarget = direct;
        return;
      }
      const table = object?.userData?.pickTable;
      if (!Array.isArray(table)) return;
      pickTarget = table.find((target) => (
        target?.objectKind === 'support' && target?.supportId === support.id
      )) ?? null;
    });
    if (!pickTarget) throw new Error(`No mounted support pick target for ${support.id}.`);
    controller.handleViewportSelection(pickTarget, {
      ctrlKey: false, metaKey: false, shiftKey: false,
    });
    const context = controller.supportPositionRuntime?.context?.();
    return {
      supportId: support.id,
      pickObjectId: pickTarget.objectId,
      pickSupportId: pickTarget.supportId,
      hostEdgeId: context?.hostEdgeId ?? null,
      currentStationMm: context?.currentStationMm ?? null,
      hostLengthMm: context?.hostLengthMm ?? null,
    };
  });
  expect(picked.pickObjectId).toBe(picked.supportId);
  expect(picked.pickSupportId).toBe(picked.supportId);
  expect(picked.hostEdgeId).toBeTruthy();
  expect(Number.isFinite(picked.currentStationMm)).toBe(true);
  expect(Number.isFinite(picked.hostLengthMm)).toBe(true);

  await expect(host).toHaveAttribute('data-topology-edit-selection-primary-id', picked.supportId);
  const panel = page.locator('details[data-panel-kind="support-position"]');
  await expect(panel).toHaveAttribute('open', '');
  const surface = panel.locator('[data-role="topology-edit-support-position"]');
  await expect(surface).toBeVisible();
  await expect(surface).toHaveAttribute('data-support-position-id', picked.supportId);
  await expect(surface).toHaveAttribute('data-support-position-host-edge-id', picked.hostEdgeId);
  await expect(surface).toContainText('Free XYZ support motion and host rebinding are blocked');
  await expect(surface.locator('[data-support-position-x], [data-support-position-y], [data-support-position-z]')).toHaveCount(0);

  const station = surface.locator('[data-support-position-station]');
  const slider = surface.locator('[data-support-position-slider]');
  await expect(station).toBeEnabled();
  await expect(slider).toBeEnabled();
  expect(Number(await station.inputValue())).toBeCloseTo(picked.currentStationMm, 9);
  expect(Number(await station.getAttribute('max'))).toBeCloseTo(picked.hostLengthMm, 9);

  const requestedStation = Math.min(
    picked.hostLengthMm,
    picked.currentStationMm + Math.min(100, (picked.hostLengthMm - picked.currentStationMm) / 2),
  );
  expect(requestedStation).toBeGreaterThan(picked.currentStationMm);
  await station.fill(String(requestedStation));
  await expect.poll(() => host.getAttribute('data-topology-edit-support-position-draft-hash')).toBeTruthy();
  await expect.poll(() => Number(host.getAttribute('data-topology-edit-support-position-station-mm')))
    .toBeCloseTo(requestedStation, 9);
  expectAuthorityNoop(await authorityEvidence(page), baseline);
  await expect(panel.locator('[data-support-position-action="stage"]')).toBeEnabled();

  await panel.locator('[data-support-position-action="stage"]').click();
  await expect.poll(() => host.getAttribute('data-topology-edit-support-position-bridge-hash')).toBeTruthy();
  await expect.poll(() => host.getAttribute('data-topology-edit-support-position-intent-hash')).toBeTruthy();
  await expect.poll(() => host.getAttribute('data-topology-edit-table-batch-hash')).toBeTruthy();
  await expect.poll(() => host.getAttribute('data-topology-edit-table-preview-hash')).toBeTruthy();
  expect(await host.getAttribute('data-topology-edit-table-validation-hash')).toBe('');
  expectAuthorityNoop(await authorityEvidence(page), baseline);

  const preview = await page.evaluate((supportId) => {
    const controller = document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController;
    const runtime = controller?.tableAdapter?.runtime;
    const canonical = controller?.session?.currentTopology?.()?.supports?.find((row) => row.id === supportId);
    const candidate = runtime?.preview?.candidate?.canonicalTopology?.supports?.find((row) => row.id === supportId);
    return {
      canonicalOverride: canonical?.placementOverride ?? null,
      candidateOverride: candidate?.placementOverride ?? null,
      intentKind: runtime?.intents?.find((row) => row.target?.canonicalId === supportId)?.intentKind ?? null,
      commandType: runtime?.batchPlan?.operationPlan?.commandIntents?.find(
        (row) => row.payload?.supportId === supportId,
      )?.commandType ?? null,
      ghostChildCount: controller?.viewportBackend?.groups?.ghostGroup?.children?.length ?? 0,
    };
  }, picked.supportId);
  expect(preview.canonicalOverride).toBeNull();
  expect(preview.candidateOverride?.authority).toBe('CERTIFIED_TABLE_OVERRIDE');
  expect(preview.candidateOverride?.stationMm).toBeCloseTo(requestedStation, 9);
  expect(preview.intentKind).toBe('SUPPORT_PLACEMENT');
  expect(preview.commandType).toBe('UPDATE_SUPPORT_PLACEMENT');
  expect(preview.ghostChildCount).toBeGreaterThan(0);

  await page.locator('[data-action="open-engineering-table"]').click();
  await expect(page.locator('details[data-panel-kind="table"]')).toHaveAttribute('open', '');
  await page.locator('[data-table-action="validate"]').click();
  await expect(host).toHaveAttribute('data-topology-edit-table-validation-status', 'READY_TO_APPLY');
  expectAuthorityNoop(await authorityEvidence(page), baseline);
  await expect(page.locator('[data-table-action="apply"]')).toBeEnabled();

  await page.locator('[data-table-action="apply"]').click();
  await expect.poll(() => authorityEvidence(page).then((value) => value.canonicalHash))
    .not.toBe(baseline.canonicalHash);
  const applied = await authorityEvidence(page);
  const appliedSupport = await page.evaluate((supportId) => {
    const controller = document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController;
    return controller?.session?.currentTopology?.()?.supports?.find((row) => row.id === supportId) ?? null;
  }, picked.supportId);
  expect(appliedSupport?.placementOverride?.authority).toBe('CERTIFIED_TABLE_OVERRIDE');
  expect(appliedSupport?.placementOverride?.stationMm).toBeCloseTo(requestedStation, 9);
  expect(applied.activeCommandCount).toBe(baseline.activeCommandCount + 1);
  expect(applied.sourceHash).toBe(baseline.sourceHash);
  expect(applied.sourceByteHash).toBe(baseline.sourceByteHash);

  await page.locator('[data-action="undo"]').click();
  await expect.poll(() => authorityEvidence(page).then((value) => value.canonicalHash))
    .toBe(baseline.canonicalHash);
  const undone = await authorityEvidence(page);
  expect(undone.activeLedgerHash).toBe(baseline.activeLedgerHash);
  expect(undone.activeCommandIds).toEqual(baseline.activeCommandIds);

  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.consoleErrors.filter((message) => !message.includes('favicon'))).toEqual([]);
});

async function openProductionController(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('navigation', { name: 'Application views' })
    .getByRole('button', { name: 'Workspace', exact: true }).click();
  await page.locator('[data-action="load-topology-edit-xyz-branch-demo"]').click();
  await expect(page.locator('[data-role="summary-supports"]')).toContainText('7');
  await page.getByRole('button', { name: '3D Edit', exact: true }).click();
  const host = page.locator('[data-role="topology-edit-render-host"]');
  await expect(host).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(
    document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController?.tableAdapter?.runtime?.projection,
  ))).toBe(true);
  await expect.poll(() => page.evaluate(() => Boolean(
    document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController?.supportPositionRuntime?.element,
  ))).toBe(true);
  await expect.poll(() => page.evaluate(() => (
    document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController?.viewportBackend?.groups?.supportGroup?.children?.length ?? 0
  ))).toBeGreaterThan(0);
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
function collectDiagnostics(page) {
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  return { pageErrors, consoleErrors };
}
