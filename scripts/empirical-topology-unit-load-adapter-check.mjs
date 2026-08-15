import assert from 'node:assert/strict';
import {
  createSharedPipingModel,
} from '../src/core/shared-piping-model/index.js';
import {
  buildPipingPortTopologyGraph,
  createToleranceTopologyProfile,
} from '../src/core/piping-topology/index.js';
import {
  assembleUnitForceFlexibilityMatrix,
} from '../src/core/empirical-piping-mechanics/index.js';
import {
  buildExactTopologyStraightPipeUnitLoadActions,
} from '../src/workspace/engineering-loads/adapters/topology-to-empirical-unit-load-tree.js';

const E = 200e9;
const G = 80e9;
const A = 0.004;
const I = 8e-6;
const J = 1.2e-5;
const L1 = 3;
const L2 = 2;
const properties = {
  elasticModulusPa: E,
  shearModulusPa: G,
  areaM2: A,
  secondMomentYM4: I,
  secondMomentZM4: I,
  torsionConstantM4: J,
};

const exactModel = fixtureModel('ROM-ADAPTER-EXACT', 'PIPE');
const exactGraph = buildPipingPortTopologyGraph(exactModel);
const adapted = buildExactTopologyStraightPipeUnitLoadActions({
  topologyGraph: exactGraph,
  rootPortKey: 'P1:FROM',
  cases: [
    { caseId: 'FX', portKey: 'P2:TO', direction: [1, 0, 0] },
    { caseId: 'FY', portKey: 'P2:TO', direction: [0, 1, 0] },
    { caseId: 'FZ', portKey: 'P2:TO', direction: [0, 0, 1] },
  ],
});

assert.equal(adapted.datasetId, exactModel.project.datasetId);
assert.equal(adapted.topologySemanticHash, exactGraph.semanticHash);
assert.equal(adapted.evidence.toleranceInferenceConsumed, false);
assert.equal(adapted.evidence.callerInternalActionsConsumed, false);
assert.equal(adapted.mechanics.evidence.internalActionsAcceptedFromCaller, false);
assert.equal(adapted.mechanics.nodes.length, 3);
assert.equal(adapted.mechanics.segments.length, 2);

const matrix = assembleUnitForceFlexibilityMatrix({
  caseIds: adapted.mechanics.caseIds,
  segments: adapted.mechanics.segments.map((row) => ({
    segmentId: row.segmentId,
    lengthM: row.lengthM,
    properties,
    actionByCaseId: row.actionByCaseId,
  })),
  reciprocityTolerance: 1e-14,
});

const expectedXX = (
  L1 / (E * A)
  + (L1 * (L2 ** 2)) / (E * I)
  + (L2 ** 3) / (3 * E * I)
);
const expectedYY = (L1 ** 3) / (3 * E * I) + L2 / (E * A);
const expectedXY = -(L2 * (L1 ** 2)) / (2 * E * I);
const expectedZZ = (
  (L1 ** 3) / (3 * E * I)
  + (L1 * (L2 ** 2)) / (G * J)
  + (L2 ** 3) / (3 * E * I)
);
close(matrix.matrix[0][0], expectedXX, 'canonical L-route +X');
close(matrix.matrix[1][1], expectedYY, 'canonical L-route +Y');
close(matrix.matrix[0][1], expectedXY, 'canonical L-route XY coupling');
close(matrix.matrix[1][0], expectedXY, 'canonical L-route reciprocal XY coupling');
close(matrix.matrix[2][2], expectedZZ, 'canonical L-route +Z bending/torsion');
assert.equal(matrix.reciprocity.satisfied, true);

const toleranceGraph = buildPipingPortTopologyGraph(
  exactModel,
  createToleranceTopologyProfile('mm', 1),
);
assert.throws(() => buildExactTopologyStraightPipeUnitLoadActions({
  topologyGraph: toleranceGraph,
  rootPortKey: 'P1:FROM',
  cases: [{ caseId: 'FX', portKey: 'P2:TO', direction: [1, 0, 0] }],
}), /rejects tolerance inference/);

const nonPipeModel = fixtureModel('ROM-ADAPTER-NONPIPE', 'ELBOW');
const nonPipeGraph = buildPipingPortTopologyGraph(nonPipeModel);
assert.throws(() => buildExactTopologyStraightPipeUnitLoadActions({
  topologyGraph: nonPipeGraph,
  rootPortKey: 'P1:FROM',
  cases: [{ caseId: 'FX', portKey: 'P2:TO', direction: [1, 0, 0] }],
}), /not a straight PIPE/);

console.log('PASS: empirical exact-topology unit-load adapter checks');
console.log(JSON.stringify({
  topologySemanticHash: exactGraph.semanticHash,
  mechanicsSegmentIds: adapted.mechanics.segments.map((row) => row.segmentId),
  flexibilityMatrix: matrix.matrix,
  reciprocityResidual: matrix.reciprocity.maximumResidual,
}, null, 2));

function fixtureModel(datasetId, secondType) {
  const joint = { x: L1 * 1000, y: 0, z: 0 };
  return createSharedPipingModel({
    project: { datasetId, name: datasetId, sourceName: `${datasetId}.json` },
    units: { length: 'mm', force: 'N', mass: 'kg' },
    sourceSnapshotRef: {
      schema: 'source-package-snapshot/v1',
      datasetId,
      sourceSchema: 'empirical-unit-load-adapter-fixture/v1',
      sourceSemanticHash: `fixture:${datasetId}`,
      sourceByteHash: `sha256:${datasetId}`,
    },
    components: [
      component('P1', 'PIPE', { x: 0, y: 0, z: 0 }, joint, 'P2:FROM'),
      component('P2', secondType, joint, { x: L1 * 1000, y: L2 * 1000, z: 0 }, 'P1:TO'),
    ],
    supports: [],
    sourceReferences: { nodes: [] },
    diagnostics: [],
  });
}

function component(componentKey, type, start, end, peerAtJoint) {
  return {
    componentKey,
    sourceEntityId: `entity:${componentKey}`,
    name: componentKey,
    type,
    identity: { lineId: 'L1', branchId: 'B1', systemId: 'SYS-ROM', zoneId: 'Z1' },
    geometry: {
      start,
      end,
      center: midpoint(start, end),
      points: [start, end],
      branchPoints: [],
      explicitCenter: false,
      boreMm: null,
      ports: [
        port(componentKey, 'FROM', start, componentKey === 'P2' ? peerAtJoint : null),
        port(componentKey, 'TO', end, componentKey === 'P1' ? peerAtJoint : null),
      ],
      sources: {
        start: `${componentKey}.start`,
        end: `${componentKey}.end`,
        center: 'derived.midpoint',
        branches: [],
      },
    },
    engineeringProperties: {},
    compatibilityEvidence: {},
    sourceReferences: sourceReferences(componentKey),
    diagnostics: [],
  };
}

function port(componentKey, role, position, peerPortKey) {
  const sourceReference = { sourcePath: `${componentKey}.${role}` };
  if (peerPortKey) sourceReference.explicitPeerPortKey = peerPortKey;
  return {
    portKey: `${componentKey}:${role}`,
    role,
    position,
    sourceReference,
  };
}

function midpoint(left, right) {
  return {
    x: (left.x + right.x) / 2,
    y: (left.y + right.y) / 2,
    z: (left.z + right.z) / 2,
  };
}

function sourceReferences(key) {
  return {
    sourceNodeKey: `node:${key}`,
    sourceEntityId: `entity:${key}`,
    jsonPointer: `/objects/${key}`,
    sourcePath: `/MODEL/${key}`,
  };
}

function close(actual, expected, label) {
  const tolerance = Math.max(1e-14, Math.abs(expected) * 1e-11);
  assert(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, received ${actual}, tolerance ${tolerance}`,
  );
}
