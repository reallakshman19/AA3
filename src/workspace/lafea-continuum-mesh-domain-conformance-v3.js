/**
 * Independent LAFEA.3 straight-boundary domain-conformance proof for generated meshes.
 *
 * Initial production scope is intentionally narrow: planar single-region LINE boundaries.
 * Circular-arc boundary conformance remains fail-closed until a certified curved-edge
 * deviation bound is wired; the existing v2 producer remains unaffected.
 */
import { t6ShapeFunctions, q8ShapeFunctions, jacobianAt } from '../core/lafea-meshing/element-geometry.js';
import { canonicalLafeaAnalysisMesh } from './lafea-analysis-mesh-contract.js';
import { validateLafeaAnalysisGeometry } from './lafea-analysis-geometry-contract.js';
import { validateLafeaContinuumAnalysisDomain } from './lafea-continuum-analysis-domain.js';
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import { buildLafeaMeshTopology } from './lafea-mesh-geometry-topology-adapter.js';
import { qualifyLafeaHighOrderJacobiansV3 } from './lafea-high-order-jacobian-qualification-v3.js';
import { qualifyLafeaMeshDomainConformanceV3 } from './lafea-mesh-domain-conformance-v3.js';
import { qualifyLafeaMeshTopologyV3 } from './lafea-mesh-topology-qualification-v3.js';

export const LAFEA_CONTINUUM_DOMAIN_CONFORMANCE_OPERATOR_V3 =
  'LAFEA3_LINE_BOUNDARY_POSITIVE_MAPPING_AREA_CLOSURE_V1';

const EDGE_PATHS = Object.freeze({
  T3: Object.freeze([[0, 1], [1, 2], [2, 0]]),
  T6: Object.freeze([[0, 3, 1], [1, 4, 2], [2, 5, 0]]),
  Q8: Object.freeze([[0, 4, 1], [1, 5, 2], [2, 6, 3], [3, 7, 0]]),
});

export function qualifyLafeaContinuumGeneratedMeshDomainV3(options) {
  const geometry = validateLafeaAnalysisGeometry(options?.geometry);
  const domain = validateLafeaContinuumAnalysisDomain(options?.domain, geometry);
  const mesh = canonicalLafeaAnalysisMesh(options?.mesh);
  const meshContentHash = sha(options?.meshContentHash, 'MESH_CONTENT_HASH');
  const propertyBoundaryHash = sha(options?.propertyBoundaryHash, 'PROPERTY_BOUNDARY_HASH');
  if (geometry.stageId !== 'LAFEA.3' || domain.stageId !== 'LAFEA.3') {
    fail('LAFEA_CONTINUUM_DOMAIN_CONFORMANCE_V3_STAGE_INVALID');
  }
  if (geometry.segments.some((segment) => segment.type !== 'LINE')) {
    fail('LAFEA_CONTINUUM_DOMAIN_CONFORMANCE_V3_CURVED_BOUNDARY_NOT_QUALIFIED');
  }

  const topologyEvidence = qualifyLafeaMeshTopologyV3(mesh);
  if (topologyEvidence.qualification !== 'PASS') {
    fail('LAFEA_CONTINUUM_DOMAIN_CONFORMANCE_V3_GLOBAL_TOPOLOGY_BLOCKED');
  }
  const highOrderEvidence = qualifyLafeaHighOrderJacobiansV3(mesh);
  if (highOrderEvidence.qualification !== 'PASS') {
    fail('LAFEA_CONTINUUM_DOMAIN_CONFORMANCE_V3_HIGH_ORDER_MAPPING_BLOCKED');
  }

  const topologyAdapter = buildLafeaMeshTopology(geometry);
  const topologyRegion = topologyAdapter.topology.regions.find(
    (row) => row.regionId === topologyAdapter.regionId,
  );
  if (!topologyRegion || !(topologyRegion.netArea > 0)) {
    fail('LAFEA_CONTINUUM_DOMAIN_CONFORMANCE_V3_EXPECTED_AREA_INVALID');
  }
  const expectedDomainMeasure = topologyRegion.netArea;
  const scale = geometryScale(geometry);
  const boundaryDeviationTolerance = 1e-8 * scale;
  const domainMeasureAbsTolerance = 1e-8 * Math.max(1, expectedDomainMeasure);

  const boundary = proveLineBoundaryConformance(mesh, geometry, boundaryDeviationTolerance);
  const attachmentSupport = proveAttachmentSupport(
    domain,
    geometry,
    mesh,
    boundary.mappedSegmentIds,
    boundaryDeviationTolerance,
  );

  const coveredDomainMeasure = integratedMeshArea(mesh);
  const closure = coveredDomainMeasure - expectedDomainMeasure;
  const uncoveredDomainMeasure = Math.max(0, -closure);
  const outsideDomainMeasure = Math.max(0, closure);

  const conformanceOperatorHash = canonicalLafeaSha256({
    schema: 'lafea-continuum-domain-conformance-operator/v3',
    operatorId: LAFEA_CONTINUUM_DOMAIN_CONFORMANCE_OPERATOR_V3,
    stageId: 'LAFEA.3',
    boundaryTypes: ['LINE'],
    boundaryToleranceRelativeToGeometryScale: 1e-8,
    areaClosureRelativeToExpectedArea: 1e-8,
    attachmentSupportPolicy: 'EXACT_GEOMETRY_FEATURE_TO_RETAINED_MESH_V1',
    globalTopologyQualificationHash: topologyEvidence.qualificationHash,
    highOrderMappingQualificationHash: highOrderEvidence.qualificationHash,
  });

  const evidence = qualifyLafeaMeshDomainConformanceV3({
    schema: 'lafea-mesh-domain-conformance/v3',
    stageId: 'LAFEA.3',
    meshContentHash,
    analysisGeometryHash: geometry.semanticHash,
    propertyBoundaryHash,
    conformanceOperatorHash,
    lengthUnit: geometry.lengthUnit,
    measureUnit: `${geometry.lengthUnit}^2`,
    expectedDomainMeasure,
    coveredDomainMeasure,
    uncoveredDomainMeasure,
    overlapMeasure: 0,
    outsideDomainMeasure,
    maximumBoundaryDeviation: boundary.maximumBoundaryDeviation,
    maximumPropertyBoundaryDeviation: 0,
    unmappedBcSupportMeasure: 0,
    unmappedLoadSupportMeasure: 0,
    domainMeasureAbsTolerance,
    boundaryDeviationTolerance,
    propertyBoundaryDeviationTolerance: boundaryDeviationTolerance,
    supportMeasureAbsTolerance: 0,
  });

  return freeze({
    schema: 'lafea-continuum-generated-mesh-domain-proof/v3',
    evidence,
    topologyEvidenceHash: topologyEvidence.qualificationHash,
    highOrderMappingEvidenceHash: highOrderEvidence.qualificationHash,
    boundaryPathCount: boundary.boundaryPathCount,
    mappedSegmentIds: boundary.mappedSegmentIds,
    mappedVertexIds: attachmentSupport.mappedVertexIds,
    attachmentCount: attachmentSupport.attachmentCount,
    proofScope: 'PLANAR_SINGLE_REGION_STRAIGHT_BOUNDARY',
    engineeringAuthority: false,
  });
}

function proveLineBoundaryConformance(mesh, geometry, tolerance) {
  const nodeById = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  const vertexById = new Map(geometry.vertices.map((vertex) => [vertex.vertexId, vertex]));
  const paths = boundaryPaths(mesh);
  const rowsBySegment = new Map(geometry.segments.map((segment) => [segment.segmentId, []]));
  let maximumBoundaryDeviation = 0;
  let assigned = 0;

  for (const path of paths) {
    const matches = [];
    for (const segment of geometry.segments) {
      const classified = classifyLinePath(path, segment, nodeById, vertexById, tolerance);
      if (classified) matches.push(classified);
    }
    if (matches.length !== 1) {
      fail(matches.length
        ? 'LAFEA_CONTINUUM_DOMAIN_CONFORMANCE_V3_BOUNDARY_PATH_AMBIGUOUS'
        : 'LAFEA_CONTINUUM_DOMAIN_CONFORMANCE_V3_BOUNDARY_PATH_OUTSIDE_GEOMETRY');
    }
    const match = matches[0];
    rowsBySegment.get(match.segmentId).push(match);
    maximumBoundaryDeviation = Math.max(maximumBoundaryDeviation, match.deviationBound);
    assigned += 1;
  }
  if (assigned !== paths.length) fail('LAFEA_CONTINUUM_DOMAIN_CONFORMANCE_V3_BOUNDARY_ASSIGNMENT_INCOMPLETE');

  for (const segment of geometry.segments) {
    const rows = rowsBySegment.get(segment.segmentId).sort((a, b) => a.start - b.start || a.end - b.end);
    if (!rows.length) fail('LAFEA_CONTINUUM_DOMAIN_CONFORMANCE_V3_SEGMENT_UNMAPPED');
    if (rows[0].start > 1e-7 || Math.abs(rows.at(-1).end - 1) > 1e-7) {
      fail('LAFEA_CONTINUUM_DOMAIN_CONFORMANCE_V3_SEGMENT_COVERAGE_INCOMPLETE');
    }
    for (let index = 1; index < rows.length; index += 1) {
      if (Math.abs(rows[index - 1].end - rows[index].start) > 1e-7
        || rows[index - 1].nodeIds.at(-1) !== rows[index].nodeIds[0]) {
        fail('LAFEA_CONTINUUM_DOMAIN_CONFORMANCE_V3_SEGMENT_COVERAGE_GAP');
      }
    }
  }

  if (maximumBoundaryDeviation > tolerance) {
    fail('LAFEA_CONTINUUM_DOMAIN_CONFORMANCE_V3_BOUNDARY_DEVIATION_BLOCKED');
  }
  return freeze({
    boundaryPathCount: paths.length,
    mappedSegmentIds: freeze([...rowsBySegment.keys()].sort()),
    maximumBoundaryDeviation,
  });
}

/**
 * Feature support proof used by the mesh gate itself. It deliberately avoids the
 * solver compiler so the meshing qualification remains a pure leaf and cannot
 * acquire authority from a downstream workbench/run module.
 */
function proveAttachmentSupport(domain, geometry, mesh, mappedSegmentIds, tolerance) {
  const mappedSegments = new Set(mappedSegmentIds);
  const vertexById = new Map(geometry.vertices.map((vertex) => [vertex.vertexId, vertex]));
  const mappedVertices = new Set();

  for (const attachment of domain.attachments) {
    if (attachment.targetType === 'VERTEX') {
      const vertex = vertexById.get(attachment.targetId);
      if (!vertex) fail('LAFEA_CONTINUUM_DOMAIN_CONFORMANCE_V3_ATTACHMENT_VERTEX_UNKNOWN');
      const mapped = mesh.nodes.some((node) => Math.abs(node.z) <= tolerance
        && Math.hypot(node.x - vertex.x, node.y - vertex.y) <= tolerance);
      if (!mapped) fail('LAFEA_CONTINUUM_DOMAIN_CONFORMANCE_V3_ATTACHMENT_VERTEX_UNMAPPED');
      mappedVertices.add(attachment.targetId);
      continue;
    }
    if (attachment.targetType === 'SEGMENT') {
      if (!mappedSegments.has(attachment.targetId)) {
        fail('LAFEA_CONTINUUM_DOMAIN_CONFORMANCE_V3_ATTACHMENT_SEGMENT_UNMAPPED');
      }
      continue;
    }
    if (attachment.targetType === 'REGION') {
      if (attachment.targetId !== domain.region.regionId) {
        fail('LAFEA_CONTINUUM_DOMAIN_CONFORMANCE_V3_ATTACHMENT_REGION_UNMAPPED');
      }
      continue;
    }
    fail('LAFEA_CONTINUUM_DOMAIN_CONFORMANCE_V3_ATTACHMENT_TARGET_TYPE_INVALID');
  }

  return freeze({
    attachmentCount: domain.attachments.length,
    mappedVertexIds: freeze([...mappedVertices].sort()),
  });
}

function classifyLinePath(path, segment, nodeById, vertexById, tolerance) {
  const start = vertexById.get(segment.startVertexId);
  const end = vertexById.get(segment.endVertexId);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length2 = dx * dx + dy * dy;
  const parameters = [];
  let maximumNodeDeviation = 0;
  for (const nodeId of path.nodeIds) {
    const node = nodeById.get(nodeId);
    if (!node || Math.abs(node.z) > tolerance) return null;
    const t = ((node.x - start.x) * dx + (node.y - start.y) * dy) / length2;
    const px = start.x + t * dx;
    const py = start.y + t * dy;
    const deviation = Math.hypot(node.x - px, node.y - py);
    if (t < -1e-8 || t > 1 + 1e-8 || deviation > tolerance) return null;
    parameters.push(clamp01(t));
    maximumNodeDeviation = Math.max(maximumNodeDeviation, deviation);
  }
  let nodeIds = [...path.nodeIds];
  let values = parameters;
  if (values.at(-1) < values[0]) {
    nodeIds.reverse();
    values = [...values].reverse();
  }
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] < values[index - 1] - 1e-12) return null;
  }
  const interpolationFactor = nodeIds.length === 3 ? 1.25 : 1;
  return freeze({
    segmentId: segment.segmentId,
    elementId: path.elementId,
    nodeIds: freeze(nodeIds),
    start: values[0],
    end: values.at(-1),
    deviationBound: interpolationFactor * maximumNodeDeviation,
  });
}

function boundaryPaths(mesh) {
  const occurrences = new Map();
  for (const element of mesh.elements) {
    const paths = EDGE_PATHS[element.elementType];
    if (!paths) fail('LAFEA_CONTINUUM_DOMAIN_CONFORMANCE_V3_ELEMENT_TYPE_UNSUPPORTED');
    for (const indices of paths) {
      const nodeIds = indices.map((index) => element.nodeIds[index]);
      const key = endpointKey(nodeIds[0], nodeIds.at(-1));
      const rows = occurrences.get(key) ?? [];
      rows.push({ elementId: element.elementId, nodeIds });
      occurrences.set(key, rows);
    }
  }
  if ([...occurrences.values()].some((rows) => rows.length > 2)) {
    fail('LAFEA_CONTINUUM_DOMAIN_CONFORMANCE_V3_NON_MANIFOLD_BOUNDARY');
  }
  return [...occurrences.values()]
    .filter((rows) => rows.length === 1)
    .map((rows) => rows[0]);
}

function integratedMeshArea(mesh) {
  const nodeById = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  let area = 0;
  for (const element of mesh.elements) {
    const nodes = element.nodeIds.map((nodeId) => nodeById.get(nodeId));
    if (nodes.some((node) => !node)) fail('LAFEA_CONTINUUM_DOMAIN_CONFORMANCE_V3_NODE_MISSING');
    if (element.elementType === 'T3') {
      const determinant = triangleDeterminant(nodes[0], nodes[1], nodes[2]);
      if (!(determinant > 0)) fail('LAFEA_CONTINUUM_DOMAIN_CONFORMANCE_V3_T3_MAPPING_NONPOSITIVE');
      area += determinant / 2;
      continue;
    }
    if (element.elementType === 'T6') {
      const samples = [[1 / 6, 1 / 6], [2 / 3, 1 / 6], [1 / 6, 2 / 3]];
      for (const [xi, eta] of samples) {
        const determinant = jacobianAt(t6ShapeFunctions(xi, eta), nodes).determinant;
        if (!(determinant > 0)) fail('LAFEA_CONTINUUM_DOMAIN_CONFORMANCE_V3_T6_MAPPING_NONPOSITIVE');
        area += determinant / 6;
      }
      continue;
    }
    if (element.elementType === 'Q8') {
      const a = Math.sqrt(3 / 5);
      const points = [-a, 0, a];
      const weights = [5 / 9, 8 / 9, 5 / 9];
      for (let i = 0; i < points.length; i += 1) {
        for (let j = 0; j < points.length; j += 1) {
          const determinant = jacobianAt(q8ShapeFunctions(points[i], points[j]), nodes).determinant;
          if (!(determinant > 0)) fail('LAFEA_CONTINUUM_DOMAIN_CONFORMANCE_V3_Q8_MAPPING_NONPOSITIVE');
          area += determinant * weights[i] * weights[j];
        }
      }
      continue;
    }
    fail('LAFEA_CONTINUUM_DOMAIN_CONFORMANCE_V3_ELEMENT_TYPE_UNSUPPORTED');
  }
  return area;
}

function triangleDeterminant(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
}
function geometryScale(geometry) {
  const xs = geometry.vertices.map((row) => row.x);
  const ys = geometry.vertices.map((row) => row.y);
  return Math.max(1, Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)));
}
function endpointKey(a, b) { return a < b ? `${a}\0${b}` : `${b}\0${a}`; }
function clamp01(value) { return Math.min(1, Math.max(0, value)); }
function sha(value, field) {
  if (typeof value !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(value)) {
    fail(`LAFEA_CONTINUUM_DOMAIN_CONFORMANCE_V3_${field}_INVALID`);
  }
  return value;
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
