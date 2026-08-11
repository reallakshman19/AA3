import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createTopologyEditCommandRequest,
} from '../src/workspace/topology-edit/topology-edit-command-contract.js';
import {
  resolveTopologyEditCommand,
} from '../src/workspace/topology-edit/topology-edit-command-resolver.js';
import {
  buildTopologyEditCandidate,
} from '../src/workspace/topology-edit/topology-edit-candidate-builder.js';
import {
  validateTopologyEditCandidate,
} from '../src/workspace/topology-edit/topology-edit-candidate-validator.js';
import {
  finalizeCanonicalTopology,
} from '../src/workspace/topology-edit/topology-edit-canonical-state.js';

function fixture() {
  return finalizeCanonicalTopology({
    schema: 'topology-edit-canonical-topology/v1',
    datasetId: 'catalogue-replacement', datasetVersion: 1,
    sourceHash: 'sha256:catalogue-replacement-source',
    topologyGraphHash: 'sha256:catalogue-replacement-graph',
    nodes: [
      node('node:n1', 0), node('node:n2', 100), node('node:n3', 300),
    ],
    edges: [
      {
        id: 'edge:f1', componentKey: 'flange:f1', fromNodeId: 'node:n1', toNodeId: 'node:n2',
        entityType: 'FLANGE', diameterMm: 100, outsideDiameterMm: 114,
        diameterAuthority: 'OUTSIDE_DIAMETER', pipingClass: 'A', pressureClass: '150',
        endConnectionFrom: 'BW', endConnectionTo: 'RF', flangeType: 'WN', flangeFacing: 'RF',
        flangeClass: '150',
      },
      {
        id: 'edge:r1', componentKey: 'reducer:r1', fromNodeId: 'node:n2', toNodeId: 'node:n3',
        entityType: 'REDUCER', diameterMm: 100, outsideDiameterMm: 114,
        secondaryNominalSizeMm: 80, secondaryOutsideDiameterMm: 89,
        diameterAuthority: 'OUTSIDE_DIAMETER', pipingClass: 'A', pressureClass: '150',
        endConnectionFrom: 'BW', endConnectionTo: 'BW', reducerType: 'CONCENTRIC',
        reducerOrientation: 'CENTERED',
      },
    ],
    junctions: [], supports: [], boundaries: [], rigids: [], bends: [],
  });
}
function node(id, x) { return { id, position: { x, y: 0, z: 0 }, portKeys: [] }; }
function basis(base) {
  return {
    sourceHash: base.sourceHash,
    baseCanonicalHash: base.canonicalTopologyHash,
    priorDraftHash: base.canonicalTopologyHash,
    sessionVersion: 0,
  };
}
function sourceReference(path) {
  return { documentId: 'catalogue', revision: 'A', path };
}
function flangeBinding(overrides = {}) {
  return {
    catalogueHash: 'sha256:cat', sourceHash: 'sha256:cat-source',
    recordId: 'FLANGE-100-150-RF', recordHash: 'sha256:flange-new',
    componentType: 'FLANGE', nominalSizeMm: 100, outsideDiameterMm: 114,
    pipingClass: 'A', pressureClass: '150', materialSpecification: 'A105',
    componentLengthMm: 100, componentMassKg: 8,
    endConnectionFrom: 'BW', endConnectionTo: 'RF',
    flangeType: 'SO', flangeFacing: 'RF', flangeClass: '150',
    flangeThicknessMm: 100, flangeOutsideDiameterMm: 220,
    sourceReference: sourceReference('/flanges/1'),
    ...overrides,
  };
}
function reducerBinding(overrides = {}) {
  return {
    catalogueHash: 'sha256:cat', sourceHash: 'sha256:cat-source',
    recordId: 'RED-100-80-ECC', recordHash: 'sha256:reducer-new',
    componentType: 'REDUCER', nominalSizeMm: 100, outsideDiameterMm: 114,
    secondaryNominalSizeMm: 80, secondaryOutsideDiameterMm: 89,
    pipingClass: 'A', pressureClass: '150', materialSpecification: 'A234-WPB',
    componentLengthMm: 200, componentMassKg: 4,
    endConnectionFrom: 'BW', endConnectionTo: 'BW',
    reducerType: 'ECCENTRIC', reducerOrientation: 'FLAT_TOP',
    sourceReference: sourceReference('/reducers/1'),
    ...overrides,
  };
}
function candidate(base, edgeId, catalogueBinding, direction = 'FROM_TO') {
  const request = createTopologyEditCommandRequest({
    commandId: `cmd:${edgeId}:replace`, commandType: 'REPLACE_INLINE_COMPONENT',
    basis: basis(base), payload: { edgeId, direction, catalogueBinding },
  });
  const resolved = resolveTopologyEditCommand({
    request, canonicalTopology: base, authority: basis(base),
  });
  return buildTopologyEditCandidate({ canonicalTopology: base, resolvedCommand: resolved });
}

test('exact FLANGE catalogue replacement changes one edge and preserves geometry', () => {
  const base = fixture();
  const next = candidate(base, 'edge:f1', flangeBinding());
  const report = validateTopologyEditCandidate({ candidate: next, baseCanonicalTopology: base });
  assert.equal(report.valid, true, JSON.stringify(report.errors));
  assert.deepEqual(next.topologyDelta.edges.changedIds, ['edge:f1']);
  assert.deepEqual(next.topologyDelta.nodes.changedIds, []);
  const edge = next.canonicalTopology.edges.find((row) => row.id === 'edge:f1');
  assert.equal(edge.flangeType, 'SO');
  assert.equal(edge.flangeFacing, 'RF');
  assert.equal(edge.componentLengthMm, 100);
  assert.equal(edge.catalogueRecordHash, 'sha256:flange-new');
});

test('exact REDUCER catalogue replacement updates exact reducer scalars without node movement', () => {
  const base = fixture();
  const next = candidate(base, 'edge:r1', reducerBinding());
  const report = validateTopologyEditCandidate({ candidate: next, baseCanonicalTopology: base });
  assert.equal(report.valid, true, JSON.stringify(report.errors));
  assert.deepEqual(next.topologyDelta.edges.changedIds, ['edge:r1']);
  assert.deepEqual(next.topologyDelta.nodes.changedIds, []);
  const edge = next.canonicalTopology.edges.find((row) => row.id === 'edge:r1');
  assert.equal(edge.reducerType, 'ECCENTRIC');
  assert.equal(edge.reducerOrientation, 'FLAT_TOP');
  assert.equal(edge.secondaryNominalSizeMm, 80);
  assert.equal(edge.catalogueRecordHash, 'sha256:reducer-new');
});

test('fitting replacement fails closed on type, size, orientation, or envelope mismatch', () => {
  const base = fixture();
  assert.throws(() => candidate(base, 'edge:f1', reducerBinding()), /is not a REDUCER edge/);
  assert.throws(() => candidate(base, 'edge:f1', flangeBinding({ nominalSizeMm: 80 })), /nominal size differs/);
  assert.throws(() => candidate(base, 'edge:f1', flangeBinding({ componentLengthMm: 120 })), /preserve the current geometric envelope/);
  assert.throws(() => candidate(base, 'edge:r1', reducerBinding({ secondaryNominalSizeMm: 50 })), /secondary nominal size differs/);
  assert.throws(() => candidate(base, 'edge:r1', reducerBinding(), 'TO_FROM'), /requires FROM_TO orientation/);
});
