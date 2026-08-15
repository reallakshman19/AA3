import assert from 'node:assert/strict';
import {
  createSharedPipingModel,
} from '../src/core/shared-piping-model/index.js';
import {
  buildPipingPortTopologyGraph,
  createExactTopologyProfile,
} from '../src/core/piping-topology/index.js';
import {
  createEmpiricalElbowFlexibilityAuthority,
  solveRootedTreeComponentThermalCompatibility,
} from '../src/core/empirical-piping-mechanics/index.js';
import {
  buildCanonicalElbowGeometryAuthority,
} from '../src/workspace/engineering-loads/adapters/canonical-elbow-geometry-authority.js';
import {
  buildCanonicalComponentRomRoute,
} from '../src/workspace/engineering-loads/adapters/canonical-component-rom-route.js';

const fixture = buildFixture();
const elbowAuthorities = ['E1', 'E2'].map((componentKey) => buildCanonicalElbowGeometryAuthority({
  dataset: fixture.dataset,
  topologyGraph: fixture.graph,
  componentKey,
}));
assertVectorNear(elbowAuthorities[0].geometry.planeNormal, [0, 0, 1], 1e-12, 'E1 +Z plane');
assertVectorNear(elbowAuthorities[1].geometry.planeNormal, [0, 0, -1], 1e-12, 'E2 -Z plane');
assert.ok(elbowAuthorities.every((row) => row.tangentContinuity.evaluatedStraightNeighborCount === 2));

const route = buildCanonicalComponentRomRoute({
  topologyGraph: fixture.graph,
  connectedComponentId: fixture.graph.connectedComponents[0].connectedComponentId,
  elbowGeometryAuthorities: elbowAuthorities,
});
assert.equal(route.components.length, 5);
assert.equal(route.nodes.length, 6);
assert.equal(route.evidence.elbowCount, 2);
assert.deepEqual(
  route.components.filter((row) => row.kind === 'CIRCULAR_ELBOW').map((row) => row.componentId),
  ['E1', 'E2'],
);
console.log('PASS: canonical Z-route contains two independently sealed elbows with opposite bend-plane normals.');

const properties = {
  elasticModulusPa: 200e9,
  shearModulusPa: 76.923076923e9,
  areaM2: 0.004,
  secondMomentYM4: 8e-6,
  secondMomentZM4: 8e-6,
  torsionConstantM4: 1.6e-5,
};
const thermal = {
  referenceTemperatureC: 20,
  analysisTemperatureC: 120,
  expansionCoefficientPerK: 1e-5,
  coefficientBasis: 'CONSTANT_OVER_TEMPERATURE_RANGE',
};
const geometryById = new Map(elbowAuthorities.map((row) => [row.componentKey, row.geometry]));
const flexibilityById = new Map(['E1', 'E2'].map((componentId) => [
  componentId,
  createEmpiricalElbowFlexibilityAuthority({
    schema: 'empirical-elbow-flexibility-authority/v1',
    authorityId: `AUTH:${componentId}:BENCHMARK-K-2.5`,
    componentId,
    basis: 'CODE_COMPONENT_FLEXIBILITY',
    inPlaneFlexibilityFactor: 2.5,
    outOfPlaneFlexibilityFactor: 2.5,
    torsionalFlexibilityFactor: 1,
    source: {
      standard: 'ASME_B31J',
      edition: 'BENCHMARK',
      ruleId: 'FROZEN_INDEPENDENT_BENCHMARK_K',
      sourceSemanticHash: `BENCHMARK:B31J:${componentId}`,
      factorResultSemanticHash: `BENCHMARK:FACTOR:${componentId}`,
    },
    geometryBinding: {
      bendRadiusM: 1,
      outerDiameterM: 0.2,
      wallThicknessM: 0.01,
      pressurePa: 0,
      elasticModulusPa: properties.elasticModulusPa,
    },
  }),
]));
const components = route.components.map((component) => ({
  componentId: component.componentId,
  kind: component.kind,
  nodeAId: component.nodeAId,
  nodeBId: component.nodeBId,
  properties: { ...properties },
  thermal: { ...thermal },
  geometry: component.kind === 'CIRCULAR_ELBOW'
    ? geometryById.get(component.componentId)
    : null,
  flexibilityAuthority: component.kind === 'CIRCULAR_ELBOW'
    ? flexibilityById.get(component.componentId)
    : null,
}));
const root = nodeAt(route, [-2, 0, 0]);
const tip = nodeAt(route, [4, 4, 0]);
const result = solveRootedTreeComponentThermalCompatibility({
  nodes: route.nodes.map((node) => ({ id: node.id, pointM: node.pointM })),
  components,
  rootNodeId: root.id,
  coordinates: [
    {
      coordinateId: 'TIP-X',
      nodeId: tip.id,
      direction: [1, 0, 0],
      targetDisplacementM: 0,
      supportStiffnessNPerM: null,
    },
    {
      coordinateId: 'TIP-Y',
      nodeId: tip.id,
      direction: [0, 1, 0],
      targetDisplacementM: 0,
      supportStiffnessNPerM: null,
    },
  ],
  options: {},
});

// Frozen independent continuum oracle. The route is:
// P1 (-2,0)->(0,0)
// E1 R=1: (0,0)->(1,1), centre (0,1), n=+Z
// P2 (1,1)->(1,3)
// E2 R=1: (1,3)->(2,4), centre (2,3), n=-Z
// P3 (2,4)->(4,4)
const expectedF = [
  [5.8671692028862445e-5, -6.5297419648638357e-5],
  [-6.5297419648638357e-5, 8.9879551301699372e-5],
];
for (let row = 0; row < 2; row += 1) {
  for (let column = 0; column < 2; column += 1) {
    assertNear(
      result.flexibility.matrixMPerN[row][column],
      expectedF[row][column],
      4e-14,
      `Z-route F[${row}][${column}]`,
    );
  }
}
assertNear(result.flexibility.matrixMPerN[0][1], result.flexibility.matrixMPerN[1][0], 1e-15, 'Z reciprocity');

// Uniform epsilon=0.001 and total end-to-end vector [6,4,0] m.
const referenceById = new Map(result.thermalReference.rows.map((row) => [row.coordinateId, row.referenceDisplacementM]));
assertNear(referenceById.get('TIP-X'), 0.006, 1e-14, 'Z TIP-X free thermal movement');
assertNear(referenceById.get('TIP-Y'), 0.004, 1e-14, 'Z TIP-Y free thermal movement');

// Independent inverse: expectedF * R = -[0.006,0.004].
const reactionById = new Map(result.compatibility.rows.map((row) => [row.coordinateId, row.reactionN]));
assertNear(reactionById.get('TIP-X'), -792.8301758786337, 1e-6, 'Z TIP-X reaction');
assertNear(reactionById.get('TIP-Y'), -620.4944717319305, 1e-6, 'Z TIP-Y reaction');
assert.ok(result.compatibility.compatibility.maximumResidualM <= 1e-10);
assert.ok(result.compatibility.energy.relativeResidual <= 1e-10);
assert.equal(result.evidence.globalNodalStiffnessMatrixAssembled, false);
assert.equal(result.evidence.finiteElementRouteUsed, false);
console.log('PASS: two-elbow Z-route flexibility, reciprocity, thermal movement and reactions match frozen independent continuum/matrix oracles.');

console.log('PASS: empirical canonical two-elbow Z-route checks.');

function buildFixture() {
  const datasetId = 'CANONICAL-Z-ROUTE';
  const sourceHash = 'SOURCE:CANONICAL-Z-ROUTE';
  const components = [
    component('P1', 'PIPE', [port('P1:A', [-2, 0, 0]), port('P1:B', [0, 0, 0])]),
    component('E1', 'BEND', [port('E1:A', [0, 0, 0]), port('E1:B', [1, 1, 0])]),
    component('P2', 'PIPE', [port('P2:A', [1, 1, 0]), port('P2:B', [1, 3, 0])]),
    component('E2', 'BEND', [port('E2:A', [1, 3, 0]), port('E2:B', [2, 4, 0])]),
    component('P3', 'PIPE', [port('P3:A', [2, 4, 0]), port('P3:B', [4, 4, 0])]),
  ];
  const sharedModel = createSharedPipingModel({
    project: { datasetId, name: datasetId, sourceName: 'canonical-z-route' },
    units: { length: 'm', force: 'N', mass: 'kg' },
    sourceSnapshotRef: {
      schema: 'source-package-snapshot/v1',
      datasetId,
      sourceSchema: 'empirical-canonical-z-route/v1',
      sourceSemanticHash: sourceHash,
      sourceByteHash: null,
    },
    components,
    supports: [],
    sourceReferences: { nodes: [] },
    diagnostics: [],
  });
  const graph = buildPipingPortTopologyGraph(sharedModel, createExactTopologyProfile('m'));
  const dataset = {
    schema: 'analysis-workspace-dataset/v1',
    datasetId,
    sourceSnapshot: { sourceSemanticHash: sourceHash, sourceByteHash: null },
    sharedModel,
    entities: [
      pipeEntity('P1', [-2, 0, 0], [0, 0, 0]),
      elbowEntity('E1', [0, 0, 0], [1, 1, 0], [0, 1, 0]),
      pipeEntity('P2', [1, 1, 0], [1, 3, 0]),
      elbowEntity('E2', [1, 3, 0], [2, 4, 0], [2, 3, 0]),
      pipeEntity('P3', [2, 4, 0], [4, 4, 0]),
    ],
  };
  return { dataset, graph };
}

function component(componentKey, type, ports) {
  return {
    componentKey,
    sourceEntityId: `SRC:${componentKey}`,
    name: componentKey,
    type,
    identity: { lineId: 'L1', branchId: 'B1', systemId: 'S1', zoneId: 'Z1' },
    geometry: { ports },
    engineeringProperties: {},
    compatibilityEvidence: {},
    sourceReferences: { sourceEntityId: `SRC:${componentKey}` },
    diagnostics: [],
  };
}
function port(portKey, xyz) {
  return {
    portKey,
    role: 'PORT',
    position: point(xyz),
    sourceReference: { sourcePath: `/ports/${portKey}` },
  };
}
function elbowEntity(entityId, start, end, center) {
  return {
    entityId,
    sourceEntityId: `SRC:${entityId}`,
    entityType: 'BEND',
    sourcePath: `/fixture/${entityId}`,
    properties: {
      geometry: {
        start: point(start),
        end: point(end),
        center: point(center),
        explicitCenter: true,
        sources: {
          start: 'item.points[0]',
          end: 'item.points[1]',
          center: 'item.centrePoint',
          branches: [],
          boreMm: '',
        },
      },
    },
  };
}
function pipeEntity(entityId, start, end) {
  return {
    entityId,
    sourceEntityId: `SRC:${entityId}`,
    entityType: 'PIPE',
    sourcePath: `/fixture/${entityId}`,
    properties: {
      geometry: {
        start: point(start),
        end: point(end),
        center: point([(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2]),
        explicitCenter: false,
        sources: {
          start: 'nativeParams.startPoint',
          end: 'nativeParams.endPoint',
          center: 'derived.midpoint',
          branches: [],
          boreMm: '',
        },
      },
    },
  };
}
function point(xyz) { return { x: xyz[0], y: xyz[1], z: xyz[2] }; }
function nodeAt(route, xyz) {
  const rows = route.nodes.filter((node) => (
    Math.abs(node.pointM.x - xyz[0]) <= 1e-12
    && Math.abs(node.pointM.y - xyz[1]) <= 1e-12
    && Math.abs(node.pointM.z - xyz[2]) <= 1e-12
  ));
  assert.equal(rows.length, 1, `Expected one node at ${xyz.join(',')}.`);
  return rows[0];
}
function assertNear(actual, expected, tolerance, label) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} != ${expected}`);
}
function assertVectorNear(actual, expected, tolerance, label) {
  actual.forEach((value, index) => assertNear(value, expected[index], tolerance, `${label}[${index}]`));
}
