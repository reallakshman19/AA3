import assert from 'node:assert/strict';
import test from 'node:test';
import { checkCanonicalTopology } from '../src/workspace/topology-edit/topology-edit-checker.js';
import { finalizeCanonicalTopology } from '../src/workspace/topology-edit/topology-edit-canonical-state.js';
import { TopologyEditCertifiedSession } from '../src/workspace/topology-edit/topology-edit-certified-session.js';
import {
  runTopologyEditIncrementalValidation,
} from '../src/workspace/topology-edit/professional/topology-edit-incremental-validation.js';
import { createTopologyEditTableBatch } from '../src/workspace/topology-edit/table/topology-edit-table-batch.js';
import { planTopologyEditTableBatch } from '../src/workspace/topology-edit/table/topology-edit-table-batch-planner.js';
import {
  deriveTopologyEditTableCellCapability,
  deriveTopologyEditTableNodePositionCapability,
  deriveTopologyEditTableSupportPlacementCapability,
} from '../src/workspace/topology-edit/table/topology-edit-table-edit-capability.js';
import { createTopologyEditTableIntent } from '../src/workspace/topology-edit/table/topology-edit-table-intent.js';
import { buildTopologyEditTableProjection } from '../src/workspace/topology-edit/table/topology-edit-table-projection.js';
import { rebaseTopologyEditTableBatchPlan } from '../src/workspace/topology-edit/table/topology-edit-table-rebase.js';
import {
  applyTopologyEditTableTransaction,
  prepareTopologyEditTablePreview,
  redoTopologyEditTableTransaction,
  undoTopologyEditTableTransaction,
  validateTopologyEditTablePreview,
} from '../src/workspace/topology-edit/table/topology-edit-table-transaction.js';

function fixture() {
  return finalizeCanonicalTopology({
    schema: 'topology-edit-canonical-topology/v1',
    datasetId: 'table-support-placement', datasetVersion: 1,
    sourceHash: 'sha256:table-support-placement-source',
    topologyGraphHash: 'sha256:table-support-placement-graph',
    nodes: [
      { id: 'node:n1', position: { x: 0, y: 0, z: 0 }, portKeys: [] },
      { id: 'node:n2', position: { x: 1000, y: 0, z: 0 }, portKeys: [] },
    ],
    edges: [{
      id: 'edge:p1', componentKey: 'pipe:p1', fromNodeId: 'node:n1', toNodeId: 'node:n2',
      entityType: 'PIPE', diameterMm: 100, outsideDiameterMm: 114,
      diameterAuthority: 'OUTSIDE_DIAMETER',
    }],
    junctions: [], boundaries: [], rigids: [], bends: [],
    supports: [{
      id: 'support:s1', entityId: 'support-source:s1', nodeId: 'node:n1',
      hostEntityId: 'pipe:p1', stationMm: 250, resolved: true,
      origin: { x: 250, y: 0, z: 0 }, originAuthority: 'ATTACHMENT_PROJECTED_POINT',
      attachmentId: 'attachment:s1', attachmentSegmentParameter: 0.25,
      restraints: [{ id: 'restraint:source:1', type: 'REST', direction: '+Z', gapMm: 1 }],
    }],
  });
}
function support(topology) { return topology.supports.find((row) => row.id === 'support:s1'); }
function row(projection, id) { return projection.rows.find((item) => item.identity.canonicalId === id); }
function planned(session, topology, stationMm = 600) {
  const projection = buildTopologyEditTableProjection({ canonicalTopology: topology });
  const intent = createTopologyEditTableIntent({
    projection,
    sessionSnapshot: session.snapshot(),
    canonicalId: 'support:s1',
    intentKind: 'SUPPORT_PLACEMENT',
    requestedValue: { hostEdgeId: 'edge:p1', stationMm },
  });
  const batch = createTopologyEditTableBatch({ intents: [intent] });
  const batchPlan = planTopologyEditTableBatch({ batch, projection, canonicalTopology: topology });
  return { projection, intent, batch, batchPlan };
}
function validationReceipt(baseTopology, preview, batchPlan) {
  let tick = 0;
  return runTopologyEditIncrementalValidation({
    canonicalTopology: preview.candidate.canonicalTopology,
    operationPlan: batchPlan.operationPlan,
    previousDiagnostics: checkCanonicalTopology(baseTopology),
    now: () => { tick += 1; return tick; },
    performancePolicy: { fastPathBudgetMs: 100, warningBudgetMs: 200, hysteresisMs: 10 },
  });
}

test('SUPPORT station cell exposes exact same-host placement evidence', () => {
  const topology = fixture();
  const projection = buildTopologyEditTableProjection({ canonicalTopology: topology });
  const supportRow = row(projection, 'support:s1');
  const cell = deriveTopologyEditTableCellCapability({
    row: supportRow, columnKey: 'stationMm', projection,
  });
  assert.equal(cell.status, 'NEEDS_INPUT');
  assert.equal(cell.details.intentKind, 'SUPPORT_PLACEMENT');

  const capability = deriveTopologyEditTableSupportPlacementCapability({
    row: supportRow, projection, canonicalTopology: topology,
  });
  assert.equal(capability.status, 'NEEDS_INPUT');
  assert.equal(capability.details.hostEdgeId, 'edge:p1');
  assert.equal(capability.details.hostLengthMm, 1000);
  assert.equal(capability.details.currentStationMm, 250);
  assert.equal(capability.details.stationAuthority, 'DECLARED_SUPPORT_STATION');
  assert.equal(capability.details.currentOriginX, 250);
  assert.equal(capability.details.currentOriginY, 0);
  assert.equal(capability.details.currentOriginZ, 0);
});

test('SUPPORT_PLACEMENT plan captures support, host edge, and both host endpoints', () => {
  const topology = fixture();
  const session = new TopologyEditCertifiedSession(topology);
  const { intent, batchPlan } = planned(session, topology);

  assert.deepEqual(batchPlan.operationPlan.commandIntents, [{
    sequence: 0,
    commandType: 'UPDATE_SUPPORT_PLACEMENT', payload: intent.requestedValue,
  }]);
  for (const id of ['support:s1', 'edge:p1', 'node:n1', 'node:n2']) {
    assert.ok(batchPlan.dependencyRevisions[id], `missing dependency ${id}`);
  }
});

test('SUPPORT_PLACEMENT Preview → Validate → Apply is atomic and Undo/Redo is exact', async () => {
  const topology = fixture();
  const session = new TopologyEditCertifiedSession(topology);
  const { batchPlan } = planned(session, topology);
  const prior = session.snapshot();

  const preview = await prepareTopologyEditTablePreview({ session, batchPlan });
  assert.equal(session.currentTopology().canonicalTopologyHash, prior.activeCanonicalTopologyHash);
  assert.equal(support(preview.candidate.canonicalTopology).placementOverride.stationMm, 600);
  assert.deepEqual(support(preview.candidate.canonicalTopology).origin, { x: 250, y: 0, z: 0 });

  const tableValidation = validateTopologyEditTablePreview({
    preview, workerReceipt: validationReceipt(topology, preview, batchPlan),
  });
  assert.equal(tableValidation.status, 'READY_TO_APPLY');
  assert.equal(session.currentTopology().canonicalTopologyHash, prior.activeCanonicalTopologyHash);

  const transaction = await applyTopologyEditTableTransaction({
    session, batchPlan, preview, tableValidation,
  });
  assert.equal(transaction.commandCount, 1);
  assert.equal(support(session.currentTopology()).placementOverride.stationMm, 600);
  assert.deepEqual(support(session.currentTopology()).placementOverride.origin, { x: 600, y: 0, z: 0 });
  assert.deepEqual(support(session.currentTopology()).origin, { x: 250, y: 0, z: 0 });

  const appliedProjection = buildTopologyEditTableProjection({
    canonicalTopology: session.currentTopology(),
  });
  const appliedRow = row(appliedProjection, 'support:s1');
  assert.equal(appliedRow.fields.stationMm, 600);
  assert.equal(appliedRow.fieldAuthority.stationMm, 'CERTIFIED_TABLE_OVERRIDE');

  const pipeRow = row(appliedProjection, 'edge:p1');
  const blocked = deriveTopologyEditTableNodePositionCapability({
    row: pipeRow, endpoint: 'FROM', projection: appliedProjection,
    canonicalTopology: session.currentTopology(),
  });
  assert.equal(blocked.status, 'UNREPRESENTABLE');
  assert.equal(blocked.reasonCode, 'SUPPORT_GEOMETRY_POLICY_REQUIRED');

  undoTopologyEditTableTransaction(session, transaction);
  assert.equal(session.currentTopology().canonicalTopologyHash, prior.activeCanonicalTopologyHash);
  assert.equal(session.journal.activeLedgerHash, prior.activeLedgerHash);
  assert.equal(support(session.currentTopology()).placementOverride, undefined);

  redoTopologyEditTableTransaction(session, transaction);
  assert.equal(session.currentTopology().canonicalTopologyHash, transaction.resultingCanonicalHash);
  assert.equal(support(session.currentTopology()).placementOverride.stationMm, 600);
});

test('SUPPORT_PLACEMENT rebase fails closed when exact host geometry changes', () => {
  const topology = fixture();
  const session = new TopologyEditCertifiedSession(topology);
  const { batch, batchPlan } = planned(session, topology);
  const changed = finalizeCanonicalTopology({
    ...JSON.parse(JSON.stringify(topology)),
    edges: topology.edges.map((edge) => edge.id === 'edge:p1'
      ? { ...edge, outsideDiameterMm: 120 }
      : edge),
  });
  const changedProjection = buildTopologyEditTableProjection({ canonicalTopology: changed });
  const currentSession = new TopologyEditCertifiedSession(changed);
  const result = rebaseTopologyEditTableBatchPlan({
    batch,
    plan: batchPlan,
    projection: changedProjection,
    canonicalTopology: changed,
    sessionSnapshot: currentSession.snapshot(),
  });
  assert.equal(result.disposition, 'STALE_CONFLICT');
  assert.ok(result.reasons.some((reason) => (
    reason.code === 'DEPENDENCY_REVISION_CHANGED' && reason.canonicalIds.includes('edge:p1')
  )));
});
