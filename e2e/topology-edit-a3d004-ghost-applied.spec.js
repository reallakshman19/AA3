import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import {
  assertA3d004AppliedDifferential,
  assertA3d004PreviewNonMutating,
  assertA3d004ValidationNonMutating,
  captureA3d004Applied,
  captureA3d004Authority,
  captureA3d004Preview,
} from './helpers/topology-edit-ghost-applied-differential.js';

const REPORT = 'reports/qualification/topology-edit-a3d004-ghost-applied.json';
const Q3_FIXTURE = resolve('public/fixtures/topology-edit-table-q3-exact.staged.json');
const EVIDENCE = [];
const DIRECT_NO_PREVIEW = Object.freeze([
  'MERGE_NODES', 'BRIDGE_GAP', 'SPLIT_EDGE', 'DISCONNECT_ENDPOINT', 'DELETE_EDGE',
]);
const PREVIEW_NOT_MATRIXED = Object.freeze([
  'INSERT_PIPE_SEGMENT', 'INSERT_INLINE_COMPONENT', 'INSERT_BRANCH_COMPONENT',
  'ADD_JUNCTION_DEFINITION', 'TRIM_EDGE',
]);

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1720, height: 1080 });
  await page.addInitScript(() => globalThis.localStorage?.clear());
});

test.afterAll(async () => {
  await mkdir('reports/qualification', { recursive: true });
  const covered = [...new Set(EVIDENCE.flatMap((row) => row.commandTypes))].sort();
  await writeFile(REPORT, `${JSON.stringify({
    schema: 'TopologyEditA3D004GhostAppliedQualification.v1',
    candidateHead: process.env.TOPOLOGY_EDIT_TARGET_HEAD_SHA || null,
    status: 'PARTIAL_BLOCKED_LEGACY_DIRECT_COMMAND_PREVIEW',
    coveredCommandTypes: covered,
    directCommandTypesWithoutPreviewBoundary: DIRECT_NO_PREVIEW,
    previewCapableCommandTypesNotYetMatrixed: PREVIEW_NOT_MATRIXED,
    rows: EVIDENCE,
  }, null, 2)}\n`);
});

test('A3D-004 Route + Elbow keeps one candidate from ghost through Apply', async ({ page }) => {
  const host = await openDemo(page);
  await openPanel(host, 'authoring');
  const endpoint = await safeAxisAlignedOpenEndpoint(page);
  await selectCanonicalFromTree(page, host, endpoint.nodeId);
  await page.locator('[data-action="activate-authoring-route-elbow"]').click();
  await fillAuthoringFields(page, (await safeRouteProperties(page, endpoint.nodeId)).fields);
  EVIDENCE.push({
    family: 'ROUTE_ELBOW',
    ...await qualifyAuthoringPreview(page, host, [
      'CREATE_NODE', 'CREATE_NODE', 'ADD_STRAIGHT_ELEMENT',
      'ADD_STRAIGHT_ELEMENT', 'ADD_BEND_DEFINITION',
    ]),
  });
});

test('A3D-004 Q3 Table composite keeps one candidate from ghost through Apply', async ({ page }) => {
  const host = await openQ3(page);
  const q3 = await q3Authority(page);
  const baseline = await captureA3d004Authority(page);

  await stagePipe(page, q3.m04Id, 3000);
  await selectTableRow(page, q3.m06Id);
  await page.locator('[data-table-edit-valve-catalogue-record]').selectOption(q3.ballRecordId);
  await page.locator('[data-table-edit-anchor]').selectOption('FROM');
  await page.locator('[data-table-edit-propagation]').selectOption('DOWNSTREAM');
  await page.locator('[data-table-action="stage-valve-replacement"]').click();

  await selectTableRow(page, q3.teeId);
  await page.locator('[data-table-edit-tee-branch-port]').selectOption(q3.branchPortKey);
  await page.locator('[data-table-edit-tee-reducer]').selectOption(q3.reducerId);
  await page.locator('[data-table-edit-tee-run-dn]').fill('150');
  await page.locator('[data-table-edit-tee-branch-dn]').fill('100');
  await page.locator('[data-table-edit-tee-downstream-dn]').fill('80');
  await page.locator('[data-table-action="stage-tee-reducer-relation"]').click();
  assertA3d004ValidationNonMutating(baseline, await captureA3d004Authority(page));

  await page.locator('[data-table-action="preview"]').click();
  await expect.poll(() => host.getAttribute('data-topology-edit-table-preview-hash')).toBeTruthy();
  const preview = await captureA3d004Preview(page, 'table');
  assertA3d004PreviewNonMutating(baseline, preview);
  for (const type of ['MOVE_NODE', 'REPLACE_INLINE_COMPONENT', 'UPDATE_JUNCTION_BRANCH_RELATION']) {
    expect(preview.commandTypes).toContain(type);
  }

  await page.locator('[data-table-action="validate"]').click();
  await expect(host).toHaveAttribute('data-topology-edit-table-validation-status', 'READY_TO_APPLY');
  assertA3d004ValidationNonMutating(baseline, await captureA3d004Authority(page));
  await page.locator('[data-table-action="apply"]').click();
  await expect.poll(() => captureA3d004Authority(page).then((row) => row.canonicalHash))
    .toBe(preview.resultingCanonicalHash);
  const applied = await captureA3d004Applied(page, preview);
  assertA3d004AppliedDifferential(baseline, preview, applied);
  EVIDENCE.push(evidenceRow('TABLE_Q3_PIPE_VALVE_JUNCTION', preview));
});

test('A3D-004 support placement ghost equals applied support projection', async ({ page }) => {
  const host = await openXyzTable(page);
  const supportId = await selectTableSupport(page, 'S-007');
  const editor = page.locator(`[data-table-support-placement-editor="${supportId}"]`);
  const station = editor.locator('[data-table-edit-support-station]');
  const currentStation = Number(await station.inputValue());
  const hostLength = Number(await station.getAttribute('max'));
  const requested = Math.min(
    hostLength,
    currentStation + Math.min(100, (hostLength - currentStation) / 2),
  );
  expect(requested).toBeGreaterThan(currentStation);
  await station.fill(String(requested));

  const baseline = await captureA3d004Authority(page);
  await editor.locator('[data-table-support-placement-stage]').click();
  assertA3d004ValidationNonMutating(baseline, await captureA3d004Authority(page));
  EVIDENCE.push({
    family: 'UPDATE_SUPPORT_PLACEMENT',
    ...await qualifyTablePreview(page, host, baseline, ['UPDATE_SUPPORT_PLACEMENT']),
  });
});

test('A3D-004 support restraint ghost equals applied support projection', async ({ page }) => {
  const host = await openXyzTable(page);
  const supportId = await selectTableSupport(page, 'S-007');
  const editor = page.locator(`[data-table-support-restraint-editor="${supportId}"]`);
  const family = editor.locator('[data-table-edit-support-family]');
  const direction = editor.locator('[data-table-edit-support-direction]');
  const gap = editor.locator('[data-table-edit-support-gap]');
  const travel = editor.locator('[data-table-edit-support-travel]');
  await family.selectOption((await family.inputValue()) === 'GUIDE' ? 'LINE_STOP' : 'GUIDE');
  await direction.selectOption((await direction.inputValue()) === '+X' ? '+Y' : '+X');
  await gap.fill(Number(await gap.inputValue()) === 5 ? '6' : '5');
  await travel.fill(Number(await travel.inputValue()) === 20 ? '25' : '20');

  const baseline = await captureA3d004Authority(page);
  await editor.locator('[data-table-support-restraint-stage]').click();
  assertA3d004ValidationNonMutating(baseline, await captureA3d004Authority(page));
  EVIDENCE.push({
    family: 'UPDATE_SUPPORT_RESTRAINT',
    ...await qualifyTablePreview(page, host, baseline, ['UPDATE_SUPPORT_RESTRAINT']),
  });
});

async function qualifyAuthoringPreview(page, host, expectedCommandTypes) {
  const baseline = await captureA3d004Authority(page);
  await page.locator('[data-action="preview-authoring-operation"]').click();
  await expect.poll(() => page.evaluate(() => (
    document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController?.viewportBackend?.groups?.ghostGroup?.children?.length ?? 0
  ))).toBeGreaterThan(0);
  const preview = await captureA3d004Preview(page);
  assertA3d004PreviewNonMutating(baseline, preview);
  expect(preview.commandTypes).toEqual(expectedCommandTypes);

  await page.locator('[data-action="validate-authoring-operation"]').click();
  await expect(host).toHaveAttribute('data-topology-edit-authoring-phase', 'READY_TO_APPLY');
  assertA3d004ValidationNonMutating(baseline, await captureA3d004Authority(page));
  await page.locator('[data-action="apply-authoring-operation"]').click();
  await expect.poll(() => captureA3d004Authority(page).then((row) => row.canonicalHash))
    .toBe(preview.resultingCanonicalHash);
  assertA3d004AppliedDifferential(
    baseline,
    preview,
    await captureA3d004Applied(page, preview),
  );
  return evidenceRow('AUTHORING', preview);
}

async function qualifyTablePreview(page, host, baseline, expectedCommandTypes) {
  await page.locator('[data-table-action="preview"]').click();
  await expect.poll(() => host.getAttribute('data-topology-edit-table-preview-hash')).toBeTruthy();
  const preview = await captureA3d004Preview(page, 'table');
  assertA3d004PreviewNonMutating(baseline, preview);
  expect(preview.commandTypes).toEqual(expectedCommandTypes);
  await page.locator('[data-table-action="validate"]').click();
  await expect(host).toHaveAttribute('data-topology-edit-table-validation-status', 'READY_TO_APPLY');
  assertA3d004ValidationNonMutating(baseline, await captureA3d004Authority(page));
  await page.locator('[data-table-action="apply"]').click();
  await expect.poll(() => captureA3d004Authority(page).then((row) => row.canonicalHash))
    .toBe(preview.resultingCanonicalHash);
  assertA3d004AppliedDifferential(
    baseline,
    preview,
    await captureA3d004Applied(page, preview),
  );
  return evidenceRow('TABLE', preview);
}

function evidenceRow(surface, preview) {
  return {
    surface,
    candidateHash: preview.candidateHash,
    resultingCanonicalHash: preview.resultingCanonicalHash,
    changedCanonicalIds: preview.changedCanonicalIds,
    commandTypes: preview.commandTypes,
    semanticProjectionCount: preview.projectionSignature.length,
    renderedGhostCount: preview.ghostSignature.length,
  };
}

async function openDemo(page) {
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
  await expect.poll(() => page.evaluate(() => Boolean(
    document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController?.professionalRuntime?.catalogue
  ))).toBe(true);
  return host;
}

async function openQ3(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('navigation', { name: 'Application views' })
    .getByRole('button', { name: 'Workspace', exact: true }).click();
  await page.locator('[data-role="dataset-file"]').setInputFiles(Q3_FIXTURE);
  await expect.poll(() => page.evaluate(() => (
    globalThis.AnalysisWorkspace?.getSnapshot?.()?.dataset?.entities?.length ?? 0
  ))).toBe(8);
  await page.getByRole('button', { name: '3D Edit', exact: true }).click();
  const host = page.locator('[data-role="topology-edit-render-host"]');
  await expect(host).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(
    document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController?.tableAdapter?.runtime?.projection
  ))).toBe(true);
  await openPanel(host, 'table');
  return host;
}

async function openXyzTable(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('navigation', { name: 'Application views' })
    .getByRole('button', { name: 'Workspace', exact: true }).click();
  await page.locator('[data-action="load-topology-edit-xyz-branch-demo"]').click();
  await expect(page.locator('[data-role="summary-supports"]')).toContainText('7');
  await page.getByRole('button', { name: '3D Edit', exact: true }).click();
  const host = page.locator('[data-role="topology-edit-render-host"]');
  await expect(host).toBeVisible();
  const trigger = page.locator('[data-action="open-engineering-table"]');
  if ((await trigger.getAttribute('aria-expanded')) !== 'true') await trigger.click();
  await expect(page.locator('[data-role="topology-edit-table"]')).toBeVisible();
  return host;
}

async function openPanel(host, kind) {
  const panel = host.locator(`details[data-panel-kind="${kind}"]`);
  if (!(await panel.evaluate((element) => element.open))) await panel.locator(':scope > summary').click();
}

async function selectCanonicalFromTree(page, host, canonicalId) {
  await openPanel(host, 'topology-edit-object-tree');
  const panel = host.locator('details[data-panel-kind="topology-edit-object-tree"]');
  const filter = panel.locator('[data-role="topology-edit-object-tree-filter"]');
  await filter.fill(canonicalId);
  const row = panel.locator(`[data-canonical-id="${canonicalId}"]`);
  await expect(row).toHaveCount(1);
  await row.locator('[data-object-tree-select]').click();
  await expect(host).toHaveAttribute('data-topology-edit-selection-primary-id', canonicalId);
  await filter.fill('');
}

async function selectTableSupport(page, tag) {
  const filter = page.locator('[data-table-filter]');
  await filter.fill(tag);
  const row = page.locator(
    '[data-role="topology-edit-table"] tbody tr[data-canonical-id][data-element-type="SUPPORT"]',
  );
  await expect(row).toHaveCount(1);
  const id = await row.getAttribute('data-canonical-id');
  expect(id).toBeTruthy();
  await row.locator('[data-table-select]').click();
  return id;
}

async function fillAuthoringFields(page, values) {
  for (const [key, value] of Object.entries(values)) {
    const control = page.locator(`[data-authoring-field="${key}"]`);
    await expect(control).toBeVisible();
    if (await control.evaluate((node) => node.tagName === 'SELECT')) {
      await control.selectOption(String(value));
    } else {
      await control.fill(String(value));
    }
  }
}

async function safeAxisAlignedOpenEndpoint(page) {
  return page.evaluate(() => {
    const topology = document.querySelector('[data-role="topology-edit-render-host"]')
      .__topologyEditAuthoringController.session.currentTopology();
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
      const edge = topology.edges.find(
        (row) => row.fromNodeId === node.id || row.toNodeId === node.id,
      );
      const other = topology.nodes.find((row) => row.id === (
        edge.fromNodeId === node.id ? edge.toNodeId : edge.fromNodeId
      ));
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
        node.position.x - center.x, node.position.y - center.y, node.position.z - center.z,
      );
      return [{ nodeId: node.id, radial }];
    }).sort((a, b) => b.radial - a.radial || a.nodeId.localeCompare(b.nodeId));
    if (!candidates.length) throw new Error('A3D-004: no safe open endpoint.');
    return candidates[0];
  });
}

async function safeRouteProperties(page, nodeId) {
  return page.evaluate((selectedId) => {
    const topology = document.querySelector('[data-role="topology-edit-render-host"]')
      .__topologyEditAuthoringController.session.currentTopology();
    const node = topology.nodes.find((row) => row.id === selectedId);
    const edge = topology.edges.find(
      (row) => row.fromNodeId === selectedId || row.toNodeId === selectedId,
    );
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
        Math.abs(node.position[right] - center[right])
        - Math.abs(node.position[left] - center[left])
      ))[0];
    const sign = node.position[perpendicularAxis] >= center[perpendicularAxis] ? 1 : -1;
    const offset = { x: outward.x * 600, y: outward.y * 600, z: outward.z * 600 };
    offset[perpendicularAxis] += sign * 1600;
    const diameterMm = Number(edge.diameterMm) > 0 ? Number(edge.diameterMm) : 100;
    return {
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

async function q3Authority(page) {
  return page.evaluate(() => {
    const controller = document.querySelector('[data-role="topology-edit-render-host"]')
      .__topologyEditAuthoringController;
    const topology = controller.session.currentTopology();
    const rows = controller.tableAdapter.runtime.projection.rows;
    const row = (key) => rows.find((item) => item.identity.componentKey === key);
    const edge = (key) => topology.edges.find((item) => item.componentKey === key);
    const tee = row('T-001');
    const reducer = edge('R-001');
    const valve = row('V-M06');
    const branch = tee.identity.portBindings.find((item) => item.nodeId === reducer.fromNodeId);
    const ball = controller.professionalRuntime.catalogue.records.find((record) => (
      record.componentType === 'VALVE'
      && record.valveType === 'BALL'
      && record.nominalSizeMm === valve.fields.dnInMm
      && record.pipingClass === valve.fields.pipingClass
      && record.pressureClass === valve.fields.pressureClass
    ));
    if (!ball) throw new Error('A3D-004 Q3 compatible BALL record is unavailable.');
    return {
      m04Id: row('P-M04').identity.canonicalId,
      m06Id: valve.identity.canonicalId,
      ballRecordId: ball.recordId,
      teeId: tee.identity.canonicalId,
      reducerId: row('R-001').identity.canonicalId,
      branchPortKey: branch.portKey,
    };
  });
}

async function selectTableRow(page, canonicalId) {
  const row = page.locator(`[data-role="topology-edit-table"] [data-canonical-id="${canonicalId}"]`);
  await expect(row).toBeVisible();
  await row.locator('[data-table-select]').click();
}

async function stagePipe(page, canonicalId, lengthMm) {
  await selectTableRow(page, canonicalId);
  await page.locator('[data-table-edit-length]').fill(String(lengthMm));
  await page.locator('[data-table-edit-anchor]').selectOption('FROM');
  await page.locator('[data-table-edit-propagation]').selectOption('DOWNSTREAM');
  await page.locator('[data-table-action="stage-pipe-length"]').click();
}
