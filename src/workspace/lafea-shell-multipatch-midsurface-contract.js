import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import {
  LAFEA_SHELL_MIDSURFACE_GEOMETRY_SCHEMA,
  LAFEA_SHELL_MIDSURFACE_ORIENTATION,
  createLafeaShellMidsurfaceGeometry,
} from './lafea-shell-midsurface-contract.js';

export const LAFEA_SHELL_MULTIPATCH_ANALYSIS_DOMAIN_SCHEMA =
  'lafea-shell-multipatch-analysis-domain/v1';
export const LAFEA_SHELL_MULTIPATCH_MIDSURFACE_GEOMETRY_SCHEMA =
  'lafea-shell-multipatch-midsurface-geometry/v1';
export const LAFEA_SHELL_MULTIPATCH_MIDSURFACE_EVIDENCE_SCHEMA =
  'lafea-shell-multipatch-midsurface-evidence/v1';
export const LAFEA_SHELL_MULTIPATCH_MIDSURFACE_INTAKE_SCHEMA =
  'lafea-shell-multipatch-midsurface-evidence-intake/v1';
export const LAFEA_SHELL_MULTIPATCH_TOPOLOGY =
  'PLANAR_TWO_RECTANGULAR_PATCHES_CONFORMING_FULL_EDGE_SEAM_V1';
export const LAFEA_SHELL_MULTIPATCH_ORIENTATION =
  'COPLANAR_COMMON_RIGHT_HANDED_BASIS_CONFORMING_SEAM_V1';

const STAGES = Object.freeze(['LAFEA.4', 'LAFEA.5']);
const DOMAIN_KEYS = Object.freeze([
  'schema', 'stageId', 'domainId', 'sourceHash', 'midsurfaceGeometryHash',
  'lengthUnit', 'topologyClass',
]);
const DOMAIN_OUTPUT_KEYS = Object.freeze([...DOMAIN_KEYS, 'semanticHash']);
const GEOMETRY_KEYS = Object.freeze([
  'schema', 'stageId', 'geometryId', 'lengthUnit', 'origin', 'axisU', 'axisV',
  'orientationPolicy', 'patches', 'seams',
]);
const GEOMETRY_OUTPUT_KEYS = Object.freeze([...GEOMETRY_KEYS, 'semanticHash']);
const EVIDENCE_KEYS = Object.freeze([
  'schema', 'stageId', 'sourceHash', 'analysisDomain', 'geometry', 'producerRef',
]);
const PATCH_KEYS = Object.freeze(['patchId', 'vertices', 'segments', 'loops']);
const SEAM_KEYS = Object.freeze([
  'seamId', 'patchAId', 'segmentAId', 'patchBId', 'segmentBId',
]);
const LIMITATIONS = Object.freeze([
  'EXACTLY_TWO_PATCHES',
  'PLANAR_COPLANAR_COMMON_BASIS_ONLY',
  'RECTANGULAR_PATCHES_ONLY',
  'ONE_COMPLETE_STRAIGHT_CONFORMING_SEAM_ONLY',
  'NO_PARTIAL_EDGE_SEAMS',
  'NO_NONCONFORMING_SEAM_DISCRETIZATION',
  'NO_HOLES',
  'NO_CREASE_OR_KINKED_DIRECTOR_SEAM',
  'NO_CURVED_PATCH_IN_MULTIPATCH_SET',
  'NO_PATCH_NETWORKS',
  'NO_OFFSET_SURFACE_GENERATION',
  'NO_THICKNESS_TRANSITION_MESHING',
]);
const EPS = 1e-10;

export function createLafeaMultiPatchShellAnalysisDomain(value) {
  exact(value, DOMAIN_KEYS, 'LAFEA_SHELL_MULTIPATCH_DOMAIN_KEYS_INVALID');
  const core = {
    schema: exactText(value.schema, LAFEA_SHELL_MULTIPATCH_ANALYSIS_DOMAIN_SCHEMA,
      'LAFEA_SHELL_MULTIPATCH_DOMAIN_SCHEMA_INVALID'),
    stageId: stage(value.stageId),
    domainId: text(value.domainId, 'LAFEA_SHELL_MULTIPATCH_DOMAIN_ID_INVALID'),
    sourceHash: sha256(value.sourceHash, 'LAFEA_SHELL_MULTIPATCH_SOURCE_HASH_INVALID'),
    midsurfaceGeometryHash: sha256(value.midsurfaceGeometryHash,
      'LAFEA_SHELL_MULTIPATCH_GEOMETRY_HASH_INVALID'),
    lengthUnit: text(value.lengthUnit, 'LAFEA_SHELL_MULTIPATCH_LENGTH_UNIT_INVALID'),
    topologyClass: exactText(value.topologyClass, LAFEA_SHELL_MULTIPATCH_TOPOLOGY,
      'LAFEA_SHELL_MULTIPATCH_TOPOLOGY_CLASS_INVALID'),
  };
  return freeze({
    ...core,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea-shell-multipatch-analysis-domain-hash-input/v1', domain: core,
    }),
  });
}

export function validateLafeaMultiPatchShellAnalysisDomain(value) {
  exact(value, DOMAIN_OUTPUT_KEYS, 'LAFEA_SHELL_MULTIPATCH_DOMAIN_OUTPUT_KEYS_INVALID');
  const rebuilt = createLafeaMultiPatchShellAnalysisDomain({
    schema: value.schema,
    stageId: value.stageId,
    domainId: value.domainId,
    sourceHash: value.sourceHash,
    midsurfaceGeometryHash: value.midsurfaceGeometryHash,
    lengthUnit: value.lengthUnit,
    topologyClass: value.topologyClass,
  });
  if (rebuilt.semanticHash !== value.semanticHash) {
    fail('LAFEA_SHELL_MULTIPATCH_DOMAIN_HASH_TAMPERED');
  }
  return rebuilt;
}

/**
 * Two coplanar rectangular shell patches in one common planar UV authority.
 * Each patch remains a real existing single-patch geometry contract; this
 * wrapper adds exactly one declared full-edge seam between them.
 */
export function createLafeaMultiPatchShellMidsurfaceGeometry(value) {
  exact(value, GEOMETRY_KEYS, 'LAFEA_SHELL_MULTIPATCH_GEOMETRY_KEYS_INVALID');
  const stageId = stage(value.stageId);
  const lengthUnit = text(value.lengthUnit, 'LAFEA_SHELL_MULTIPATCH_LENGTH_UNIT_INVALID');
  const frame = canonicalFrame(value.origin, value.axisU, value.axisV, stageId, lengthUnit);
  exactText(value.orientationPolicy, LAFEA_SHELL_MULTIPATCH_ORIENTATION,
    'LAFEA_SHELL_MULTIPATCH_ORIENTATION_POLICY_INVALID');
  if (!Array.isArray(value.patches) || value.patches.length !== 2) {
    fail('LAFEA_SHELL_MULTIPATCH_EXACTLY_TWO_PATCHES_REQUIRED');
  }
  const patches = value.patches.map((row) => canonicalPatch(row, frame))
    .sort((left, right) => left.patchId.localeCompare(right.patchId));
  unique(patches.map((row) => row.patchId), 'LAFEA_SHELL_MULTIPATCH_PATCH_ID_DUPLICATE');
  if (!Array.isArray(value.seams) || value.seams.length !== 1) {
    fail('LAFEA_SHELL_MULTIPATCH_EXACTLY_ONE_SEAM_REQUIRED');
  }
  const seam = canonicalSeam(value.seams[0], patches);
  validateTwoRectanglePartition(patches, seam);
  const core = {
    schema: exactText(value.schema, LAFEA_SHELL_MULTIPATCH_MIDSURFACE_GEOMETRY_SCHEMA,
      'LAFEA_SHELL_MULTIPATCH_GEOMETRY_SCHEMA_INVALID'),
    stageId,
    geometryId: text(value.geometryId, 'LAFEA_SHELL_MULTIPATCH_GEOMETRY_ID_INVALID'),
    lengthUnit,
    origin: frame.origin,
    axisU: frame.axisU,
    axisV: frame.axisV,
    orientationPolicy: LAFEA_SHELL_MULTIPATCH_ORIENTATION,
    patches,
    seams: freeze([seam]),
  };
  return freeze({
    ...core,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea-shell-multipatch-midsurface-geometry-hash-input/v1', geometry: core,
    }),
  });
}

export function validateLafeaMultiPatchShellMidsurfaceGeometry(value) {
  exact(value, GEOMETRY_OUTPUT_KEYS, 'LAFEA_SHELL_MULTIPATCH_GEOMETRY_OUTPUT_KEYS_INVALID');
  const rebuilt = createLafeaMultiPatchShellMidsurfaceGeometry({
    schema: value.schema,
    stageId: value.stageId,
    geometryId: value.geometryId,
    lengthUnit: value.lengthUnit,
    origin: value.origin,
    axisU: value.axisU,
    axisV: value.axisV,
    orientationPolicy: value.orientationPolicy,
    patches: value.patches.map((row) => ({
      patchId: row.patchId,
      vertices: row.geometry.vertices,
      segments: row.geometry.segments,
      loops: row.geometry.loops,
    })),
    seams: value.seams,
  });
  if (rebuilt.semanticHash !== value.semanticHash) {
    fail('LAFEA_SHELL_MULTIPATCH_GEOMETRY_HASH_TAMPERED');
  }
  return rebuilt;
}

export function createLafeaMultiPatchShellMidsurfaceEvidence(value) {
  exact(value, EVIDENCE_KEYS, 'LAFEA_SHELL_MULTIPATCH_EVIDENCE_KEYS_INVALID');
  exactText(value.schema, LAFEA_SHELL_MULTIPATCH_MIDSURFACE_INTAKE_SCHEMA,
    'LAFEA_SHELL_MULTIPATCH_EVIDENCE_INTAKE_SCHEMA_INVALID');
  const geometry = value.geometry?.semanticHash
    ? validateLafeaMultiPatchShellMidsurfaceGeometry(value.geometry)
    : createLafeaMultiPatchShellMidsurfaceGeometry(value.geometry);
  const domain = value.analysisDomain?.semanticHash
    ? validateLafeaMultiPatchShellAnalysisDomain(value.analysisDomain)
    : createLafeaMultiPatchShellAnalysisDomain(value.analysisDomain);
  const stageId = stage(value.stageId);
  const sourceHash = sha256(value.sourceHash, 'LAFEA_SHELL_MULTIPATCH_SOURCE_HASH_INVALID');
  if (geometry.stageId !== stageId || domain.stageId !== stageId
    || domain.sourceHash !== sourceHash
    || domain.midsurfaceGeometryHash !== geometry.semanticHash
    || domain.lengthUnit !== geometry.lengthUnit
    || domain.topologyClass !== LAFEA_SHELL_MULTIPATCH_TOPOLOGY) {
    fail('LAFEA_SHELL_MULTIPATCH_EVIDENCE_PARENT_MISMATCH');
  }
  const core = {
    schema: LAFEA_SHELL_MULTIPATCH_MIDSURFACE_EVIDENCE_SCHEMA,
    stageId,
    sourceHash,
    analysisDomainHash: domain.semanticHash,
    analysisGeometryHash: geometry.semanticHash,
    analysisDomain: domain,
    geometry,
    producerRef: text(value.producerRef, 'LAFEA_SHELL_MULTIPATCH_PRODUCER_REF_INVALID'),
    qualification: 'PASS',
    limitations: LIMITATIONS,
  };
  return freeze({
    ...core,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea-shell-multipatch-midsurface-evidence-hash-input/v1', evidence: core,
    }),
  });
}

export function validateLafeaMultiPatchShellMidsurfaceEvidence(value) {
  if (!value || value.schema !== LAFEA_SHELL_MULTIPATCH_MIDSURFACE_EVIDENCE_SCHEMA) {
    fail('LAFEA_SHELL_MULTIPATCH_EVIDENCE_SCHEMA_INVALID');
  }
  const rebuilt = createLafeaMultiPatchShellMidsurfaceEvidence({
    schema: LAFEA_SHELL_MULTIPATCH_MIDSURFACE_INTAKE_SCHEMA,
    stageId: value.stageId,
    sourceHash: value.sourceHash,
    analysisDomain: value.analysisDomain,
    geometry: value.geometry,
    producerRef: value.producerRef,
  });
  if (rebuilt.semanticHash !== value.semanticHash) {
    fail('LAFEA_SHELL_MULTIPATCH_EVIDENCE_TAMPERED');
  }
  return rebuilt;
}

export function multiPatchShellPoint3d(geometryValue, u, v) {
  const geometry = validateLafeaMultiPatchShellMidsurfaceGeometry(geometryValue);
  return freeze({
    x: canonical(geometry.origin.x + geometry.axisU.x * u + geometry.axisV.x * v),
    y: canonical(geometry.origin.y + geometry.axisU.y * u + geometry.axisV.y * v),
    z: canonical(geometry.origin.z + geometry.axisU.z * u + geometry.axisV.z * v),
  });
}

export function multiPatchShellFrame(geometryValue) {
  const geometry = validateLafeaMultiPatchShellMidsurfaceGeometry(geometryValue);
  return freeze({
    director: cross(geometry.axisU, geometry.axisV),
    rotationBasis1: geometry.axisU,
    rotationBasis2: geometry.axisV,
  });
}

export function multiPatchShellPatchGeometry(geometryValue, patchId) {
  const geometry = validateLafeaMultiPatchShellMidsurfaceGeometry(geometryValue);
  const patch = geometry.patches.find((row) => row.patchId === patchId);
  if (!patch) fail('LAFEA_SHELL_MULTIPATCH_PATCH_NOT_FOUND');
  return patch.geometry;
}

function canonicalFrame(origin, axisU, axisV, stageId, lengthUnit) {
  // Reuse the existing single-patch authority as the frame validator.
  const probe = createLafeaShellMidsurfaceGeometry({
    schema: LAFEA_SHELL_MIDSURFACE_GEOMETRY_SCHEMA,
    stageId,
    geometryId: 'MULTIPATCH-FRAME-PROBE',
    lengthUnit,
    origin,
    axisU,
    axisV,
    orientationPolicy: LAFEA_SHELL_MIDSURFACE_ORIENTATION,
    vertices: [
      { vertexId: 'V1', u: 0, v: 0 },
      { vertexId: 'V2', u: 1, v: 0 },
      { vertexId: 'V3', u: 0, v: 1 },
    ],
    segments: [
      { segmentId: 'S1', startVertexId: 'V1', endVertexId: 'V2' },
      { segmentId: 'S2', startVertexId: 'V2', endVertexId: 'V3' },
      { segmentId: 'S3', startVertexId: 'V3', endVertexId: 'V1' },
    ],
    loops: [{ loopId: 'L', role: 'OUTER', segmentIds: ['S1', 'S2', 'S3'] }],
  });
  return freeze({
    stageId,
    lengthUnit,
    origin: probe.origin,
    axisU: probe.axisU,
    axisV: probe.axisV,
  });
}

function canonicalPatch(value, frame) {
  exact(value, PATCH_KEYS, 'LAFEA_SHELL_MULTIPATCH_PATCH_KEYS_INVALID');
  const patchId = text(value.patchId, 'LAFEA_SHELL_MULTIPATCH_PATCH_ID_INVALID');
  const geometry = createLafeaShellMidsurfaceGeometry({
    schema: LAFEA_SHELL_MIDSURFACE_GEOMETRY_SCHEMA,
    stageId: frame.stageId,
    geometryId: `MULTIPATCH:${patchId}`,
    lengthUnit: frame.lengthUnit,
    origin: frame.origin,
    axisU: frame.axisU,
    axisV: frame.axisV,
    orientationPolicy: LAFEA_SHELL_MIDSURFACE_ORIENTATION,
    vertices: value.vertices,
    segments: value.segments,
    loops: value.loops,
  });
  if (geometry.loops.some((row) => row.role === 'HOLE')) {
    fail('LAFEA_SHELL_MULTIPATCH_HOLES_NOT_QUALIFIED');
  }
  requireRectangle(geometry);
  return freeze({ patchId, geometry });
}

function canonicalSeam(value, patches) {
  exact(value, SEAM_KEYS, 'LAFEA_SHELL_MULTIPATCH_SEAM_KEYS_INVALID');
  const seamId = text(value.seamId, 'LAFEA_SHELL_MULTIPATCH_SEAM_ID_INVALID');
  const left = {
    patchId: text(value.patchAId, 'LAFEA_SHELL_MULTIPATCH_SEAM_PATCH_ID_INVALID'),
    segmentId: text(value.segmentAId, 'LAFEA_SHELL_MULTIPATCH_SEAM_SEGMENT_ID_INVALID'),
  };
  const right = {
    patchId: text(value.patchBId, 'LAFEA_SHELL_MULTIPATCH_SEAM_PATCH_ID_INVALID'),
    segmentId: text(value.segmentBId, 'LAFEA_SHELL_MULTIPATCH_SEAM_SEGMENT_ID_INVALID'),
  };
  if (left.patchId === right.patchId) fail('LAFEA_SHELL_MULTIPATCH_SEAM_REQUIRES_DISTINCT_PATCHES');
  const ordered = [left, right].sort((a, b) => a.patchId.localeCompare(b.patchId));
  const patchById = new Map(patches.map((row) => [row.patchId, row]));
  for (const side of ordered) {
    const patch = patchById.get(side.patchId);
    if (!patch) fail('LAFEA_SHELL_MULTIPATCH_SEAM_PATCH_NOT_FOUND');
    if (!patch.geometry.segments.some((segment) => segment.segmentId === side.segmentId)) {
      fail('LAFEA_SHELL_MULTIPATCH_SEAM_SEGMENT_NOT_FOUND');
    }
  }
  return freeze({
    seamId,
    patchAId: ordered[0].patchId,
    segmentAId: ordered[0].segmentId,
    patchBId: ordered[1].patchId,
    segmentBId: ordered[1].segmentId,
  });
}

function validateTwoRectanglePartition(patches, seam) {
  const a = patches.find((row) => row.patchId === seam.patchAId);
  const b = patches.find((row) => row.patchId === seam.patchBId);
  const segmentA = segmentPoints(a.geometry, seam.segmentAId);
  const segmentB = segmentPoints(b.geometry, seam.segmentBId);
  if (!samePoint(segmentA.start, segmentB.end) || !samePoint(segmentA.end, segmentB.start)) {
    fail('LAFEA_SHELL_MULTIPATCH_SEAM_NOT_COINCIDENT_OPPOSITE');
  }
  const lengthA = distance(segmentA.start, segmentA.end);
  const lengthB = distance(segmentB.start, segmentB.end);
  if (!(lengthA > EPS) || Math.abs(lengthA - lengthB) > EPS) {
    fail('LAFEA_SHELL_MULTIPATCH_SEAM_LENGTH_MISMATCH');
  }
  const boundsA = bounds(a.geometry.vertices);
  const boundsB = bounds(b.geometry.vertices);
  const overlapU = Math.min(boundsA.uMax, boundsB.uMax) - Math.max(boundsA.uMin, boundsB.uMin);
  const overlapV = Math.min(boundsA.vMax, boundsB.vMax) - Math.max(boundsA.vMin, boundsB.vMin);
  const shareVertical = Math.abs(overlapU) <= EPS && overlapV > EPS;
  const shareHorizontal = Math.abs(overlapV) <= EPS && overlapU > EPS;
  if (!(shareVertical || shareHorizontal)) {
    if (overlapU > EPS && overlapV > EPS) fail('LAFEA_SHELL_MULTIPATCH_PATCH_INTERIORS_OVERLAP');
    fail('LAFEA_SHELL_MULTIPATCH_PATCHES_NOT_FULL_EDGE_ADJACENT');
  }
  const expectedLength = shareVertical ? overlapV : overlapU;
  if (Math.abs(expectedLength - lengthA) > EPS) {
    fail('LAFEA_SHELL_MULTIPATCH_PARTIAL_EDGE_SEAM_NOT_QUALIFIED');
  }
}

function requireRectangle(geometry) {
  if (geometry.vertices.length !== 4 || geometry.segments.length !== 4
    || geometry.loops.length !== 1) {
    fail('LAFEA_SHELL_MULTIPATCH_RECTANGULAR_PATCH_REQUIRED');
  }
  const b = bounds(geometry.vertices);
  const corners = new Set(geometry.vertices.map((row) => `${row.u}|${row.v}`));
  for (const key of [
    `${b.uMin}|${b.vMin}`, `${b.uMax}|${b.vMin}`,
    `${b.uMax}|${b.vMax}`, `${b.uMin}|${b.vMax}`,
  ]) if (!corners.has(key)) fail('LAFEA_SHELL_MULTIPATCH_RECTANGULAR_PATCH_REQUIRED');
  for (const segment of geometry.segments) {
    const endpoints = segmentPoints(geometry, segment.segmentId);
    const du = Math.abs(endpoints.end.u - endpoints.start.u);
    const dv = Math.abs(endpoints.end.v - endpoints.start.v);
    if ((du <= EPS) === (dv <= EPS)) fail('LAFEA_SHELL_MULTIPATCH_RECTANGULAR_PATCH_REQUIRED');
  }
}

function segmentPoints(geometry, segmentId) {
  const segment = geometry.segments.find((row) => row.segmentId === segmentId);
  if (!segment) fail('LAFEA_SHELL_MULTIPATCH_SEGMENT_NOT_FOUND');
  const vertexById = new Map(geometry.vertices.map((row) => [row.vertexId, row]));
  return { start: vertexById.get(segment.startVertexId), end: vertexById.get(segment.endVertexId) };
}
function bounds(vertices) {
  return {
    uMin: Math.min(...vertices.map((row) => row.u)),
    uMax: Math.max(...vertices.map((row) => row.u)),
    vMin: Math.min(...vertices.map((row) => row.v)),
    vMax: Math.max(...vertices.map((row) => row.v)),
  };
}
function samePoint(a, b) { return Math.abs(a.u - b.u) <= EPS && Math.abs(a.v - b.v) <= EPS; }
function distance(a, b) { return Math.hypot(b.u - a.u, b.v - a.v); }
function stage(value) {
  if (!STAGES.includes(value)) fail('LAFEA_SHELL_MULTIPATCH_STAGE_INVALID');
  return value;
}
function cross(a, b) {
  return freeze({
    x: canonical(a.y * b.z - a.z * b.y),
    y: canonical(a.z * b.x - a.x * b.z),
    z: canonical(a.x * b.y - a.y * b.x),
  });
}
function exact(value, keys, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join('|') !== [...keys].sort().join('|')) fail(code);
}
function exactText(value, expected, code) { if (value !== expected) fail(code); return value; }
function text(value, code) { if (typeof value !== 'string' || !value.trim()) fail(code); return value; }
function sha256(value, code) { if (typeof value !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(value)) fail(code); return value; }
function unique(values, code) { if (new Set(values).size !== values.length) fail(code); }
function canonical(value) { return Object.is(value, -0) ? 0 : Number(value.toPrecision(15)); }
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
