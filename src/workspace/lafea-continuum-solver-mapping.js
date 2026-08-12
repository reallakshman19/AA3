/** Geometry-feature to governed-mesh mapping for the LAFEA.3 solver compiler. */
import { canonicalLafeaAnalysisMesh } from './lafea-analysis-mesh-contract.js';
import { validateLafeaAnalysisGeometry } from './lafea-analysis-geometry-contract.js';
import { validateLafeaContinuumAnalysisDomain } from './lafea-continuum-analysis-domain.js';

const EDGE_PATHS = Object.freeze({
  T3: Object.freeze([[0, 1], [1, 2], [2, 0]]),
  T6: Object.freeze([[0, 3, 1], [1, 4, 2], [2, 5, 0]]),
  Q8: Object.freeze([[0, 4, 1], [1, 5, 2], [2, 6, 3], [3, 7, 0]]),
});

export function compileLafeaContinuumAttachmentTargets(options) {
  const geometry = validateLafeaAnalysisGeometry(options?.geometry);
  const domain = validateLafeaContinuumAnalysisDomain(options?.domain, geometry);
  const mesh = canonicalLafeaAnalysisMesh(options?.mesh);
  const context = createContext(geometry, mesh);
  return freeze(domain.attachments.map((attachment) => freeze({
    attachmentId: attachment.attachmentId,
    kind: attachment.kind,
    target: compileTarget(attachment, domain, context),
  })));
}

function createContext(geometry, mesh) {
  const nodeMap = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  const vertexMap = new Map(geometry.vertices.map((row) => [row.vertexId, row]));
  const segmentMap = new Map(geometry.segments.map((row) => [row.segmentId, row]));
  const boundaryPaths = collectBoundaryPaths(mesh);
  const scale = geometryScale(geometry);
  return { geometry, mesh, nodeMap, vertexMap, segmentMap, boundaryPaths, tolerance: 1e-8 * scale };
}

function compileTarget(attachment, domain, context) {
  if (attachment.targetType === 'REGION') {
    if (attachment.targetId !== domain.region.regionId) fail('LAFEA_CONTINUUM_SOLVER_REGION_MAPPING_MISMATCH');
    return freeze({
      targetType: 'REGION', featureId: attachment.targetId,
      nodeIds: [], edgeNodePaths: [],
      elementIds: context.mesh.elements.map((row) => row.elementId),
    });
  }
  if (attachment.targetType === 'VERTEX') return compileVertex(attachment.targetId, context);
  if (attachment.targetType === 'SEGMENT') return compileSegment(attachment.targetId, context);
  fail('LAFEA_CONTINUUM_SOLVER_TARGET_TYPE_UNSUPPORTED');
}

function compileVertex(vertexId, context) {
  const vertex = context.vertexMap.get(vertexId);
  if (!vertex) fail('LAFEA_CONTINUUM_SOLVER_VERTEX_MAPPING_MISSING');
  const matches = context.mesh.nodes.filter((node) =>
    distance(node.x, node.y, vertex.x, vertex.y) <= context.tolerance);
  if (matches.length !== 1) {
    fail(matches.length ? 'LAFEA_CONTINUUM_SOLVER_VERTEX_MAPPING_AMBIGUOUS'
      : 'LAFEA_CONTINUUM_SOLVER_VERTEX_MAPPING_MISSING');
  }
  return freeze({
    targetType: 'VERTEX', featureId: vertexId,
    nodeIds: [matches[0].nodeId], edgeNodePaths: [], elementIds: [],
  });
}

function compileSegment(segmentId, context) {
  const segment = context.segmentMap.get(segmentId);
  if (!segment) fail('LAFEA_CONTINUUM_SOLVER_SEGMENT_MAPPING_MISSING');
  const candidates = context.boundaryPaths
    .map((path) => classifyBoundaryPath(path, segment, context))
    .filter(Boolean)
    .sort((left, right) => left.start - right.start || left.end - right.end);
  if (!candidates.length) fail('LAFEA_CONTINUUM_SOLVER_SEGMENT_MAPPING_MISSING');
  const ordered = orientAndValidateSegmentPaths(candidates, segmentId);
  return freeze({
    targetType: 'SEGMENT', featureId: segmentId,
    nodeIds: orderedNodeIds(ordered),
    edgeNodePaths: ordered.map((row) => row.nodeIds),
    elementIds: ordered.map((row) => row.elementId),
  });
}

function classifyBoundaryPath(path, segment, context) {
  const parameters = path.nodeIds.map((nodeId) => {
    const node = context.nodeMap.get(nodeId);
    return segmentParameter(node, segment, context);
  });
  if (parameters.some((value) => value === null)) return null;
  let nodeIds = [...path.nodeIds];
  let values = parameters;
  if (values.at(-1) < values[0]) {
    nodeIds.reverse(); values = [...values].reverse();
  }
  for (let index = 1; index < values.length; index += 1) {
    if (!(values[index] > values[index - 1] - 1e-12)) return null;
  }
  return { elementId: path.elementId, nodeIds, start: values[0], end: values.at(-1) };
}

function orientAndValidateSegmentPaths(rows, segmentId) {
  const eps = 1e-7;
  if (rows[0].start > eps || Math.abs(rows.at(-1).end - 1) > eps) {
    fail('LAFEA_CONTINUUM_SOLVER_SEGMENT_MAPPING_INCOMPLETE');
  }
  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1]; const current = rows[index];
    if (Math.abs(previous.end - current.start) > eps
      || previous.nodeIds.at(-1) !== current.nodeIds[0]) {
      fail('LAFEA_CONTINUUM_SOLVER_SEGMENT_MAPPING_GAP');
    }
  }
  const edgeKeys = rows.map((row) => row.nodeIds.join('\0'));
  if (new Set(edgeKeys).size !== edgeKeys.length) fail('LAFEA_CONTINUUM_SOLVER_SEGMENT_MAPPING_AMBIGUOUS');
  return rows.map((row) => freeze({ ...row, featureId: segmentId }));
}

function collectBoundaryPaths(mesh) {
  const occurrences = new Map();
  for (const element of mesh.elements) {
    const paths = EDGE_PATHS[element.elementType];
    if (!paths) fail('LAFEA_CONTINUUM_SOLVER_ELEMENT_TYPE_UNSUPPORTED');
    for (const indices of paths) {
      const nodeIds = indices.map((index) => element.nodeIds[index]);
      const key = endpointKey(nodeIds[0], nodeIds.at(-1));
      const rows = occurrences.get(key) ?? [];
      rows.push({ elementId: element.elementId, nodeIds }); occurrences.set(key, rows);
    }
  }
  return [...occurrences.values()].filter((rows) => rows.length === 1).map((rows) => rows[0]);
}

function segmentParameter(node, segment, context) {
  if (!node || Math.abs(node.z) > context.tolerance) return null;
  if (segment.type === 'LINE') return lineParameter(node, segment, context);
  if (segment.type === 'CIRCULAR_ARC') return arcParameter(node, segment, context);
  return null;
}

function lineParameter(node, segment, context) {
  const start = context.vertexMap.get(segment.startVertexId);
  const end = context.vertexMap.get(segment.endVertexId);
  const dx = end.x - start.x; const dy = end.y - start.y;
  const length2 = dx * dx + dy * dy;
  const t = ((node.x - start.x) * dx + (node.y - start.y) * dy) / length2;
  const px = start.x + t * dx; const py = start.y + t * dy;
  if (t < -1e-8 || t > 1 + 1e-8
    || distance(node.x, node.y, px, py) > context.tolerance) return null;
  return clamp01(t);
}

function arcParameter(node, segment, context) {
  const radial = distance(node.x, node.y, segment.centerX, segment.centerY);
  if (Math.abs(radial - segment.radius) > context.tolerance) return null;
  const start = context.vertexMap.get(segment.startVertexId);
  const end = context.vertexMap.get(segment.endVertexId);
  const a0 = Math.atan2(start.y - segment.centerY, start.x - segment.centerX);
  const a1 = Math.atan2(end.y - segment.centerY, end.x - segment.centerX);
  const a = Math.atan2(node.y - segment.centerY, node.x - segment.centerX);
  const total = segment.sweep === 'CCW' ? ccw(a0, a1) : ccw(a1, a0);
  const delta = segment.sweep === 'CCW' ? ccw(a0, a) : ccw(a, a0);
  const t = delta / total;
  if (t < -1e-8 || t > 1 + 1e-8) return null;
  return clamp01(t);
}

function orderedNodeIds(rows) {
  const result = [];
  for (const row of rows) {
    for (const nodeId of row.nodeIds) if (result.at(-1) !== nodeId) result.push(nodeId);
  }
  return result;
}
function endpointKey(a, b) { return a < b ? `${a}\0${b}` : `${b}\0${a}`; }
function geometryScale(geometry) {
  const xs = geometry.vertices.map((row) => row.x);
  const ys = geometry.vertices.map((row) => row.y);
  return Math.max(1, Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)));
}
function distance(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function clamp01(value) { return Math.min(1, Math.max(0, value)); }
function ccw(start, end) { let value = end - start; while (value < 0) value += Math.PI * 2; while (value >= Math.PI * 2) value -= Math.PI * 2; return value; }
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.values(value).forEach(freeze); return Object.freeze(value); }
