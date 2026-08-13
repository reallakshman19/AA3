import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const REPORT = 'reports/qualification/connect-contextual-workflow.json';
const PIPE_RECORD = 'PIPE-DN100-SCH40-A';

test('Connect Ends uses two real canvas picks then automatic governed qualification', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.addInitScript(() => globalThis.localStorage?.clear());
  const host = await openController(page);
  await openAuthoringPanel(page);

  const startNodeId = await seedRoute(page, [9000, 0, 5000], [10000, 0, 5000]);
  const endNodeId = await seedRoute(page, [12000, 3000, 5000], [12000, 2000, 5000]);
  const before = await evidence(page);
  await fitAllStable(page);

  const firstRun = await configureConnect(page, host, startNodeId, endNodeId);
  const preview = await evidence(page);
  expect(preview.canonicalHash).toBe(before.canonicalHash);
  expect(preview.journalHash).toBe(before.journalHash);
  expect(preview.ghostChildCount).toBeGreaterThan(0);
  await expect(host).toHaveAttribute('data-topology-edit-authoring-phase', 'READY_TO_APPLY');
  const details = page.locator('[data-role="route-connect-engineering-evidence"]');
  await expect(details).not.toHaveAttribute('open', '');
  await expect(details.locator('[data-action="plan-connect-alternatives"]')).toBeHidden();
  await expect(details.locator('[data-action="preview-authoring-operation"]')).toBeHidden();
  await expect(details.locator('[data-action="validate-authoring-operation"]')).toBeHidden();

  await page.locator('[data-action="cancel-authoring-operation"]').click();
  await expect.poll(() => evidence(page).then((row) => row.canonicalHash)).toBe(before.canonicalHash);
  expect((await evidence(page)).ghostChildCount).toBe(0);

  const secondRun = await configureConnect(page, host, startNodeId, endNodeId);
  await page.getByRole('button', { name: 'Apply connection', exact: true }).click();
  await expect.poll(() => evidence(page).then((row) => row.activeCommandCount))
    .toBe(before.activeCommandCount + 4);
  const applied = await evidence(page);
  expect(applied.nodeCount).toBe(before.nodeCount + 1);
  expect(applied.edgeCount).toBe(before.edgeCount + 2);
  expect(applied.bendCount).toBe(before.bendCount + 1);
  expect(applied.commandTypes.slice(-4)).toEqual([
    'CREATE_NODE', 'INSERT_PIPE_SEGMENT', 'INSERT_PIPE_SEGMENT', 'ADD_BEND_DEFINITION',
  ]);
  expect(applied.ghostChildCount).toBe(0);

  await page.locator('[data-action="undo-connect-ends-operation"]').click();
  await expect.poll(() => evidence(page).then((row) => row.canonicalHash)).toBe(before.canonicalHash);
  const undone = await evidence(page);
  expect(undone.activeLedgerHash).toBe(before.activeLedgerHash);

  await page.locator('[data-action="redo-connect-ends-operation"]').click();
  await expect.poll(() => evidence(page).then((row) => row.canonicalHash)).toBe(applied.canonicalHash);
  const redone = await evidence(page);
  expect(redone.activeLedgerHash).toBe(applied.activeLedgerHash);

  await testInfo.attach('connect-contextual-stable-viewport', {
    body: await page.screenshot({ fullPage: true }), contentType: 'image/png',
  });
  await mkdir('reports/qualification', { recursive: true });
  await writeFile(REPORT, `${JSON.stringify({
    schema: 'TopologyEditConnectContextualWorkflow.v1',
    candidateHead: process.env.TOPOLOGY_EDIT_TARGET_HEAD_SHA || null,
    status: 'PASS', startNodeId, endNodeId, firstRun, secondRun,
    before, preview, applied, undone, redone,
  }, null, 2)}\n`);
});

async function openController(page) {
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
    document.querySelector('[data-role="topology-edit-render-host"]')?.__topologyEditAuthoringController
  ))).toBe(true);
  return host;
}

async function openAuthoringPanel(page) {
  const details = page.locator('details[data-panel-kind="authoring"]');
  if (!(await details.evaluate((element) => element.open))) await details.locator(':scope > summary').click();
  await expect.poll(() => details.evaluate((element) => element.open)).toBe(true);
}

async function seedRoute(page, start, end) {
  await page.locator('[data-action="activate-authoring-start-route"]').click();
  await expect.poll(() => page.locator('[data-start-route-field="catalogueRecordId"] option').count())
    .toBeGreaterThan(1);
  await page.evaluate(({ startPoint, endPoint, record }) => {
    const values = {
      inputMode: 'TYPED', startX: startPoint[0], startY: startPoint[1], startZ: startPoint[2],
      endX: endPoint[0], endY: endPoint[1], endZ: endPoint[2], axisLock: 'FREE',
      catalogueRecordId: record, minimumLengthMm: '6', overlapToleranceMm: '0.001',
    };
    for (const [key, value] of Object.entries(values)) {
      const control = document.querySelector(`[data-start-route-field="${key}"]`);
      if (!control) throw new Error(`Missing Start Route field ${key}.`);
      control.value = String(value);
    }
    document.querySelector('[data-start-route-field="overlapToleranceMm"]')
      ?.dispatchEvent(new Event('change', { bubbles: true }));
  }, { startPoint: start, endPoint: end, record: PIPE_RECORD });
  const host = page.locator('[data-role="topology-edit-render-host"]');
  await expect.poll(() => host.getAttribute('data-topology-edit-authoring-phase')).toBe('READY_TO_APPLY');
  await page.getByRole('button', { name: 'Apply route', exact: true }).click();
  return page.evaluate(() => {
    const controller = document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController;
    const nodeId = controller?.selection?.nodeIds?.[0];
    if (!nodeId) throw new Error('Seed Start Route did not select its created end node.');
    return nodeId;
  });
}

async function fitAllStable(page) {
  await page.evaluate(async () => {
    const controller = document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController;
    controller.viewportBackend.fitAll({ remember: false });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  });
}

async function configureConnect(page, host, startNodeId, endNodeId) {
  const clear = page.getByLabel('Canonical selection', { exact: true })
    .getByRole('button', { name: 'Clear', exact: true });
  if (await clear.isEnabled()) await clear.click();
  await page.locator('[data-action="activate-authoring-connect-ends"]').click();
  const startPick = await clickProductionNode(page, startNodeId);
  await expect.poll(() => host.getAttribute('data-topology-edit-connect-start-endpoint-hash')).toBeTruthy();
  const endPick = await clickProductionNode(page, endNodeId);
  await expect.poll(() => host.getAttribute('data-topology-edit-connect-end-endpoint-hash')).toBeTruthy();

  const pipe = page.locator('[data-connect-field="catalogueRecordId"]');
  await pipe.selectOption(PIPE_RECORD);
  await expect.poll(() => page.locator('[data-connect-field="alternativeId"] option').count()).toBeGreaterThan(1);
  const route = page.locator('[data-connect-field="alternativeId"]');
  const orthogonal = await route.locator('option').filter({ hasText: 'x>y' }).first().getAttribute('value');
  expect(orthogonal).toBeTruthy();
  await route.selectOption(orthogonal);
  await expect(page.getByText('UNIQUE EXACT')).toBeVisible();
  await expect.poll(() => host.getAttribute('data-topology-edit-authoring-phase')).toBe('READY_TO_APPLY');
  await expect.poll(() => host.getAttribute('data-topology-edit-connect-validation-hash')).toBeTruthy();
  return { startPick, endPick, alternativeId: orthogonal };
}

async function clickProductionNode(page, nodeId) {
  const pick = await resolvePickPoint(page, nodeId);
  const canvas = page.locator(
    '[data-role="topology-edit-canvas-mount"] canvas[data-viewport-backend="topology-edit-webgl"]',
  );
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Production WebGL canvas has no bounding box.');
  await canvas.click({ position: { x: pick.x - box.x, y: pick.y - box.y } });
  const actual = await page.evaluate(() => {
    const controller = document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController;
    return {
      pickedId: controller.viewportBackend.lastSelectionPick?.objectId ?? null,
      selectedId: controller.selection?.nodeIds?.[0] ?? null,
    };
  });
  expect(actual.pickedId).toBe(nodeId);
  expect(actual.selectedId).toBe(nodeId);
  return { nodeId, ...pick, actual };
}

async function resolvePickPoint(page, nodeId) {
  return page.evaluate((targetId) => {
    const controller = document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController;
    const backend = controller.viewportBackend;
    const node = controller.session.currentTopology().nodes.find((row) => row.id === targetId);
    backend.engineeringRoot.updateMatrixWorld(true);
    backend.activeCamera.updateMatrixWorld(true);
    backend.activeCamera.updateProjectionMatrix();
    const vector = backend.activeCamera.position.clone().set(node.position.x, node.position.y, node.position.z);
    vector.applyMatrix4(backend.engineeringRoot.matrixWorld).project(backend.activeCamera);
    const rect = backend.renderer.domElement.getBoundingClientRect();
    const center = {
      x: rect.left + ((vector.x + 1) / 2) * rect.width,
      y: rect.top + ((1 - vector.y) / 2) * rect.height,
    };
    const radii = [0, 2, 4, 6, 8, 10, 12, 16, 20, 24];
    const directions = [[1,0],[.7071,.7071],[0,1],[-.7071,.7071],[-1,0],[-.7071,-.7071],[0,-1],[.7071,-.7071]];
    for (const radius of radii) {
      const offsets = radius === 0 ? [[0, 0]] : directions.map(([x, y]) => [x * radius, y * radius]);
      for (const [dx, dy] of offsets) {
        const x = center.x + dx; const y = center.y + dy;
        const pick = backend.pickAt(x, y);
        if (pick?.objectId === targetId) return { x, y, radiusPx: radius };
      }
    }
    throw new Error(`CONNECT_STABLE_VIEW_NODE_UNREACHABLE: ${targetId}`);
  }, nodeId);
}

async function evidence(page) {
  return page.evaluate(() => {
    const host = document.querySelector('[data-role="topology-edit-render-host"]');
    const controller = host?.__topologyEditAuthoringController;
    const topology = controller.session.currentTopology();
    const journal = controller.session.journal;
    return {
      canonicalHash: topology.canonicalTopologyHash,
      journalHash: journal.journalHash,
      activeLedgerHash: journal.activeLedgerHash,
      activeCommandCount: journal.activeCommandIds.length,
      commandTypes: journal.history.map((row) => row.request?.commandType),
      nodeCount: topology.nodes.length,
      edgeCount: topology.edges.length,
      bendCount: topology.bends?.length ?? 0,
      ghostChildCount: controller.viewportBackend.groups.ghostGroup.children.length,
    };
  });
}
