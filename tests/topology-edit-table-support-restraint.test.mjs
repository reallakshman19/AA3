import assert from 'node:assert/strict';
import test from 'node:test';
import { checkCanonicalTopology } from '../src/workspace/topology-edit/topology-edit-checker.js';
import { finalizeCanonicalTopology } from '../src/workspace/topology-edit/topology-edit-canonical-state.js';
import { TopologyEditCertifiedSession } from '../src/workspace/topology-edit/topology-edit-certified-session.js';
import { runTopologyEditIncrementalValidation } from '../src/workspace/topology-edit/professional/topology-edit-incremental-validation.js';
import { createTopologyEditTableBatch } from '../src/workspace/topology-edit/table/topology-edit-table-batch.js';
import { planTopologyEditTableBatch } from '../src/workspace/topology-edit/table/topology-edit-table-batch-planner.js';
import { deriveTopologyEditTableCellCapability } from '../src/workspace/topology-edit/table/topology-edit-table-edit-capability.js';
import { createTopologyEditTableIntent } from '../src/workspace/topology-edit/table/topology-edit-table-intent.js';
import { buildTopologyEditTableProjection } from '../src/workspace/topology-edit/table/topology-edit-table-projection.js';
import { applyTopologyEditTableTransaction, prepareTopologyEditTablePreview, redoTopologyEditTableTransaction, undoTopologyEditTableTransaction, validateTopologyEditTablePreview } from '../src/workspace/topology-edit/table/topology-edit-table-transaction.js';
import { renderTopologyEditTablePreviewGhost } from '../src/workspace/viewport-productivity/topology-edit-table-workflow.js';

function fixture() {
  return finalizeCanonicalTopology({
    schema: 'topology-edit-canonical-topology/v1', datasetId: 'table-support', datasetVersion: 1,
    sourceHash: 'sha256:table-support-source', topologyGraphHash: 'sha256:table-support-graph',
    nodes: [
      { id: 'node:n1', position: { x: 0, y: 0, z: 0 }, portKeys: [] },
      { id: 'node:n2', position: { x: 1000, y: 0, z: 0 }, portKeys: [] },
    ],
    edges: [{ id: 'edge:p1', componentKey: 'pipe:p1', fromNodeId: 'node:n1', toNodeId: 'node:n2', entityType: 'PIPE', diameterMm: 100, outsideDiameterMm: 114, diameterAuthority: 'OUTSIDE_DIAMETER' }],
    junctions: [], boundaries: [], rigids: [], bends: [],
    supports: [{ id: 'support:s1', nodeId: 'node:n1', hostEntityId: 'pipe:p1', stationMm: 0, restraints: [{ id: 'restraint:source:1', type: 'REST', direction: '+Z', gapMm: 1 }] }],
  });
}
function support(topology) { return topology.supports.find((row) => row.id === 'support:s1'); }
function planned(session, topology) {
  const projection = buildTopologyEditTableProjection({ canonicalTopology: topology });
  const intent = createTopologyEditTableIntent({ projection, sessionSnapshot: session.snapshot(), canonicalId: 'support:s1', intentKind: 'SUPPORT_RESTRAINT', requestedValue: { family: 'GUIDE', direction: 'LOCAL_Y', gapMm: 5, travelMm: 20 } });
  const batch = createTopologyEditTableBatch({ intents: [intent] });
  return { projection, intent, batchPlan: planTopologyEditTableBatch({ batch, projection, canonicalTopology: topology }) };
}
function validationReceipt(baseTopology, preview, batchPlan) {
  let tick = 0;
  return runTopologyEditIncrementalValidation({ canonicalTopology: preview.candidate.canonicalTopology, operationPlan: batchPlan.operationPlan, previousDiagnostics: checkCanonicalTopology(baseTopology), now: () => { tick += 1; return tick; }, performancePolicy: { fastPathBudgetMs: 100, warningBudgetMs: 200, hysteresisMs: 10 } });
}

test('SUPPORT restraint cells remain certified while station relocation is certified and host rebinding stays read-only', () => {
  const topology = fixture();
  const projection = buildTopologyEditTableProjection({ canonicalTopology: topology });
  const row = projection.rows.find((candidate) => candidate.identity.canonicalId === 'support:s1');
  for (const key of ['supportType', 'direction', 'gapMm', 'travelMm']) {
    const capability = deriveTopologyEditTableCellCapability({ row, columnKey: key, projection });
    assert.equal(capability.status, 'NEEDS_INPUT');
    assert.equal(capability.details.intentKind, 'SUPPORT_RESTRAINT');
    assert.equal(capability.reasonCode, 'EXPLICIT_SUPPORT_RESTRAINT_REQUIRED');
  }
  const station = deriveTopologyEditTableCellCapability({ row, columnKey: 'stationMm', projection });
  assert.equal(station.status, 'NEEDS_INPUT');
  assert.equal(station.reasonCode, 'EXPLICIT_SUPPORT_STATION_REQUIRED');
  assert.equal(station.details.intentKind, 'SUPPORT_PLACEMENT');
  const host = deriveTopologyEditTableCellCapability({ row, columnKey: 'hostEntityId', projection });
  assert.equal(host.status, 'BLOCKED');
  assert.equal(host.reasonCode, 'READ_ONLY_PROPERTY');
});

test('SUPPORT_RESTRAINT plan captures support, node, and host dependencies with one governed command', () => {
  const topology = fixture(); const session = new TopologyEditCertifiedSession(topology); const { intent, batchPlan } = planned(session, topology);
  assert.equal(intent.requestedValue.supportId, 'support:s1');
  assert.equal(intent.requestedValue.authority, 'CERTIFIED_TABLE_OVERRIDE');
  assert.deepEqual(batchPlan.operationPlan.commandIntents, [{ sequence: 0, commandType: 'UPDATE_SUPPORT_RESTRAINT', payload: intent.requestedValue }]);
  assert.ok(batchPlan.dependencyRevisions['support:s1']); assert.ok(batchPlan.dependencyRevisions['node:n1']); assert.ok(batchPlan.dependencyRevisions['edge:p1']);
});

test('SUPPORT_RESTRAINT Preview renders only the governed candidate support glyph without mutation', async () => {
  const topology = fixture(); const session = new TopologyEditCertifiedSession(topology); const { batchPlan } = planned(session, topology); const prior = session.snapshot();
  const preview = await prepareTopologyEditTablePreview({ session, batchPlan }); let ghost = null;
  renderTopologyEditTablePreviewGhost({ preview, controller: { deriveVisual: () => ({ projection: { elements: [], segments: [] } }), viewportBackend: { navigationConfiguration: { supportMarkerSize: 24 }, renderGhost: (value) => { ghost = value; } } } });
  assert.equal(session.currentTopology().canonicalTopologyHash, prior.activeCanonicalTopologyHash);
  assert.ok(ghost);
  assert.equal(ghost.elements.length, 0);
  assert.equal(ghost.segments.length, 0);
  const supportProjection = ghost.engineeringSupportProjection;
  assert.ok(supportProjection);
  assert.equal(supportProjection.elements.length, 1);
  assert.equal(supportProjection.segments.length, 1);
  assert.equal(supportProjection.glyphOverlays.length, 1);
  assert.equal(supportProjection.elements[0].pickTarget.objectKind, 'support');
  assert.equal(supportProjection.elements[0].pickTarget.objectId, 'support:s1');
  assert.equal(supportProjection.segments[0].type, 'RESTRAINT_DIRECTION');
  assert.equal(supportProjection.segments[0].pickTarget.objectKind, 'restraint');
  assert.equal(supportProjection.segments[0].pickTarget.supportId, 'support:s1');
  assert.equal(
    supportProjection.segments[0].pickTarget.objectId,
    supportProjection.segments[0].pickTarget.restraintId,
  );
  assert.equal(supportProjection.glyphOverlays[0].supportId, 'support:s1');
  assert.equal(supportProjection.glyphOverlays[0].restraint.type, 'GUIDE');
});

test('SUPPORT_RESTRAINT Preview → Validate → Apply is atomic and journal undo/redo is exact', async () => {
  const topology = fixture(); const session = new TopologyEditCertifiedSession(topology); const { batchPlan } = planned(session, topology); const prior = session.snapshot();
  const priorSupport = structuredClone(support(session.currentTopology()));
  const preview = await prepareTopologyEditTablePreview({ session, batchPlan });
  assert.equal(session.currentTopology().canonicalTopologyHash, prior.activeCanonicalTopologyHash);
  assert.equal(support(preview.candidate.canonicalTopology).restraint.type, 'GUIDE');
  assert.equal(support(preview.candidate.canonicalTopology).restraints[0].id, 'restraint:source:1');
  const tableValidation = validateTopologyEditTablePreview({ preview, workerReceipt: validationReceipt(topology, preview, batchPlan) });
  assert.equal(tableValidation.status, 'READY_TO_APPLY');
  const transaction = await applyTopologyEditTableTransaction({ session, batchPlan, preview, tableValidation });
  assert.equal(transaction.commandCount, 1); assert.equal(support(session.currentTopology()).restraint.type, 'GUIDE');
  assert.equal(support(session.currentTopology()).restraint.direction, 'LOCAL_Y'); assert.equal(support(session.currentTopology()).restraints[0].id, 'restraint:source:1');
  const appliedProjection = buildTopologyEditTableProjection({ canonicalTopology: session.currentTopology() });
  const appliedRow = appliedProjection.rows.find((row) => row.identity.canonicalId === 'support:s1');
  assert.equal(appliedRow.fields.supportType, 'GUIDE'); assert.equal(appliedRow.fields.direction, 'LOCAL_Y'); assert.equal(appliedRow.fields.gapMm, 5);
  undoTopologyEditTableTransaction(session, transaction);
  assert.equal(session.currentTopology().canonicalTopologyHash, prior.activeCanonicalTopologyHash); assert.equal(session.journal.activeLedgerHash, prior.activeLedgerHash);
  assert.deepEqual(structuredClone(support(session.currentTopology())), priorSupport);
  redoTopologyEditTableTransaction(session, transaction);
  assert.equal(session.currentTopology().canonicalTopologyHash, transaction.resultingCanonicalHash); assert.equal(support(session.currentTopology()).restraint.type, 'GUIDE');
});