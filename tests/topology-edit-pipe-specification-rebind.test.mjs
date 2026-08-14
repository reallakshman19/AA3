import test from 'node:test';
import assert from 'node:assert/strict';
import { finalizeCanonicalTopology } from '../src/workspace/topology-edit/topology-edit-canonical-state.js';
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
  resolveTopologyEditTablePipeSpecificationSelection,
  topologyEditTablePipeSpecificationCandidates,
} from '../src/workspace/topology-edit/table/topology-edit-table-pipe-catalogue.js';

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
function edge(id, fromNodeId, toNodeId, nominalSizeMm = 100) {
  return {
    id, componentKey: id.replace('edge:', 'P-'), fromNodeId, toNodeId,
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

test('DN change is allowed on a graph-open pipe and exact same-record custody is rejected as a no-op', () => {
  const open = topology({ peer: false });
  const binding80 = createPipeSegmentCatalogueBinding({ catalogue: CATALOGUE, recordId: 'PIPE-80-A' });
  assert.doesNotThrow(() => assertTopologyEditPipeSpecificationRebindTarget(open, {
    edgeId: 'edge:target', catalogueBinding: binding80,
  }));

  const binding100 = createPipeSegmentCatalogueBinding({ catalogue: CATALOGUE, recordId: 'PIPE-100-A' });
  const rebound = finalizeCanonicalTopology(applyTopologyEditPipeSpecificationRebind(open, {
    commandId: 'command:pipe-spec-2', commandType: REBIND_PIPE_SPECIFICATION,
    payload: { edgeId: 'edge:target', catalogueBinding: binding100 },
  }));
  assert.throws(() => assertTopologyEditPipeSpecificationRebindTarget(rebound, {
    edgeId: 'edge:target', catalogueBinding: binding100,
  }), /rebind is a no-op/);
});

test('Table PIPE catalogue candidates expose only command-certifiable exact records', () => {
  const connected = topology();
  const connectedIds = topologyEditTablePipeSpecificationCandidates({
    catalogue: CATALOGUE, row: row(), canonicalTopology: connected,
  }).map((record) => record.recordId);
  assert.deepEqual(connectedIds, ['PIPE-100-A', 'PIPE-100-B']);

  const open = topology({ peer: false });
  const openIds = topologyEditTablePipeSpecificationCandidates({
    catalogue: CATALOGUE, row: row(), canonicalTopology: open,
  }).map((record) => record.recordId);
  assert.deepEqual(openIds, ['PIPE-100-A', 'PIPE-100-B', 'PIPE-80-A']);

  const selection = resolveTopologyEditTablePipeSpecificationSelection({
    catalogue: CATALOGUE, row: row(), canonicalTopology: connected, recordId: 'PIPE-100-B',
  });
  assert.equal(selection.record.recordId, 'PIPE-100-B');
  assert.equal(selection.catalogueBinding.schedule, 'SCH80');
  assert.equal(selection.catalogueBinding.bindingHash.startsWith('fnv1a64:'), true);
});
