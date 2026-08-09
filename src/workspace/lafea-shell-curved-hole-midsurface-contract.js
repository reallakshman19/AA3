import { createLafeaAnalysisGeometry } from './lafea-analysis-geometry-contract.js';
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA_SHELL_CURVED_HOLE_ANALYSIS_DOMAIN_SCHEMA = 'lafea-shell-curved-hole-analysis-domain/v1';
export const LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_GEOMETRY_SCHEMA = 'lafea-shell-curved-hole-midsurface-geometry/v1';
export const LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_EVIDENCE_SCHEMA = 'lafea-shell-curved-hole-midsurface-evidence/v1';
export const LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_INTAKE_SCHEMA = 'lafea-shell-curved-hole-midsurface-evidence-intake/v1';
export const LAFEA_SHELL_CURVED_HOLE_STAGES = Object.freeze(['LAFEA.4', 'LAFEA.5']);
export const LAFEA_SHELL_CURVED_HOLE_SURFACE_KIND = 'CYLINDER';
export const LAFEA_SHELL_CURVED_HOLE_TOPOLOGY = 'CYLINDRICAL_SINGLE_RECTANGULAR_PATCH_WITH_HOLES_V1';
export const LAFEA_SHELL_CURVED_HOLE_ORIENTATION = 'CYLINDER_OUTWARD_OUTER_CCW_HOLES_CW_V1';
export const LAFEA_SHELL_CURVED_HOLE_MAXIMUM_PATCH_ANGLE_DEGREES = 180;

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
  'SINGLE_RECTANGULAR_NON_WRAPPING_OUTER_PATCH_ONLY',
  'STRAIGHT_PARAMETRIC_OUTER_AND_HOLE_SEGMENTS_ONLY',
  'DISJOINT_NON_NESTED_HOLES_ONLY',
  'MAXIMUM_PATCH_ANGLE_180_DEGREES',
  'NO_FULL_CYLINDER_PERIODIC_HOLE_INTERACTION',
  'NO_MULTI_PATCH_SEAMS',
  'NO_CONE_SPHERE_NURBS_OR_FREEFORM',
  'NO_OFFSET_SURFACE_GENERATION',
  'NO_THICKNESS_TRANSITION_MESHING',
]);
const EPS = 1e-12;

export function createLafeaCurvedHoleShellAnalysisDomain(value) {
  exact(value, DOMAIN_KEYS, 'LAFEA_SHELL_CURVED_HOLE_DOMAIN_KEYS_INVALID');
  const core = {
    schema: exactText(value.schema, LAFEA_SHELL_CURVED_HOLE_ANALYSIS_DOMAIN_SCHEMA, 'DOMAIN_SCHEMA'),
    stageId: stage(value.stageId),
    domainId: text(value.domainId, 'DOMAIN_ID'),
    sourceHash: sha256(value.sourceHash, 'SOURCE_HASH'),
    midsurfaceGeometryHash: sha256(value.midsurfaceGeometryHash, 'MIDSURFACE_GEOMETRY_HASH'),
    lengthUnit: text(value.lengthUnit, 'LENGTH_UNIT'),
    topologyClass: exactText(value.topologyClass, LAFEA_SHELL_CURVED_HOLE_TOPOLOGY, 'TOPOLOGY_CLASS'),
  };
  return freeze({
    ...core,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea-shell-curved-hole-analysis-domain-hash-input/v1', domain: core,
    }),
  });
}

export function validateLafeaCurvedHoleShellAnalysisDomain(value) {
  exact(value, DOMAIN_OUTPUT_KEYS, 'LAFEA_SHELL_CURVED_HOLE_DOMAIN_OUTPUT_KEYS_INVALID');
  const rebuilt = createLafeaCurvedHoleShellAnalysisDomain({
    schema: value.schema,
    stageId: value.stageId,
    domainId: value.domainId,
    sourceHash: value.sourceHash,
    midsurfaceGeometryHash: value.midsurfaceGeometryHash,
    lengthUnit: value.lengthUnit,
    topologyClass: value.topologyClass,
  });
  if (rebuilt.semanticHash !== value.semanticHash) fail('LAFEA_SHELL_CURVED_HOLE_DOMAIN_HASH_INVALID');
  return rebuilt;
}

/**
 * Multiply-connected patch on an analytic cylinder.
 *
 * The parameter metric is isometric because u is circumferential arc length
 * and v is axial length: ds^2 = du^2 + dv^2. Consequently the existing planar
 * constrained-hole mesher and material-ligament length rule are physically
 * meaningful in UV. This contract nevertheless owns curved-surface geometry,
 * orientation and hole containment independently; it does not relabel planar
 * evidence as curved evidence.
 */
export function createLafeaCurvedHoleShellMidsurfaceGeometry(value) {
  exact(value, GEOMETRY_KEYS, 'LAFEA_SHELL_CURVED_HOLE_GEOMETRY_KEYS_INVALID');
  const stageId = stage(value.stageId);
  const surface = canonicalCylinder(value.surface);
  const vertices = canonicalVertices(value.vertices);
  const segments = canonicalSegments(value.segments, vertices);
  const loops = canonicalLoops(value.loops, segments);
  exactText(value.orientationPolicy, LAFEA_SHELL_CURVED_HOLE_ORIENTATION, 'ORIENTATION_POLICY');

  const outer = loops.filter((row) => row.role === 'OUTER');
  const holes = loops.filter((row) => row.role === 'HOLE');
  if (outer.length !== 1 || holes.length < 1) {
    fail('LAFEA_SHELL_CURVED_HOLE_OUTER_AND_HOLE_COUNT_INVALID');
  }
  validateLoopOwnership(loops, segments);
  validateLoopGeometry(loops, segments, vertices);
  validateOuterRectangle(outer[0], segments, vertices, surface.radius);
  validateHoleContainmentAndDisjointness(outer[0], holes, segments, vertices);
  validateUvTopology(value, vertices, segments, loops);

  const core = {
    schema: exactText(value.schema, LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_GEOMETRY_SCHEMA, 'GEOMETRY_SCHEMA'),
    stageId,
    geometryId: text(value.geometryId, 'GEOMETRY_ID'),
    lengthUnit: text(value.lengthUnit, 'LENGTH_UNIT'),
    surface,
    orientationPolicy: LAFEA_SHELL_CURVED_HOLE_ORIENTATION,
    vertices,
    segments,
    loops,
  };
  return freeze({
    ...core,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea-shell-curved-hole-midsurface-geometry-hash-input/v1', geometry: core,
    }),
  });
}

export function validateLafeaCurvedHoleShellMidsurfaceGeometry(value) {
  exact(value, GEOMETRY_OUTPUT_KEYS, 'LAFEA_SHELL_CURVED_HOLE_GEOMETRY_OUTPUT_KEYS_INVALID');
  const rebuilt = createLafeaCurvedHoleShellMidsurfaceGeometry({
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
  if (rebuilt.semanticHash !== value.semanticHash) fail('LAFEA_SHELL_CURVED_HOLE_GEOMETRY_HASH_INVALID');
  return rebuilt;
}

export function createLafeaCurvedHoleShellMidsurfaceEvidence(value) {
  exact(value, EVIDENCE_KEYS, 'LAFEA_SHELL_CURVED_HOLE_EVIDENCE_KEYS_INVALID');
  exactText(value.schema, LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_INTAKE_SCHEMA, 'EVIDENCE_INTAKE_SCHEMA');
  const geometry = value.geometry?.semanticHash
    ? validateLafeaCurvedHoleShellMidsurfaceGeometry(value.geometry)
    : createLafeaCurvedHoleShellMidsurfaceGeometry(value.geometry);
  const analysisDomain = value.analysisDomain?.semanticHash
    ? validateLafeaCurvedHoleShellAnalysisDomain(value.analysisDomain)
    : createLafeaCurvedHoleShellAnalysisDomain(value.analysisDomain);
  const stageId = stage(value.stageId);
  const sourceHash = sha256(value.sourceHash, 'SOURCE_HASH');
  if (geometry.stageId !== stageId || analysisDomain.stageId !== stageId
    || analysisDomain.sourceHash !== sourceHash
    || analysisDomain.midsurfaceGeometryHash !== geometry.semanticHash
    || analysisDomain.lengthUnit !== geometry.lengthUnit
    || analysisDomain.topologyClass !== LAFEA_SHELL_CURVED_HOLE_TOPOLOGY) {
    fail('LAFEA_SHELL_CURVED_HOLE_EVIDENCE_PARENT_MISMATCH');
  }
  const core = {
    schema: LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_EVIDENCE_SCHEMA,
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
      schema: 'lafea-shell-curved-hole-midsurface-evidence-hash-input/v1', evidence: core,
    }),
  });
}

export function validateLafeaCurvedHoleShellMidsurfaceEvidence(value) {
  if (!value || value.schema !== LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_EVIDENCE_SCHEMA) {
    fail('LAFEA_SHELL_CURVED_HOLE_EVIDENCE_SCHEMA_INVALID');
  }
  const rebuilt = createLafeaCurvedHoleShellMidsurfaceEvidence({
    schema: LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_INTAKE_SCHEMA,
    stageId: value.stageId,
    sourceHash: value.sourceHash,
    analysisDomain: value.analysisDomain,
    geometry: value.geometry,
    producerRef: value.producerRef,
  });
  if (rebuilt.semanticHash !== value.semanticHash) fail('LAFEA_SHELL_CURVED_HOLE_EVIDENCE_TAMPERED');
  return rebuilt;
}

export function curvedHoleShellPoint3d(geometryValue, u, v) {
  const geometry = validateLafeaCurvedHoleShellMidsurfaceGeometry(geometryValue);
  const { axisOrigin, axisDirection, radialDirection, radius } = geometry.surface;
  const axis = array(axisDirection);
  const radial0 = array(radialDirection);
  const tangent0 = cross(axis, radial0);
  const theta = finite(u, 'U') / radius;
  const axial = finite(v, 'V');
  const radial = add(scale(radial0, Math.cos(theta)), scale(tangent0, Math.sin(theta)));
  return freeze(object(add(add(array(axisOrigin), scale(axis, axial)), scale(radial, radius))));
}

export function curvedHoleShellFrameAtUv(geometryValue, u, v) {
  void v;
  const geometry = validateLafeaCurvedHoleShellMidsurfaceGeometry(geometryValue);
  const axis = array(geometry.surface.axisDirection);
  const radial0 = array(geometry.surface.radialDirection);
  const tangent0 = cross(axis, radial0);
  const theta = finite(u, 'U') / geometry.surface.radius;
  const director = add(scale(radial0, Math.cos(theta)), scale(tangent0, Math.sin(theta)));
  const tangentU = add(scale(radial0, -Math.sin(theta)), scale(tangent0, Math.cos(theta)));
  return freeze({ director: object(director), rotationBasis1: object(tangentU), rotationBasis2: object(axis) });
}

export function curvedHoleShellUvAtPoint3d(geometryValue, pointValue) {
  const geometry = validateLafeaCurvedHoleShellMidsurfaceGeometry(geometryValue);
  const point = vector3(pointValue, 'POINT');
  const origin = array(geometry.surface.axisOrigin);
  const axis = array(geometry.surface.axisDirection);
  const radial0 = array(geometry.surface.radialDirection);
  const tangent0 = cross(axis, radial0);
  const relative = subtract(array(point), origin);
  const v = dot(relative, axis);
  const radial = subtract(relative, scale(axis, v));
  const radialNorm = norm(radial);
  const tolerance = geometryTolerance(geometry.surface.radius);
  if (Math.abs(radialNorm - geometry.surface.radius) > tolerance) {
    fail('LAFEA_SHELL_CURVED_HOLE_POINT_NOT_ON_CYLINDER');
  }
  const radialUnit = scale(radial, 1 / radialNorm);
  const angle = Math.atan2(dot(radialUnit, tangent0), dot(radialUnit, radial0));
  const u = angle * geometry.surface.radius;
  const bounds = curvedHoleShellGeometryBounds(geometry);
  if (u < bounds.uMin - tolerance || u > bounds.uMax + tolerance
    || v < bounds.vMin - tolerance || v > bounds.vMax + tolerance) {
    fail('LAFEA_SHELL_CURVED_HOLE_POINT_OUTSIDE_OUTER_PATCH');
  }
  return freeze({ u: canonical(u), v: canonical(v) });
}

export function curvedHoleShellFrameAtPoint3d(geometryValue, pointValue) {
  const uv = curvedHoleShellUvAtPoint3d(geometryValue, pointValue);
  return curvedHoleShellFrameAtUv(geometryValue, uv.u, uv.v);
}

export function curvedHoleShellParameterGeometry(geometryValue) {
  const geometry = validateLafeaCurvedHoleShellMidsurfaceGeometry(geometryValue);
  return createLafeaAnalysisGeometry({
    schema: 'lafea-analysis-geometry/v1',
    stageId: 'LAFEA.3',
    geometryId: `${geometry.geometryId}:CYLINDER-HOLE-PARAMETRIC`,
    coordinateSystemId: 'SHELL_CYLINDER_UV_ARCLENGTH_AXIAL_WITH_HOLES',
    lengthUnit: geometry.lengthUnit,
    orientationPolicy: 'OUTER_CCW_HOLES_CW_V1',
    vertices: geometry.vertices.map((row) => ({ vertexId: row.vertexId, x: row.u, y: row.v })),
    segments: geometry.segments.map((row) => ({
      segmentId: row.segmentId, type: 'LINE',
      startVertexId: row.startVertexId, endVertexId: row.endVertexId,
    })),
    loops: geometry.loops.map((row) => ({
      loopId: row.loopId, role: row.role, segmentIds: [...row.segmentIds],
    })),
  });
}

export function curvedHoleShellGeometryBounds(geometryValue) {
  const geometry = validateLafeaCurvedHoleShellMidsurfaceGeometry(geometryValue);
  const outer = geometry.loops.find((row) => row.role === 'OUTER');
  const vertexById = new Map(geometry.vertices.map((row) => [row.vertexId, row]));
  const segmentById = new Map(geometry.segments.map((row) => [row.segmentId, row]));
  const outerVertices = orderedLoopVertices(outer, segmentById, vertexById);
  const us = outerVertices.map((row) => row.u);
  const vs = outerVertices.map((row) => row.v);
  const uMin = Math.min(...us); const uMax = Math.max(...us);
  const vMin = Math.min(...vs); const vMax = Math.max(...vs);
  return freeze({
    uMin, uMax, vMin, vMax,
    angularSpanRadians: (uMax - uMin) / geometry.surface.radius,
    angularSpanDegrees: ((uMax - uMin) / geometry.surface.radius) * 180 / Math.PI,
    axialSpan: vMax - vMin,
  });
}

function canonicalCylinder(value) {
  exact(value, SURFACE_KEYS, 'LAFEA_SHELL_CURVED_HOLE_SURFACE_KEYS_INVALID');
  exactText(value.kind, LAFEA_SHELL_CURVED_HOLE_SURFACE_KIND, 'SURFACE_KIND');
  const axisOrigin = vector3(value.axisOrigin, 'AXIS_ORIGIN');
  const axisDirection = unitVector(value.axisDirection, 'AXIS_DIRECTION');
  const radialDirection = unitVector(value.radialDirection, 'RADIAL_DIRECTION');
  if (Math.abs(dot(array(axisDirection), array(radialDirection))) > EPS) {
    fail('LAFEA_SHELL_CURVED_HOLE_CYLINDER_BASIS_NOT_ORTHOGONAL');
  }
  const radius = finite(value.radius, 'RADIUS');
  if (!(radius > 0)) fail('LAFEA_SHELL_CURVED_HOLE_RADIUS_INVALID');
  return freeze({ kind: LAFEA_SHELL_CURVED_HOLE_SURFACE_KIND, axisOrigin, axisDirection, radialDirection, radius });
}

function canonicalVertices(value) {
  if (!Array.isArray(value) || value.length < 7) fail('LAFEA_SHELL_CURVED_HOLE_VERTICES_INVALID');
  const rows = value.map((row) => {
    exact(row, ['vertexId', 'u', 'v'], 'LAFEA_SHELL_CURVED_HOLE_VERTEX_KEYS_INVALID');
    return freeze({ vertexId: text(row.vertexId, 'VERTEX_ID'), u: finite(row.u, 'VERTEX_U'), v: finite(row.v, 'VERTEX_V') });
  }).sort(byId('vertexId'));
  unique(rows.map((row) => row.vertexId), 'LAFEA_SHELL_CURVED_HOLE_VERTEX_ID_DUPLICATE');
  return freeze(rows);
}

function canonicalSegments(value, vertices) {
  if (!Array.isArray(value) || value.length < 7) fail('LAFEA_SHELL_CURVED_HOLE_SEGMENTS_INVALID');
  const known = new Set(vertices.map((row) => row.vertexId));
  const rows = value.map((row) => {
    exact(row, ['segmentId', 'startVertexId', 'endVertexId'], 'LAFEA_SHELL_CURVED_HOLE_SEGMENT_KEYS_INVALID');
    const segment = {
      segmentId: text(row.segmentId, 'SEGMENT_ID'),
      startVertexId: text(row.startVertexId, 'START_VERTEX_ID'),
      endVertexId: text(row.endVertexId, 'END_VERTEX_ID'),
    };
    if (segment.startVertexId === segment.endVertexId
      || !known.has(segment.startVertexId) || !known.has(segment.endVertexId)) {
      fail('LAFEA_SHELL_CURVED_HOLE_SEGMENT_VERTEX_INVALID');
    }
    return freeze(segment);
  }).sort(byId('segmentId'));
  unique(rows.map((row) => row.segmentId), 'LAFEA_SHELL_CURVED_HOLE_SEGMENT_ID_DUPLICATE');
  return freeze(rows);
}

function canonicalLoops(value, segments) {
  if (!Array.isArray(value) || value.length < 2) fail('LAFEA_SHELL_CURVED_HOLE_LOOPS_INVALID');
  const known = new Set(segments.map((row) => row.segmentId));
  const rows = value.map((row) => {
    exact(row, ['loopId', 'role', 'segmentIds'], 'LAFEA_SHELL_CURVED_HOLE_LOOP_KEYS_INVALID');
    if (!['OUTER', 'HOLE'].includes(row.role)) fail('LAFEA_SHELL_CURVED_HOLE_LOOP_ROLE_INVALID');
    if (!Array.isArray(row.segmentIds) || row.segmentIds.length < 3) fail('LAFEA_SHELL_CURVED_HOLE_LOOP_TOO_SHORT');
    const segmentIds = row.segmentIds.map((id) => text(id, 'LOOP_SEGMENT_ID'));
    unique(segmentIds, 'LAFEA_SHELL_CURVED_HOLE_LOOP_SEGMENT_DUPLICATE');
    if (segmentIds.some((id) => !known.has(id))) fail('LAFEA_SHELL_CURVED_HOLE_LOOP_SEGMENT_MISSING');
    return freeze({ loopId: text(row.loopId, 'LOOP_ID'), role: row.role, segmentIds: freeze(segmentIds) });
  }).sort(loopCompare);
  unique(rows.map((row) => row.loopId), 'LAFEA_SHELL_CURVED_HOLE_LOOP_ID_DUPLICATE');
  return freeze(rows);
}

function validateLoopOwnership(loops, segments) {
  const owner = new Map();
  for (const loop of loops) {
    for (const segmentId of loop.segmentIds) {
      if (owner.has(segmentId)) fail('LAFEA_SHELL_CURVED_HOLE_SEGMENT_MULTI_LOOP');
      owner.set(segmentId, loop.loopId);
    }
  }
  if (owner.size !== segments.length) fail('LAFEA_SHELL_CURVED_HOLE_ORPHAN_SEGMENT');
}

function validateLoopGeometry(loops, segments, vertices) {
  const segmentById = new Map(segments.map((row) => [row.segmentId, row]));
  const vertexById = new Map(vertices.map((row) => [row.vertexId, row]));
  for (const loop of loops) {
    requireClosedLoop(loop.segmentIds, segmentById);
    const area2 = signedArea2(loop.segmentIds, segmentById, vertexById);
    if (loop.role === 'OUTER' && !(area2 > EPS)) fail('LAFEA_SHELL_CURVED_HOLE_OUTER_NOT_CCW_OR_DEGENERATE');
    if (loop.role === 'HOLE' && !(area2 < -EPS)) fail('LAFEA_SHELL_CURVED_HOLE_ORIENTATION_INVALID');
  }
}

function validateOuterRectangle(loop, segments, vertices, radius) {
  if (loop.segmentIds.length !== 4) fail('LAFEA_SHELL_CURVED_HOLE_OUTER_RECTANGLE_REQUIRES_FOUR_SEGMENTS');
  const segmentById = new Map(segments.map((row) => [row.segmentId, row]));
  const vertexById = new Map(vertices.map((row) => [row.vertexId, row]));
  const rows = orderedLoopVertices(loop, segmentById, vertexById);
  if (rows.length !== 4) fail('LAFEA_SHELL_CURVED_HOLE_OUTER_RECTANGLE_REQUIRES_FOUR_VERTICES');
  const uValues = [...new Set(rows.map((row) => row.u))].sort((a, b) => a - b);
  const vValues = [...new Set(rows.map((row) => row.v))].sort((a, b) => a - b);
  if (uValues.length !== 2 || vValues.length !== 2) fail('LAFEA_SHELL_CURVED_HOLE_OUTER_NOT_RECTANGULAR');
  for (const segmentId of loop.segmentIds) {
    const segment = segmentById.get(segmentId);
    const a = vertexById.get(segment.startVertexId);
    const b = vertexById.get(segment.endVertexId);
    const isoU = Math.abs(a.u - b.u) <= EPS;
    const isoV = Math.abs(a.v - b.v) <= EPS;
    if (isoU === isoV) fail('LAFEA_SHELL_CURVED_HOLE_OUTER_BOUNDARY_NOT_ISO_U_OR_ISO_V');
  }
  const span = (uValues[1] - uValues[0]) / radius;
  if (!(span > 0) || span > Math.PI + 1e-12) fail('LAFEA_SHELL_CURVED_HOLE_PATCH_ANGLE_EXCEEDS_180_DEGREES');
}

function validateHoleContainmentAndDisjointness(outer, holes, segments, vertices) {
  const segmentById = new Map(segments.map((row) => [row.segmentId, row]));
  const vertexById = new Map(vertices.map((row) => [row.vertexId, row]));
  const outerPolygon = orderedLoopVertices(outer, segmentById, vertexById);
  const holePolygons = holes.map((hole) => ({
    loopId: hole.loopId,
    polygon: orderedLoopVertices(hole, segmentById, vertexById),
    segments: hole.segmentIds.map((id) => segmentById.get(id)),
  }));
  const outerSegments = outer.segmentIds.map((id) => segmentById.get(id));

  for (const hole of holePolygons) {
    for (const point of hole.polygon) {
      if (!pointStrictlyInsidePolygon(point, outerPolygon)) fail('LAFEA_SHELL_CURVED_HOLE_OUTSIDE_OUTER');
    }
    for (const a of hole.segments) {
      for (const b of outerSegments) {
        if (segmentsIntersect(a, b, vertexById, false)) fail('LAFEA_SHELL_CURVED_HOLE_INTERSECTS_OUTER');
      }
    }
  }

  for (let i = 0; i < holePolygons.length; i += 1) {
    for (let j = i + 1; j < holePolygons.length; j += 1) {
      const left = holePolygons[i]; const right = holePolygons[j];
      for (const a of left.segments) {
        for (const b of right.segments) {
          if (segmentsIntersect(a, b, vertexById, true)) fail('LAFEA_SHELL_CURVED_HOLE_LOOPS_INTERSECT');
        }
      }
      if (pointStrictlyInsidePolygon(left.polygon[0], right.polygon)
        || pointStrictlyInsidePolygon(right.polygon[0], left.polygon)) {
        fail('LAFEA_SHELL_CURVED_HOLE_NESTED_HOLES_NOT_QUALIFIED');
      }
    }
  }
}

function validateUvTopology(value, vertices, segments, loops) {
  try {
    createLafeaAnalysisGeometry({
      schema: 'lafea-analysis-geometry/v1',
      stageId: 'LAFEA.3',
      geometryId: `${text(value.geometryId, 'GEOMETRY_ID')}:CURVED-HOLE-UV-CHECK`,
      coordinateSystemId: 'SHELL_CYLINDER_UV_ARCLENGTH_AXIAL_WITH_HOLES',
      lengthUnit: text(value.lengthUnit, 'LENGTH_UNIT'),
      orientationPolicy: 'OUTER_CCW_HOLES_CW_V1',
      vertices: vertices.map((row) => ({ vertexId: row.vertexId, x: row.u, y: row.v })),
      segments: segments.map((row) => ({
        segmentId: row.segmentId, type: 'LINE',
        startVertexId: row.startVertexId, endVertexId: row.endVertexId,
      })),
      loops: loops.map((row) => ({ loopId: row.loopId, role: row.role, segmentIds: [...row.segmentIds] })),
    });
  } catch (error) {
    const wrapped = new TypeError('LAFEA_SHELL_CURVED_HOLE_PARAMETRIC_TOPOLOGY_INVALID');
    wrapped.code = 'LAFEA_SHELL_CURVED_HOLE_PARAMETRIC_TOPOLOGY_INVALID';
    wrapped.cause = error;
    throw wrapped;
  }
}

function orderedLoopVertices(loop, segmentById, vertexById) {
  return loop.segmentIds.map((id) => vertexById.get(segmentById.get(id).startVertexId));
}
function requireClosedLoop(ids, segmentById) {
  for (let index = 0; index < ids.length; index += 1) {
    const current = segmentById.get(ids[index]);
    const next = segmentById.get(ids[(index + 1) % ids.length]);
    if (current.endVertexId !== next.startVertexId) fail('LAFEA_SHELL_CURVED_HOLE_LOOP_NOT_CONTIGUOUS');
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
function pointStrictlyInsidePolygon(point, polygon) {
  if (pointOnPolygonBoundary(point, polygon)) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]; const b = polygon[j];
    const crosses = ((a.v > point.v) !== (b.v > point.v))
      && (point.u < (b.u - a.u) * (point.v - a.v) / (b.v - a.v) + a.u);
    if (crosses) inside = !inside;
  }
  return inside;
}
function pointOnPolygonBoundary(point, polygon) {
  for (let i = 0; i < polygon.length; i += 1) {
    if (pointOnSegment(point, polygon[i], polygon[(i + 1) % polygon.length])) return true;
  }
  return false;
}
function pointOnSegment(point, a, b) {
  const crossValue = (point.u - a.u) * (b.v - a.v) - (point.v - a.v) * (b.u - a.u);
  if (Math.abs(crossValue) > 1e-10) return false;
  const dotValue = (point.u - a.u) * (point.u - b.u) + (point.v - a.v) * (point.v - b.v);
  return dotValue <= 1e-10;
}
function segmentsIntersect(left, right, vertexById, includeTouch) {
  const a = vertexById.get(left.startVertexId); const b = vertexById.get(left.endVertexId);
  const c = vertexById.get(right.startVertexId); const d = vertexById.get(right.endVertexId);
  const o1 = orient2(a, b, c); const o2 = orient2(a, b, d);
  const o3 = orient2(c, d, a); const o4 = orient2(c, d, b);
  if (o1 * o2 < -EPS && o3 * o4 < -EPS) return true;
  if (!includeTouch) return false;
  return (Math.abs(o1) <= EPS && pointOnSegment(c, a, b))
    || (Math.abs(o2) <= EPS && pointOnSegment(d, a, b))
    || (Math.abs(o3) <= EPS && pointOnSegment(a, c, d))
    || (Math.abs(o4) <= EPS && pointOnSegment(b, c, d));
}
function orient2(a, b, c) { return (b.u - a.u) * (c.v - a.v) - (b.v - a.v) * (c.u - a.u); }

function vector3(value, label) {
  exact(value, ['x', 'y', 'z'], `LAFEA_SHELL_CURVED_HOLE_${label}_KEYS_INVALID`);
  return freeze({ x: finite(value.x, `${label}_X`), y: finite(value.y, `${label}_Y`), z: finite(value.z, `${label}_Z`) });
}
function unitVector(value, label) {
  const row = vector3(value, label);
  if (Math.abs(norm(array(row)) - 1) > EPS) fail(`LAFEA_SHELL_CURVED_HOLE_${label}_NOT_UNIT`);
  return row;
}
function array(value) { return [value.x, value.y, value.z]; }
function object(value) { return { x: canonical(value[0]), y: canonical(value[1]), z: canonical(value[2]) }; }
function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function subtract(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function scale(a, factor) { return [a[0] * factor, a[1] * factor, a[2] * factor]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function norm(value) { return Math.hypot(value[0], value[1], value[2]); }
function geometryTolerance(radius) { return Math.max(1e-9, Math.abs(radius) * 1e-10); }
function stage(value) {
  if (!LAFEA_SHELL_CURVED_HOLE_STAGES.includes(value)) fail('LAFEA_SHELL_CURVED_HOLE_STAGE_INVALID');
  return value;
}
function exactText(value, expected, label) {
  if (value !== expected) fail(`LAFEA_SHELL_CURVED_HOLE_${label}_INVALID`);
  return value;
}
function text(value, label) {
  if (typeof value !== 'string' || !value.trim()) fail(`LAFEA_SHELL_CURVED_HOLE_${label}_INVALID`);
  return value.trim();
}
function finite(value, label) {
  if (!Number.isFinite(value)) fail(`LAFEA_SHELL_CURVED_HOLE_${label}_INVALID`);
  return canonical(value);
}
function sha256(value, label) {
  const out = text(value, label);
  if (!/^sha256:[0-9a-f]{64}$/u.test(out)) fail(`LAFEA_SHELL_CURVED_HOLE_${label}_INVALID`);
  return out;
}
function unique(values, code) { if (new Set(values).size !== values.length) fail(code); }
function byId(key) { return (left, right) => left[key].localeCompare(right[key]); }
function loopCompare(a, b) { if (a.role !== b.role) return a.role === 'OUTER' ? -1 : 1; return a.loopId.localeCompare(b.loopId); }
function canonical(value) { return Object.is(value, -0) ? 0 : Number(value.toPrecision(15)); }
function exact(value, keys, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join('|') !== [...keys].sort().join('|')) fail(code);
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
