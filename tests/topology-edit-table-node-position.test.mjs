import test from 'node:test';
import assert from 'node:assert/strict';
import { checkCanonicalTopology } from '../src/workspace/topology-edit/topology-edit-checker.js';
import { finalizeCanonicalTopology } from '../src/workspace/topology-edit/topology-edit-canonical-state.js';
import { TopologyEditCertifiedSession } from '../src/workspace/topology-edit/topology-edit-certified-session.js';
import {
  runTopologyEditIncrementalValidation,
} from '../src/workspace/topology-edit/professional/topology-edit-incremental-validation.js';
import { createTopologyEditTableBatch } from '../src/workspace/topology-edit/table/topology-edit-table-batch.js';
import { planTopologyEditTableBatch } from '../src/workspace/topology-edit/table/topology-edit-table-batch-planner.js';
import {
  deriveTopologyEditTableNodePositionCapability,
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

function topologyFixture(extra = {}) {
  return finalizeCanonicalTopology({
    schema: 'topology-edit-canonical-topology/v1',
    datasetId: 'dataset-node-position', datasetVersion: 1, sourceHash: 'sha256:node-position-source',
    topologyGraphHash: 'sha256:node-position-graph',
    nodes: [
      node('node:n1', 0, 0, 0),
      node('node:n2', 1000, 0, 0),
      node('node:n3', 2000, 0, 0),
    ],
    edges: [
      pipe('edge:p1', 'node:n1', 'node:n2'),
      pipe('edge:p2', 'node:n2', 'node:n3'),
    ],
    junctions: [], supports: [], boundaries: [], rigids: [], bends: [],
    ...extra,
  });
}
function node(id, x, y, z) { return { id, position: { x, y, z }, portKeys: [] }; }
function pipe(id, fromNodeId, toNodeId) {
  return {
    id, componentKey: id.replace('edge:', 'pipe:'), fromNodeId, toNodeId,
    entityType: 'PIPE', diameterMm: 100, outsideDiameterMm: 114,
    diameterAuthority: 'OUTSIDE_DIAMETER',
  };
}
function projection(topology) {
  return buildTopologyEditTableProjection({ canonicalTopology: topology });
}
function rowFor(tableProjection, id) {
  return tableProjection.rows.find((row) => row.identity.canonicalId === id);
}
function point(topology, id) {
  return topology.nodes.find((row) => row.id === id).position;
}
function intent(session, topology, {
  edgeId = 'edge:p1', endpoint = 'FROM', nodeId = 'node:n1', position,
  movementMode = 'NODE_ONLY',
} = {}) {
  const tableProjection = projection(topology);
  return createTopologyEditTableIntent({
    projection: tableProjection,
    sessionSnapshot: session.snapshot(),
    canonicalId: edgeId,
    intentKind: 'NODE_POSITION',
    requestedValue: {
      endpoint,
      nodeId,
      expectedPosition: point(topology, nodeId),
      position,
    },
    geometryPolicy: { movementMode },
  });
}
function planned(session, topology, input) {
  const tableProjection = projection(topology);
  const edit = intent(session, topology, input);
  const batch = createTopologyEditTableBatch({ intents: [edit] });
  return planTopologyEditTableBatch({ batch, projection: tableProjection, canonicalTopology: topology });
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

test('NODE_POSITION capability is exact and NODE_ONLY compiles to one governed MOVE_NODE', () => {
  const topology = topologyFixture();
  const session = new TopologyEditCertifiedSession(topology);
  const tableProjection = projection(topology);
  const row = rowFor(tableProjection, 'edge:p1');
  const capability = deriveTopologyEditTableNodePositionCapability({
    row, endpoint: 'FROM', projection: tableProjection, canonicalTopology: topology,
  });

  assert.equal(capability.status, 'AVAILABLE');
  assert.equal(capability.details.nodeId, 'node:n1');
  assert.deepEqual(capability.details.movementModes, ['NODE_ONLY', 'CONNECTED_RUN']);

  const plan = planned(session, topology, {
    position: { x: 100, y: 50, z: 25 },
  });
  assert.deepEqual(plan.operationPlan.commandIntents, [{
    commandType: 'MOVE_NODE',
    payload: { nodeId: 'node:n1', position: { x: 100, y: 50, z: 25 } },
  }]);
  assert.ok(plan.dependencyRevisions['node:n1']);
  assert.ok(plan.dependencyRevisions['edge:p1']);
});

test('CONNECTED_RUN translates the complete plain run on the selected side of the edge', () => {
  const topology = topologyFixture();
  const session = new TopologyEditCertifiedSession(topology);
  const plan = planned(session, topology, {
    endpoint: 'TO', nodeId: 'node:n2',
    position: { x: 1250, y: 100, z: 20 },
    movementMode: 'CONNECTED_RUN',
  });

  assert.deepEqual(plan.operationPlan.commandIntents.map((row) => row.payload.nodeId), [
    'node:n2', 'node:n3',
  ]);
  assert.deepEqual(plan.operationPlan.commandIntents.map((row) => row.payload.position), [
    { x: 1250, y: 100, z: 20 },
    { x: 2250, y: 100, z: 20 },
  ]);
});

test('NODE_POSITION fails closed for stale coordinates, certified dependants, and overlapping move closures', () => {
  const topology = topologyFixture();
  const session = new TopologyEditCertifiedSession(topology);
  const tableProjection = projection(topology);
  const stale = createTopologyEditTableIntent({
    projection: tableProjection,
    sessionSnapshot: session.snapshot(),
    canonicalId: 'edge:p1',
    intentKind: 'NODE_POSITION',
    requestedValue: {
      endpoint: 'FROM', nodeId: 'node:n1',
      expectedPosition: { x: -1, y: 0, z: 0 },
      position: { x: 100, y: 0, z: 0 },
    },
    geometryPolicy: { movementMode: 'NODE_ONLY' },
  });
  assert.throws(() => planTopologyEditTableBatch({
    batch: createTopologyEditTableBatch({ intents: [stale] }),
    projection: tableProjection,
    canonicalTopology: topology,
  }), /position changed before NODE_POSITION planning/);

  const withBoundary = topologyFixture({ boundaries: [{ id: 'boundary:b1', nodeId: 'node:n1' }] });
  const boundaryProjection = projection(withBoundary);
  const blocked = deriveTopologyEditTableNodePositionCapability({
    row: rowFor(boundaryProjection, 'edge:p1'),
    endpoint: 'FROM',
    projection: boundaryProjection,
    canonicalTopology: withBoundary,
  });
  assert.equal(blocked.status, 'UNREPRESENTABLE');
  assert.equal(blocked.reasonCode, 'NODE_DEPENDANT_POLICY_REQUIRED');

  const first = intent(session, topology, {
    edgeId: 'edge:p1', endpoint: 'TO', nodeId: 'node:n2',
    position: { x: 1200, y: 0, z: 0 }, movementMode: 'CONNECTED_RUN',
  });
  const second = intent(session, topology, {
    edgeId: 'edge:p2', endpoint: 'FROM', nodeId: 'node:n2',
    position: { x: 1100, y: 0, z: 0 }, movementMode: 'NODE_ONLY',
  });
  assert.throws(() => planTopologyEditTableBatch({
    batch: createTopologyEditTableBatch({ intents: [first, second] }),
    projection: tableProjection,
    canonicalTopology: topology,
  }), /overlapping table intents/);
});

test('NODE_POSITION Preview → Validate → Apply remains atomic and journal undo/redo is exact', async () => {
  const topology = topologyFixture();
  const session = new TopologyEditCertifiedSession(topology);
  const batchPlan = planned(session, topology, {
    position: { x: 100, y: 100, z: 0 },
  });
  const prior = session.snapshot();

  const preview = await prepareTopologyEditTablePreview({ session, batchPlan });
  assert.equal(session.currentTopology().canonicalTopologyHash, prior.activeCanonicalTopologyHash);
  assert.deepEqual(point(preview.candidate.canonicalTopology, 'node:n1'), { x: 100, y: 100, z: 0 });

  const tableValidation = validateTopologyEditTablePreview({
    preview,
    workerReceipt: validationReceipt(topology, preview, batchPlan),
  });
  assert.equal(tableValidation.status, 'READY_TO_APPLY');

  const transaction = await applyTopologyEditTableTransaction({
    session, batchPlan, preview, tableValidation,
  });
  assert.deepEqual(point(session.currentTopology(), 'node:n1'), { x: 100, y: 100, z: 0 });
  assert.equal(transaction.commandCount, 1);

  undoTopologyEditTableTransaction(session, transaction);
  assert.equal(session.currentTopology().canonicalTopologyHash, prior.activeCanonicalTopologyHash);
  assert.equal(session.journal.activeLedgerHash, prior.activeLedgerHash);
  assert.deepEqual(point(session.currentTopology(), 'node:n1'), { x: 0, y: 0, z: 0 });

  redoTopologyEditTableTransaction(session, transaction);
  assert.equal(session.currentTopology().canonicalTopologyHash, transaction.resultingCanonicalHash);
  assert.deepEqual(point(session.currentTopology(), 'node:n1'), { x: 100, y: 100, z: 0 });
});
