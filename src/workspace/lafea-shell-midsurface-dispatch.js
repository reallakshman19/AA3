import { createLafeaAnalysisGeometry } from './lafea-analysis-geometry-contract.js';
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
import {
  LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_EVIDENCE_SCHEMA,
  LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_GEOMETRY_SCHEMA,
  curvedHoleShellFrameAtPoint3d,
  curvedHoleShellFrameAtUv,
  curvedHoleShellParameterGeometry,
  curvedHoleShellPoint3d,
  validateLafeaCurvedHoleShellMidsurfaceEvidence,
  validateLafeaCurvedHoleShellMidsurfaceGeometry,
} from './lafea-shell-curved-hole-midsurface-contract.js';
import {
  LAFEA_SHELL_PERIODIC_MIDSURFACE_EVIDENCE_SCHEMA,
  LAFEA_SHELL_PERIODIC_MIDSURFACE_GEOMETRY_SCHEMA,
  periodicCylindricalShellFrameAtPoint3d,
  periodicCylindricalShellFrameAtUv,
  periodicCylindricalShellParameterGeometry,
  periodicCylindricalShellPoint3d,
  validateLafeaPeriodicShellMidsurfaceEvidence,
  validateLafeaPeriodicShellMidsurfaceGeometry,
} from './lafea-shell-periodic-midsurface-contract.js';
import {
  LAFEA_SHELL_MULTIPATCH_MIDSURFACE_EVIDENCE_SCHEMA,
  LAFEA_SHELL_MULTIPATCH_MIDSURFACE_GEOMETRY_SCHEMA,
  multiPatchShellFrame,
  multiPatchShellPoint3d,
  validateLafeaMultiPatchShellMidsurfaceEvidence,
  validateLafeaMultiPatchShellMidsurfaceGeometry,
} from './lafea-shell-multipatch-midsurface-contract.js';
import {
  LAFEA5_SOURCE_SHELL_PARENT_SCHEMA,
  validateLafea5SourceShellParent,
} from './lafea-source-shell-mesh-adoption.js';

export const LAFEA_SHELL_SURFACE_KINDS = Object.freeze({
  PLANAR: 'PLANAR',
  PLANAR_MULTIPATCH: 'PLANAR_MULTIPATCH',
  CYLINDRICAL: 'CYLINDRICAL',
  CYLINDRICAL_HOLES: 'CYLINDRICAL_HOLES',
  CYLINDRICAL_PERIODIC: 'CYLINDRICAL_PERIODIC',
  SOURCE_MESH: 'SOURCE_MESH',
});

export function validateLafeaAnyShellMidsurfaceEvidence(value) {
  if (value?.schema === LAFEA5_SOURCE_SHELL_PARENT_SCHEMA) {
    return validateLafea5SourceShellParent(value);
  }
  if (value?.schema === LAFEA_SHELL_MULTIPATCH_MIDSURFACE_EVIDENCE_SCHEMA) {
    return validateLafeaMultiPatchShellMidsurfaceEvidence(value);
  }
  if (value?.schema === LAFEA_SHELL_PERIODIC_MIDSURFACE_EVIDENCE_SCHEMA) {
    return validateLafeaPeriodicShellMidsurfaceEvidence(value);
  }
  if (value?.schema === LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_EVIDENCE_SCHEMA) {
    return validateLafeaCurvedHoleShellMidsurfaceEvidence(value);
  }
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
  if (geometry?.schema === LAFEA5_SOURCE_SHELL_PARENT_SCHEMA) {
    validateLafea5SourceShellParent(geometry);
    return LAFEA_SHELL_SURFACE_KINDS.SOURCE_MESH;
  }
  if (geometry?.schema === LAFEA_SHELL_MULTIPATCH_MIDSURFACE_GEOMETRY_SCHEMA) {
    validateLafeaMultiPatchShellMidsurfaceGeometry(geometry);
    return LAFEA_SHELL_SURFACE_KINDS.PLANAR_MULTIPATCH;
  }
  if (geometry?.schema === LAFEA_SHELL_PERIODIC_MIDSURFACE_GEOMETRY_SCHEMA) {
    validateLafeaPeriodicShellMidsurfaceGeometry(geometry);
    return LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL_PERIODIC;
  }
  if (geometry?.schema === LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_GEOMETRY_SCHEMA) {
    validateLafeaCurvedHoleShellMidsurfaceGeometry(geometry);
    return LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL_HOLES;
  }
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
  const kind = shellMidsurfaceKind(geometry);
  if (kind === LAFEA_SHELL_SURFACE_KINDS.SOURCE_MESH) {
    fail('LAFEA5_SOURCE_SHELL_ADOPTION_HAS_NO_PARAMETRIC_MIDSURFACE');
  }
  if (kind === LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL_PERIODIC) {
    return periodicCylindricalShellPoint3d(geometry, u, v);
  }
  if (kind === LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL_HOLES) {
    return curvedHoleShellPoint3d(geometry, u, v);
  }
  if (kind === LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL) {
    return cylindricalShellPoint3d(geometry, u, v);
  }
  if (kind === LAFEA_SHELL_SURFACE_KINDS.PLANAR_MULTIPATCH) {
    return multiPatchShellPoint3d(geometry, u, v);
  }
  return shellMidsurfacePoint3d(geometry, u, v);
}

export function shellMidsurfaceFrameAtUvAny(geometry, u, v) {
  const kind = shellMidsurfaceKind(geometry);
  if (kind === LAFEA_SHELL_SURFACE_KINDS.SOURCE_MESH) {
    fail('LAFEA5_SOURCE_SHELL_ADOPTION_HAS_NO_PARAMETRIC_MIDSURFACE');
  }
  if (kind === LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL_PERIODIC) {
    return periodicCylindricalShellFrameAtUv(geometry, u, v);
  }
  if (kind === LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL_HOLES) {
    return curvedHoleShellFrameAtUv(geometry, u, v);
  }
  if (kind === LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL) {
    return cylindricalShellFrameAtUv(geometry, u, v);
  }
  if (kind === LAFEA_SHELL_SURFACE_KINDS.PLANAR_MULTIPATCH) {
    return multiPatchShellFrame(geometry);
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
  const kind = shellMidsurfaceKind(geometry);
  if (kind === LAFEA_SHELL_SURFACE_KINDS.SOURCE_MESH) {
    fail('LAFEA5_SOURCE_SHELL_ADOPTION_HAS_NO_PARAMETRIC_MIDSURFACE');
  }
  if (kind === LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL_PERIODIC) {
    return periodicCylindricalShellFrameAtPoint3d(geometry, physicalPoint(point));
  }
  if (kind === LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL_HOLES) {
    return curvedHoleShellFrameAtPoint3d(geometry, physicalPoint(point));
  }
  if (kind === LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL) {
    return cylindricalShellFrameAtPoint3d(geometry, physicalPoint(point));
  }
  if (kind === LAFEA_SHELL_SURFACE_KINDS.PLANAR_MULTIPATCH) {
    const planar = validateLafeaMultiPatchShellMidsurfaceGeometry(geometry);
    requirePointOnPlane(planar, point);
    return multiPatchShellFrame(planar);
  }
  const planar = validateLafeaShellMidsurfaceGeometry(geometry);
  requirePointOnPlane(planar, point);
  const normal = cross(planar.axisU, planar.axisV);
  return freeze({ director: normal, rotationBasis1: planar.axisU, rotationBasis2: planar.axisV });
}

export function shellMidsurfaceParameterGeometry(value) {
  const evidence = value?.geometry ? validateLafeaAnyShellMidsurfaceEvidence(value) : null;
  const geometry = evidence?.geometry ?? value;
  const kind = shellMidsurfaceKind(geometry);
  if (kind === LAFEA_SHELL_SURFACE_KINDS.SOURCE_MESH) {
    fail('LAFEA5_SOURCE_SHELL_ADOPTION_HAS_NO_PARAMETRIC_MIDSURFACE');
  }
  if (kind === LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL_PERIODIC) {
    return periodicCylindricalShellParameterGeometry(geometry);
  }
  if (kind === LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL_HOLES) {
    return curvedHoleShellParameterGeometry(geometry);
  }
  if (kind === LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL) {
    return curvedShellParameterGeometry(geometry);
  }
  if (kind === LAFEA_SHELL_SURFACE_KINDS.PLANAR_MULTIPATCH) {
    fail('LAFEA_SHELL_MULTIPATCH_REQUIRES_PATCHWISE_PARAMETER_MESHING');
  }
  const planar = validateLafeaShellMidsurfaceGeometry(geometry);
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

function requirePointOnPlane(planar, point) {
  const offset = subtract(physicalPoint(point), planar.origin);
  const normal = cross(planar.axisU, planar.axisV);
  const normalResidual = Math.abs(dot(offset, normal));
  if (normalResidual > 1e-9) fail('LAFEA_SHELL_PLANAR_POINT_NOT_ON_MIDSURFACE');
}
function physicalPoint(value) {
  if (!value || typeof value !== 'object'
    || !Number.isFinite(value.x) || !Number.isFinite(value.y) || !Number.isFinite(value.z)) {
    fail('LAFEA_SHELL_MIDSURFACE_POINT_INVALID');
  }
  return { x: value.x, y: value.y, z: value.z };
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
