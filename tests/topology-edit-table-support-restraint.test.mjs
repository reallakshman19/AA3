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
} from '../src/workspace/topology-edit/table/topology-edit-table-edit-capability.js';
import { createTopologyEditTableIntent } from '../src/workspace/topology-edit/table/topology-edit-table-intent.js';
import { buildTopologyEditTableProjection } from '../src/workspace/topology-edit/table/topology-edit-table-projection.js';
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
    datasetId: 'table-support', datasetVersion: 1,
    sourceHash: 'sha256:table-support-source', topologyGraphHash: 'sha256:table-support-graph',
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
      id: 'support:s1', nodeId: 'node:n1', hostEntityId: 'pipe:p1', stationMm: 0,
      restraints: [{ id: 'restraint:source:1', type: 'REST', direction: '+Z', gapMm: 1 }],
    }],
  });
}
function support(topology) {
  return topology.supports.find((row) => row.id === 'support:s1');
}
function planned(session, topology) {
  const projection = buildTopologyEditTableProjection({ canonicalTopology: topology });
  const intent = createTopologyEditTableIntent({
    projection,
    sessionSnapshot: session.snapshot(),
    canonicalId: 'support:s1',
    intentKind: 'SUPPORT_RESTRAINT',
    requestedValue: {
      family: 'GUIDE', direction: 'LOCAL_Y', gapMm: 5, travelMm: 20,
    },
  });
  const batch = createTopologyEditTableBatch({ intents: [intent] });
  return { projection, intent, batchPlan: planTopologyEditTableBatch({
    batch, projection, canonicalTopology: topology,
  }) };
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

test('SUPPORT restraint cells route to one explicit compound intent while placement stays read-only', () => {
  const topology = fixture();
  const projection = buildTopologyEditTableProjection({ canonicalTopology: topology });
  const row = projection.rows.find((candidate) => candidate.identity.canonicalId === 'support:s1');
  for (const key of ['supportType', 'direction', 'gapMm', 'travelMm']) {
    const capability = deriveTopologyEditTableCellCapability({ row, columnKey: key, projection });
    assert.equal(capability.status, 'NEEDS_INPUT');
    assert.equal(capability.details.intentKind, 'SUPPORT_RESTRAINT');
    assert.equal(capability.reasonCode, 'EXPLICIT_SUPPORT_RESTRAINT_REQUIRED');
  }
  for (const key of ['hostEntityId', 'stationMm']) {
    const capability = deriveTopologyEditTableCellCapability({ row, columnKey: key, projection });
    assert.equal(capability.status, 'BLOCKED');
    assert.equal(capability.reasonCode, 'READ_ONLY_PROPERTY');
  }
});

test('SUPPORT_RESTRAINT plan captures support, node, and host dependencies with one governed command', () => {
  const topology = fixture();
  const session = new TopologyEditCertifiedSession(topology);
  const { intent, batchPlan } = planned(session, topology);

  assert.equal(intent.requestedValue.supportId, 'support:s1');
  assert.equal(intent.requestedValue.authority, 'CERTIFIED_TABLE_OVERRIDE');
  assert.deepEqual(batchPlan.operationPlan.commandIntents, [{
    commandType: 'UPDATE_SUPPORT_RESTRAINT',
    payload: intent.requestedValue,
  }]);
  assert.ok(batchPlan.dependencyRevisions['support:s1']);
  assert.ok(batchPlan.dependencyRevisions['node:n1']);
  assert.ok(batchPlan.dependencyRevisions['edge:p1']);
});

test('SUPPORT_RESTRAINT Preview → Validate → Apply is atomic and journal undo/redo is exact', async () => {
  const topology = fixture();
  const session = new TopologyEditCertifiedSession(topology);
  const { batchPlan } = planned(session, topology);
  const prior = session.snapshot();

  const preview = await prepareTopologyEditTablePreview({ session, batchPlan });
  assert.equal(session.currentTopology().canonicalTopologyHash, prior.activeCanonicalTopologyHash);
  assert.equal(support(preview.candidate.canonicalTopology).restraint.type, 'GUIDE');
  assert.equal(support(preview.candidate.canonicalTopology).restraints[0].id, 'restraint:source:1');

  const tableValidation = validateTopologyEditTablePreview({
    preview,
    workerReceipt: validationReceipt(topology, preview, batchPlan),
  });
  assert.equal(tableValidation.status, 'READY_TO_APPLY');

  const transaction = await applyTopologyEditTableTransaction({
    session, batchPlan, preview, tableValidation,
  });
  assert.equal(transaction.commandCount, 1);
  assert.equal(support(session.currentTopology()).restraint.type, 'GUIDE');
  assert.equal(support(session.currentTopology()).restraint.direction, 'LOCAL_Y');
  assert.equal(support(session.currentTopology()).restraints[0].id, 'restraint:source:1');

  const appliedProjection = buildTopologyEditTableProjection({
    canonicalTopology: session.currentTopology(),
  });
  const appliedRow = appliedProjection.rows.find((row) => row.identity.canonicalId === 'support:s1');
  assert.equal(appliedRow.fields.supportType, 'GUIDE');
  assert.equal(appliedRow.fields.direction, 'LOCAL_Y');
  assert.equal(appliedRow.fields.gapMm, 5);

  undoTopologyEditTableTransaction(session, transaction);
  assert.equal(session.currentTopology().canonicalTopologyHash, prior.activeCanonicalTopologyHash);
  assert.equal(session.journal.activeLedgerHash, prior.activeLedgerHash);
  assert.equal(support(session.currentTopology()).restraint, undefined);

  redoTopologyEditTableTransaction(session, transaction);
  assert.equal(session.currentTopology().canonicalTopologyHash, transaction.resultingCanonicalHash);
  assert.equal(support(session.currentTopology()).restraint.type, 'GUIDE');
});
