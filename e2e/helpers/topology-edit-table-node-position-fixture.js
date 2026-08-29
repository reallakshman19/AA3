import { resolve } from 'node:path';
import { expect } from '@playwright/test';

const Q3_FIXTURE = resolve('public/fixtures/topology-edit-table-q3-exact.staged.json');

export async function openNodePositionDemo(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('navigation', { name: 'Application views' })
    .getByRole('button', { name: 'Workspace', exact: true }).click();
  await page.locator('[data-action="load-topology-edit-demo"]').click();
  await expect.poll(() => page.evaluate(() => (
    globalThis.AnalysisWorkspace?.getSnapshot?.()?.dataset?.entities?.length ?? 0
  ))).toBe(20);
  return open3dTable(page);
}

export async function openNodePositionQ3(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('navigation', { name: 'Application views' })
    .getByRole('button', { name: 'Workspace', exact: true }).click();
  await page.locator('[data-role="dataset-file"]').setInputFiles(Q3_FIXTURE);
  await expect.poll(() => page.evaluate(() => (
    globalThis.AnalysisWorkspace?.getSnapshot?.()?.dataset?.entities?.length ?? 0
  ))).toBe(8);
  return open3dTable(page);
}

export async function rowAuthority(page, componentKey) {
  return page.evaluate((key) => {
    const host = document.querySelector('[data-role="topology-edit-render-host"]');
    const controller = host?.__topologyEditAuthoringController;
    const topology = controller.session.currentTopology();
    const position = (id) => {
      const node = topology.nodes.find((item) => item.id === id);
      if (!node) throw new Error(`Missing node ${id}.`);
      return { ...node.position };
    };
    const row = controller?.tableAdapter?.runtime?.projection?.rows?.find(
      (item) => item.identity?.componentKey === key,
    );
    if (!row) throw new Error(`Missing Table row for ${key}.`);
    const edge = topology.edges.find((item) => item.id === row.identity.canonicalId);
    if (!edge) throw new Error(`Missing canonical edge for ${key}.`);
    return {
      canonicalId: row.identity.canonicalId,
      componentKey: key,
      fromNodeId: edge.fromNodeId,
      toNodeId: edge.toNodeId,
      fromPosition: position(edge.fromNodeId),
      toPosition: position(edge.toNodeId),
    };
  }, componentKey);
}

export async function q3ConnectedRunAuthority(page) {
  return page.evaluate(() => {
    const host = document.querySelector('[data-role="topology-edit-render-host"]');
    const controller = host?.__topologyEditAuthoringController;
    const topology = controller.session.currentTopology();
    const position = (id) => {
      const node = topology.nodes.find((item) => item.id === id);
      if (!node) throw new Error(`Missing node ${id}.`);
      return { ...node.position };
    };
    const componentWithout = (startNodeId, blockedEdgeId) => {
      const adjacency = new Map(topology.nodes.map((node) => [node.id, []]));
      for (const candidate of topology.edges) {
        if (candidate.id === blockedEdgeId) continue;
        adjacency.get(candidate.fromNodeId)?.push(candidate.toNodeId);
        adjacency.get(candidate.toNodeId)?.push(candidate.fromNodeId);
      }
      const visited = new Set([startNodeId]); const queue = [startNodeId];
      while (queue.length) {
        const current = queue.shift();
        for (const peer of [...(adjacency.get(current) ?? [])].sort()) {
          if (visited.has(peer)) continue;
          visited.add(peer); queue.push(peer);
        }
      }
      return [...visited].sort();
    };
    const rows = controller.tableAdapter.runtime.projection.rows;
    const row = rows.find((item) => item.identity?.componentKey === 'P-M04');
    const edge = topology.edges.find((item) => item.id === row?.identity?.canonicalId);
    if (!edge) throw new Error('Q3 P-M04 canonical edge is unavailable.');
    const movedNodeIds = componentWithout(edge.toNodeId, edge.id);
    if (movedNodeIds.includes(edge.fromNodeId) || movedNodeIds.length < 2) {
      throw new Error('Q3 P-M04 TO must expose an acyclic multi-node moving side.');
    }
    const moved = new Set(movedNodeIds);
    const internalEdgeIds = topology.edges.filter((candidate) => (
      moved.has(candidate.fromNodeId) && moved.has(candidate.toNodeId)
    )).map((candidate) => candidate.id).sort();
    if (!internalEdgeIds.length) throw new Error('Q3 CONNECTED_RUN must contain an internal moving edge.');
    const selected = position(edge.toNodeId);
    return {
      canonicalId: edge.id,
      endpoint: 'TO',
      nodeId: edge.toNodeId,
      anchorNodeId: edge.fromNodeId,
      movedNodeIds,
      internalEdgeIds,
      requestedPosition: { x: selected.x + 60, y: selected.y, z: selected.z + 40 },
    };
  });
}

export async function q3ConcurrencyAuthority(page) {
  return page.evaluate(() => {
    const controller = document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController;
    const topology = controller.session.currentTopology();
    const rows = controller.tableAdapter.runtime.projection.rows;
    const position = (id) => {
      const node = topology.nodes.find((item) => item.id === id);
      if (!node) throw new Error(`Missing node ${id}.`);
      return { ...node.position };
    };
    const edgeFor = (componentKey) => {
      const row = rows.find((item) => item.identity?.componentKey === componentKey);
      return topology.edges.find((item) => item.id === row?.identity?.canonicalId);
    };
    const target = edgeFor('P-R42'); const unrelated = edgeFor('P-TAIL');
    if (!target || !unrelated) throw new Error('Q3 concurrency edges are unavailable.');
    return {
      targetEdgeId: target.id,
      targetFromNodeId: target.fromNodeId,
      targetToNodeId: target.toNodeId,
      targetFromPosition: position(target.fromNodeId),
      unrelatedNodeId: unrelated.toNodeId,
    };
  });
}

export async function selectTableRow(page, canonicalId) {
  const filter = page.locator('[data-table-filter]');
  await filter.fill(canonicalId);
  const row = page.locator(`[data-role="topology-edit-table"] [data-canonical-id="${canonicalId}"]`);
  await expect(row).toBeVisible();
  await row.locator('[data-table-select]').click();
  await expect(page.locator('[data-table-all-properties]')).toBeVisible();
}

export async function stageNodePosition(page, { canonicalId, endpoint, movementMode, position }) {
  await selectTableRow(page, canonicalId);
  const panel = page.locator(`[data-table-node-endpoint="${endpoint}"]`);
  await expect(panel).toBeVisible();
  await panel.locator(`[data-table-edit-node-x="${endpoint}"]`).fill(String(position.x));
  await panel.locator(`[data-table-edit-node-y="${endpoint}"]`).fill(String(position.y));
  await panel.locator(`[data-table-edit-node-z="${endpoint}"]`).fill(String(position.z));
  await panel.locator(`[data-table-edit-node-mode="${endpoint}"]`).selectOption(movementMode);
  await panel.locator(`[data-table-node-position-stage="${endpoint}"]`).click();
}

export async function moveNodeViaCanvas(page, host, nodeId, fields) {
  const treePanel = host.locator('details[data-panel-kind="topology-edit-object-tree"]');
  if (!(await treePanel.evaluate((node) => node.open))) await treePanel.locator(':scope > summary').click();
  const filter = treePanel.locator('[data-role="topology-edit-object-tree-filter"]');
  await filter.fill(nodeId);
  await treePanel.locator(`[data-canonical-id="${nodeId}"] [data-object-tree-select]`).click();
  await expect(host).toHaveAttribute('data-topology-edit-selection-primary-id', nodeId);
  await filter.fill('');

  const authoring = host.locator('details[data-panel-kind="authoring"]');
  if (!(await authoring.evaluate((node) => node.open))) await authoring.locator(':scope > summary').click();
  await page.locator('[data-action="activate-authoring-move"]').click();
  for (const [key, value] of Object.entries(fields)) {
    await page.locator(`[data-authoring-field="${key}"]`).fill(String(value));
  }
  const priorHash = (await authorityEvidence(page)).canonicalHash;
  await page.locator('[data-action="preview-authoring-operation"]').click();
  await page.locator('[data-action="validate-authoring-operation"]').click();
  await expect(host).toHaveAttribute('data-topology-edit-authoring-phase', 'READY_TO_APPLY');
  await page.locator('[data-action="apply-authoring-operation"]').click();
  await expect.poll(() => authorityEvidence(page).then((row) => row.canonicalHash)).not.toBe(priorHash);
}

export async function authorityEvidence(page) {
  return page.evaluate(() => {
    const host = document.querySelector('[data-role="topology-edit-render-host"]');
    const controller = host?.__topologyEditAuthoringController;
    const runtime = controller?.tableAdapter?.runtime; const journal = controller?.session?.journal;
    return {
      canonicalHash: controller?.session?.currentTopology?.()?.canonicalTopologyHash ?? null,
      journalHash: journal?.journalHash ?? null,
      activeLedgerHash: journal?.activeLedgerHash ?? null,
      activeCommandIds: [...(journal?.activeCommandIds ?? [])],
      activeCommandCount: journal?.activeCommandIds?.length ?? 0,
      sessionVersion: journal?.sessionVersion ?? null,
      sourceHash: controller?.workspaceDataset?.sourceSnapshot?.sourceSemanticHash ?? null,
      sourceByteHash: controller?.workspaceDataset?.sourceSnapshot?.sourceByteHash ?? null,
      rendererCount: controller?.viewportBackend?.renderer?.domElement ? 1 : 0,
      ghostChildCount: controller?.viewportBackend?.groups?.ghostGroup?.children?.length ?? 0,
      batchHash: runtime?.batch?.batchHash ?? '',
      previewHash: runtime?.preview?.previewHash ?? '',
      validationStatus: runtime?.validation?.status ?? '',
      tableError: runtime?.error ?? '',
      tableMessage: runtime?.message ?? '',
      staleDisposition: runtime?.staleResult?.disposition ?? '',
      staleReasonCodes: runtime?.staleResult?.reasons?.map((row) => row.code) ?? [],
      batchBasisHash: runtime?.batch?.authority?.priorDraftHash ?? '',
      intentCount: runtime?.batch?.intentCount ?? 0,
    };
  });
}

export async function geometryEvidence(page, nodeIds, edgeIds = []) {
  return page.evaluate(({ nodeIds: nodes, edgeIds: edges }) => {
    const topology = document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController.session.currentTopology();
    const position = (id) => {
      const node = topology.nodes.find((item) => item.id === id);
      if (!node) throw new Error(`Missing node ${id}.`);
      return { ...node.position };
    };
    const positions = Object.fromEntries(nodes.map((id) => [id, position(id)]));
    const lengths = Object.fromEntries(edges.map((id) => {
      const edge = topology.edges.find((row) => row.id === id);
      const from = position(edge.fromNodeId); const to = position(edge.toNodeId);
      return [id, Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z)];
    }));
    return { positions, lengths };
  }, { nodeIds, edgeIds });
}

export function expectAuthorityNoop(actual, expected) {
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

async function open3dTable(page) {
  await page.getByRole('button', { name: '3D Edit', exact: true }).click();
  const host = page.locator('[data-role="topology-edit-render-host"]');
  await expect(host).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(
    document.querySelector('[data-role="topology-edit-render-host"]')
      ?.__topologyEditAuthoringController?.tableAdapter?.runtime?.projection
  ))).toBe(true);
  const openTable = page.locator('[data-action="open-engineering-table"]');
  await expect(openTable).toBeVisible();
  await openTable.click();
  await expect(page.locator('[data-role="topology-edit-table"]')).toBeVisible();
  await expect.poll(() => host.getAttribute('data-topology-edit-table-projection-hash')).toBeTruthy();
  return host;
}
