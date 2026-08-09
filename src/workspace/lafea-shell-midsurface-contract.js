import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA_SHELL_ANALYSIS_DOMAIN_SCHEMA = 'lafea-shell-analysis-domain/v1';
export const LAFEA_SHELL_MIDSURFACE_GEOMETRY_SCHEMA = 'lafea-shell-midsurface-geometry/v1';
export const LAFEA_SHELL_MIDSURFACE_EVIDENCE_SCHEMA = 'lafea-shell-midsurface-evidence/v1';
export const LAFEA_SHELL_MIDSURFACE_INTAKE_SCHEMA = 'lafea-shell-midsurface-evidence-intake/v1';
export const LAFEA_SHELL_MIDSURFACE_STAGES = Object.freeze(['LAFEA.4', 'LAFEA.5']);
export const LAFEA_SHELL_MIDSURFACE_TOPOLOGY = 'PLANAR_SINGLE_PATCH_STRAIGHT_PERIMETER_V1';
export const LAFEA_SHELL_MIDSURFACE_ORIENTATION = 'OUTER_CCW_RIGHT_HANDED_BASIS_V1';

const DOMAIN_KEYS = Object.freeze([
  'schema', 'stageId', 'domainId', 'sourceHash', 'midsurfaceGeometryHash',
  'lengthUnit', 'topologyClass',
]);
const DOMAIN_OUTPUT_KEYS = Object.freeze([...DOMAIN_KEYS, 'semanticHash']);
const GEOMETRY_KEYS = Object.freeze([
  'schema', 'stageId', 'geometryId', 'lengthUnit', 'origin', 'axisU', 'axisV',
  'orientationPolicy', 'vertices', 'segments', 'loops',
]);
const GEOMETRY_OUTPUT_KEYS = Object.freeze([...GEOMETRY_KEYS, 'semanticHash']);
const EVIDENCE_KEYS = Object.freeze([
  'schema', 'stageId', 'sourceHash', 'analysisDomain', 'geometry', 'producerRef',
]);

/** Mesh-independent shell analysis-domain authority. */
export function createLafeaShellAnalysisDomain(value) {
  exact(value, DOMAIN_KEYS, 'LAFEA_SHELL_DOMAIN_KEYS_INVALID');
  const stageId = stage(value.stageId);
  const core = {
    schema: exactText(value.schema, LAFEA_SHELL_ANALYSIS_DOMAIN_SCHEMA, 'DOMAIN_SCHEMA'),
    stageId,
    domainId: text(value.domainId, 'DOMAIN_ID'),
    sourceHash: sha256(value.sourceHash, 'SOURCE_HASH'),
    midsurfaceGeometryHash: sha256(value.midsurfaceGeometryHash, 'MIDSURFACE_GEOMETRY_HASH'),
    lengthUnit: text(value.lengthUnit, 'LENGTH_UNIT'),
    topologyClass: exactText(
      value.topologyClass, LAFEA_SHELL_MIDSURFACE_TOPOLOGY, 'TOPOLOGY_CLASS',
    ),
  };
  return freeze({
    ...core,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea-shell-analysis-domain-hash-input/v1', domain: core,
    }),
  });
}

export function validateLafeaShellAnalysisDomain(value) {
  exact(value, DOMAIN_OUTPUT_KEYS, 'LAFEA_SHELL_DOMAIN_OUTPUT_KEYS_INVALID');
  const rebuilt = createLafeaShellAnalysisDomain({
    schema: value.schema,
    stageId: value.stageId,
    domainId: value.domainId,
    sourceHash: value.sourceHash,
    midsurfaceGeometryHash: value.midsurfaceGeometryHash,
    lengthUnit: value.lengthUnit,
    topologyClass: value.topologyClass,
  });
  if (value.semanticHash !== rebuilt.semanticHash) {
    fail('LAFEA_SHELL_DOMAIN_HASH_INVALID');
  }
  return rebuilt;
}

/**
 * Planar shell patch declared in its own 2D parametric basis. Coordinates are
 * not inferred from an existing facet mesh. `axisU × axisV` defines the shell
 * director used when the generated mesh is compiled into the local-shell model.
 */
export function createLafeaShellMidsurfaceGeometry(value) {
  exact(value, GEOMETRY_KEYS, 'LAFEA_SHELL_MIDSURFACE_GEOMETRY_KEYS_INVALID');
  const stageId = stage(value.stageId);
  const origin = vector3(value.origin, 'ORIGIN');
  const axisU = unitVector(value.axisU, 'AXIS_U');
  const axisV = unitVector(value.axisV, 'AXIS_V');
  if (Math.abs(dot(axisU, axisV)) > 1e-12) fail('LAFEA_SHELL_MIDSURFACE_BASIS_NOT_ORTHOGONAL');
  const director = cross(axisU, axisV);
  if (norm(director) < 1 - 1e-12) fail('LAFEA_SHELL_MIDSURFACE_BASIS_DEGENERATE');

  if (!Array.isArray(value.vertices) || value.vertices.length < 3) {
    fail('LAFEA_SHELL_MIDSURFACE_VERTICES_INVALID');
  }
  const vertices = value.vertices.map((row) => {
    exact(row, ['vertexId', 'u', 'v'], 'LAFEA_SHELL_MIDSURFACE_VERTEX_KEYS_INVALID');
    return freeze({
      vertexId: text(row.vertexId, 'VERTEX_ID'),
      u: finite(row.u, 'VERTEX_U'),
      v: finite(row.v, 'VERTEX_V'),
    });
  }).sort(byId('vertexId'));
  unique(vertices.map((row) => row.vertexId), 'LAFEA_SHELL_MIDSURFACE_VERTEX_ID_DUPLICATE');
  const vertexIds = new Set(vertices.map((row) => row.vertexId));

  if (!Array.isArray(value.segments) || value.segments.length < 3) {
    fail('LAFEA_SHELL_MIDSURFACE_SEGMENTS_INVALID');
  }
  const segments = value.segments.map((row) => {
    exact(row, ['segmentId', 'startVertexId', 'endVertexId'],
      'LAFEA_SHELL_MIDSURFACE_SEGMENT_KEYS_INVALID');
    const segment = freeze({
      segmentId: text(row.segmentId, 'SEGMENT_ID'),
      startVertexId: text(row.startVertexId, 'START_VERTEX_ID'),
      endVertexId: text(row.endVertexId, 'END_VERTEX_ID'),
    });
    if (segment.startVertexId === segment.endVertexId
      || !vertexIds.has(segment.startVertexId) || !vertexIds.has(segment.endVertexId)) {
      fail('LAFEA_SHELL_MIDSURFACE_SEGMENT_VERTEX_INVALID');
    }
    return segment;
  }).sort(byId('segmentId'));
  unique(segments.map((row) => row.segmentId), 'LAFEA_SHELL_MIDSURFACE_SEGMENT_ID_DUPLICATE');
  const segmentById = new Map(segments.map((row) => [row.segmentId, row]));

  if (!Array.isArray(value.loops) || value.loops.length !== 1) {
    fail('LAFEA_SHELL_MIDSURFACE_SINGLE_OUTER_LOOP_REQUIRED');
  }
  const loop = value.loops[0];
  exact(loop, ['loopId', 'role', 'segmentIds'], 'LAFEA_SHELL_MIDSURFACE_LOOP_KEYS_INVALID');
  if (loop.role !== 'OUTER' || !Array.isArray(loop.segmentIds)
    || loop.segmentIds.length !== segments.length) {
    fail('LAFEA_SHELL_MIDSURFACE_OUTER_LOOP_INVALID');
  }
  const segmentIds = loop.segmentIds.map((id) => text(id, 'LOOP_SEGMENT_ID'));
  unique(segmentIds, 'LAFEA_SHELL_MIDSURFACE_LOOP_SEGMENT_DUPLICATE');
  if (segmentIds.some((id) => !segmentById.has(id))) {
    fail('LAFEA_SHELL_MIDSURFACE_LOOP_SEGMENT_MISSING');
  }
  requireClosedLoop(segmentIds, segmentById);
  const vertexById = new Map(vertices.map((row) => [row.vertexId, row]));
  const area2 = signedArea2(segmentIds, segmentById, vertexById);
  if (!(area2 > 1e-12)) fail('LAFEA_SHELL_MIDSURFACE_OUTER_LOOP_NOT_CCW_OR_DEGENERATE');

  const core = {
    schema: exactText(value.schema, LAFEA_SHELL_MIDSURFACE_GEOMETRY_SCHEMA, 'GEOMETRY_SCHEMA'),
    stageId,
    geometryId: text(value.geometryId, 'GEOMETRY_ID'),
    lengthUnit: text(value.lengthUnit, 'LENGTH_UNIT'),
    origin,
    axisU,
    axisV,
    orientationPolicy: exactText(
      value.orientationPolicy, LAFEA_SHELL_MIDSURFACE_ORIENTATION, 'ORIENTATION_POLICY',
    ),
    vertices,
    segments,
    loops: freeze([freeze({
      loopId: text(loop.loopId, 'LOOP_ID'), role: 'OUTER', segmentIds: freeze(segmentIds),
    })]),
  };
  return freeze({
    ...core,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea-shell-midsurface-geometry-hash-input/v1', geometry: core,
    }),
  });
}

export function validateLafeaShellMidsurfaceGeometry(value) {
  exact(value, GEOMETRY_OUTPUT_KEYS, 'LAFEA_SHELL_MIDSURFACE_GEOMETRY_OUTPUT_KEYS_INVALID');
  const rebuilt = createLafeaShellMidsurfaceGeometry({
    schema: value.schema,
    stageId: value.stageId,
    geometryId: value.geometryId,
    lengthUnit: value.lengthUnit,
    origin: value.origin,
    axisU: value.axisU,
    axisV: value.axisV,
    orientationPolicy: value.orientationPolicy,
    vertices: value.vertices,
    segments: value.segments,
    loops: value.loops,
  });
  if (value.semanticHash !== rebuilt.semanticHash) {
    fail('LAFEA_SHELL_MIDSURFACE_GEOMETRY_HASH_INVALID');
  }
  return rebuilt;
}

export function createLafeaShellMidsurfaceEvidence(value) {
  exact(value, EVIDENCE_KEYS, 'LAFEA_SHELL_MIDSURFACE_EVIDENCE_KEYS_INVALID');
  exactText(value.schema, LAFEA_SHELL_MIDSURFACE_INTAKE_SCHEMA, 'EVIDENCE_INTAKE_SCHEMA');
  const geometry = validateOrCreateGeometry(value.geometry);
  const domain = validateOrCreateDomain(value.analysisDomain);
  const stageId = stage(value.stageId);
  const sourceHash = sha256(value.sourceHash, 'SOURCE_HASH');
  if (geometry.stageId !== stageId || domain.stageId !== stageId
    || domain.sourceHash !== sourceHash
    || domain.midsurfaceGeometryHash !== geometry.semanticHash
    || domain.lengthUnit !== geometry.lengthUnit) {
    fail('LAFEA_SHELL_MIDSURFACE_EVIDENCE_PARENT_MISMATCH');
  }
  const core = {
    schema: LAFEA_SHELL_MIDSURFACE_EVIDENCE_SCHEMA,
    stageId,
    sourceHash,
    analysisDomainHash: domain.semanticHash,
    analysisGeometryHash: geometry.semanticHash,
    analysisDomain: domain,
    geometry,
    producerRef: text(value.producerRef, 'PRODUCER_REF'),
    qualification: 'PASS',
    limitations: freeze([
      'PLANAR_SINGLE_PATCH_ONLY',
      'STRAIGHT_PERIMETER_SEGMENTS_ONLY',
      'NO_HOLES',
      'NO_MULTI_PATCH_SEAMS',
      'NO_CURVED_MIDSURFACE',
      'NO_OFFSET_SURFACE_GENERATION',
      'NO_THICKNESS_TRANSITION_MESHING',
    ]),
  };
  return freeze({
    ...core,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea-shell-midsurface-evidence-hash-input/v1', evidence: core,
    }),
  });
}

export function validateLafeaShellMidsurfaceEvidence(value) {
  if (!value || value.schema !== LAFEA_SHELL_MIDSURFACE_EVIDENCE_SCHEMA) {
    fail('LAFEA_SHELL_MIDSURFACE_EVIDENCE_SCHEMA_INVALID');
  }
  const rebuilt = createLafeaShellMidsurfaceEvidence({
    schema: LAFEA_SHELL_MIDSURFACE_INTAKE_SCHEMA,
    stageId: value.stageId,
    sourceHash: value.sourceHash,
    analysisDomain: value.analysisDomain,
    geometry: value.geometry,
    producerRef: value.producerRef,
  });
  if (rebuilt.semanticHash !== value.semanticHash) {
    fail('LAFEA_SHELL_MIDSURFACE_EVIDENCE_TAMPERED');
  }
  return rebuilt;
}

export function shellMidsurfacePoint3d(geometryValue, u, v) {
  const geometry = validateLafeaShellMidsurfaceGeometry(geometryValue);
  return freeze({
    x: canonical(geometry.origin.x + geometry.axisU.x * u + geometry.axisV.x * v),
    y: canonical(geometry.origin.y + geometry.axisU.y * u + geometry.axisV.y * v),
    z: canonical(geometry.origin.z + geometry.axisU.z * u + geometry.axisV.z * v),
  });
}

function validateOrCreateGeometry(value) {
  return value?.semanticHash
    ? validateLafeaShellMidsurfaceGeometry(value)
    : createLafeaShellMidsurfaceGeometry(value);
}
function validateOrCreateDomain(value) {
  return value?.semanticHash
    ? validateLafeaShellAnalysisDomain(value)
    : createLafeaShellAnalysisDomain(value);
}
function requireClosedLoop(ids, byId) {
  for (let index = 0; index < ids.length; index += 1) {
    const current = byId.get(ids[index]);
    const next = byId.get(ids[(index + 1) % ids.length]);
    if (current.endVertexId !== next.startVertexId) fail('LAFEA_SHELL_MIDSURFACE_LOOP_NOT_CONTIGUOUS');
  }
}
function signedArea2(ids, segmentById, vertexById) {
  return ids.reduce((sum, id) => {
    const segment = segmentById.get(id);
    const a = vertexById.get(segment.startVertexId);
    const b = vertexById.get(segment.endVertexId);
    return sum + a.u * b.v - b.u * a.v;
  }, 0);
}
function vector3(value, field) {
  exact(value, ['x', 'y', 'z'], `LAFEA_SHELL_MIDSURFACE_${field}_KEYS_INVALID`);
  return freeze({ x: finite(value.x, `${field}_X`), y: finite(value.y, `${field}_Y`), z: finite(value.z, `${field}_Z`) });
}
function unitVector(value, field) {
  const vector = vector3(value, field);
  if (Math.abs(norm(vector) - 1) > 1e-12) fail(`LAFEA_SHELL_MIDSURFACE_${field}_NOT_UNIT`);
  return vector;
}
function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
function cross(a, b) { return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }; }
function norm(a) { return Math.hypot(a.x, a.y, a.z); }
function byId(key) { return (a, b) => a[key].localeCompare(b[key]); }
function unique(values, code) { if (new Set(values).size !== values.length) fail(code); }
function stage(value) { if (!LAFEA_SHELL_MIDSURFACE_STAGES.includes(value)) fail('LAFEA_SHELL_MIDSURFACE_STAGE_INVALID'); return value; }
function exactText(value, expected, field) { if (value !== expected) fail(`LAFEA_SHELL_MIDSURFACE_${field}_INVALID`); return value; }
function text(value, field) { if (typeof value !== 'string' || !value.trim()) fail(`LAFEA_SHELL_MIDSURFACE_${field}_INVALID`); return value.trim(); }
function sha256(value, field) { const out = text(value, field); if (!/^sha256:[0-9a-f]{64}$/u.test(out)) fail(`LAFEA_SHELL_MIDSURFACE_${field}_INVALID`); return out; }
function finite(value, field) { if (!Number.isFinite(value)) fail(`LAFEA_SHELL_MIDSURFACE_${field}_INVALID`); return canonical(value); }
function canonical(value) { return Object.is(value, -0) ? 0 : value; }
function exact(value, keys, code) { if (!value || typeof value !== 'object' || Array.isArray(value) || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) fail(code); }
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.values(value).forEach(freeze); return Object.freeze(value); }
