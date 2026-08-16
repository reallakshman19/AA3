import {
  LAFEA_SHELL_CURVED_ANALYSIS_DOMAIN_SCHEMA,
  LAFEA_SHELL_CURVED_MIDSURFACE_GEOMETRY_SCHEMA,
  LAFEA_SHELL_CURVED_MIDSURFACE_INTAKE_SCHEMA,
  LAFEA_SHELL_CURVED_ORIENTATION,
  LAFEA_SHELL_CURVED_TOPOLOGY,
  createLafeaCurvedShellAnalysisDomain,
  createLafeaCurvedShellMidsurfaceEvidence,
  createLafeaCurvedShellMidsurfaceGeometry,
  cylindricalShellUvAtPoint3d,
} from './lafea-shell-curved-midsurface-contract.js';

const LAFEA4_SAMPLE_MODEL_ID = 'CYLINDRICAL_PIPE_SHELL_BENCHMARK';
const LAFEA4_SAMPLE_RADIUS_MM = 100;
const LAFEA4_SAMPLE_LENGTH_MM = 50;
const LAFEA4_SAMPLE_SPAN_RADIANS = Math.PI / 3;
const LAFEA4_SAMPLE_CIRCUMFERENTIAL_SEGMENTS = 12;
const LAFEA4_SAMPLE_NODE_COUNT = 26;
const LAFEA4_SAMPLE_ELEMENT_COUNT = 24;

/**
 * Compatibility-only analytic parents for the visible [SIMULATED] samples.
 *
 * LAFEA.4 has an exact analytic cylindrical parent because its sample builder
 * is itself defined from radius/length/span cylinder parameters. Parent
 * registration proves not only that each node lies on the cylinder, but that
 * the complete known Sample discretization has the expected two axial rims,
 * 13 angular stations and 24 TRI3 source facets. This prevents a future fixture
 * edit from silently retaining the same modelIdentity while changing the
 * analytic parent meaning.
 *
 * LAFEA.5 intentionally returns null. Its caller-authored host shell is a
 * periodic cylindrical footprint band whose axial rims follow the orthogonal
 * pipe/trunnion intersection curve. The current qualified periodic-cylinder
 * contract accepts rectangular iso-v rims only, so substituting that contract
 * would change the sample geometry rather than mesh it.
 */
export function createLafeaSimulatedShellMidsurfaceEvidence(stageId, sourceHash, documentValue) {
  if (stageId === 'LAFEA.4') {
    return createLafea4SampleCylinderParent(sourceHash, documentValue);
  }
  if (stageId === 'LAFEA.5') return null;
  return null;
}

function createLafea4SampleCylinderParent(sourceHash, documentValue) {
  if (!documentValue || documentValue.modelIdentity !== LAFEA4_SAMPLE_MODEL_ID) {
    fail('LAFEA4_SIMULATED_CYLINDER_SOURCE_IDENTITY_MISMATCH');
  }
  if (!Array.isArray(documentValue.nodes)
    || documentValue.nodes.length !== LAFEA4_SAMPLE_NODE_COUNT) {
    fail('LAFEA4_SIMULATED_CYLINDER_SOURCE_NODE_COUNT_MISMATCH');
  }
  if (!Array.isArray(documentValue.elements)
    || documentValue.elements.length !== LAFEA4_SAMPLE_ELEMENT_COUNT) {
    fail('LAFEA4_SIMULATED_CYLINDER_SOURCE_ELEMENT_COUNT_MISMATCH');
  }

  const halfArc = LAFEA4_SAMPLE_RADIUS_MM * LAFEA4_SAMPLE_SPAN_RADIANS / 2;
  const geometry = createLafeaCurvedShellMidsurfaceGeometry({
    schema: LAFEA_SHELL_CURVED_MIDSURFACE_GEOMETRY_SCHEMA,
    stageId: 'LAFEA.4',
    geometryId: 'SIMULATED-LAFEA4-CYLINDRICAL-PIPE-SHELL',
    lengthUnit: 'mm',
    surface: {
      kind: 'CYLINDER',
      axisOrigin: { x: 0, y: 0, z: 0 },
      axisDirection: { x: 1, y: 0, z: 0 },
      radialDirection: { x: 0, y: 0, z: 1 },
      radius: LAFEA4_SAMPLE_RADIUS_MM,
    },
    orientationPolicy: LAFEA_SHELL_CURVED_ORIENTATION,
    vertices: [
      { vertexId: 'V1', u: -halfArc, v: 0 },
      { vertexId: 'V2', u: halfArc, v: 0 },
      { vertexId: 'V3', u: halfArc, v: LAFEA4_SAMPLE_LENGTH_MM },
      { vertexId: 'V4', u: -halfArc, v: LAFEA4_SAMPLE_LENGTH_MM },
    ],
    segments: [
      { segmentId: 'S1', startVertexId: 'V1', endVertexId: 'V2' },
      { segmentId: 'S2', startVertexId: 'V2', endVertexId: 'V3' },
      { segmentId: 'S3', startVertexId: 'V3', endVertexId: 'V4' },
      { segmentId: 'S4', startVertexId: 'V4', endVertexId: 'V1' },
    ],
    loops: [{ loopId: 'OUTER', role: 'OUTER', segmentIds: ['S1', 'S2', 'S3', 'S4'] }],
  });

  validateLafea4SampleDiscretization(documentValue, geometry, halfArc);

  const domain = createLafeaCurvedShellAnalysisDomain({
    schema: LAFEA_SHELL_CURVED_ANALYSIS_DOMAIN_SCHEMA,
    stageId: 'LAFEA.4',
    domainId: 'SIMULATED-LAFEA4-CYLINDRICAL-PIPE-SHELL-DOMAIN',
    sourceHash,
    midsurfaceGeometryHash: geometry.semanticHash,
    lengthUnit: 'mm',
    topologyClass: LAFEA_SHELL_CURVED_TOPOLOGY,
  });

  return createLafeaCurvedShellMidsurfaceEvidence({
    schema: LAFEA_SHELL_CURVED_MIDSURFACE_INTAKE_SCHEMA,
    stageId: 'LAFEA.4',
    sourceHash,
    analysisDomain: domain,
    geometry,
    producerRef: 'SIMULATED-SAMPLE-DECLARED-CYLINDRICAL-MIDSURFACE',
  });
}

function validateLafea4SampleDiscretization(documentValue, geometry, halfArc) {
  const tolerance = 1e-8;
  const uvByNode = new Map();
  for (const node of documentValue.nodes) {
    if (typeof node?.nodeId !== 'string' || !Array.isArray(node?.position) || node.position.length !== 3) {
      fail('LAFEA4_SIMULATED_CYLINDER_SOURCE_NODE_POSITION_INVALID');
    }
    const uv = cylindricalShellUvAtPoint3d(geometry, {
      x: node.position[0],
      y: node.position[1],
      z: node.position[2],
    });
    uvByNode.set(node.nodeId, uv);
  }

  const expectedNodeIds = [];
  for (let axial = 0; axial < 2; axial += 1) {
    for (let station = 0; station <= LAFEA4_SAMPLE_CIRCUMFERENTIAL_SEGMENTS; station += 1) {
      const nodeId = `N${axial}-${station}`;
      expectedNodeIds.push(nodeId);
      const uv = uvByNode.get(nodeId);
      if (!uv) fail('LAFEA4_SIMULATED_CYLINDER_SOURCE_TOPOLOGY_MISMATCH');
      const expectedU = -halfArc + (2 * halfArc * station / LAFEA4_SAMPLE_CIRCUMFERENTIAL_SEGMENTS);
      const expectedV = axial * LAFEA4_SAMPLE_LENGTH_MM;
      if (Math.abs(uv.u - expectedU) > tolerance || Math.abs(uv.v - expectedV) > tolerance) {
        fail('LAFEA4_SIMULATED_CYLINDER_SOURCE_STATION_MISMATCH');
      }
    }
  }
  const actualNodeIds = [...uvByNode.keys()].sort();
  if (!sameStrings(actualNodeIds, expectedNodeIds.sort())) {
    fail('LAFEA4_SIMULATED_CYLINDER_SOURCE_TOPOLOGY_MISMATCH');
  }

  const expectedElements = new Map();
  for (let station = 0; station < LAFEA4_SAMPLE_CIRCUMFERENTIAL_SEGMENTS; station += 1) {
    const a = `N0-${station}`;
    const b = `N1-${station}`;
    const c = `N1-${station + 1}`;
    const d = `N0-${station + 1}`;
    expectedElements.set(`E${station}-A`, [a, b, c]);
    expectedElements.set(`E${station}-B`, [a, c, d]);
  }
  for (const element of documentValue.elements) {
    const expected = expectedElements.get(element?.elementId);
    if (!expected || !Array.isArray(element?.nodeIds) || !sameStrings(element.nodeIds, expected)) {
      fail('LAFEA4_SIMULATED_CYLINDER_SOURCE_ELEMENT_TOPOLOGY_MISMATCH');
    }
  }
  if (new Set(documentValue.elements.map((row) => row.elementId)).size !== expectedElements.size) {
    fail('LAFEA4_SIMULATED_CYLINDER_SOURCE_ELEMENT_TOPOLOGY_MISMATCH');
  }
}

function sameStrings(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
function fail(code) {
  const error = new TypeError(code);
  error.code = code;
  throw error;
}
