import { expect, test } from '@playwright/test';

test('support marker pointer drag projects to exact host and stages through SUPPORT_PLACEMENT', async ({ page }) => {
  test.setTimeout(180_000);
  const diagnostics = collectDiagnostics(page);
  await page.setViewportSize({ width: 1720, height: 1080 });
  await page.addInitScript(() => globalThis.localStorage?.clear());
  const host = await openProductionController(page);
  const baseline = await authorityEvidence(page);

  const setup = await page.evaluate(() => {
    const controller = document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController;
    const topology = controller?.session?.currentTopology?.();
    const support = (topology?.supports ?? []).find((row) => row.hostEntityId === 'P-011');
    if (!support) throw new Error('Expected exact P-011 support.');
    let pickTarget = null;
    controller.viewportBackend.groups.supportGroup.traverse((object) => {
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
    if (!pickTarget) throw new Error(`Mounted support pick target ${support.id} not found.`);
    controller.handleViewportSelection(pickTarget, {
      ctrlKey: false, metaKey: false, shiftKey: false,
    });
    const context = controller.supportPositionRuntime.context();
    if (!Number.isFinite(context?.currentStationMm) || !Number.isFinite(context?.hostLengthMm)
        || !context?.currentOrigin) {
      throw new Error('Selected support has no certified station/origin context.');
    }
    const requestedStation = Math.min(
      context.hostLengthMm,
      context.currentStationMm + Math.min(120, (context.hostLengthMm - context.currentStationMm) / 2),
    );
    if (!(requestedStation > context.currentStationMm)) {
      throw new Error('Support fixture has no forward host travel for drag qualification.');
    }
    const from = topology.nodes.find((node) => node.id === context.fromNodeId)?.position;
    const to = topology.nodes.find((node) => node.id === context.toNodeId)?.position;
    if (!from || !to) throw new Error('Support host endpoints are unavailable.');
    const factor = requestedStation / context.hostLengthMm;
    const target = {
      x: from.x + ((to.x - from.x) * factor),
      y: from.y + ((to.y - from.y) * factor),
      z: from.z + ((to.z - from.z) * factor),
    };
    const backend = controller.viewportBackend;
    const camera = backend.activeCamera;
    const canvas = backend.renderer.domElement;
    backend.engineeringRoot.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    const rect = canvas.getBoundingClientRect();
    const engineeringToWorld = (point) => backend.engineeringRoot.localToWorld(
      camera.position.clone().set(point.x, point.y, point.z),
    );
    const toClient = (world) => {
      const ndc = world.clone().project(camera);
      return {
        x: rect.left + ((ndc.x + 1) * 0.5 * rect.width),
        y: rect.top + ((1 - ndc.y) * 0.5 * rect.height),
      };
    };
    const start = toClient(engineeringToWorld(context.currentOrigin));
    const end = toClient(engineeringToWorld(target));
    const genericPick = backend.pickAt(start.x, start.y);
    return {
      supportId: support.id,
      pickObjectId: pickTarget.objectId,
      pickSupportId: pickTarget.supportId,
      hostEdgeId: context.hostEdgeId,
      currentStationMm: context.currentStationMm,
      requestedStation,
      start,
      end,
      genericPickKind: genericPick?.objectKind ?? null,
      genericPickId: genericPick?.supportId ?? genericPick?.objectId ?? null,
    };
  });

  expect(setup.pickObjectId).toBe(setup.supportId);
  expect(setup.pickSupportId).toBe(setup.supportId);
  await expect(host).toHaveAttribute('data-topology-edit-selection-primary-id', setup.supportId);
  const panel = page.locator('details[data-panel-kind="support-position"]');
  await expect(panel).toHaveAttribute('open', '');
  expect(Math.hypot(setup.end.x - setup.start.x, setup.end.y - setup.start.y)).toBeGreaterThan(3);

  await page.mouse.move(setup.start.x, setup.start.y);
  await page.mouse.down();
  await expect(host).toHaveAttribute('data-topology-edit-support-drag-active', 'true');
  await expect(host).toHaveAttribute(
    'data-topology-edit-support-drag-hit-source',
    /SUPPORT_GROUP/u,
  );
  await page.mouse.move(setup.end.x, setup.end.y, { steps: 12 });
  await page.mouse.up();

  await expect(host).toHaveAttribute('data-topology-edit-support-drag-active', 'false');
  await expect.poll(() => host.getAttribute('data-topology-edit-support-drag-draft-hash')).toBeTruthy();
  await expect(host).toHaveAttribute('data-topology-edit-support-drag-guide-visible', 'true');
  await expect.poll(() => host.getAttribute('data-topology-edit-support-drag-station-mm')
    .then((value) => Number(value)))
    .toBeCloseTo(setup.requestedStation, 4);
  const transient = await page.evaluate(() => {
    const controller = document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController;
    const draft = controller?.supportPositionRuntime?.draft;
    return draft ? {
      source: draft.source,
      stationMm: draft.stationMm,
      hostEdgeId: draft.hostEdgeId,
      orthogonalDistanceMm: draft.orthogonalDistanceMm,
      canonicalHash: controller.session.currentTopology().canonicalTopologyHash,
    } : null;
  });
  expect(transient?.source).toBe('CANVAS_DRAG');
  expect(transient?.hostEdgeId).toBe(setup.hostEdgeId);
  expect(transient?.stationMm).toBeCloseTo(setup.requestedStation, 4);
  expect(transient?.orthogonalDistanceMm).toBeLessThan(0.01);
  expect(transient?.canonicalHash).toBe(baseline.canonicalHash);
  expectAuthorityNoop(await authorityEvidence(page), baseline);

  await expect(panel.locator('[data-support-position-action="stage"]')).toBeEnabled();
  await panel.locator('[data-support-position-action="stage"]').click();
  await expect.poll(() => host.getAttribute('data-topology-edit-support-position-bridge-hash')).toBeTruthy();
  await expect.poll(() => host.getAttribute('data-topology-edit-table-batch-hash')).toBeTruthy();
  await expect.poll(() => host.getAttribute('data-topology-edit-table-preview-hash')).toBeTruthy();
  expect(await host.getAttribute('data-topology-edit-table-validation-hash')).toBe('');
  expectAuthorityNoop(await authorityEvidence(page), baseline);

  const staged = await page.evaluate((supportId) => {
    const controller = document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController;
    const runtime = controller?.tableAdapter?.runtime;
    const intent = runtime?.intents?.find((row) => row.target?.canonicalId === supportId) ?? null;
    const candidate = runtime?.preview?.candidate?.canonicalTopology?.supports?.find((row) => row.id === supportId);
    return {
      intentKind: intent?.intentKind ?? null,
      stationMm: intent?.requestedValue?.stationMm ?? null,
      hostEdgeId: intent?.requestedValue?.hostEdgeId ?? null,
      candidateStationMm: candidate?.placementOverride?.stationMm ?? null,
      ghostChildCount: controller?.viewportBackend?.groups?.ghostGroup?.children?.length ?? 0,
    };
  }, setup.supportId);
  expect(staged.intentKind).toBe('SUPPORT_PLACEMENT');
  expect(staged.hostEdgeId).toBe(setup.hostEdgeId);
  expect(staged.stationMm).toBeCloseTo(setup.requestedStation, 4);
  expect(staged.candidateStationMm).toBeCloseTo(setup.requestedStation, 4);
  expect(staged.ghostChildCount).toBeGreaterThan(0);

  await page.locator('[data-action="open-engineering-table"]').click();
  await expect(page.locator('details[data-panel-kind="table"]')).toHaveAttribute('open', '');
  await page.locator('[data-table-action="discard"]').click();
  await expect.poll(() => host.getAttribute('data-topology-edit-table-batch-hash')).toBe('');
  await expect.poll(() => host.getAttribute('data-topology-edit-table-preview-hash')).toBe('');
  expectAuthorityNoop(await authorityEvidence(page), baseline);

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
      ?.__topologyEditAuthoringController?.supportHostDragRuntime?.canvas,
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
