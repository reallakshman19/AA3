import test from 'node:test';
import assert from 'node:assert/strict';
import { finalizeCanonicalTopology } from '../src/workspace/topology-edit/topology-edit-canonical-state.js';
import { TopologyEditCertifiedSession } from '../src/workspace/topology-edit/topology-edit-certified-session.js';
import {
  prepareTopologyEditAuthoringCandidate,
} from '../src/workspace/topology-edit/authoring/topology-edit-authoring-composite-operation.js';
import {
  createPipeSegmentCatalogueBinding,
} from '../src/workspace/topology-edit/topology-edit-pipe-segment-contract.js';
import {
  applyTopologyEditPipeSpecificationRebind,
  assertTopologyEditPipeSpecificationRebindTarget,
  REBIND_PIPE_SPECIFICATION,
} from '../src/workspace/topology-edit/topology-edit-pipe-specification-rebind.js';
import {
  createTopologyEditSpecificationCatalogue,
} from '../src/workspace/topology-edit/professional/topology-edit-spec-catalog.js';
import {
  buildCanonicalTopologyFromWorkspaceDataset,
  applyCanonicalTopologyToWorkspaceEntities,
} from '../src/workspace/topology-edit/topology-edit-source-adapter-dispatch.js';
import { createTopologyEditTableBatch } from '../src/workspace/topology-edit/table/topology-edit-table-batch.js';
import { planTopologyEditTableBatch } from '../src/workspace/topology-edit/table/topology-edit-table-batch-planner.js';
import { createTopologyEditTableIntent } from '../src/workspace/topology-edit/table/topology-edit-table-intent.js';
import {
  resolveTopologyEditTablePipeSpecificationSelection,
  topologyEditTablePipeSpecificationCandidates,
} from '../src/workspace/topology-edit/table/topology-edit-table-pipe-catalogue.js';
import { buildTopologyEditTableProjection } from '../src/workspace/topology-edit/table/topology-edit-table-projection.js';

const CATALOGUE = createTopologyEditSpecificationCatalogue({
  catalogueId: 'PIPE-SPEC-TEST', catalogueVersion: '1',
  authority: {
    sourceId: 'PIPE-SPEC', sourceVersion: '1', sourceHash: `sha256:${'7'.repeat(64)}`,
  },
  records: [
    pipeRecord('PIPE-100-A', 100, 114.3, 'SCH40', 6.02, 'A106-B', 'PCL-100'),
    pipeRecord('PIPE-100-B', 100, 114.3, 'SCH80', 8.56, 'A333-6', 'PCL-100'),
    pipeRecord('PIPE-80-A', 80, 88.9, 'SCH40', 5.49, 'A106-B', 'PCL-80'),
  ],
});

function pipeRecord(recordId, nominalSizeMm, outsideDiameterMm, schedule, wallThicknessMm,
  materialSpecification, pipingClass) {
  return {
    recordId, componentType: 'PIPE', nominalSizeMm, outsideDiameterMm,
    schedule, wallThicknessMm, materialSpecification, pipingClass,
    pressureClass: '150', endConnectionFrom: 'BW', endConnectionTo: 'BW',
    sourceReference: { documentId: 'PIPE-SPEC', revision: '1', path: `/pipe/${recordId}` },
  };
}
function node(id, x) { return { id, position: { x, y: 0, z: 0 }, portKeys: [] }; }
function edge(id, fromNodeId, toNodeId, nominalSizeMm = 100, componentKey = null) {
  return {
    id, componentKey: componentKey ?? id.replace('edge:', 'P-'), fromNodeId, toNodeId,
    entityType: 'PIPE', diameterMm: nominalSizeMm, nominalSizeMm,
    outsideDiameterMm: nominalSizeMm === 100 ? 114.3 : 88.9,
    diameterAuthority: 'OUTSIDE_DIAMETER', endConnectionFrom: 'BW', endConnectionTo: 'BW',
  };
}
function topology({ peer = true, junction = false } = {}) {
  return finalizeCanonicalTopology({
    schema: 'topology-edit-canonical-topology/v1', datasetId: 'dataset-pipe-spec',
    datasetVersion: 1, sourceHash: 'sha256:pipe-spec-source', topologyGraphHash: 'sha256:graph',
    nodes: [node('node:a', 0), node('node:b', 1000), node('node:c', 2000)],
    edges: [edge('edge:target', 'node:a', 'node:b'), ...(peer ? [edge('edge:peer', 'node:b', 'node:c')] : [])],
    junctions: junction ? [{ id: 'junction:j1', componentKey: 'TEE-1', entityType: 'TEE', nodeIds: ['node:a', 'node:b', 'node:c'] }] : [],
    supports: [], boundaries: [], rigids: [], bends: [],
  });
}
function projection(topologyInput) {
  return buildTopologyEditTableProjection({ canonicalTopology: topologyInput });
}
function row() {
  return {
    elementType: 'PIPE', identity: { canonicalKind: 'EDGE', canonicalId: 'edge:target' },
    fields: { dnInMm: 100, dnOutMm: 100, endConnectionFrom: 'BW', endConnectionTo: 'BW' },
    custody: { catalogue: null },
  };
}

test('exact PIPE rebind changes the catalogue tuple without changing identity or geometry', () => {
  const before = topology();
  const binding = createPipeSegmentCatalogueBinding({ catalogue: CATALOGUE, recordId: 'PIPE-100-B' });
  const target = assertTopologyEditPipeSpecificationRebindTarget(before, {
    edgeId: 'edge:target', catalogueBinding: binding,
  });
  assert.equal(target.edge.id, 'edge:target');
  const after = finalizeCanonicalTopology(applyTopologyEditPipeSpecificationRebind(before, {
    commandId: 'command:pipe-spec-1', commandType: REBIND_PIPE_SPECIFICATION,
    payload: { edgeId: 'edge:target', catalogueBinding: binding },
  }));
  const changed = after.edges.find((candidate) => candidate.id === 'edge:target');
  assert.equal(changed.fromNodeId, 'node:a');
  assert.equal(changed.toNodeId, 'node:b');
  assert.equal(changed.nominalSizeMm, 100);
  assert.equal(changed.schedule, 'SCH80');
  assert.equal(changed.wallThicknessMm, 8.56);
  assert.equal(changed.materialSpecification, 'A333-6');
  assert.equal(changed.pipingClass, 'PCL-100');
  assert.equal(changed.catalogueRecordId, 'PIPE-100-B');
  assert.equal(changed.catalogueRecordHash, binding.recordHash);
  assert.equal(changed.topologyOperation, REBIND_PIPE_SPECIFICATION);
  assert.deepEqual(after.nodes, before.nodes);
});

test('DN change fails closed at an incompatible connected peer and at a junction boundary', () => {
  const binding = createPipeSegmentCatalogueBinding({ catalogue: CATALOGUE, recordId: 'PIPE-80-A' });
  assert.throws(() => assertTopologyEditPipeSpecificationRebindTarget(topology(), {
    edgeId: 'edge:target', catalogueBinding: binding,
  }), /incompatible with edge:peer endpoint DN 100/);
  assert.throws(() => assertTopologyEditPipeSpecificationRebindTarget(topology({ peer: false, junction: true }), {
    edgeId: 'edge:target', catalogueBinding: binding,
  }), /junction .* DN change requires explicit junction\/reducer policy/);
});

test('candidate resolver exposes only command-certifiable exact PIPE records', () => {
  const connectedIds = topologyEditTablePipeSpecificationCandidates({
    catalogue: CATALOGUE, row: row(), canonicalTopology: topology(),
  }).map((record) => record.recordId);
  assert.deepEqual(connectedIds, ['PIPE-100-A', 'PIPE-100-B']);

  const open = topology({ peer: false });
  const openIds = topologyEditTablePipeSpecificationCandidates({
    catalogue: CATALOGUE, row: row(), canonicalTopology: open,
  }).map((record) => record.recordId);
  assert.deepEqual(openIds, ['PIPE-100-A', 'PIPE-100-B', 'PIPE-80-A']);

  const selection = resolveTopologyEditTablePipeSpecificationSelection({
    catalogue: CATALOGUE, row: row(), canonicalTopology: topology(), recordId: 'PIPE-100-B',
  });
  assert.equal(selection.record.recordId, 'PIPE-100-B');
  assert.equal(selection.catalogueBinding.schedule, 'SCH80');
  assert.equal(selection.catalogueBinding.bindingHash.startsWith('fnv1a64:'), true);
});

test('Table PIPE specification intent builds a non-mutating governed candidate through the certified command pipeline', async () => {
  const canonical = topology();
  const session = new TopologyEditCertifiedSession(canonical);
  const tableProjection = projection(canonical);
  const selection = resolveTopologyEditTablePipeSpecificationSelection({
    catalogue: CATALOGUE,
    row: tableProjection.rows.find((candidate) => candidate.identity.canonicalId === 'edge:target'),
    canonicalTopology: canonical,
    recordId: 'PIPE-100-B',
  });
  const intent = createTopologyEditTableIntent({
    projection: tableProjection,
    sessionSnapshot: session.snapshot(),
    canonicalId: 'edge:target',
    intentKind: 'PIPE_SPECIFICATION',
    requestedValue: { catalogueBinding: selection.catalogueBinding },
  });
  const batch = createTopologyEditTableBatch({ intents: [intent] });
  const plan = planTopologyEditTableBatch({
    batch, projection: tableProjection, canonicalTopology: canonical,
  });
  assert.deepEqual(plan.operationPlan.commandIntents.map((entry) => entry.commandType), [
    'REBIND_PIPE_SPECIFICATION',
  ]);
  assert.equal(plan.operationPlan.parameters.compositeCertification.mode, 'FINAL_STATE');
  const beforeHash = session.currentTopology().canonicalTopologyHash;
  const beforeJournal = session.journal.journalHash;
  const candidate = await prepareTopologyEditAuthoringCandidate({
    session, operationPlan: plan.operationPlan,
  });
  assert.equal(session.currentTopology().canonicalTopologyHash, beforeHash);
  assert.equal(session.journal.journalHash, beforeJournal);
  assert.notEqual(candidate.resultingCanonicalHash, beforeHash);
  assert.equal(candidate.commandCount, 1);
  const changed = candidate.canonicalTopology.edges.find((entry) => entry.id === 'edge:target');
  assert.equal(changed.schedule, 'SCH80');
  assert.equal(changed.materialSpecification, 'A333-6');
  assert.equal(changed.wallThicknessMm, 8.56);
  assert.deepEqual(candidate.canonicalTopology.nodes, canonical.nodes);
});

test('PIPE length and specification intents coexist on the same row in one deterministic candidate', async () => {
  const canonical = topology({ peer: false });
  const session = new TopologyEditCertifiedSession(canonical);
  const tableProjection = projection(canonical);
  const pipeRow = tableProjection.rows.find((candidate) => candidate.identity.canonicalId === 'edge:target');
  const selection = resolveTopologyEditTablePipeSpecificationSelection({
    catalogue: CATALOGUE, row: pipeRow, canonicalTopology: canonical, recordId: 'PIPE-100-B',
  });
  const specIntent = createTopologyEditTableIntent({
    projection: tableProjection, sessionSnapshot: session.snapshot(), canonicalId: 'edge:target',
    intentKind: 'PIPE_SPECIFICATION', requestedValue: { catalogueBinding: selection.catalogueBinding },
  });
  const lengthIntent = createTopologyEditTableIntent({
    projection: tableProjection, sessionSnapshot: session.snapshot(), canonicalId: 'edge:target',
    intentKind: 'PIPE_LENGTH', requestedValue: { lengthMm: 1250 },
    geometryPolicy: { anchor: 'FROM', propagation: 'DOWNSTREAM' },
  });
  const batch = createTopologyEditTableBatch({ intents: [specIntent, lengthIntent] });
  const plan = planTopologyEditTableBatch({ batch, projection: tableProjection, canonicalTopology: canonical });
  assert.deepEqual(plan.operationPlan.commandIntents.map((entry) => entry.commandType), [
    'REBIND_PIPE_SPECIFICATION', 'MOVE_NODE',
  ]);
  const candidate = await prepareTopologyEditAuthoringCandidate({ session, operationPlan: plan.operationPlan });
  const changed = candidate.canonicalTopology.edges.find((entry) => entry.id === 'edge:target');
  const from = candidate.canonicalTopology.nodes.find((entry) => entry.id === changed.fromNodeId).position;
  const to = candidate.canonicalTopology.nodes.find((entry) => entry.id === changed.toNodeId).position;
  assert.equal(Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z), 1250);
  assert.equal(changed.schedule, 'SCH80');
  assert.equal(candidate.commandCount, 2);
});

test('exact PIPE specification custody survives workspace writeback and canonical reopen', () => {
  const base = finalizeCanonicalTopology({
    schema: 'topology-edit-canonical-topology/v1', datasetId: 'dataset-roundtrip', datasetVersion: 1,
    sourceHash: 'sha256:roundtrip-source', topologyGraphHash: 'sha256:roundtrip-graph',
    nodes: [node('node:a', 0), node('node:b', 1000)],
    edges: [edge('edge:P-1', 'node:a', 'node:b', 100, 'P-1')],
    junctions: [], supports: [], boundaries: [], rigids: [], bends: [],
  });
  const binding = createPipeSegmentCatalogueBinding({ catalogue: CATALOGUE, recordId: 'PIPE-100-B' });
  const edited = finalizeCanonicalTopology(applyTopologyEditPipeSpecificationRebind(base, {
    commandId: 'command:pipe-spec-roundtrip', commandType: REBIND_PIPE_SPECIFICATION,
    payload: { edgeId: 'edge:P-1', catalogueBinding: binding },
  }));
  const dataset = {
    datasetId: 'dataset-roundtrip', version: 1,
    sourceSnapshot: { sourceSemanticHash: 'sha256:roundtrip-source' },
    entities: [{
      entityId: 'P-1', sourceEntityId: 'P-1', name: 'P-1', entityType: 'PIPE',
      category: 'pipe', selectionType: 'component', nominalDiameterMm: 100,
      outsideDiameterMm: 114.3,
      properties: {
        identity: { entityId: 'P-1', sourceEntityId: 'P-1', name: 'P-1', entityType: 'PIPE' },
        geometry: { start: { x: 0, y: 0, z: 0 }, end: { x: 1000, y: 0, z: 0 }, center: { x: 500, y: 0, z: 0 } },
        sourceAttributes: {}, attributes: { TYPE: 'PIPE' }, enrichedAttributes: {}, nativeParams: {}, diagnostics: [],
      },
    }],
  };
  const writtenEntities = applyCanonicalTopologyToWorkspaceEntities(dataset, base, edited, 'session:roundtrip');
  const written = writtenEntities.find((entity) => entity.entityId === 'P-1');
  assert.equal(written.properties.nativeParams.pipeSpecificationRebind.authority, 'CERTIFIED_EXACT_PIPE_CATALOGUE_RECORD');
  assert.equal(written.properties.nativeParams.pipeSpecificationRebind.catalogueBinding.recordHash, binding.recordHash);
  assert.equal(written.properties.attributes.SCHEDULE, 'SCH80');
  assert.equal(written.properties.attributes.MATERIAL_SPECIFICATION, 'A333-6');
  assert.equal(written.properties.attributes.WALL_THICKNESS_MM, 8.56);

  const reopenedDataset = { ...dataset, entities: writtenEntities };
  const graph = {
    semanticHash: 'sha256:roundtrip-graph',
    components: [{ componentKey: 'P-1', portKeys: ['port:P-1:start', 'port:P-1:end'] }],
    ports: [
      { portKey: 'port:P-1:start', componentKey: 'P-1', role: 'start', position: { x: 0, y: 0, z: 0 }, sourceEndpointIdentity: 'node:a' },
      { portKey: 'port:P-1:end', componentKey: 'P-1', role: 'end', position: { x: 1000, y: 0, z: 0 }, sourceEndpointIdentity: 'node:b' },
    ],
    connections: [],
  };
  const reopened = buildCanonicalTopologyFromWorkspaceDataset(reopenedDataset, graph);
  const recovered = reopened.edges.find((entry) => entry.id === 'edge:P-1');
  assert.equal(recovered.catalogueRecordHash, binding.recordHash);
  assert.equal(recovered.catalogueBinding.bindingHash, binding.bindingHash);
  assert.equal(recovered.schedule, 'SCH80');
  assert.equal(recovered.wallThicknessMm, 8.56);
  assert.equal(recovered.materialSpecification, 'A333-6');
  assert.equal(recovered.pipingClass, 'PCL-100');
});
