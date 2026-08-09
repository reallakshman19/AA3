import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import {
  LAFEA_SHELL_ANALYSIS_DOMAIN_SCHEMA,
  LAFEA_SHELL_MIDSURFACE_GEOMETRY_SCHEMA,
  LAFEA_SHELL_MIDSURFACE_ORIENTATION,
  LAFEA_SHELL_MIDSURFACE_TOPOLOGY,
  createLafeaShellAnalysisDomain,
  createLafeaShellMidsurfaceGeometry,
  validateLafeaShellAnalysisDomain,
  validateLafeaShellMidsurfaceGeometry,
} from './lafea-shell-midsurface-contract.js';

export const LAFEA_SHELL_REFERENCE_SURFACE_GEOMETRY_SCHEMA =
  'lafea-shell-reference-surface-geometry/v1';
export const LAFEA_SHELL_OFFSET_MIDSURFACE_EVIDENCE_SCHEMA =
  'lafea-shell-offset-midsurface-evidence/v1';
export const LAFEA_SHELL_OFFSET_MIDSURFACE_INTAKE_SCHEMA =
  'lafea-shell-offset-midsurface-evidence-intake/v1';
export const LAFEA_SHELL_OFFSET_CONVENTIONS = Object.freeze([
  'MIDSURFACE', 'TOP_OFFSET', 'BOTTOM_OFFSET',
]);
export const LAFEA_SHELL_OFFSET_TOPOLOGY =
  'PLANAR_SINGLE_RECTANGULAR_REFERENCE_SURFACE_CONSTANT_OFFSET_V1';
export const LAFEA_SHELL_OFFSET_NORMAL_RULE = 'AXIS_U_CROSS_AXIS_V_POSITIVE_V1';

const STAGES = Object.freeze(['LAFEA.4', 'LAFEA.5']);
const REFERENCE_KEYS = Object.freeze([
  'schema', 'stageId', 'geometryId', 'lengthUnit', 'origin', 'axisU', 'axisV',
  'orientationPolicy', 'vertices', 'segments', 'loops',
]);
const REFERENCE_OUTPUT_KEYS = Object.freeze([...REFERENCE_KEYS, 'semanticHash']);
const INTAKE_KEYS = Object.freeze([
  'schema', 'stageId', 'sourceHash', 'referenceSurface', 'thickness',
  'offsetConvention', 'producerRef',
]);
const LIMITATIONS = Object.freeze([
  'PLANAR_SINGLE_RECTANGULAR_REFERENCE_SURFACE_ONLY',
  'CONSTANT_THICKNESS_ONLY',
  'CONSTANT_NORMAL_OFFSET_ONLY',
  'POSITIVE_NORMAL_AXIS_U_CROSS_AXIS_V',
  'NO_HOLES_ON_OFFSET_REFERENCE_SURFACE',
  'NO_CURVED_OFFSET_SURFACE_GENERATION',
  'NO_MULTIPATCH_OFFSET_SURFACE_GENERATION',
  'NO_VARIABLE_THICKNESS',
  'NO_THICKNESS_TRANSITIONS',
  'NO_SHELL_STIFFNESS_ECCENTRICITY_CLAIM',
]);
const EPS = 1e-12;

/**
 * Reference-surface geometry has the same geometric fields as a planar shell
 * midsurface but is not itself the analysis midsurface. The positive reference
 * normal is exactly axisU x axisV.
 */
export function createLafeaShellReferenceSurfaceGeometry(value) {
  exact(value, REFERENCE_KEYS, 'LAFEA_SHELL_REFERENCE_SURFACE_KEYS_INVALID');
  exactText(value.schema, LAFEA_SHELL_REFERENCE_SURFACE_GEOMETRY_SCHEMA,
    'LAFEA_SHELL_REFERENCE_SURFACE_SCHEMA_INVALID');
  const validated = createLafeaShellMidsurfaceGeometry({
    schema: LAFEA_SHELL_MIDSURFACE_GEOMETRY_SCHEMA,
    stageId: stage(value.stageId),
    geometryId: text(value.geometryId, 'LAFEA_SHELL_REFERENCE_SURFACE_GEOMETRY_ID_INVALID'),
    lengthUnit: text(value.lengthUnit, 'LAFEA_SHELL_REFERENCE_SURFACE_LENGTH_UNIT_INVALID'),
    origin: value.origin,
    axisU: value.axisU,
    axisV: value.axisV,
    orientationPolicy: LAFEA_SHELL_MIDSURFACE_ORIENTATION,
    vertices: value.vertices,
    segments: value.segments,
    loops: value.loops,
  });
  requireRectangularHoleFree(validated);
  const core = {
    schema: LAFEA_SHELL_REFERENCE_SURFACE_GEOMETRY_SCHEMA,
    stageId: validated.stageId,
    geometryId: validated.geometryId,
    lengthUnit: validated.lengthUnit,
    origin: validated.origin,
    axisU: validated.axisU,
    axisV: validated.axisV,
    orientationPolicy: exactText(value.orientationPolicy, LAFEA_SHELL_MIDSURFACE_ORIENTATION,
      'LAFEA_SHELL_REFERENCE_SURFACE_ORIENTATION_INVALID'),
    vertices: validated.vertices,
    segments: validated.segments,
    loops: validated.loops,
  };
  return freeze({
    ...core,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea-shell-reference-surface-geometry-hash-input/v1', referenceSurface: core,
    }),
  });
}

export function validateLafeaShellReferenceSurfaceGeometry(value) {
  exact(value, REFERENCE_OUTPUT_KEYS, 'LAFEA_SHELL_REFERENCE_SURFACE_OUTPUT_KEYS_INVALID');
  const rebuilt = createLafeaShellReferenceSurfaceGeometry({
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
  if (rebuilt.semanticHash !== value.semanticHash) {
    fail('LAFEA_SHELL_REFERENCE_SURFACE_HASH_TAMPERED');
  }
  return rebuilt;
}

/**
 * Derive the analysis midsurface from a declared planar reference surface.
 *
 * Positive normal n = axisU x axisV.
 *
 * MIDSURFACE   : delta = 0
 * TOP_OFFSET   : reference is the +n physical face, so midsurface = ref - t/2 n
 * BOTTOM_OFFSET: reference is the -n physical face, so midsurface = ref + t/2 n
 *
 * This is geometry derivation only. The local-shell solver receives the
 * derived midsurface node positions and the ordinary positive element
 * thickness; no eccentric stiffness or hidden rigid offset is introduced.
 */
export function createLafeaShellOffsetMidsurfaceEvidence(value) {
  exact(value, INTAKE_KEYS, 'LAFEA_SHELL_OFFSET_INTAKE_KEYS_INVALID');
  exactText(value.schema, LAFEA_SHELL_OFFSET_MIDSURFACE_INTAKE_SCHEMA,
    'LAFEA_SHELL_OFFSET_INTAKE_SCHEMA_INVALID');
  const stageId = stage(value.stageId);
  const sourceHash = sha256(value.sourceHash, 'LAFEA_SHELL_OFFSET_SOURCE_HASH_INVALID');
  const referenceSurface = value.referenceSurface?.semanticHash
    ? validateLafeaShellReferenceSurfaceGeometry(value.referenceSurface)
    : createLafeaShellReferenceSurfaceGeometry(value.referenceSurface);
  if (referenceSurface.stageId !== stageId) fail('LAFEA_SHELL_OFFSET_STAGE_MISMATCH');
  const thickness = positive(value.thickness, 'LAFEA_SHELL_OFFSET_THICKNESS_INVALID');
  const offsetConvention = member(value.offsetConvention, LAFEA_SHELL_OFFSET_CONVENTIONS,
    'LAFEA_SHELL_OFFSET_CONVENTION_INVALID');
  const signedReferenceToMidsurfaceOffset = offsetDistance(offsetConvention, thickness);
  const normal = cross(referenceSurface.axisU, referenceSurface.axisV);
  const derivedOrigin = {
    x: canonical(referenceSurface.origin.x + signedReferenceToMidsurfaceOffset * normal.x),
    y: canonical(referenceSurface.origin.y + signedReferenceToMidsurfaceOffset * normal.y),
    z: canonical(referenceSurface.origin.z + signedReferenceToMidsurfaceOffset * normal.z),
  };
  const geometry = createLafeaShellMidsurfaceGeometry({
    schema: LAFEA_SHELL_MIDSURFACE_GEOMETRY_SCHEMA,
    stageId,
    geometryId: `${referenceSurface.geometryId}:DERIVED-MIDSURFACE`,
    lengthUnit: referenceSurface.lengthUnit,
    origin: derivedOrigin,
    axisU: referenceSurface.axisU,
    axisV: referenceSurface.axisV,
    orientationPolicy: LAFEA_SHELL_MIDSURFACE_ORIENTATION,
    vertices: referenceSurface.vertices,
    segments: referenceSurface.segments,
    loops: referenceSurface.loops,
  });
  const analysisDomain = createLafeaShellAnalysisDomain({
    schema: LAFEA_SHELL_ANALYSIS_DOMAIN_SCHEMA,
    stageId,
    domainId: `${referenceSurface.geometryId}:OFFSET-DOMAIN`,
    sourceHash,
    midsurfaceGeometryHash: geometry.semanticHash,
    lengthUnit: geometry.lengthUnit,
    topologyClass: LAFEA_SHELL_MIDSURFACE_TOPOLOGY,
  });
  const core = {
    schema: LAFEA_SHELL_OFFSET_MIDSURFACE_EVIDENCE_SCHEMA,
    stageId,
    sourceHash,
    analysisDomainHash: analysisDomain.semanticHash,
    analysisGeometryHash: geometry.semanticHash,
    analysisDomain,
    geometry,
    referenceSurface,
    referenceSurfaceHash: referenceSurface.semanticHash,
    thickness,
    offsetConvention,
    normalRule: LAFEA_SHELL_OFFSET_NORMAL_RULE,
    positiveNormal: normal,
    signedReferenceToMidsurfaceOffset,
    producerRef: text(value.producerRef, 'LAFEA_SHELL_OFFSET_PRODUCER_REF_INVALID'),
    qualification: 'PASS',
    limitations: LIMITATIONS,
  };
  return freeze({
    ...core,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea-shell-offset-midsurface-evidence-hash-input/v1', evidence: core,
    }),
  });
}

export function validateLafeaShellOffsetMidsurfaceEvidence(value) {
  if (!value || value.schema !== LAFEA_SHELL_OFFSET_MIDSURFACE_EVIDENCE_SCHEMA) {
    fail('LAFEA_SHELL_OFFSET_EVIDENCE_SCHEMA_INVALID');
  }
  const referenceSurface = validateLafeaShellReferenceSurfaceGeometry(value.referenceSurface);
  const geometry = validateLafeaShellMidsurfaceGeometry(value.geometry);
  const domain = validateLafeaShellAnalysisDomain(value.analysisDomain);
  const rebuilt = createLafeaShellOffsetMidsurfaceEvidence({
    schema: LAFEA_SHELL_OFFSET_MIDSURFACE_INTAKE_SCHEMA,
    stageId: value.stageId,
    sourceHash: value.sourceHash,
    referenceSurface,
    thickness: value.thickness,
    offsetConvention: value.offsetConvention,
    producerRef: value.producerRef,
  });
  if (rebuilt.semanticHash !== value.semanticHash
    || geometry.semanticHash !== rebuilt.geometry.semanticHash
    || domain.semanticHash !== rebuilt.analysisDomain.semanticHash) {
    fail('LAFEA_SHELL_OFFSET_EVIDENCE_TAMPERED');
  }
  return rebuilt;
}

export function shellOffsetExpectedMidsurfaceOrigin(value) {
  const evidence = validateLafeaShellOffsetMidsurfaceEvidence(value);
  return evidence.geometry.origin;
}

function offsetDistance(convention, thickness) {
  if (convention === 'TOP_OFFSET') return canonical(-thickness / 2);
  if (convention === 'BOTTOM_OFFSET') return canonical(thickness / 2);
  return 0;
}
function requireRectangularHoleFree(geometry) {
  if (geometry.loops.length !== 1 || geometry.loops[0].role !== 'OUTER') {
    fail('LAFEA_SHELL_OFFSET_HOLES_NOT_QUALIFIED');
  }
  if (geometry.vertices.length !== 4 || geometry.segments.length !== 4) {
    fail('LAFEA_SHELL_OFFSET_RECTANGULAR_REFERENCE_SURFACE_REQUIRED');
  }
  const uMin = Math.min(...geometry.vertices.map((row) => row.u));
  const uMax = Math.max(...geometry.vertices.map((row) => row.u));
  const vMin = Math.min(...geometry.vertices.map((row) => row.v));
  const vMax = Math.max(...geometry.vertices.map((row) => row.v));
  if (!(uMax > uMin) || !(vMax > vMin)) fail('LAFEA_SHELL_OFFSET_RECTANGULAR_REFERENCE_SURFACE_REQUIRED');
  const corners = new Set(geometry.vertices.map((row) => `${row.u}|${row.v}`));
  for (const key of [`${uMin}|${vMin}`, `${uMax}|${vMin}`, `${uMax}|${vMax}`, `${uMin}|${vMax}`]) {
    if (!corners.has(key)) fail('LAFEA_SHELL_OFFSET_RECTANGULAR_REFERENCE_SURFACE_REQUIRED');
  }
}
function stage(value) {
  if (!STAGES.includes(value)) fail('LAFEA_SHELL_OFFSET_STAGE_INVALID');
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
function positive(value, code) { if (!(Number.isFinite(value) && value > 0)) fail(code); return canonical(value); }
function member(value, allowed, code) { if (!allowed.includes(value)) fail(code); return value; }
function canonical(value) { return Object.is(value, -0) ? 0 : Number(value.toPrecision(15)); }
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
