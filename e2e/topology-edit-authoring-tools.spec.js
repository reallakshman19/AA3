import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const REPORT_PATH = 'reports/qualification/topology-edit-authoring-tools.json';

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.addInitScript(() => globalThis.localStorage?.clear());
});

test('production 3D Edit completes contextual Continue route through governed authority', async ({ page }, testInfo) => {
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  const host = await openProductionAuthoringController(page);
  const initial = await evidence(page);
  const endpoint = await safeAxisAlignedOpenEndpoint(page);
  await clickCanonicalNode(page, endpoint.nodeId);
  await expect.poll(() => selectedNodeId(page)).toBe(endpoint.nodeId);

  const continueRoute = page.locator('[data-action="activate-authoring-route-elbow"]');
  await expect(continueRoute).toHaveText('Continue route');
  await continueRoute.click();
  const route = await safeRouteProperties(page, endpoint.nodeId);
  await fillFields(page, route.fields);

  await expect.poll(() => host.getAttribute('data-topology-edit-authoring-command-count')).toBe('5');
  await expect(host).toHaveAttribute('data-topology-edit-authoring-certification-mode', 'FINAL_STATE');
  await expect.poll(() => page.evaluate(() => (
    globalThis.__AUTHORING_CONTROLLER__.viewportBackend.groups.ghostGroup.children.length
  ))).toBeGreaterThan(0);
  await expect.poll(() => host.getAttribute('data-topology-edit-authoring-phase')).toBe('READY_TO_APPLY');
  await expect(host).toHaveAttribute('data-topology-edit-authoring-blocking-issue-count', '0');
  const preview = await evidence(page);
  expect(preview.canonicalHash).toBe(initial.canonicalHash);
  expect(preview.journalHash).toBe(initial.journalHash);

  const engineeringEvidence = page.locator('[data-role="route-connect-engineering-evidence"]');
  await expect(engineeringEvidence).not.toHaveAttribute('open', '');
  await expect(engineeringEvidence.locator('[data-action="preview-authoring-operation"]')).toBeHidden();
  await expect(engineeringEvidence.locator('[data-action="validate-authoring-operation"]')).toBeHidden();

  const applyRoute = page.getByRole('button', { name: 'Apply route', exact: true });
  await expect(applyRoute).toBeEnabled();
  await applyRoute.click();
  await expect.poll(() => page.evaluate(() => (
    globalThis.__AUTHORING_CONTROLLER__.session.journal.activeCommandIds.length
  ))).toBe(initial.activeCommandCount + 5);

  const completed = await evidence(page);
  expect(completed.nodeCount).toBe(initial.nodeCount + 2);
  expect(completed.edgeCount).toBe(initial.edgeCount + 2);
  expect(completed.bendCount).toBe(initial.bendCount + 1);
  expect(completed.rightAngleIssueIds).toEqual(initial.rightAngleIssueIds);
  expect(completed.authoredBendArcCount).toBeGreaterThanOrEqual(1);
  expect(completed.transactionHash).not.toBe('');
  expect(completed.commandTypes.slice(-5)).toEqual([
    'CREATE_NODE', 'CREATE_NODE', 'INSERT_PIPE_SEGMENT', 'INSERT_PIPE_SEGMENT', 'ADD_BEND_DEFINITION',
  ]);

  await testInfo.attach('topology-edit-contextual-continue-route', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });

  await page.locator('[data-action="undo"]').click();
  await expect.poll(() => controllerCanonicalHash(page)).toBe(initial.canonicalHash);
  expect((await evidence(page)).activeCommandCount).toBe(initial.activeCommandCount);
  await page.locator('[data-action="redo"]').click();
  await expect.poll(() => controllerCanonicalHash(page)).toBe(completed.canonicalHash);
  expect((await evidence(page)).activeCommandCount).toBe(completed.activeCommandCount);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors.filter(isCriticalConsoleError)).toEqual([]);
  await mkdir('reports/qualification', { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify({
    schema: 'TopologyEditAuthoringToolsEvidence.v3',
    status: 'PASS_CONTEXTUAL_CONTINUE_ROUTE_AUTO_PREVIEW_VALIDATE_APPLY_UNDO_REDO',
    candidateHead: process.env.TOPOLOGY_EDIT_TARGET_HEAD_SHA || null,
    fixture: 'public/fixtures/topology-edit-20-element-demo.staged.json',
    productionController: 'topology-edit-3d-sjson-fidelity-controller.js',
    endpoint,
    route,
    initial,
    preview,
    completed,
  }, null, 2)}\n`);
});

async function openProductionAuthoringController(page) {
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
  await page.evaluate(() => {
    globalThis.__AUTHORING_CONTROLLER__ = document.querySelector(
      '[data-role="topology-edit-render-host"]',
    )?.__topologyEditAuthoringController;
  });
  const authoringPanel = page.locator('details[data-panel-kind="authoring"]');
  if (!(await authoringPanel.evaluate((element) => element.open))) {
    await authoringPanel.locator(':scope > summary').click();
  }
  await expect(page.locator('[data-role="topology-edit-authoring"]')).toBeVisible();
  return host;
}

async function fillFields(page, values) {
  for (const [key, value] of Object.entries(values)) {
    const control = page.locator(`[data-authoring-field="${key}"]`);
    await expect(control).toBeVisible();
    if (await control.evaluate((node) => node.tagName === 'SELECT')) {
      await control.selectOption(String(value));
    } else {
      await control.fill(String(value));
      await control.blur();
    }
  }
}

async function safeAxisAlignedOpenEndpoint(page) {
  return page.evaluate(() => {
    const topology = globalThis.__AUTHORING_CONTROLLER__.session.currentTopology();
    const degrees = new Map(topology.nodes.map((node) => [node.id, 0]));
    topology.edges.forEach((edge) => {
      degrees.set(edge.fromNodeId, (degrees.get(edge.fromNodeId) ?? 0) + 1);
      degrees.set(edge.toNodeId, (degrees.get(edge.toNodeId) ?? 0) + 1);
    });
    const center = topology.nodes.reduce((sum, node) => ({
      x: sum.x + node.position.x / topology.nodes.length,
      y: sum.y + node.position.y / topology.nodes.length,
      z: sum.z + node.position.z / topology.nodes.length,
    }), { x: 0, y: 0, z: 0 });
    const candidates = topology.nodes.flatMap((node) => {
      if (degrees.get(node.id) !== 1) return [];
      const edge = topology.edges.find((row) => row.fromNodeId === node.id || row.toNodeId === node.id);
      const otherId = edge.fromNodeId === node.id ? edge.toNodeId : edge.fromNodeId;
      const other = topology.nodes.find((row) => row.id === otherId);
      const delta = {
        x: node.position.x - other.position.x,
        y: node.position.y - other.position.y,
        z: node.position.z - other.position.z,
      };
      const length = Math.hypot(delta.x, delta.y, delta.z);
      if (!(length > 300)) return [];
      const outward = { x: delta.x / length, y: delta.y / length, z: delta.z / length };
      if (Object.values(outward).filter((value) => Math.abs(value) > 1e-8).length !== 1) return [];
      const radial = Math.hypot(
        node.position.x - center.x,
        node.position.y - center.y,
        node.position.z - center.z,
      );
      return [{ nodeId: node.id, edgeId: edge.id, outward, lengthMm: length, radial }];
    }).sort((left, right) => right.radial - left.radial || left.nodeId.localeCompare(right.nodeId));
    if (!candidates.length) throw new Error('No safe axis-aligned graph-open endpoint is available.');
    return candidates[0];
  });
}

async function safeRouteProperties(page, nodeId) {
  return page.evaluate((selectedId) => {
    const topology = globalThis.__AUTHORING_CONTROLLER__.session.currentTopology();
    const node = topology.nodes.find((row) => row.id === selectedId);
    const edge = topology.edges.find((row) => row.fromNodeId === selectedId || row.toNodeId === selectedId);
    const other = topology.nodes.find((row) => row.id === (
      edge.fromNodeId === selectedId ? edge.toNodeId : edge.fromNodeId
    ));
    const delta = {
      x: node.position.x - other.position.x,
      y: node.position.y - other.position.y,
      z: node.position.z - other.position.z,
    };
    const length = Math.hypot(delta.x, delta.y, delta.z);
    const outward = { x: delta.x / length, y: delta.y / length, z: delta.z / length };
    const occupiedAxis = ['x', 'y', 'z'].find((axis) => Math.abs(outward[axis]) > 0.9);
    const bounds = topology.nodes.reduce((value, row) => ({
      minimum: {
        x: Math.min(value.minimum.x, row.position.x),
        y: Math.min(value.minimum.y, row.position.y),
        z: Math.min(value.minimum.z, row.position.z),
      },
      maximum: {
        x: Math.max(value.maximum.x, row.position.x),
        y: Math.max(value.maximum.y, row.position.y),
        z: Math.max(value.maximum.z, row.position.z),
      },
    }), {
      minimum: { x: Infinity, y: Infinity, z: Infinity },
      maximum: { x: -Infinity, y: -Infinity, z: -Infinity },
    });
    const center = {
      x: (bounds.minimum.x + bounds.maximum.x) / 2,
      y: (bounds.minimum.y + bounds.maximum.y) / 2,
      z: (bounds.minimum.z + bounds.maximum.z) / 2,
    };
    const perpendicularAxis = ['x', 'y', 'z']
      .filter((axis) => axis !== occupiedAxis)
      .sort((left, right) => (
        Math.abs(node.position[right] - center[right]) - Math.abs(node.position[left] - center[left])
      ))[0];
    const sign = node.position[perpendicularAxis] >= center[perpendicularAxis] ? 1 : -1;
    const offset = { x: outward.x * 600, y: outward.y * 600, z: outward.z * 600 };
    offset[perpendicularAxis] += sign * 1600;
    const diameterMm = Number(edge.diameterMm) > 0 ? Number(edge.diameterMm) : 100;
    return {
      endpointNodeId: selectedId,
      hostEdgeId: edge.id,
      occupiedAxis,
      perpendicularAxis,
      fields: {
        offsetX: offset.x,
        offsetY: offset.y,
        offsetZ: offset.z,
        nominalSizeMm: diameterMm,
        angleDeg: 90,
        radiusType: 'LR',
        radiusMm: diameterMm * 1.5,
        pipingClass: edge.pipingClass || 'UNSPECIFIED',
      },
    };
  }, nodeId);
}

async function clickCanonicalNode(page, nodeId) {
  const point = await page.evaluate((id) => {
    const controller = globalThis.__AUTHORING_CONTROLLER__;
    const node = controller.session.currentTopology().nodes.find((row) => row.id === id);
    const camera = controller.viewportBackend.activeCamera;
    const canvas = controller.viewportBackend.renderer.domElement;
    const vector = camera.position.clone().set(node.position.x, node.position.y, node.position.z).project(camera);
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.left + ((vector.x + 1) / 2) * rect.width,
      y: rect.top + ((1 - vector.y) / 2) * rect.height,
    };
  }, nodeId);
  await page.mouse.click(point.x, point.y);
}

async function selectedNodeId(page) {
  return page.evaluate(() => globalThis.__AUTHORING_CONTROLLER__?.selection?.nodeIds?.[0] ?? null);
}

async function controllerCanonicalHash(page) {
  return page.evaluate(() => globalThis.__AUTHORING_CONTROLLER__.session.currentTopology().canonicalTopologyHash);
}

async function evidence(page) {
  return page.evaluate(() => {
    const controller = globalThis.__AUTHORING_CONTROLLER__;
    const topology = controller.session.currentTopology();
    let authoredBendArcCount = 0;
    controller.viewportBackend.groups.draftGroup.traverse((object) => {
      if (object.userData?.partRole === 'authored-elbow-arc') authoredBendArcCount += 1;
    });
    return {
      canonicalHash: topology.canonicalTopologyHash,
      journalHash: controller.session.journal.journalHash,
      sessionVersion: controller.session.journal.sessionVersion,
      activeCommandCount: controller.session.journal.activeCommandIds.length,
      commandTypes: controller.session.journal.history.map((row) => row.request?.commandType),
      nodeCount: topology.nodes.length,
      edgeCount: topology.edges.length,
      bendCount: topology.bends?.length ?? 0,
      rightAngleIssueIds: controller.issues
        .filter((row) => row.kind === 'RIGHT_ANGLE_WITHOUT_BEND')
        .map((row) => row.id)
        .sort(),
      transactionHash: controller.hostElement.dataset.topologyEditAuthoringTransactionHash || '',
      authoredBendArcCount,
    };
  });
}

function isCriticalConsoleError(message) {
  return [
    /ReferenceError/i,
    /Cannot access .* before initialization/i,
    /does not provide an export named/i,
    /Failed to fetch dynamically imported module/i,
    /circular import/i,
    /WebGL context lost/i,
  ].some((pattern) => pattern.test(message));
}
