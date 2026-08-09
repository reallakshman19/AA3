import {
  LAFEA_SHELL_MIDSURFACE_EVIDENCE_SCHEMA,
  LAFEA_SHELL_MIDSURFACE_GEOMETRY_SCHEMA,
  shellMidsurfacePoint3d,
  validateLafeaShellMidsurfaceEvidence,
  validateLafeaShellMidsurfaceGeometry,
} from './lafea-shell-midsurface-contract.js';
import {
  LAFEA_SHELL_CURVED_MIDSURFACE_EVIDENCE_SCHEMA,
  LAFEA_SHELL_CURVED_MIDSURFACE_GEOMETRY_SCHEMA,
  curvedShellParameterGeometry,
  cylindricalShellFrameAtPoint3d,
  cylindricalShellFrameAtUv,
  cylindricalShellPoint3d,
  validateLafeaCurvedShellMidsurfaceEvidence,
  validateLafeaCurvedShellMidsurfaceGeometry,
} from './lafea-shell-curved-midsurface-contract.js';

export const LAFEA_SHELL_SURFACE_KINDS = Object.freeze({
  PLANAR: 'PLANAR',
  CYLINDRICAL: 'CYLINDRICAL',
});

export function validateLafeaAnyShellMidsurfaceEvidence(value) {
  if (value?.schema === LAFEA_SHELL_CURVED_MIDSURFACE_EVIDENCE_SCHEMA) {
    return validateLafeaCurvedShellMidsurfaceEvidence(value);
  }
  if (value?.schema === LAFEA_SHELL_MIDSURFACE_EVIDENCE_SCHEMA) {
    return validateLafeaShellMidsurfaceEvidence(value);
  }
  fail('LAFEA_SHELL_MIDSURFACE_EVIDENCE_SCHEMA_UNSUPPORTED');
}

export function shellMidsurfaceKind(value) {
  const geometry = value?.geometry ?? value;
  if (geometry?.schema === LAFEA_SHELL_CURVED_MIDSURFACE_GEOMETRY_SCHEMA) {
    validateLafeaCurvedShellMidsurfaceGeometry(geometry);
    return LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL;
  }
  if (geometry?.schema === LAFEA_SHELL_MIDSURFACE_GEOMETRY_SCHEMA) {
    validateLafeaShellMidsurfaceGeometry(geometry);
    return LAFEA_SHELL_SURFACE_KINDS.PLANAR;
  }
  fail('LAFEA_SHELL_MIDSURFACE_GEOMETRY_SCHEMA_UNSUPPORTED');
}

export function shellMidsurfacePoint3dAny(geometry, u, v) {
  return shellMidsurfaceKind(geometry) === LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL
    ? cylindricalShellPoint3d(geometry, u, v)
    : shellMidsurfacePoint3d(geometry, u, v);
}

export function shellMidsurfaceFrameAtUvAny(geometry, u, v) {
  if (shellMidsurfaceKind(geometry) === LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL) {
    return cylindricalShellFrameAtUv(geometry, u, v);
  }
  const planar = validateLafeaShellMidsurfaceGeometry(geometry);
  const director = cross(planar.axisU, planar.axisV);
  return freeze({
    director,
    rotationBasis1: planar.axisU,
    rotationBasis2: planar.axisV,
  });
}

export function shellMidsurfaceFrameAtPoint3dAny(geometry, point) {
  if (shellMidsurfaceKind(geometry) === LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL) {
    return cylindricalShellFrameAtPoint3d(geometry, point);
  }
  const planar = validateLafeaShellMidsurfaceGeometry(geometry);
  const offset = subtract(point, planar.origin);
  const normal = cross(planar.axisU, planar.axisV);
  const normalResidual = Math.abs(dot(offset, normal));
  if (normalResidual > 1e-9) fail('LAFEA_SHELL_PLANAR_POINT_NOT_ON_MIDSURFACE');
  return freeze({ director: normal, rotationBasis1: planar.axisU, rotationBasis2: planar.axisV });
}

export function shellMidsurfaceParameterGeometry(value) {
  const evidence = value?.geometry ? validateLafeaAnyShellMidsurfaceEvidence(value) : null;
  const geometry = evidence?.geometry ?? value;
  if (shellMidsurfaceKind(geometry) === LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL) {
    return curvedShellParameterGeometry(geometry);
  }
  const planar = validateLafeaShellMidsurfaceGeometry(geometry);
  const { createLafeaAnalysisGeometry } = requireAnalysisGeometryFactory();
  return createLafeaAnalysisGeometry({
    schema: 'lafea-analysis-geometry/v1',
    stageId: 'LAFEA.3',
    geometryId: `${planar.geometryId}:PARAMETRIC`,
    coordinateSystemId: 'SHELL_MIDSURFACE_UV',
    lengthUnit: planar.lengthUnit,
    orientationPolicy: 'OUTER_CCW_HOLES_CW_V1',
    vertices: planar.vertices.map((row) => ({ vertexId: row.vertexId, x: row.u, y: row.v })),
    segments: planar.segments.map((row) => ({
      segmentId: row.segmentId,
      type: 'LINE',
      startVertexId: row.startVertexId,
      endVertexId: row.endVertexId,
    })),
    loops: planar.loops.map((row) => ({
      loopId: row.loopId, role: row.role, segmentIds: [...row.segmentIds],
    })),
  });
}

// Keep this module dependency-light for custody/producer use. The planar
// parameter-geometry builder is retained in the producer; callers should not
// reach this helper until the static import version lands.
function requireAnalysisGeometryFactory() {
  fail('LAFEA_SHELL_PLANAR_PARAMETER_GEOMETRY_DISPATCH_NOT_AVAILABLE');
}

function cross(left, right) {
  return {
    x: left.y * right.z - left.z * right.y,
    y: left.z * right.x - left.x * right.z,
    z: left.x * right.y - left.y * right.x,
  };
}
function subtract(left, right) {
  return { x: left.x - right.x, y: left.y - right.y, z: left.z - right.z };
}
function dot(left, right) { return left.x * right.x + left.y * right.y + left.z * right.z; }
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
