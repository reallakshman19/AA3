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
    datasetId: 'table-fitting-catalogue', datasetVersion: 1,
    sourceHash: 'sha256:table-fitting-source', topologyGraphHash: 'sha256:table-fitting-graph',
    nodes: [node('node:n1', 0), node('node:n2', 100), node('node:n3', 300)],
    edges: [
      {
        id: 'edge:f1', componentKey: 'flange:f1', fromNodeId: 'node:n1', toNodeId: 'node:n2',
        entityType: 'FLANGE', diameterMm: 100, outsideDiameterMm: 114,
        diameterAuthority: 'OUTSIDE_DIAMETER', pipingClass: 'A', pressureClass: '150',
        endConnectionFrom: 'BW', endConnectionTo: 'RF', flangeType: 'WN', flangeFacing: 'RF',
        flangeClass: '150', catalogueBinding: currentBinding('FLANGE', 'flange-current'),
      },
      {
        id: 'edge:r1', componentKey: 'reducer:r1', fromNodeId: 'node:n2', toNodeId: 'node:n3',
        entityType: 'REDUCER', diameterMm: 100, outsideDiameterMm: 114,
        secondaryNominalSizeMm: 80, secondaryOutsideDiameterMm: 89,
        diameterAuthority: 'OUTSIDE_DIAMETER', pipingClass: 'A', pressureClass: '150',
        endConnectionFrom: 'BW', endConnectionTo: 'BW', reducerType: 'CONCENTRIC',
        reducerOrientation: 'CENTERED', catalogueBinding: currentBinding('REDUCER', 'reducer-current'),
      },
    ],
    junctions: [], supports: [], boundaries: [], rigids: [], bends: [],
  });
}
function node(id, x) { return { id, position: { x, y: 0, z: 0 }, portKeys: [] }; }
function currentBinding(componentType, recordId) {
  return {
    catalogueHash: 'sha256:current-cat', sourceHash: 'sha256:current-source',
    recordId, recordHash: `sha256:${recordId}`, componentType,
  };
}
function sourceReference(path) { return { documentId: 'cat', revision: 'B', path }; }
function flangeBinding(overrides = {}) {
  return {
    catalogueHash: 'sha256:next-cat', sourceHash: 'sha256:next-source',
    recordId: 'flange-next', recordHash: 'sha256:flange-next', componentType: 'FLANGE',
    nominalSizeMm: 100, outsideDiameterMm: 114, pipingClass: 'A', pressureClass: '150',
    materialSpecification: 'A105', componentLengthMm: 100, componentMassKg: 8,
    endConnectionFrom: 'BW', endConnectionTo: 'RF', flangeType: 'SO', flangeFacing: 'RF',
    flangeClass: '150', flangeThicknessMm: 100, flangeOutsideDiameterMm: 220,
    sourceReference: sourceReference('/flanges/next'), ...overrides,
  };
}
function reducerBinding(overrides = {}) {
  return {
    catalogueHash: 'sha256:next-cat', sourceHash: 'sha256:next-source',
    recordId: 'reducer-next', recordHash: 'sha256:reducer-next', componentType: 'REDUCER',
    nominalSizeMm: 100, outsideDiameterMm: 114,
    secondaryNominalSizeMm: 80, secondaryOutsideDiameterMm: 89,
    pipingClass: 'A', pressureClass: '150', materialSpecification: 'A234-WPB',
    componentLengthMm: 200, componentMassKg: 4,
    endConnectionFrom: 'BW', endConnectionTo: 'BW',
    reducerType: 'ECCENTRIC', reducerOrientation: 'FLAT_TOP',
    sourceReference: sourceReference('/reducers/next'), ...overrides,
  };
}
function projection(topology) { return buildTopologyEditTableProjection({ canonicalTopology: topology }); }
function row(table, id) { return table.rows.find((candidate) => candidate.identity.canonicalId === id); }
function planned(session, topology, canonicalId, catalogueBinding) {
  const table = projection(topology);
  const intent = createTopologyEditTableIntent({
    projection: table,
    sessionSnapshot: session.snapshot(),
    canonicalId,
    intentKind: 'CATALOGUE_COMPONENT_REPLACEMENT',
    requestedValue: { catalogueBinding },
  });
  const batch = createTopologyEditTableBatch({ intents: [intent] });
  return { intent, batchPlan: planTopologyEditTableBatch({ batch, projection: table, canonicalTopology: topology }) };
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

test('FLANGE and REDUCER scalar cells route to one exact catalogue compound intent', () => {
  const table = projection(fixture());
  for (const [canonicalId, keys] of [
    ['edge:f1', ['flangeType', 'flangeFacing', 'rating']],
    ['edge:r1', ['reducerType', 'reducerOrientation']],
  ]) for (const key of keys) {
    const capability = deriveTopologyEditTableCellCapability({
      row: row(table, canonicalId), columnKey: key, projection: table,
    });
    assert.equal(capability.status, 'NEEDS_INPUT');
    assert.equal(capability.details.intentKind, 'CATALOGUE_COMPONENT_REPLACEMENT');
    assert.equal(capability.reasonCode, 'EXACT_CATALOGUE_RECORD_REQUIRED');
  }
});

test('fitting catalogue plan is one governed replacement with no MOVE_NODE commands', () => {
  const topology = fixture();
  const session = new TopologyEditCertifiedSession(topology);
  for (const [id, binding] of [['edge:f1', flangeBinding()], ['edge:r1', reducerBinding()]]) {
    const { batchPlan } = planned(session, topology, id, binding);
    assert.deepEqual(batchPlan.operationPlan.commandIntents.map((command) => command.commandType), [
      'REPLACE_INLINE_COMPONENT',
    ]);
    assert.equal(batchPlan.operationPlan.parameters.compositeCertification.mode, 'FINAL_STATE');
    assert.ok(batchPlan.dependencyRevisions[id]);
  }
});

test('FLANGE catalogue Preview → Validate → Apply is atomic and exact undo/redo restores record custody', async () => {
  const topology = fixture();
  const session = new TopologyEditCertifiedSession(topology);
  const { batchPlan } = planned(session, topology, 'edge:f1', flangeBinding());
  const prior = session.snapshot();

  const preview = await prepareTopologyEditTablePreview({ session, batchPlan });
  assert.equal(session.currentTopology().canonicalTopologyHash, prior.activeCanonicalTopologyHash);
  const previewEdge = preview.candidate.canonicalTopology.edges.find((edge) => edge.id === 'edge:f1');
  assert.equal(previewEdge.flangeType, 'SO');
  assert.equal(previewEdge.catalogueRecordHash, 'sha256:flange-next');
  assert.deepEqual(preview.candidate.topologyDelta.nodes.changedIds, []);

  const tableValidation = validateTopologyEditTablePreview({
    preview,
    workerReceipt: validationReceipt(topology, preview, batchPlan),
  });
  assert.equal(tableValidation.status, 'READY_TO_APPLY');

  const transaction = await applyTopologyEditTableTransaction({
    session, batchPlan, preview, tableValidation,
  });
  assert.equal(transaction.commandCount, 1);
  assert.equal(session.currentTopology().edges.find((edge) => edge.id === 'edge:f1').catalogueRecordHash, 'sha256:flange-next');

  undoTopologyEditTableTransaction(session, transaction);
  assert.equal(session.currentTopology().canonicalTopologyHash, prior.activeCanonicalTopologyHash);
  assert.equal(session.journal.activeLedgerHash, prior.activeLedgerHash);
  assert.equal(session.currentTopology().edges.find((edge) => edge.id === 'edge:f1').flangeType, 'WN');

  redoTopologyEditTableTransaction(session, transaction);
  assert.equal(session.currentTopology().canonicalTopologyHash, transaction.resultingCanonicalHash);
  assert.equal(session.currentTopology().edges.find((edge) => edge.id === 'edge:f1').flangeType, 'SO');
});

test('fitting Table intent rejects cross-type or geometry-changing catalogue records before staging', () => {
  const topology = fixture();
  const session = new TopologyEditCertifiedSession(topology);
  assert.throws(() => planned(session, topology, 'edge:f1', reducerBinding()), /type must remain FLANGE/);
  assert.throws(() => planned(session, topology, 'edge:f1', flangeBinding({ componentLengthMm: 110 })), /preserve the current geometric envelope/);
});
