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
  createToleranceTopologyProfile,
} from '../src/core/piping-topology/index.js';
import {
  buildCanonicalElbowGeometryAuthority,
  requireCanonicalElbowGeometryAuthority,
} from '../src/workspace/engineering-loads/adapters/canonical-elbow-geometry-authority.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const xy = fixture();
const authority = buildCanonicalElbowGeometryAuthority({
  dataset: xy.dataset,
  topologyGraph: xy.graph,
  componentKey: 'E1',
});
assert.equal(authority.schema, 'empirical-canonical-elbow-geometry-authority/v1');
assert.equal(authority.componentKey, 'E1');
assert.equal(authority.sourceGeometry.centerAuthorityClass, 'SOURCE_DECLARED_BEND_CENTRE_POINT');
assert.equal(authority.sourceGeometry.centerSourcePath, 'item.centrePoint');
assert.equal(authority.policy.rendererGeometryConsumed, false);
assert.equal(authority.policy.rendererLongRadiusFallbackPermitted, false);
assert.equal(authority.policy.toleranceInferredTopologyConsumed, false);
assert.equal(authority.tangentContinuity.evaluatedStraightNeighborCount, 2);
assert.ok(authority.tangentContinuity.rows.every((row) => row.status === 'PASS_STRAIGHT_NEIGHBOR_COLLINEAR'));
assertNear(authority.geometry.radiusM, 1, 1e-12, 'XY radius');
assertNear(authority.geometry.includedAngleRad, Math.PI / 2, 1e-12, 'XY angle');
assertNear(authority.geometry.arcLengthM, Math.PI / 2, 1e-12, 'XY arc length');
assertVectorNear(authority.geometry.planeNormal, [0, 0, 1], 1e-12, 'XY plane normal');
assertVectorNear(authority.geometry.tangentStart, [1, 0, 0], 1e-12, 'XY start tangent');
assertVectorNear(authority.geometry.tangentEnd, [0, 1, 0], 1e-12, 'XY end tangent');
assert.equal(requireCanonicalElbowGeometryAuthority(authority), authority);
console.log('PASS: source-declared XY elbow is bound to exact topology and straight-neighbor tangents.');

const reversedPorts = fixture({ reverseElbowPortStorage: true });
const reversedAuthority = buildCanonicalElbowGeometryAuthority({
  dataset: reversedPorts.dataset,
  topologyGraph: reversedPorts.graph,
  componentKey: 'E1',
});
assertNear(reversedAuthority.geometry.radiusM, authority.geometry.radiusM, 1e-12, 'reversed-port radius');
assertNear(reversedAuthority.geometry.includedAngleRad, authority.geometry.includedAngleRad, 1e-12, 'reversed-port angle');
assert.deepEqual(
  reversedAuthority.portBindings.map((row) => row.sourceEndpoint),
  ['START', 'END'],
);
assert.equal(reversedAuthority.portBindings[0].residualM, 0);
assert.equal(reversedAuthority.portBindings[1].residualM, 0);
console.log('PASS: source endpoint authority is invariant to stored topology-port ordering.');

const yz = fixture({ orientation: 'YZ' });
const yzAuthority = buildCanonicalElbowGeometryAuthority({
  dataset: yz.dataset,
  topologyGraph: yz.graph,
  componentKey: 'E1',
});
assertNear(yzAuthority.geometry.radiusM, 1, 1e-12, 'YZ radius');
assertNear(yzAuthority.geometry.includedAngleRad, Math.PI / 2, 1e-12, 'YZ angle');
assertVectorNear(yzAuthority.geometry.planeNormal, [1, 0, 0], 1e-12, 'YZ plane normal');
assertVectorNear(yzAuthority.geometry.tangentStart, [0, 1, 0], 1e-12, 'YZ start tangent');
assertVectorNear(yzAuthority.geometry.tangentEnd, [0, 0, 1], 1e-12, 'YZ end tangent');
assert.equal(yzAuthority.tangentContinuity.evaluatedStraightNeighborCount, 2);
console.log('PASS: 3D plane custody is coordinate-independent for an orthogonal YZ rotation.');

const genericCenter = fixture({ centerSourcePath: 'item.center' });
assertCode(
  () => buildCanonicalElbowGeometryAuthority({
    dataset: genericCenter.dataset,
    topologyGraph: genericCenter.graph,
    componentKey: 'E1',
  }),
  'EMPIRICAL_CANONICAL_ELBOW_CENTER_SEMANTICS_UNQUALIFIED',
);

const midpoint = fixture({ explicitCenter: false, centerSourcePath: 'derived.midpoint' });
assertCode(
  () => buildCanonicalElbowGeometryAuthority({
    dataset: midpoint.dataset,
    topologyGraph: midpoint.graph,
    componentKey: 'E1',
  }),
  'EMPIRICAL_CANONICAL_ELBOW_EXPLICIT_CENTER_REQUIRED',
);

const endpointMismatch = fixture({ sourceStartOverride: { x: 0.001, y: 0, z: 0 } });
assertCode(
  () => buildCanonicalElbowGeometryAuthority({
    dataset: endpointMismatch.dataset,
    topologyGraph: endpointMismatch.graph,
    componentKey: 'E1',
  }),
  'EMPIRICAL_CANONICAL_ELBOW_PORT_ENDPOINT_BINDING_FAILED',
);

const radiusMismatch = fixture({ sourceCenterOverride: { x: 0, y: 1.1, z: 0 } });
assertCode(
  () => buildCanonicalElbowGeometryAuthority({
    dataset: radiusMismatch.dataset,
    topologyGraph: radiusMismatch.graph,
    componentKey: 'E1',
  }),
  'EMPIRICAL_ELBOW_RADIUS_MISMATCH',
);

const collinear = fixture({ sourceCenterOverride: { x: 0.5, y: 0.5, z: 0 } });
assertCode(
  () => buildCanonicalElbowGeometryAuthority({
    dataset: collinear.dataset,
    topologyGraph: collinear.graph,
    componentKey: 'E1',
  }),
  'EMPIRICAL_CANONICAL_ELBOW_PLANE_UNRESOLVED',
);

const tangentBad = fixture({ badStartTangentNeighbor: true });
assertCode(
  () => buildCanonicalElbowGeometryAuthority({
    dataset: tangentBad.dataset,
    topologyGraph: tangentBad.graph,
    componentKey: 'E1',
  }),
  'EMPIRICAL_CANONICAL_ELBOW_TANGENT_DISCONTINUITY',
);

const toleranceTopology = fixture({ toleranceProfile: true });
assertCode(
  () => buildCanonicalElbowGeometryAuthority({
    dataset: toleranceTopology.dataset,
    topologyGraph: toleranceTopology.graph,
    componentKey: 'E1',
  }),
  'EMPIRICAL_CANONICAL_ELBOW_TOLERANCE_TOPOLOGY_REJECTED',
);

const stale = fixture();
const other = fixture({ datasetId: 'ELBOW-GEOMETRY-OTHER' });
assertCode(
  () => buildCanonicalElbowGeometryAuthority({
    dataset: other.dataset,
    topologyGraph: stale.graph,
    componentKey: 'E1',
  }),
  'EMPIRICAL_CANONICAL_ELBOW_TOPOLOGY_STALE',
);

const tampered = structuredClone(authority);
tampered.geometry.radiusM = 99;
assertCode(
  () => requireCanonicalElbowGeometryAuthority(tampered),
  'EMPIRICAL_CANONICAL_ELBOW_GEOMETRY_AUTHORITY_HASH_MISMATCH',
);
console.log('PASS: unqualified centre semantics, midpoint centre, stale/mismatched geometry, tangent discontinuity and tolerance topology fail closed.');

const source = await readFile(
  path.join(root, 'src/workspace/engineering-loads/adapters/canonical-elbow-geometry-authority.js'),
  'utf8',
);
assert.doesNotMatch(source, /resolved-engineering-geometry|viewport-render-model|three-|canvas2d/i);
assert.doesNotMatch(source, /1\.5\s*\*|1\.5D|LONG_RADIUS_DEFAULT/i);
assert.match(source, /genericComponentCenterPermitted:\s*false/);
assert.match(source, /rendererLongRadiusFallbackPermitted:\s*false/);
assert.match(source, /toleranceInferredTopologyConsumed:\s*false/);
console.log('PASS: source guard proves the mechanics authority does not consume renderer geometry or long-radius defaults.');

console.log('PASS: empirical canonical elbow geometry authority checks.');

function fixture(options = {}) {
  const datasetId = options.datasetId || 'ELBOW-GEOMETRY-CUSTODY';
  const orientation = options.orientation || 'XY';
  const geometry = orientationGeometry(orientation);
  const sourceHash = `SOURCE:${datasetId}`;
  const components = [
    component('P1', 'PIPE', [
      port('P1:A', geometry.pipe1Far),
      port('P1:B', geometry.elbowStart),
    ]),
    component('E1', 'BEND', options.reverseElbowPortStorage
      ? [port('E1:A', geometry.elbowEnd), port('E1:B', geometry.elbowStart)]
      : [port('E1:A', geometry.elbowStart), port('E1:B', geometry.elbowEnd)]),
    component('P2', 'PIPE', [
      port('P2:A', geometry.elbowEnd),
      port('P2:B', options.badStartTangentNeighbor ? geometry.pipe2Far : geometry.pipe2Far),
    ]),
  ];
  if (options.badStartTangentNeighbor) {
    components[0] = component('P1', 'PIPE', [
      port('P1:A', geometry.badPipe1Far),
      port('P1:B', geometry.elbowStart),
    ]);
  }
  const sharedModel = createSharedPipingModel({
    project: { datasetId, name: datasetId, sourceName: 'fixture' },
    units: { length: 'm', force: 'N', mass: 'kg' },
    sourceSnapshotRef: {
      schema: 'source-package-snapshot/v1',
      datasetId,
      sourceSchema: 'empirical-canonical-elbow-fixture/v1',
      sourceSemanticHash: sourceHash,
      sourceByteHash: null,
    },
    components,
    supports: [],
    sourceReferences: { nodes: [] },
    diagnostics: [],
  });
  const profile = options.toleranceProfile
    ? createToleranceTopologyProfile('m', 0.01)
    : createExactTopologyProfile('m');
  const graph = buildPipingPortTopologyGraph(sharedModel, profile);
  const sourceStart = options.sourceStartOverride || geometry.elbowStart;
  const sourceCenter = options.sourceCenterOverride || geometry.elbowCenter;
  const centerSourcePath = options.centerSourcePath || 'item.centrePoint';
  const explicitCenter = options.explicitCenter ?? true;
  const dataset = {
    schema: 'analysis-workspace-dataset/v1',
    datasetId,
    sourceSnapshot: {
      sourceSemanticHash: sourceHash,
      sourceByteHash: null,
    },
    sharedModel,
    entities: [
      entity('P1', 'PIPE', geometry.pipe1Far, geometry.elbowStart),
      {
        entityId: 'E1',
        sourceEntityId: 'SRC:E1',
        entityType: 'BEND',
        sourcePath: '/fixture/E1',
        properties: {
          geometry: {
            start: sourceStart,
            end: geometry.elbowEnd,
            center: sourceCenter,
            explicitCenter,
            sources: {
              start: 'item.points[0]',
              end: 'item.points[1]',
              center: centerSourcePath,
              branches: [],
              boreMm: '',
            },
          },
        },
      },
      entity('P2', 'PIPE', geometry.elbowEnd, geometry.pipe2Far),
    ],
  };
  return { dataset, graph, sharedModel };
}

function orientationGeometry(orientation) {
  if (orientation === 'YZ') {
    return {
      pipe1Far: { x: 0, y: -2, z: 0 },
      badPipe1Far: { x: 1, y: -2, z: 0 },
      elbowStart: { x: 0, y: 0, z: 0 },
      elbowCenter: { x: 0, y: 0, z: 1 },
      elbowEnd: { x: 0, y: 1, z: 1 },
      pipe2Far: { x: 0, y: 1, z: 3 },
    };
  }
  return {
    pipe1Far: { x: -2, y: 0, z: 0 },
    badPipe1Far: { x: -2, y: 1, z: 0 },
    elbowStart: { x: 0, y: 0, z: 0 },
    elbowCenter: { x: 0, y: 1, z: 0 },
    elbowEnd: { x: 1, y: 1, z: 0 },
    pipe2Far: { x: 1, y: 3, z: 0 },
  };
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

function port(portKey, position) {
  return {
    portKey,
    role: 'PORT',
    position: { ...position },
    sourceReference: { sourcePath: `/ports/${portKey}` },
  };
}

function entity(entityId, entityType, start, end) {
  return {
    entityId,
    sourceEntityId: `SRC:${entityId}`,
    entityType,
    sourcePath: `/fixture/${entityId}`,
    properties: {
      geometry: {
        start,
        end,
        center: {
          x: (start.x + end.x) / 2,
          y: (start.y + end.y) / 2,
          z: (start.z + end.z) / 2,
        },
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

function assertCode(fn, code) {
  assert.throws(fn, (error) => error?.code === code, `Expected error code ${code}.`);
}
function assertNear(actual, expected, tolerance, label) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} != ${expected}`);
}
function assertVectorNear(actual, expected, tolerance, label) {
  assert.equal(actual.length, expected.length, `${label} length`);
  actual.forEach((value, index) => assertNear(value, expected[index], tolerance, `${label}[${index}]`));
}
