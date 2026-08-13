import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const REPORT = 'reports/qualification/topology-edit-a3d003-cross-surface.json';
const STEP_MM = 25;
const ROWS = [];
const DEFECTS = [];
const RESULTS = new Map();

const FIXTURES = Object.freeze({
  mock1: Object.freeze({
    label: 'Mock 1 / 3D Demo',
    loader: 'load-topology-edit-demo',
    entityCount: 20,
  }),
  mock2: Object.freeze({
    label: 'Mock 2 / XYZ Branch',
    loader: 'load-topology-edit-xyz-branch-demo',
    entityCount: 32,
  }),
});

// One worker preserves the declared order while default mode still executes later rows after a failure.
test.describe.configure({ mode: 'default' });

test.beforeEach(async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1720, height: 1080 });
  await page.addInitScript(() => globalThis.localStorage?.clear());
});

test.afterAll(async () => {
  await mkdir('reports/qualification', { recursive: true });
  await writeFile(REPORT, `${JSON.stringify({
    schema: 'TopologyEditA3D003CrossSurfaceMatrix.v1',
    candidateHead: process.env.TOPOLOGY_EDIT_TARGET_HEAD_SHA || null,
    operation: {
      commandType: 'MOVE_NODE',
      movementMode: 'NODE_ONLY',
      change: 'OUTWARD_COLLINEAR_TERMINAL_PIPE',
      distanceMm: STEP_MM,
    },
    order: ['mock1:canvas', 'mock1:table', 'mock2:canvas', 'mock2:table'],
    status: DEFECTS.length ? 'FAIL' : 'PASS',
    defects: DEFECTS,
    rows: ROWS,
  }, null, 2)}\n`);
});

for (const fixtureId of ['mock1', 'mock2']) {
  test(`${FIXTURES[fixtureId].label} via 3D canvas`, async ({ page }, testInfo) => {
    await matrixCase(page, testInfo, fixtureId, 'canvas');
  });
  test(`${FIXTURES[fixtureId].label} via Table`, async ({ page }, testInfo) => {
    await matrixCase(page, testInfo, fixtureId, 'table');
  });
}

async function matrixCase(page, testInfo, fixtureId, surface) {
  try {
    const host = await openFixture(page, FIXTURES[fixtureId]);
    const target = await selectSafeMatrixTarget(page);
    const baseline = await authority(page, target);
    const requestedPosition = target.requestedPosition;

    let interactionEvidence;
    if (surface === 'canvas') {
      interactionEvidence = await moveViaCanvas(page, host, target, requestedPosition);
    } else {
      interactionEvidence = await moveViaTable(page, host, target, requestedPosition);
    }

    const applied = await authority(page, target);
    expect(applied.canonicalHash).not.toBe(baseline.canonicalHash);
    expect(applied.sourceHash).toBe(baseline.sourceHash);
    expect(applied.sourceByteHash).toBe(baseline.sourceByteHash);
    expect(applied.activeCommandCount).toBe(baseline.activeCommandCount + 1);
    expect(applied.lastCommandType).toBe('MOVE_NODE');
    expect(applied.nodePosition).toEqual(requestedPosition);
    expect(applied.edgeConnectivity).toEqual(baseline.edgeConnectivity);

    const row = {
      fixtureId,
      fixture: FIXTURES[fixtureId].label,
      surface,
      target,
      requestedPosition,
      baseline,
      interaction: interactionEvidence,
      applied,
    };
    ROWS.push(row);
    RESULTS.set(`${fixtureId}:${surface}`, row);

    if (surface === 'table') {
      const canvas = RESULTS.get(`${fixtureId}:canvas`);
      expect(canvas, `${fixtureId} canvas result must precede Table result.`).toBeTruthy();
      expect(applied.canonicalHash).toBe(canvas.applied.canonicalHash);
      expect(applied.nodePosition).toEqual(canvas.applied.nodePosition);
      expect(applied.edgeConnectivity).toEqual(canvas.applied.edgeConnectivity);
      expect(applied.sourceHash).toBe(canvas.applied.sourceHash);
      expect(interactionEvidence.commandType).toBe(canvas.interaction.commandType);
    }

    await page.screenshot({ path: testInfo.outputPath(`${fixtureId}-${surface}-applied.png`), fullPage: true });
  } catch (error) {
    DEFECTS.push({
      fixtureId,
      surface,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function openFixture(page, fixture) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('navigation', { name: 'Application views' })
    .getByRole('button', { name: 'Workspace', exact: true }).click();
  await page.locator(`[data-action="${fixture.loader}"]`).click();
  await expect.poll(() => page.evaluate(() => (
    globalThis.AnalysisWorkspace?.getSnapshot?.()?.dataset?.entities?.length ?? 0
  ))).toBe(fixture.entityCount);
  await page.getByRole('button', { name: '3D Edit', exact: true }).click();
  const host = page.locator('[data-role="topology-edit-render-host"]');
  await expect(host).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(
    document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController?.session?.currentTopology?.()
  ))).toBe(true);
  return host;
}

async function selectSafeMatrixTarget(page) {
  return page.evaluate((stepMm) => {
    const controller = document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController;
    const topology = controller.session.currentTopology();
    const degree = new Map(topology.nodes.map((node) => [node.id, 0]));
    for (const edge of topology.edges) {
      degree.set(edge.fromNodeId, (degree.get(edge.fromNodeId) ?? 0) + 1);
      degree.set(edge.toNodeId, (degree.get(edge.toNodeId) ?? 0) + 1);
    }
    const supportHosts = new Set((topology.supports ?? []).flatMap((support) => [
      support.hostEntityId, support.hostEdgeId,
    ]).filter(Boolean));
    const supportNodes = new Set((topology.supports ?? []).flatMap((support) => [
      support.nodeId, support.placementOverride?.nodeId,
    ]).filter(Boolean));
    const boundaryNodes = new Set((topology.boundaries ?? []).flatMap((boundary) => [
      boundary.nodeId, boundary.canonicalNodeId,
    ]).filter(Boolean));
    const nodes = new Map(topology.nodes.map((node) => [node.id, node]));
    const rows = [];
    for (const edge of [...topology.edges].sort((a, b) => (
      String(a.componentKey ?? a.id).localeCompare(String(b.componentKey ?? b.id))
    ))) {
      if (String(edge.entityType ?? '').toUpperCase() !== 'PIPE') continue;
      if (supportHosts.has(edge.id) || supportHosts.has(edge.componentKey)) continue;
      for (const endpoint of ['FROM', 'TO']) {
        const nodeId = endpoint === 'FROM' ? edge.fromNodeId : edge.toNodeId;
        const anchorNodeId = endpoint === 'FROM' ? edge.toNodeId : edge.fromNodeId;
        if ((degree.get(nodeId) ?? 0) !== 1 || supportNodes.has(nodeId)) continue;
        const node = nodes.get(nodeId);
        const anchor = nodes.get(anchorNodeId);
        if (!node || !anchor) continue;
        const delta = {
          x: node.position.x - anchor.position.x,
          y: node.position.y - anchor.position.y,
          z: node.position.z - anchor.position.z,
        };
        const length = Math.hypot(delta.x, delta.y, delta.z);
        if (!(length > 1e-9)) continue;
        const unit = {
          x: delta.x / length,
          y: delta.y / length,
          z: delta.z / length,
        };
        rows.push({
          edgeId: edge.id,
          componentKey: edge.componentKey ?? edge.id,
          entityType: edge.entityType,
          endpoint,
          nodeId,
          anchorNodeId,
          boundary: boundaryNodes.has(nodeId),
          position: { ...node.position },
          anchorPosition: { ...anchor.position },
          originalLengthMm: length,
          requestedPosition: {
            x: node.position.x + unit.x * stepMm,
            y: node.position.y + unit.y * stepMm,
            z: node.position.z + unit.z * stepMm,
          },
        });
      }
    }
    const preferred = rows.filter((row) => !row.boundary);
    const target = (preferred.length ? preferred : rows)[0];
    if (!target) {
      throw new Error('A3D-003: no terminal support-free PIPE NODE_ONLY target is available.');
    }
    return target;
  }, STEP_MM);
}

async function moveViaCanvas(page, host, target, requestedPosition) {
  const canvas = page.locator('canvas[data-viewport-backend="topology-edit-webgl"]');
  await expect(canvas).toBeVisible();
  const pickEvidence = await resolveVisibleNodePickPoint(page, target.nodeId);
  await page.mouse.click(pickEvidence.point.x, pickEvidence.point.y);
  await expect(host).toHaveAttribute('data-topology-edit-selection-primary-id', target.nodeId);

  const current = target.position;
  const delta = {
    x: requestedPosition.x - current.x,
    y: requestedPosition.y - current.y,
    z: requestedPosition.z - current.z,
  };
  const interactionPanel = page.locator('[data-role="topology-edit-professional-interaction"]');
  await expect(interactionPanel).toBeVisible();
  await interactionPanel.locator('[data-role="interaction-entry-mode"]').selectOption('DELTA');
  await interactionPanel.locator('[data-role="interaction-value-x"]').fill(String(delta.x));
  await interactionPanel.locator('[data-role="interaction-value-y"]').fill(String(delta.y));
  await interactionPanel.locator('[data-role="interaction-value-z"]').fill(String(delta.z));
  await interactionPanel.locator('[data-action="preview-professional-interaction"]').click();
  await expect.poll(() => host.getAttribute('data-topology-edit-interaction-preview-hash')).toBeTruthy();
  const preview = await page.evaluate(() => {
    const controller = document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController;
    return {
      previewHash: controller.interactionPreview?.previewHash ?? '',
      targetPosition: controller.interactionPreview?.targetPosition ?? null,
      canonicalHash: controller.session.currentTopology().canonicalTopologyHash,
    };
  });
  expect(preview.targetPosition).toEqual(requestedPosition);
  await interactionPanel.locator('[data-action="apply-professional-interaction"]').click();
  await expect.poll(() => host.getAttribute('data-topology-edit-interaction-acceptance-hash')).toBeTruthy();
  const acceptance = await page.evaluate(() => {
    const controller = document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController;
    return {
      acceptanceHash: controller.interactionAcceptance?.acceptanceHash ?? '',
      certificationHash: controller.interactionAcceptance?.certificationHash ?? '',
      candidateHash: controller.interactionAcceptance?.candidateDraftHash ?? '',
    };
  });
  return {
    commandType: 'MOVE_NODE',
    selectionSource: 'viewport',
    pickEvidence,
    ...preview,
    ...acceptance,
  };
}

async function resolveVisibleNodePickPoint(page, nodeId) {
  return page.evaluate((targetNodeId) => {
    const controller = document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController;
    const backend = controller.viewportBackend;
    const topology = controller.session.currentTopology();
    const node = topology.nodes.find((row) => row.id === targetNodeId);
    if (!node) throw new Error(`A3D-003: missing node ${targetNodeId}.`);
    backend.engineeringRoot.updateMatrixWorld(true);
    backend.activeCamera.updateMatrixWorld(true);
    backend.activeCamera.updateProjectionMatrix();
    const vector = backend.activeCamera.position.clone().set(
      node.position.x, node.position.y, node.position.z,
    );
    vector.applyMatrix4(backend.engineeringRoot.matrixWorld).project(backend.activeCamera);
    const rect = backend.renderer.domElement.getBoundingClientRect();
    const center = {
      x: rect.left + ((vector.x + 1) / 2) * rect.width,
      y: rect.top + ((1 - vector.y) / 2) * rect.height,
    };
    const summarize = (pick) => pick ? {
      objectId: pick.objectId ?? '',
      objectKind: pick.objectKind ?? pick.kind ?? '',
      componentKey: pick.componentKey ?? '',
    } : null;
    const productionAt = (x, y) => summarize(backend.pickAt(x, y));
    const rayAt = (x, y) => {
      const context = backend.pickContext(x, y);
      return summarize(context ? backend.pickWithRaycaster(context.pointer) : null);
    };
    const centerProduction = productionAt(center.x, center.y);
    const centerRaycaster = rayAt(center.x, center.y);
    const radii = [0, 2, 4, 6, 8, 10, 12, 16, 20, 24];
    const directions = [
      [1, 0], [0.9239, 0.3827], [0.7071, 0.7071], [0.3827, 0.9239],
      [0, 1], [-0.3827, 0.9239], [-0.7071, 0.7071], [-0.9239, 0.3827],
      [-1, 0], [-0.9239, -0.3827], [-0.7071, -0.7071], [-0.3827, -0.9239],
      [0, -1], [0.3827, -0.9239], [0.7071, -0.7071], [0.9239, -0.3827],
    ];
    const samples = [];
    for (const radius of radii) {
      const offsets = radius === 0 ? [[0, 0]] : directions.map(([x, y]) => [x * radius, y * radius]);
      for (const [dx, dy] of offsets) {
        const x = center.x + dx;
        const y = center.y + dy;
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) continue;
        const production = productionAt(x, y);
        samples.push({ radius, dx, dy, production });
        if (production?.objectId === targetNodeId) {
          return {
            point: { x, y },
            projectedCenter: center,
            centerProduction,
            centerRaycaster,
            chosenProduction: production,
            chosenRaycaster: rayAt(x, y),
            radiusPx: radius,
            sampledCount: samples.length,
            observedObjectIds: [...new Set(samples.map((row) => row.production?.objectId).filter(Boolean))].sort(),
          };
        }
      }
    }
    throw new Error(`A3D-003_VIEWPORT_NODE_PICK_UNREACHABLE: ${JSON.stringify({
      nodeId: targetNodeId,
      center,
      centerProduction,
      centerRaycaster,
      sampledCount: samples.length,
      observedObjectIds: [...new Set(samples.map((row) => row.production?.objectId).filter(Boolean))].sort(),
    })}`);
  }, nodeId);
}

async function moveViaTable(page, host, target, requestedPosition) {
  await expect.poll(() => page.evaluate(() => Boolean(
    document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController?.tableAdapter?.runtime?.projection
  ))).toBe(true);
  const trigger = page.locator('[data-action="open-engineering-table"]');
  await trigger.click();
  await expect(page.locator('[data-role="topology-edit-table"]')).toBeVisible();
  const filter = page.locator('[data-table-filter]');
  await filter.fill(target.edgeId);
  const row = page.locator(`[data-role="topology-edit-table"] [data-canonical-id="${target.edgeId}"]`);
  await expect(row).toBeVisible();
  await row.locator('[data-table-select]').click();
  const panel = page.locator(`[data-table-node-endpoint="${target.endpoint}"]`);
  await expect(panel).toBeVisible();
  await panel.locator(`[data-table-edit-node-x="${target.endpoint}"]`).fill(String(requestedPosition.x));
  await panel.locator(`[data-table-edit-node-y="${target.endpoint}"]`).fill(String(requestedPosition.y));
  await panel.locator(`[data-table-edit-node-z="${target.endpoint}"]`).fill(String(requestedPosition.z));
  await panel.locator(`[data-table-edit-node-mode="${target.endpoint}"]`).selectOption('NODE_ONLY');
  await panel.locator(`[data-table-node-position-stage="${target.endpoint}"]`).click();
  await page.locator('[data-table-action="preview"]').click();
  await expect.poll(() => host.getAttribute('data-topology-edit-table-preview-hash')).toBeTruthy();
  const preview = await page.evaluate(() => {
    const runtime = document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController?.tableAdapter?.runtime;
    return {
      batchHash: runtime?.batch?.batchHash ?? '',
      planHash: runtime?.batchPlan?.operationPlan?.planHash ?? '',
      previewHash: runtime?.preview?.previewHash ?? '',
      candidateHash: runtime?.preview?.candidate?.candidateHash ?? '',
      commandTypes: (runtime?.preview?.candidate?.materializedCommandIntents ?? []).map((row) => row.commandType),
    };
  });
  expect(preview.commandTypes).toEqual(['MOVE_NODE']);
  await page.locator('[data-table-action="validate"]').click();
  await expect(host).toHaveAttribute('data-topology-edit-table-validation-status', 'READY_TO_APPLY');
  await page.locator('[data-table-action="apply"]').click();
  await expect(host).toHaveAttribute('data-topology-edit-table-validation-status', '');
  return { commandType: 'MOVE_NODE', selectionSource: 'table', ...preview };
}

async function authority(page, target) {
  return page.evaluate(({ nodeId, edgeId }) => {
    const controller = document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController;
    const topology = controller.session.currentTopology();
    const journal = controller.session.journal;
    const node = topology.nodes.find((row) => row.id === nodeId);
    const edge = topology.edges.find((row) => row.id === edgeId);
    const history = journal.history ?? [];
    const last = history[history.length - 1];
    return {
      canonicalHash: topology.canonicalTopologyHash,
      sourceHash: controller.workspaceDataset?.sourceSnapshot?.sourceSemanticHash ?? null,
      sourceByteHash: controller.workspaceDataset?.sourceSnapshot?.sourceByteHash ?? null,
      journalHash: journal.journalHash,
      activeLedgerHash: journal.activeLedgerHash,
      activeCommandCount: journal.activeCommandIds.length,
      sessionVersion: journal.sessionVersion,
      lastCommandType: last?.request?.commandType ?? last?.certification?.request?.commandType ?? '',
      nodePosition: { ...node.position },
      edgeConnectivity: { fromNodeId: edge.fromNodeId, toNodeId: edge.toNodeId },
    };
  }, { nodeId: target.nodeId, edgeId: target.edgeId });
}
