import { createLafeaAnalysisGeometry } from './lafea-analysis-geometry-contract.js';
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA_SHELL_PERIODIC_HOLE_ANALYSIS_DOMAIN_SCHEMA = 'lafea-shell-periodic-hole-analysis-domain/v1';
export const LAFEA_SHELL_PERIODIC_HOLE_MIDSURFACE_GEOMETRY_SCHEMA = 'lafea-shell-periodic-hole-midsurface-geometry/v1';
export const LAFEA_SHELL_PERIODIC_HOLE_MIDSURFACE_EVIDENCE_SCHEMA = 'lafea-shell-periodic-hole-midsurface-evidence/v1';
export const LAFEA_SHELL_PERIODIC_HOLE_MIDSURFACE_INTAKE_SCHEMA = 'lafea-shell-periodic-hole-midsurface-evidence-intake/v1';
export const LAFEA_SHELL_PERIODIC_HOLE_STAGES = Object.freeze(['LAFEA.4', 'LAFEA.5']);
export const LAFEA_SHELL_PERIODIC_HOLE_SURFACE_KIND = 'CYLINDER';
export const LAFEA_SHELL_PERIODIC_HOLE_TOPOLOGY = 'CYLINDRICAL_FULL_U_PERIODIC_ONE_RECTANGULAR_SEAM_CROSSING_HOLE_V1';
export const LAFEA_SHELL_PERIODIC_HOLE_ORIENTATION = 'CYLINDER_OUTWARD_U_PERIODIC_ONE_SEAM_HOLE_V1';
export const LAFEA_SHELL_PERIODIC_HOLE_SEAM_POLICY = 'IDENTIFY_UMIN_UMAX_BY_V_WITH_ONE_HOLE_GAP_V1';

const DOMAIN_KEYS = Object.freeze([
  'schema', 'stageId', 'domainId', 'sourceHash', 'midsurfaceGeometryHash',
  'lengthUnit', 'topologyClass',
]);
const DOMAIN_OUTPUT_KEYS = Object.freeze([...DOMAIN_KEYS, 'semanticHash']);
const GEOMETRY_KEYS = Object.freeze([
  'schema', 'stageId', 'geometryId', 'lengthUnit', 'surface', 'axialRange',
  'seamCrossingHole', 'orientationPolicy',
]);
const GEOMETRY_OUTPUT_KEYS = Object.freeze([...GEOMETRY_KEYS, 'semanticHash']);
const EVIDENCE_KEYS = Object.freeze([
  'schema', 'stageId', 'sourceHash', 'analysisDomain', 'geometry', 'producerRef',
]);
const SURFACE_KEYS = Object.freeze([
  'kind', 'axisOrigin', 'axisDirection', 'radialDirection', 'radius',
]);
const AXIAL_KEYS = Object.freeze(['vMin', 'vMax']);
const HOLE_KEYS = Object.freeze(['holeId', 'uMin', 'uMax', 'vMin', 'vMax']);
const LIMITATIONS = Object.freeze([
  'CYLINDER_ONLY',
  'FULL_CYLINDER_U_PERIODIC_SINGLE_PATCH_ONLY',
  'CANONICAL_SEAM_AT_PLUS_MINUS_PI_R',
  'EXACTLY_ONE_AXIS_ALIGNED_RECTANGULAR_HOLE_CROSSING_CANONICAL_SEAM',
  'HOLE_CIRCUMFERENTIAL_WIDTH_LESS_THAN_HALF_CIRCUMFERENCE',
  'OPEN_AXIAL_RIMS_ONLY',
  'NO_ADDITIONAL_OR_NON_RECTANGULAR_HOLES',
  'NO_MULTI_PATCH_SEAMS',
  'NO_CONE_SPHERE_NURBS_OR_FREEFORM',
  'NO_OFFSET_SURFACE_GENERATION',
  'NO_THICKNESS_TRANSITION_MESHING',
]);
const EPS = 1e-12;

export function createLafeaPeriodicHoleShellAnalysisDomain(value) {
  exact(value, DOMAIN_KEYS, 'LAFEA_SHELL_PERIODIC_HOLE_DOMAIN_KEYS_INVALID');
  const core = {
    schema: exactText(value.schema, LAFEA_SHELL_PERIODIC_HOLE_ANALYSIS_DOMAIN_SCHEMA, 'DOMAIN_SCHEMA'),
    stageId: stage(value.stageId),
    domainId: text(value.domainId, 'DOMAIN_ID'),
    sourceHash: sha256(value.sourceHash, 'SOURCE_HASH'),
    midsurfaceGeometryHash: sha256(value.midsurfaceGeometryHash, 'MIDSURFACE_GEOMETRY_HASH'),
    lengthUnit: text(value.lengthUnit, 'LENGTH_UNIT'),
    topologyClass: exactText(value.topologyClass, LAFEA_SHELL_PERIODIC_HOLE_TOPOLOGY, 'TOPOLOGY_CLASS'),
  };
  return freeze({
    ...core,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea-shell-periodic-hole-analysis-domain-hash-input/v1', domain: core,
    }),
  });
}

export function validateLafeaPeriodicHoleShellAnalysisDomain(value) {
  exact(value, DOMAIN_OUTPUT_KEYS, 'LAFEA_SHELL_PERIODIC_HOLE_DOMAIN_OUTPUT_KEYS_INVALID');
  const rebuilt = createLafeaPeriodicHoleShellAnalysisDomain({
    schema: value.schema,
    stageId: value.stageId,
    domainId: value.domainId,
    sourceHash: value.sourceHash,
    midsurfaceGeometryHash: value.midsurfaceGeometryHash,
    lengthUnit: value.lengthUnit,
    topologyClass: value.topologyClass,
  });
  if (rebuilt.semanticHash !== value.semanticHash) fail('LAFEA_SHELL_PERIODIC_HOLE_DOMAIN_HASH_INVALID');
  return rebuilt;
}

/**
 * Full analytic cylinder with one physical rectangular material hole that
 * crosses the canonical u=+/-pi R chart seam.
 *
 * The hole is declared once in the covering space with uMin < +pi R < uMax.
 * The width must be less than half the circumference, which makes the unwrap
 * unique. For triangulation the physical hole becomes two matched notches in
 * the canonical cut chart. Welding the remaining seam chains must then close
 * those notch edges into exactly one physical hole boundary.
 */
export function createLafeaPeriodicHoleShellMidsurfaceGeometry(value) {
  exact(value, GEOMETRY_KEYS, 'LAFEA_SHELL_PERIODIC_HOLE_GEOMETRY_KEYS_INVALID');
  const stageId = stage(value.stageId);
  const surface = canonicalCylinder(value.surface);
  const axialRange = canonicalAxialRange(value.axialRange);
  const seamCrossingHole = canonicalSeamCrossingHole(value.seamCrossingHole, surface, axialRange);
  exactText(value.orientationPolicy, LAFEA_SHELL_PERIODIC_HOLE_ORIENTATION, 'ORIENTATION_POLICY');
  const core = {
    schema: exactText(value.schema, LAFEA_SHELL_PERIODIC_HOLE_MIDSURFACE_GEOMETRY_SCHEMA, 'GEOMETRY_SCHEMA'),
    stageId,
    geometryId: text(value.geometryId, 'GEOMETRY_ID'),
    lengthUnit: text(value.lengthUnit, 'LENGTH_UNIT'),
    surface,
    axialRange,
    seamCrossingHole,
    orientationPolicy: LAFEA_SHELL_PERIODIC_HOLE_ORIENTATION,
  };
  return freeze({
    ...core,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea-shell-periodic-hole-midsurface-geometry-hash-input/v1', geometry: core,
    }),
  });
}

export function validateLafeaPeriodicHoleShellMidsurfaceGeometry(value) {
  exact(value, GEOMETRY_OUTPUT_KEYS, 'LAFEA_SHELL_PERIODIC_HOLE_GEOMETRY_OUTPUT_KEYS_INVALID');
  const rebuilt = createLafeaPeriodicHoleShellMidsurfaceGeometry({
    schema: value.schema,
    stageId: value.stageId,
    geometryId: value.geometryId,
    lengthUnit: value.lengthUnit,
    surface: value.surface,
    axialRange: value.axialRange,
    seamCrossingHole: value.seamCrossingHole,
    orientationPolicy: value.orientationPolicy,
  });
  if (rebuilt.semanticHash !== value.semanticHash) fail('LAFEA_SHELL_PERIODIC_HOLE_GEOMETRY_HASH_INVALID');
  return rebuilt;
}

export function createLafeaPeriodicHoleShellMidsurfaceEvidence(value) {
  exact(value, EVIDENCE_KEYS, 'LAFEA_SHELL_PERIODIC_HOLE_EVIDENCE_KEYS_INVALID');
  exactText(value.schema, LAFEA_SHELL_PERIODIC_HOLE_MIDSURFACE_INTAKE_SCHEMA, 'EVIDENCE_INTAKE_SCHEMA');
  const geometry = value.geometry?.semanticHash
    ? validateLafeaPeriodicHoleShellMidsurfaceGeometry(value.geometry)
    : createLafeaPeriodicHoleShellMidsurfaceGeometry(value.geometry);
  const analysisDomain = value.analysisDomain?.semanticHash
    ? validateLafeaPeriodicHoleShellAnalysisDomain(value.analysisDomain)
    : createLafeaPeriodicHoleShellAnalysisDomain(value.analysisDomain);
  const stageId = stage(value.stageId);
  const sourceHash = sha256(value.sourceHash, 'SOURCE_HASH');
  if (geometry.stageId !== stageId || analysisDomain.stageId !== stageId
    || analysisDomain.sourceHash !== sourceHash
    || analysisDomain.midsurfaceGeometryHash !== geometry.semanticHash
    || analysisDomain.lengthUnit !== geometry.lengthUnit
    || analysisDomain.topologyClass !== LAFEA_SHELL_PERIODIC_HOLE_TOPOLOGY) {
    fail('LAFEA_SHELL_PERIODIC_HOLE_EVIDENCE_PARENT_MISMATCH');
  }
  const core = {
    schema: LAFEA_SHELL_PERIODIC_HOLE_MIDSURFACE_EVIDENCE_SCHEMA,
    stageId,
    sourceHash,
    analysisDomainHash: analysisDomain.semanticHash,
    analysisGeometryHash: geometry.semanticHash,
    analysisDomain,
    geometry,
    producerRef: text(value.producerRef, 'PRODUCER_REF'),
    qualification: 'PASS',
    seamPolicy: LAFEA_SHELL_PERIODIC_HOLE_SEAM_POLICY,
    limitations: LIMITATIONS,
  };
  return freeze({
    ...core,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea-shell-periodic-hole-midsurface-evidence-hash-input/v1', evidence: core,
    }),
  });
}

export function validateLafeaPeriodicHoleShellMidsurfaceEvidence(value) {
  if (!value || value.schema !== LAFEA_SHELL_PERIODIC_HOLE_MIDSURFACE_EVIDENCE_SCHEMA) {
    fail('LAFEA_SHELL_PERIODIC_HOLE_EVIDENCE_SCHEMA_INVALID');
  }
  const rebuilt = createLafeaPeriodicHoleShellMidsurfaceEvidence({
    schema: LAFEA_SHELL_PERIODIC_HOLE_MIDSURFACE_INTAKE_SCHEMA,
    stageId: value.stageId,
    sourceHash: value.sourceHash,
    analysisDomain: value.analysisDomain,
    geometry: value.geometry,
    producerRef: value.producerRef,
  });
  if (rebuilt.semanticHash !== value.semanticHash) fail('LAFEA_SHELL_PERIODIC_HOLE_EVIDENCE_TAMPERED');
  return rebuilt;
}

export function periodicHoleShellPoint3d(geometryValue, u, v) {
  const geometry = validateLafeaPeriodicHoleShellMidsurfaceGeometry(geometryValue);
  const { axisOrigin, axisDirection, radialDirection, radius } = geometry.surface;
  const axis = array(axisDirection);
  const radial0 = array(radialDirection);
  const tangent0 = cross(axis, radial0);
  const theta = finite(u, 'U') / radius;
  const axial = finite(v, 'V');
  const radial = add(scale(radial0, Math.cos(theta)), scale(tangent0, Math.sin(theta)));
  return freeze(object(add(add(array(axisOrigin), scale(axis, axial)), scale(radial, radius))));
}

export function periodicHoleShellFrameAtUv(geometryValue, u, v) {
  void v;
  const geometry = validateLafeaPeriodicHoleShellMidsurfaceGeometry(geometryValue);
  const axis = array(geometry.surface.axisDirection);
  const radial0 = array(geometry.surface.radialDirection);
  const tangent0 = cross(axis, radial0);
  const theta = finite(u, 'U') / geometry.surface.radius;
  const director = add(scale(radial0, Math.cos(theta)), scale(tangent0, Math.sin(theta)));
  const tangentU = add(scale(radial0, -Math.sin(theta)), scale(tangent0, Math.cos(theta)));
  return freeze({ director: object(director), rotationBasis1: object(tangentU), rotationBasis2: object(axis) });
}

export function periodicHoleShellFrameAtPoint3d(geometryValue, pointValue) {
  const geometry = validateLafeaPeriodicHoleShellMidsurfaceGeometry(geometryValue);
  const point = vector3(pointValue, 'POINT');
  const origin = array(geometry.surface.axisOrigin);
  const axis = array(geometry.surface.axisDirection);
  const relative = subtract(array(point), origin);
  const v = dot(relative, axis);
  const radial = subtract(relative, scale(axis, v));
  const radialNorm = norm(radial);
  const tolerance = geometryTolerance(geometry.surface.radius);
  if (Math.abs(radialNorm - geometry.surface.radius) > tolerance) {
    fail('LAFEA_SHELL_PERIODIC_HOLE_POINT_NOT_ON_CYLINDER');
  }
  if (v < geometry.axialRange.vMin - tolerance || v > geometry.axialRange.vMax + tolerance) {
    fail('LAFEA_SHELL_PERIODIC_HOLE_POINT_OUTSIDE_AXIAL_SPAN');
  }
  const director = scale(radial, 1 / radialNorm);
  const tangentU = cross(axis, director);
  return freeze({
    director: object(director),
    rotationBasis1: object(tangentU),
    rotationBasis2: object(axis),
  });
}

export function periodicHoleShellGeometryBounds(geometryValue) {
  const geometry = validateLafeaPeriodicHoleShellMidsurfaceGeometry(geometryValue);
  const half = Math.PI * geometry.surface.radius;
  const circumference = 2 * half;
  return freeze({
    uMin: -half,
    uMax: half,
    vMin: geometry.axialRange.vMin,
    vMax: geometry.axialRange.vMax,
    circumference,
    angularSpanRadians: 2 * Math.PI,
    angularSpanDegrees: 360,
    axialSpan: geometry.axialRange.vMax - geometry.axialRange.vMin,
    wrappedHoleUMax: geometry.seamCrossingHole.uMax - circumference,
    holeCircumferentialWidth: geometry.seamCrossingHole.uMax - geometry.seamCrossingHole.uMin,
  });
}

export function periodicHoleMaterialLigamentQualification(geometryValue) {
  const geometry = validateLafeaPeriodicHoleShellMidsurfaceGeometry(geometryValue);
  const bounds = periodicHoleShellGeometryBounds(geometry);
  const hole = geometry.seamCrossingHole;
  const lowerAxialLigament = hole.vMin - bounds.vMin;
  const upperAxialLigament = bounds.vMax - hole.vMax;
  const circumferentialReturnLigament = bounds.circumference - bounds.holeCircumferentialWidth;
  const minimumMaterialLigament = Math.min(
    lowerAxialLigament,
    upperAxialLigament,
    circumferentialReturnLigament,
  );
  if (!(minimumMaterialLigament > 0) || !Number.isFinite(minimumMaterialLigament)) {
    fail('LAFEA_SHELL_PERIODIC_HOLE_MATERIAL_LIGAMENT_INVALID');
  }
  return freeze({
    minimumMaterialLigament,
    lowerAxialLigament,
    upperAxialLigament,
    circumferentialReturnLigament,
  });
}

/**
 * Cut-chart material polygon for the seam-crossing hole. There is deliberately
 * no HOLE loop in this temporary planar chart: the physical hole is represented
 * by two matched notches on the identified uMin/uMax sides. After seam welding
 * those notch edges must become one closed physical hole boundary.
 */
export function periodicHoleShellParameterGeometry(geometryValue) {
  const geometry = validateLafeaPeriodicHoleShellMidsurfaceGeometry(geometryValue);
  const bounds = periodicHoleShellGeometryBounds(geometry);
  const hole = geometry.seamCrossingHole;
  const wrappedRight = bounds.wrappedHoleUMax;
  const rows = [
    ['P01', bounds.uMin, bounds.vMin],
    ['P02', bounds.uMax, bounds.vMin],
    ['P03', bounds.uMax, hole.vMin],
    ['P04', hole.uMin, hole.vMin],
    ['P05', hole.uMin, hole.vMax],
    ['P06', bounds.uMax, hole.vMax],
    ['P07', bounds.uMax, bounds.vMax],
    ['P08', bounds.uMin, bounds.vMax],
    ['P09', bounds.uMin, hole.vMax],
    ['P10', wrappedRight, hole.vMax],
    ['P11', wrappedRight, hole.vMin],
    ['P12', bounds.uMin, hole.vMin],
  ];
  const vertices = rows.map(([vertexId, x, y]) => ({ vertexId, x, y }));
  const segments = rows.map((row, index) => ({
    segmentId: `S${String(index + 1).padStart(2, '0')}`,
    type: 'LINE',
    startVertexId: row[0],
    endVertexId: rows[(index + 1) % rows.length][0],
  }));
  return createLafeaAnalysisGeometry({
    schema: 'lafea-analysis-geometry/v1',
    stageId: 'LAFEA.3',
    geometryId: `${geometry.geometryId}:CYLINDER-PERIODIC-SEAM-HOLE-PARAMETRIC`,
    coordinateSystemId: 'SHELL_CYLINDER_UV_ARCLENGTH_AXIAL_PERIODIC_SEAM_HOLE',
    lengthUnit: geometry.lengthUnit,
    orientationPolicy: 'OUTER_CCW_HOLES_CW_V1',
    vertices,
    segments,
    loops: [{ loopId: 'OUTER_WITH_SEAM_HOLE_NOTCHES', role: 'OUTER', segmentIds: segments.map((row) => row.segmentId) }],
  });
}

function canonicalCylinder(value) {
  exact(value, SURFACE_KEYS, 'LAFEA_SHELL_PERIODIC_HOLE_SURFACE_KEYS_INVALID');
  exactText(value.kind, LAFEA_SHELL_PERIODIC_HOLE_SURFACE_KIND, 'SURFACE_KIND');
  const axisOrigin = vector3(value.axisOrigin, 'AXIS_ORIGIN');
  const axisDirection = unitVector(value.axisDirection, 'AXIS_DIRECTION');
  const radialDirection = unitVector(value.radialDirection, 'RADIAL_DIRECTION');
  if (Math.abs(dot(array(axisDirection), array(radialDirection))) > EPS) {
    fail('LAFEA_SHELL_PERIODIC_HOLE_CYLINDER_BASIS_NOT_ORTHOGONAL');
  }
  const radius = finite(value.radius, 'RADIUS');
  if (!(radius > 0)) fail('LAFEA_SHELL_PERIODIC_HOLE_RADIUS_INVALID');
  return freeze({ kind: LAFEA_SHELL_PERIODIC_HOLE_SURFACE_KIND, axisOrigin, axisDirection, radialDirection, radius });
}

function canonicalAxialRange(value) {
  exact(value, AXIAL_KEYS, 'LAFEA_SHELL_PERIODIC_HOLE_AXIAL_RANGE_KEYS_INVALID');
  const vMin = finite(value.vMin, 'AXIAL_V_MIN');
  const vMax = finite(value.vMax, 'AXIAL_V_MAX');
  if (!(vMax > vMin)) fail('LAFEA_SHELL_PERIODIC_HOLE_AXIAL_RANGE_INVALID');
  return freeze({ vMin, vMax });
}

function canonicalSeamCrossingHole(value, surface, axialRange) {
  exact(value, HOLE_KEYS, 'LAFEA_SHELL_PERIODIC_HOLE_HOLE_KEYS_INVALID');
  const hole = {
    holeId: text(value.holeId, 'HOLE_ID'),
    uMin: finite(value.uMin, 'HOLE_U_MIN'),
    uMax: finite(value.uMax, 'HOLE_U_MAX'),
    vMin: finite(value.vMin, 'HOLE_V_MIN'),
    vMax: finite(value.vMax, 'HOLE_V_MAX'),
  };
  const half = Math.PI * surface.radius;
  const circumference = 2 * half;
  const tolerance = geometryTolerance(surface.radius);
  if (!(hole.uMin < half - tolerance && hole.uMax > half + tolerance)) {
    fail('LAFEA_SHELL_PERIODIC_HOLE_MUST_CROSS_CANONICAL_SEAM');
  }
  if (!(hole.uMax > hole.uMin)) fail('LAFEA_SHELL_PERIODIC_HOLE_U_RANGE_INVALID');
  if (!(hole.uMax - hole.uMin < circumference / 2 - tolerance)) {
    fail('LAFEA_SHELL_PERIODIC_HOLE_UNWRAP_NOT_UNIQUE');
  }
  const wrappedRight = hole.uMax - circumference;
  if (!(hole.uMin > -half + tolerance && wrappedRight > -half + tolerance
    && hole.uMin < half - tolerance && wrappedRight < half - tolerance)) {
    fail('LAFEA_SHELL_PERIODIC_HOLE_CIRCUMFERENTIAL_CONTAINMENT_INVALID');
  }
  if (!(hole.vMin > axialRange.vMin + tolerance
    && hole.vMax < axialRange.vMax - tolerance
    && hole.vMax > hole.vMin + tolerance)) {
    fail('LAFEA_SHELL_PERIODIC_HOLE_AXIAL_CONTAINMENT_INVALID');
  }
  return freeze(hole);
}

function stage(value) {
  if (!LAFEA_SHELL_PERIODIC_HOLE_STAGES.includes(value)) fail('LAFEA_SHELL_PERIODIC_HOLE_STAGE_INVALID');
  return value;
}
function sha256(value, label) {
  const textValue = text(value, label);
  if (!/^sha256:[0-9a-f]{64}$/.test(textValue)) fail(`LAFEA_SHELL_PERIODIC_HOLE_${label}_INVALID`);
  return textValue;
}
function exactText(value, expected, label) {
  if (value !== expected) fail(`LAFEA_SHELL_PERIODIC_HOLE_${label}_INVALID`);
  return value;
}
function text(value, label) {
  if (typeof value !== 'string' || !value.trim()) fail(`LAFEA_SHELL_PERIODIC_HOLE_${label}_INVALID`);
  return value;
}
function finite(value, label) {
  if (!Number.isFinite(value)) fail(`LAFEA_SHELL_PERIODIC_HOLE_${label}_INVALID`);
  return canonical(value);
}
function canonical(value) { return Object.is(value, -0) ? 0 : value; }
function vector3(value, label) {
  exact(value, ['x', 'y', 'z'], `LAFEA_SHELL_PERIODIC_HOLE_${label}_KEYS_INVALID`);
  return freeze({ x: finite(value.x, `${label}_X`), y: finite(value.y, `${label}_Y`), z: finite(value.z, `${label}_Z`) });
}
function unitVector(value, label) {
  const row = vector3(value, label);
  const a = array(row);
  const length = norm(a);
  if (Math.abs(length - 1) > 1e-10) fail(`LAFEA_SHELL_PERIODIC_HOLE_${label}_NOT_UNIT`);
  return row;
}
function exact(value, keys, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((row, index) => row !== expected[index])) fail(code);
}
function geometryTolerance(radius) { return Math.max(1e-9, Math.abs(radius) * 1e-10); }
function array(value) { return [value.x, value.y, value.z]; }
function object(value) { return { x: canonical(value[0]), y: canonical(value[1]), z: canonical(value[2]) }; }
function add(left, right) { return left.map((row, index) => row + right[index]); }
function subtract(left, right) { return left.map((row, index) => row - right[index]); }
function scale(value, factor) { return value.map((row) => row * factor); }
function dot(left, right) { return left.reduce((sum, row, index) => sum + row * right[index], 0); }
function cross(left, right) {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}
function norm(value) { return Math.hypot(...value); }
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
