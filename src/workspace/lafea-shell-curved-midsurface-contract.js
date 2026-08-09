import { createLafeaAnalysisGeometry } from './lafea-analysis-geometry-contract.js';
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA_SHELL_CURVED_ANALYSIS_DOMAIN_SCHEMA = 'lafea-shell-curved-analysis-domain/v1';
export const LAFEA_SHELL_CURVED_MIDSURFACE_GEOMETRY_SCHEMA = 'lafea-shell-curved-midsurface-geometry/v1';
export const LAFEA_SHELL_CURVED_MIDSURFACE_EVIDENCE_SCHEMA = 'lafea-shell-curved-midsurface-evidence/v1';
export const LAFEA_SHELL_CURVED_MIDSURFACE_INTAKE_SCHEMA = 'lafea-shell-curved-midsurface-evidence-intake/v1';
export const LAFEA_SHELL_CURVED_MIDSURFACE_STAGES = Object.freeze(['LAFEA.4', 'LAFEA.5']);
export const LAFEA_SHELL_CURVED_SURFACE_KIND = 'CYLINDER';
export const LAFEA_SHELL_CURVED_TOPOLOGY = 'CYLINDRICAL_SINGLE_PATCH_RECTANGULAR_PARAMETRIC_V1';
export const LAFEA_SHELL_CURVED_ORIENTATION = 'CYLINDER_OUTWARD_U_CIRCUMFERENTIAL_V_AXIAL_CCW_V1';
export const LAFEA_SHELL_CURVED_MAXIMUM_PATCH_ANGLE_DEGREES = 180;

const DOMAIN_KEYS = Object.freeze([
  'schema', 'stageId', 'domainId', 'sourceHash', 'midsurfaceGeometryHash',
  'lengthUnit', 'topologyClass',
]);
const DOMAIN_OUTPUT_KEYS = Object.freeze([...DOMAIN_KEYS, 'semanticHash']);
const GEOMETRY_KEYS = Object.freeze([
  'schema', 'stageId', 'geometryId', 'lengthUnit', 'surface',
  'orientationPolicy', 'vertices', 'segments', 'loops',
]);
const GEOMETRY_OUTPUT_KEYS = Object.freeze([...GEOMETRY_KEYS, 'semanticHash']);
const EVIDENCE_KEYS = Object.freeze([
  'schema', 'stageId', 'sourceHash', 'analysisDomain', 'geometry', 'producerRef',
]);
const SURFACE_KEYS = Object.freeze([
  'kind', 'axisOrigin', 'axisDirection', 'radialDirection', 'radius',
]);
const LIMITATIONS = Object.freeze([
  'CYLINDER_ONLY',
  'SINGLE_RECTANGULAR_PARAMETRIC_PATCH_ONLY',
  'PARAMETRIC_ISO_U_ISO_V_BOUNDARIES_ONLY',
  'MAXIMUM_PATCH_ANGLE_180_DEGREES',
  'NO_FULL_CYLINDER_SEAM_CLOSURE',
  'NO_HOLES_ON_CURVED_MIDSURFACE',
  'NO_MULTI_PATCH_SEAMS',
  'NO_CONE_SPHERE_NURBS_OR_FREEFORM',
  'NO_OFFSET_SURFACE_GENERATION',
  'NO_THICKNESS_TRANSITION_MESHING',
]);
const EPS = 1e-12;

export function createLafeaCurvedShellAnalysisDomain(value) {
  exact(value, DOMAIN_KEYS, 'LAFEA_SHELL_CURVED_DOMAIN_KEYS_INVALID');
  const core = {
    schema: exactText(value.schema, LAFEA_SHELL_CURVED_ANALYSIS_DOMAIN_SCHEMA, 'DOMAIN_SCHEMA'),
    stageId: stage(value.stageId),
    domainId: text(value.domainId, 'DOMAIN_ID'),
    sourceHash: sha256(value.sourceHash, 'SOURCE_HASH'),
    midsurfaceGeometryHash: sha256(value.midsurfaceGeometryHash, 'MIDSURFACE_GEOMETRY_HASH'),
    lengthUnit: text(value.lengthUnit, 'LENGTH_UNIT'),
    topologyClass: exactText(value.topologyClass, LAFEA_SHELL_CURVED_TOPOLOGY, 'TOPOLOGY_CLASS'),
  };
  return freeze({
    ...core,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea-shell-curved-analysis-domain-hash-input/v1', domain: core,
    }),
  });
}

export function validateLafeaCurvedShellAnalysisDomain(value) {
  exact(value, DOMAIN_OUTPUT_KEYS, 'LAFEA_SHELL_CURVED_DOMAIN_OUTPUT_KEYS_INVALID');
  const rebuilt = createLafeaCurvedShellAnalysisDomain({
    schema: value.schema,
    stageId: value.stageId,
    domainId: value.domainId,
    sourceHash: value.sourceHash,
    midsurfaceGeometryHash: value.midsurfaceGeometryHash,
    lengthUnit: value.lengthUnit,
    topologyClass: value.topologyClass,
  });
  if (value.semanticHash !== rebuilt.semanticHash) fail('LAFEA_SHELL_CURVED_DOMAIN_HASH_INVALID');
  return rebuilt;
}

/**
 * Analytic cylindrical midsurface patch.
 *
 * `u` is circumferential arc length and `v` is axial distance, both in the
 * declared length unit. With axis unit vector a, radial reference r0, and
 * t0 = a x r0, theta = u/R and
 *
 *   x(u,v) = axisOrigin + v a + R(cos(theta) r0 + sin(theta) t0).
 *
 * The surface parameterization is therefore isometric: ds^2 = du^2 + dv^2.
 * The first curved qualification intentionally accepts one non-wrapping
 * rectangular patch only. Curved holes, seam closure and general surfaces are
 * separate capabilities and remain fail-closed.
 */
export function createLafeaCurvedShellMidsurfaceGeometry(value) {
  exact(value, GEOMETRY_KEYS, 'LAFEA_SHELL_CURVED_GEOMETRY_KEYS_INVALID');
  const stageId = stage(value.stageId);
  const surface = canonicalCylinder(value.surface);
  const vertices = canonicalVertices(value.vertices);
  const segments = canonicalSegments(value.segments, vertices);
  const loops = canonicalLoops(value.loops, segments);
  exactText(value.orientationPolicy, LAFEA_SHELL_CURVED_ORIENTATION, 'ORIENTATION_POLICY');

  validateRectangularPatch(vertices, segments, loops, surface.radius);
  validateUvTopology(value, vertices, segments, loops);

  const core = {
    schema: exactText(value.schema, LAFEA_SHELL_CURVED_MIDSURFACE_GEOMETRY_SCHEMA, 'GEOMETRY_SCHEMA'),
    stageId,
    geometryId: text(value.geometryId, 'GEOMETRY_ID'),
    lengthUnit: text(value.lengthUnit, 'LENGTH_UNIT'),
    surface,
    orientationPolicy: LAFEA_SHELL_CURVED_ORIENTATION,
    vertices,
    segments,
    loops,
  };
  return freeze({
    ...core,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea-shell-curved-midsurface-geometry-hash-input/v1', geometry: core,
    }),
  });
}

export function validateLafeaCurvedShellMidsurfaceGeometry(value) {
  exact(value, GEOMETRY_OUTPUT_KEYS, 'LAFEA_SHELL_CURVED_GEOMETRY_OUTPUT_KEYS_INVALID');
  const rebuilt = createLafeaCurvedShellMidsurfaceGeometry({
    schema: value.schema,
    stageId: value.stageId,
    geometryId: value.geometryId,
    lengthUnit: value.lengthUnit,
    surface: value.surface,
    orientationPolicy: value.orientationPolicy,
    vertices: value.vertices,
    segments: value.segments,
    loops: value.loops,
  });
  if (value.semanticHash !== rebuilt.semanticHash) fail('LAFEA_SHELL_CURVED_GEOMETRY_HASH_INVALID');
  return rebuilt;
}

export function createLafeaCurvedShellMidsurfaceEvidence(value) {
  exact(value, EVIDENCE_KEYS, 'LAFEA_SHELL_CURVED_EVIDENCE_KEYS_INVALID');
  exactText(value.schema, LAFEA_SHELL_CURVED_MIDSURFACE_INTAKE_SCHEMA, 'EVIDENCE_INTAKE_SCHEMA');
  const geometry = value.geometry?.semanticHash
    ? validateLafeaCurvedShellMidsurfaceGeometry(value.geometry)
    : createLafeaCurvedShellMidsurfaceGeometry(value.geometry);
  const analysisDomain = value.analysisDomain?.semanticHash
    ? validateLafeaCurvedShellAnalysisDomain(value.analysisDomain)
    : createLafeaCurvedShellAnalysisDomain(value.analysisDomain);
  const stageId = stage(value.stageId);
  const sourceHash = sha256(value.sourceHash, 'SOURCE_HASH');
  if (geometry.stageId !== stageId || analysisDomain.stageId !== stageId
    || analysisDomain.sourceHash !== sourceHash
    || analysisDomain.midsurfaceGeometryHash !== geometry.semanticHash
    || analysisDomain.lengthUnit !== geometry.lengthUnit
    || analysisDomain.topologyClass !== LAFEA_SHELL_CURVED_TOPOLOGY) {
    fail('LAFEA_SHELL_CURVED_EVIDENCE_PARENT_MISMATCH');
  }
  const core = {
    schema: LAFEA_SHELL_CURVED_MIDSURFACE_EVIDENCE_SCHEMA,
    stageId,
    sourceHash,
    analysisDomainHash: analysisDomain.semanticHash,
    analysisGeometryHash: geometry.semanticHash,
    analysisDomain,
    geometry,
    producerRef: text(value.producerRef, 'PRODUCER_REF'),
    qualification: 'PASS',
    limitations: LIMITATIONS,
  };
  return freeze({
    ...core,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea-shell-curved-midsurface-evidence-hash-input/v1', evidence: core,
    }),
  });
}

export function validateLafeaCurvedShellMidsurfaceEvidence(value) {
  if (!value || value.schema !== LAFEA_SHELL_CURVED_MIDSURFACE_EVIDENCE_SCHEMA) {
    fail('LAFEA_SHELL_CURVED_EVIDENCE_SCHEMA_INVALID');
  }
  const rebuilt = createLafeaCurvedShellMidsurfaceEvidence({
    schema: LAFEA_SHELL_CURVED_MIDSURFACE_INTAKE_SCHEMA,
    stageId: value.stageId,
    sourceHash: value.sourceHash,
    analysisDomain: value.analysisDomain,
    geometry: value.geometry,
    producerRef: value.producerRef,
  });
  if (rebuilt.semanticHash !== value.semanticHash) fail('LAFEA_SHELL_CURVED_EVIDENCE_TAMPERED');
  return rebuilt;
}

export function cylindricalShellPoint3d(geometryValue, u, v) {
  const geometry = validateLafeaCurvedShellMidsurfaceGeometry(geometryValue);
  const { axisOrigin, axisDirection, radialDirection, radius } = geometry.surface;
  const axis = vectorArray(axisDirection);
  const radial0 = vectorArray(radialDirection);
  const tangentReference = cross(axis, radial0);
  const theta = finite(u, 'U') / radius;
  const axial = finite(v, 'V');
  const radial = add(
    scale(radial0, Math.cos(theta)),
    scale(tangentReference, Math.sin(theta)),
  );
  return freeze(vectorObject(add(
    add(vectorArray(axisOrigin), scale(axis, axial)),
    scale(radial, radius),
  )));
}

export function cylindricalShellFrameAtUv(geometryValue, u, v) {
  void v;
  const geometry = validateLafeaCurvedShellMidsurfaceGeometry(geometryValue);
  const { axisDirection, radialDirection, radius } = geometry.surface;
  const axis = vectorArray(axisDirection);
  const radial0 = vectorArray(radialDirection);
  const tangent0 = cross(axis, radial0);
  const theta = finite(u, 'U') / radius;
  const director = add(scale(radial0, Math.cos(theta)), scale(tangent0, Math.sin(theta)));
  const tangentU = add(scale(radial0, -Math.sin(theta)), scale(tangent0, Math.cos(theta)));
  const tangentV = axis;
  return freeze({
    director: vectorObject(director),
    rotationBasis1: vectorObject(tangentU),
    rotationBasis2: vectorObject(tangentV),
  });
}

/**
 * Invert a point on the qualified non-wrapping cylindrical patch. This is the
 * downstream bridge required to reconstruct nodal director/tangent bases from
 * retained analysis-mesh coordinates without storing solver facets as surface
 * authority.
 */
export function cylindricalShellUvAtPoint3d(geometryValue, pointValue) {
  const geometry = validateLafeaCurvedShellMidsurfaceGeometry(geometryValue);
  const point = vector3(pointValue, 'POINT');
  const origin = vectorArray(geometry.surface.axisOrigin);
  const axis = vectorArray(geometry.surface.axisDirection);
  const radial0 = vectorArray(geometry.surface.radialDirection);
  const tangent0 = cross(axis, radial0);
  const relative = subtract(vectorArray(point), origin);
  const v = dot(relative, axis);
  const radial = subtract(relative, scale(axis, v));
  const radialNorm = norm(radial);
  const tolerance = Math.max(1e-9, geometry.surface.radius * 1e-10);
  if (Math.abs(radialNorm - geometry.surface.radius) > tolerance) {
    fail('LAFEA_SHELL_CURVED_POINT_NOT_ON_CYLINDER');
  }
  const radialUnit = scale(radial, 1 / radialNorm);
  const angle = Math.atan2(dot(radialUnit, tangent0), dot(radialUnit, radial0));
  const u = angle * geometry.surface.radius;
  const bounds = uvBounds(geometry.vertices);
  if (u < bounds.uMin - tolerance || u > bounds.uMax + tolerance
    || v < bounds.vMin - tolerance || v > bounds.vMax + tolerance) {
    fail('LAFEA_SHELL_CURVED_POINT_OUTSIDE_PATCH');
  }
  return freeze({ u: canonical(u), v: canonical(v) });
}

export function cylindricalShellFrameAtPoint3d(geometryValue, pointValue) {
  const uv = cylindricalShellUvAtPoint3d(geometryValue, pointValue);
  return cylindricalShellFrameAtUv(geometryValue, uv.u, uv.v);
}

export function curvedShellParameterGeometry(geometryValue) {
  const geometry = validateLafeaCurvedShellMidsurfaceGeometry(geometryValue);
  return createLafeaAnalysisGeometry({
    schema: 'lafea-analysis-geometry/v1',
    stageId: 'LAFEA.3',
    geometryId: `${geometry.geometryId}:CYLINDER-PARAMETRIC`,
    coordinateSystemId: 'SHELL_CYLINDER_UV_ARCLENGTH_AXIAL',
    lengthUnit: geometry.lengthUnit,
    orientationPolicy: 'OUTER_CCW_HOLES_CW_V1',
    vertices: geometry.vertices.map((row) => ({ vertexId: row.vertexId, x: row.u, y: row.v })),
    segments: geometry.segments.map((row) => ({
      segmentId: row.segmentId,
      type: 'LINE',
      startVertexId: row.startVertexId,
      endVertexId: row.endVertexId,
    })),
    loops: geometry.loops.map((row) => ({
      loopId: row.loopId, role: row.role, segmentIds: [...row.segmentIds],
    })),
  });
}

export function curvedShellGeometryBounds(geometryValue) {
  const geometry = validateLafeaCurvedShellMidsurfaceGeometry(geometryValue);
  const bounds = uvBounds(geometry.vertices);
  return freeze({
    ...bounds,
    angularSpanRadians: (bounds.uMax - bounds.uMin) / geometry.surface.radius,
    angularSpanDegrees: ((bounds.uMax - bounds.uMin) / geometry.surface.radius) * 180 / Math.PI,
    axialSpan: bounds.vMax - bounds.vMin,
  });
}

function canonicalCylinder(value) {
  exact(value, SURFACE_KEYS, 'LAFEA_SHELL_CURVED_SURFACE_KEYS_INVALID');
  exactText(value.kind, LAFEA_SHELL_CURVED_SURFACE_KIND, 'SURFACE_KIND');
  const axisOrigin = vector3(value.axisOrigin, 'AXIS_ORIGIN');
  const axisDirection = unitVector(value.axisDirection, 'AXIS_DIRECTION');
  const radialDirection = unitVector(value.radialDirection, 'RADIAL_DIRECTION');
  if (Math.abs(dot(vectorArray(axisDirection), vectorArray(radialDirection))) > EPS) {
    fail('LAFEA_SHELL_CURVED_CYLINDER_BASIS_NOT_ORTHOGONAL');
  }
  const radius = finite(value.radius, 'RADIUS');
  if (!(radius > 0)) fail('LAFEA_SHELL_CURVED_RADIUS_INVALID');
  return freeze({
    kind: LAFEA_SHELL_CURVED_SURFACE_KIND,
    axisOrigin,
    axisDirection,
    radialDirection,
    radius,
  });
}

function canonicalVertices(value) {
  if (!Array.isArray(value) || value.length !== 4) fail('LAFEA_SHELL_CURVED_RECTANGLE_REQUIRES_FOUR_VERTICES');
  const rows = value.map((row) => {
    exact(row, ['vertexId', 'u', 'v'], 'LAFEA_SHELL_CURVED_VERTEX_KEYS_INVALID');
    return freeze({
      vertexId: text(row.vertexId, 'VERTEX_ID'),
      u: finite(row.u, 'VERTEX_U'),
      v: finite(row.v, 'VERTEX_V'),
    });
  }).sort(byId('vertexId'));
  unique(rows.map((row) => row.vertexId), 'LAFEA_SHELL_CURVED_VERTEX_ID_DUPLICATE');
  return freeze(rows);
}

function canonicalSegments(value, vertices) {
  if (!Array.isArray(value) || value.length !== 4) fail('LAFEA_SHELL_CURVED_RECTANGLE_REQUIRES_FOUR_SEGMENTS');
  const vertexIds = new Set(vertices.map((row) => row.vertexId));
  const rows = value.map((row) => {
    exact(row, ['segmentId', 'startVertexId', 'endVertexId'], 'LAFEA_SHELL_CURVED_SEGMENT_KEYS_INVALID');
    const segment = {
      segmentId: text(row.segmentId, 'SEGMENT_ID'),
      startVertexId: text(row.startVertexId, 'START_VERTEX_ID'),
      endVertexId: text(row.endVertexId, 'END_VERTEX_ID'),
    };
    if (segment.startVertexId === segment.endVertexId
      || !vertexIds.has(segment.startVertexId) || !vertexIds.has(segment.endVertexId)) {
      fail('LAFEA_SHELL_CURVED_SEGMENT_VERTEX_INVALID');
    }
    return freeze(segment);
  }).sort(byId('segmentId'));
  unique(rows.map((row) => row.segmentId), 'LAFEA_SHELL_CURVED_SEGMENT_ID_DUPLICATE');
  return freeze(rows);
}

function canonicalLoops(value, segments) {
  if (!Array.isArray(value) || value.length !== 1) fail('LAFEA_SHELL_CURVED_SINGLE_OUTER_LOOP_REQUIRED');
  const row = value[0];
  exact(row, ['loopId', 'role', 'segmentIds'], 'LAFEA_SHELL_CURVED_LOOP_KEYS_INVALID');
  if (row.role !== 'OUTER') fail('LAFEA_SHELL_CURVED_HOLES_NOT_QUALIFIED');
  if (!Array.isArray(row.segmentIds) || row.segmentIds.length !== 4) {
    fail('LAFEA_SHELL_CURVED_RECTANGLE_LOOP_REQUIRES_FOUR_SEGMENTS');
  }
  const segmentIds = row.segmentIds.map((id) => text(id, 'LOOP_SEGMENT_ID'));
  unique(segmentIds, 'LAFEA_SHELL_CURVED_LOOP_SEGMENT_DUPLICATE');
  const known = new Set(segments.map((segment) => segment.segmentId));
  if (segmentIds.some((id) => !known.has(id)) || segmentIds.length !== known.size) {
    fail('LAFEA_SHELL_CURVED_LOOP_SEGMENT_MISMATCH');
  }
  return freeze([freeze({ loopId: text(row.loopId, 'LOOP_ID'), role: 'OUTER', segmentIds: freeze(segmentIds) })]);
}

function validateRectangularPatch(vertices, segments, loops, radius) {
  const bounds = uvBounds(vertices);
  const uValues = [...new Set(vertices.map((row) => row.u))].sort((a, b) => a - b);
  const vValues = [...new Set(vertices.map((row) => row.v))].sort((a, b) => a - b);
  if (uValues.length !== 2 || vValues.length !== 2
    || !(bounds.uMax > bounds.uMin) || !(bounds.vMax > bounds.vMin)) {
    fail('LAFEA_SHELL_CURVED_PATCH_NOT_RECTANGULAR');
  }
  for (const segment of segments) {
    const a = vertices.find((row) => row.vertexId === segment.startVertexId);
    const b = vertices.find((row) => row.vertexId === segment.endVertexId);
    const isoU = Math.abs(a.u - b.u) <= EPS;
    const isoV = Math.abs(a.v - b.v) <= EPS;
    if (isoU === isoV) fail('LAFEA_SHELL_CURVED_BOUNDARY_NOT_ISO_U_OR_ISO_V');
  }
  const angle = (bounds.uMax - bounds.uMin) / radius;
  if (!(angle > 0) || angle > Math.PI + EPS) {
    fail('LAFEA_SHELL_CURVED_PATCH_ANGLE_EXCEEDS_180_DEGREES');
  }
  if (bounds.uMin < -Math.PI * radius - EPS || bounds.uMax > Math.PI * radius + EPS) {
    fail('LAFEA_SHELL_CURVED_PATCH_CROSSES_PARAMETRIC_SEAM');
  }
  const loop = loops[0];
  const segmentById = new Map(segments.map((row) => [row.segmentId, row]));
  const vertexById = new Map(vertices.map((row) => [row.vertexId, row]));
  let area2 = 0;
  for (const segmentId of loop.segmentIds) {
    const segment = segmentById.get(segmentId);
    const a = vertexById.get(segment.startVertexId);
    const b = vertexById.get(segment.endVertexId);
    area2 += a.u * b.v - b.u * a.v;
  }
  if (!(area2 > EPS)) fail('LAFEA_SHELL_CURVED_OUTER_LOOP_NOT_CCW');
}

function validateUvTopology(value, vertices, segments, loops) {
  try {
    createLafeaAnalysisGeometry({
      schema: 'lafea-analysis-geometry/v1',
      stageId: 'LAFEA.3',
      geometryId: `${text(value.geometryId, 'GEOMETRY_ID')}:CURVED-UV-CHECK`,
      coordinateSystemId: 'SHELL_CYLINDER_UV_ARCLENGTH_AXIAL',
      lengthUnit: text(value.lengthUnit, 'LENGTH_UNIT'),
      orientationPolicy: 'OUTER_CCW_HOLES_CW_V1',
      vertices: vertices.map((row) => ({ vertexId: row.vertexId, x: row.u, y: row.v })),
      segments: segments.map((row) => ({
        segmentId: row.segmentId,
        type: 'LINE',
        startVertexId: row.startVertexId,
        endVertexId: row.endVertexId,
      })),
      loops: loops.map((row) => ({ loopId: row.loopId, role: row.role, segmentIds: [...row.segmentIds] })),
    });
  } catch (error) {
    const wrapped = new TypeError('LAFEA_SHELL_CURVED_PARAMETRIC_TOPOLOGY_INVALID');
    wrapped.code = 'LAFEA_SHELL_CURVED_PARAMETRIC_TOPOLOGY_INVALID';
    wrapped.cause = error;
    throw wrapped;
  }
}

function uvBounds(vertices) {
  const us = vertices.map((row) => row.u);
  const vs = vertices.map((row) => row.v);
  return {
    uMin: Math.min(...us), uMax: Math.max(...us),
    vMin: Math.min(...vs), vMax: Math.max(...vs),
  };
}
function stage(value) {
  if (!LAFEA_SHELL_CURVED_MIDSURFACE_STAGES.includes(value)) fail('LAFEA_SHELL_CURVED_STAGE_INVALID');
  return value;
}
function vector3(value, label) {
  exact(value, ['x', 'y', 'z'], `LAFEA_SHELL_CURVED_${label}_KEYS_INVALID`);
  return freeze({ x: finite(value.x, `${label}_X`), y: finite(value.y, `${label}_Y`), z: finite(value.z, `${label}_Z`) });
}
function unitVector(value, label) {
  const row = vector3(value, label);
  if (Math.abs(norm(vectorArray(row)) - 1) > EPS) fail(`LAFEA_SHELL_CURVED_${label}_NOT_UNIT`);
  return row;
}
function vectorArray(value) { return [value.x, value.y, value.z]; }
function vectorObject(value) { return { x: canonical(value[0]), y: canonical(value[1]), z: canonical(value[2]) }; }
function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function subtract(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function scale(a, factor) { return [a[0] * factor, a[1] * factor, a[2] * factor]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function norm(value) { return Math.hypot(value[0], value[1], value[2]); }
function exact(value, keys, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join('|') !== [...keys].sort().join('|')) fail(code);
}
function exactText(value, expected, label) {
  if (value !== expected) fail(`LAFEA_SHELL_CURVED_${label}_INVALID`);
  return value;
}
function text(value, label) {
  if (typeof value !== 'string' || !value.trim()) fail(`LAFEA_SHELL_CURVED_${label}_INVALID`);
  return value;
}
function finite(value, label) {
  if (!Number.isFinite(value)) fail(`LAFEA_SHELL_CURVED_${label}_INVALID`);
  return canonical(value);
}
function sha256(value, label) {
  if (typeof value !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(value)) fail(`LAFEA_SHELL_CURVED_${label}_INVALID`);
  return value;
}
function unique(values, code) { if (new Set(values).size !== values.length) fail(code); }
function byId(key) { return (left, right) => left[key].localeCompare(right[key]); }
function canonical(value) { return Object.is(value, -0) ? 0 : Number(value.toPrecision(15)); }
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
