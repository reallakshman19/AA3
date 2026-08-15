import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
  requireCanonicalComponentRomRoute,
} from '../src/workspace/engineering-loads/adapters/canonical-component-rom-route.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = buildFixture();
const elbowAuthority = buildCanonicalElbowGeometryAuthority({
  dataset: fixture.dataset,
  topologyGraph: fixture.graph,
  componentKey: 'E1',
});
const route = buildCanonicalComponentRomRoute({
  topologyGraph: fixture.graph,
  connectedComponentId: fixture.graph.connectedComponents[0].connectedComponentId,
  elbowGeometryAuthorities: [elbowAuthority],
});
assert.equal(requireCanonicalComponentRomRoute(route), route);
assert.equal(route.components.length, 3);
assert.equal(route.nodes.length, 4);
assert.deepEqual(route.components.map((row) => [row.componentId, row.kind]), [
  ['E1', 'CIRCULAR_ELBOW'],
  ['P1', 'STRAIGHT'],
  ['P2', 'STRAIGHT'],
]);
assert.equal(route.evidence.finiteElementDiscretizationCreated, false);
assert.equal(route.evidence.rendererGeometryConsumed, false);
assert.equal(route.evidence.toleranceInferredTopologyConsumed, false);
console.log('PASS: exact topology + source-backed elbow geometry produce a four-node, three-component analytical route.');

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
const elbowFlexibility = createEmpiricalElbowFlexibilityAuthority({
  schema: 'empirical-elbow-flexibility-authority/v1',
  authorityId: 'AUTH:E1:BENCHMARK-K-2.5',
  componentId: 'E1',
  basis: 'CODE_COMPONENT_FLEXIBILITY',
  inPlaneFlexibilityFactor: 2.5,
  outOfPlaneFlexibilityFactor: 2.5,
  torsionalFlexibilityFactor: 1,
  source: {
    standard: 'ASME_B31J',
    edition: 'BENCHMARK',
    ruleId: 'FROZEN_INDEPENDENT_BENCHMARK_K',
    sourceSemanticHash: 'BENCHMARK:B31J:K',
    factorResultSemanticHash: 'BENCHMARK:FACTOR:RESULT',
  },
  geometryBinding: {
    bendRadiusM: 1,
    outerDiameterM: 0.2,
    wallThicknessM: 0.01,
    pressurePa: 0,
    elasticModulusPa: properties.elasticModulusPa,
  },
});

const mechanicsComponents = route.components.map((component) => ({
  componentId: component.componentId,
  kind: component.kind,
  nodeAId: component.nodeAId,
  nodeBId: component.nodeBId,
  properties: { ...properties },
  thermal: { ...thermal },
  geometry: component.kind === 'CIRCULAR_ELBOW' ? component.geometry : null,
  flexibilityAuthority: component.kind === 'CIRCULAR_ELBOW' ? elbowFlexibility : null,
}));
const rootNode = nodeAt(route, [-2, 0, 0]);
const tipNode = nodeAt(route, [1, 3, 0]);
const result = solveRootedTreeComponentThermalCompatibility({
  nodes: route.nodes.map((node) => ({ id: node.id, pointM: node.pointM })),
  components: mechanicsComponents,
  rootNodeId: rootNode.id,
  coordinates: [
    {
      coordinateId: 'TIP-X',
      nodeId: tipNode.id,
      direction: [1, 0, 0],
      targetDisplacementM: 0,
      supportStiffnessNPerM: null,
    },
    {
      coordinateId: 'TIP-Y',
      nodeId: tipNode.id,
      direction: [0, 1, 0],
      targetDisplacementM: 0,
      supportStiffnessNPerM: null,
    },
  ],
  options: {},
});

// Frozen independently before repository execution from direct continuum
// integration of two exact straight spans plus the continuous circular elbow.
// Geometry: P1 (-2,0)->(0,0), 90 deg R=1 elbow to (1,1),
// P2 (1,1)->(1,3); 1 N X/Y loads act at the final tip.
const expectedF = [
  [3.0214810087147528e-5, -1.0064363521234052e-5],
  [-1.0064363521234052e-5, 5.9767023052964523e-6],
];
for (let row = 0; row < 2; row += 1) {
  for (let column = 0; column < 2; column += 1) {
    assertNear(
      result.flexibility.matrixMPerN[row][column],
      expectedF[row][column],
      2e-14,
      `mixed F[${row}][${column}]`,
    );
  }
}
assertNear(
  result.flexibility.matrixMPerN[0][1],
  result.flexibility.matrixMPerN[1][0],
  1e-15,
  'mixed-route reciprocity',
);

// Uniform epsilon=0.001. The free endpoint translation of the complete route
// is epsilon*(r_tip-r_root) = [0.003, 0.003, 0] m. This is a kinematic identity,
// independent of the restraint solve.
const referenceById = new Map(
  result.thermalReference.rows.map((row) => [row.coordinateId, row.referenceDisplacementM]),
);
assertNear(referenceById.get('TIP-X'), 0.003, 1e-14, 'TIP-X free thermal movement');
assertNear(referenceById.get('TIP-Y'), 0.003, 1e-14, 'TIP-Y free thermal movement');

// Independent 2x2 inverse of expectedF * R = -[0.003,0.003].
const reactionById = new Map(
  result.compatibility.rows.map((row) => [row.coordinateId, row.reactionN]),
);
assertNear(reactionById.get('TIP-X'), -606.8995590818411, 1e-6, 'TIP-X thermal reaction');
assertNear(reactionById.get('TIP-Y'), -1523.9269614290317, 1e-6, 'TIP-Y thermal reaction');
assert.ok(result.compatibility.compatibility.maximumResidualM <= 1e-10);
assert.ok(result.compatibility.energy.relativeResidual <= 1e-10);
assert.equal(result.evidence.globalNodalStiffnessMatrixAssembled, false);
assert.equal(result.evidence.finiteElementRouteUsed, false);
console.log('PASS: straight-elbow-straight mixed-route F, thermal free movement and rigid-restraint reactions match frozen independent oracles.');

assertCode(
  () => buildCanonicalComponentRomRoute({
    topologyGraph: fixture.graph,
    connectedComponentId: fixture.graph.connectedComponents[0].connectedComponentId,
    elbowGeometryAuthorities: [],
  }),
  'EMPIRICAL_CANONICAL_COMPONENT_ROUTE_ELBOW_AUTHORITY_COVERAGE_MISMATCH',
);

const tamperedRoute = structuredClone(route);
tamperedRoute.nodes[0].pointM.x += 1;
assertCode(
  () => requireCanonicalComponentRomRoute(tamperedRoute),
  'EMPIRICAL_CANONICAL_COMPONENT_ROUTE_HASH_MISMATCH',
);
console.log('PASS: missing elbow custody and stale route evidence fail closed.');

const routeSource = await readFile(
  path.join(root, 'src/workspace/engineering-loads/adapters/canonical-component-rom-route.js'),
  'utf8',
);
assert.doesNotMatch(routeSource, /assembly\.js|solvePlanarSystem|globalStiffness|resolved-engineering-geometry|viewport-render-model/i);
assert.match(routeSource, /finiteElementDiscretizationCreated:\s*false/);
assert.match(routeSource, /rendererGeometryConsumed:\s*false/);
console.log('PASS: canonical mixed-route source guard excludes FE assembly and renderer authority.');

console.log('PASS: empirical canonical mixed straight-elbow-straight route checks.');

function buildFixture() {
  const datasetId = 'MIXED-ROUTE-CANONICAL';
  const sourceHash = 'SOURCE:MIXED-ROUTE-CANONICAL';
  const components = [
    component('P1', 'PIPE', [port('P1:A', [-2, 0, 0]), port('P1:B', [0, 0, 0])]),
    component('E1', 'BEND', [port('E1:A', [0, 0, 0]), port('E1:B', [1, 1, 0])]),
    component('P2', 'PIPE', [port('P2:A', [1, 1, 0]), port('P2:B', [1, 3, 0])]),
  ];
  const sharedModel = createSharedPipingModel({
    project: { datasetId, name: datasetId, sourceName: 'mixed-route-fixture' },
    units: { length: 'm', force: 'N', mass: 'kg' },
    sourceSnapshotRef: {
      schema: 'source-package-snapshot/v1',
      datasetId,
      sourceSchema: 'empirical-canonical-mixed-route-fixture/v1',
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
      {
        entityId: 'E1',
        sourceEntityId: 'SRC:E1',
        entityType: 'BEND',
        sourcePath: '/fixture/E1',
        properties: {
          geometry: {
            start: point([0, 0, 0]),
            end: point([1, 1, 0]),
            center: point([0, 1, 0]),
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
      },
      pipeEntity('P2', [1, 1, 0], [1, 3, 0]),
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
function port(portKey, coordinates) {
  return {
    portKey,
    role: 'PORT',
    position: point(coordinates),
    sourceReference: { sourcePath: `/ports/${portKey}` },
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
        center: point([
          (start[0] + end[0]) / 2,
          (start[1] + end[1]) / 2,
          (start[2] + end[2]) / 2,
        ]),
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
function point(values) { return { x: values[0], y: values[1], z: values[2] }; }
function nodeAt(routeValue, xyz) {
  const rows = routeValue.nodes.filter((node) => (
    Math.abs(node.pointM.x - xyz[0]) <= 1e-12
    && Math.abs(node.pointM.y - xyz[1]) <= 1e-12
    && Math.abs(node.pointM.z - xyz[2]) <= 1e-12
  ));
  assert.equal(rows.length, 1, `Expected one route node at ${xyz.join(',')}.`);
  return rows[0];
}
function assertNear(actual, expected, tolerance, label) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} != ${expected}`);
}
function assertCode(fn, code) {
  assert.throws(fn, (error) => error?.code === code, `Expected error code ${code}.`);
}
