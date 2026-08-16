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

/**
 * Compatibility-only analytic parents for the visible [SIMULATED] samples.
 *
 * LAFEA.4 has an exact analytic cylindrical parent because its sample builder
 * is itself defined from radius/length/span cylinder parameters. Every sample
 * node is checked against that analytic parent before the evidence is returned.
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
  if (!Array.isArray(documentValue.nodes) || documentValue.nodes.length !== 26) {
    fail('LAFEA4_SIMULATED_CYLINDER_SOURCE_NODE_COUNT_MISMATCH');
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

  for (const node of documentValue.nodes) {
    if (!Array.isArray(node?.position) || node.position.length !== 3) {
      fail('LAFEA4_SIMULATED_CYLINDER_SOURCE_NODE_POSITION_INVALID');
    }
    cylindricalShellUvAtPoint3d(geometry, {
      x: node.position[0],
      y: node.position[1],
      z: node.position[2],
    });
  }

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

function fail(code) {
  const error = new TypeError(code);
  error.code = code;
  throw error;
}
