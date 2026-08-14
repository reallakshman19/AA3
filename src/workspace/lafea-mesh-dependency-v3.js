/**
 * V3 semantic mesh-dependency projection.
 *
 * sourceHash remains audit provenance. meshDependencyHash is intentionally
 * computed only from inputs that are allowed to invalidate mesh custody.
 */
import {
  LAFEA_ANALYSIS_MESH_FEA_STAGES,
} from './lafea-analysis-mesh-contract.js';
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA_MESH_DEPENDENCY_V3_SCHEMA = 'lafea-mesh-dependency/v3';

const INPUT_KEYS = Object.freeze([
  'schema',
  'stageId',
  'sourceHash',
  'geometryTopologyHash',
  'analysisGeometryHash',
  'propertyBoundaryHash',
  'meshProfileHash',
  'meshAffectingPropertyHash',
  'geometryPredicateProfileHash',
]);

/**
 * Build a governed dependency projection for mesh custody.
 *
 * Notably absent are load/BC values, display state and report metadata. Those
 * may have their own analysis/audit hashes, but they do not invalidate a mesh
 * unless a stage adapter explicitly projects a mesh-affecting consequence into
 * one of the fields below.
 */
export function createLafeaMeshDependencyProjectionV3(value) {
  exact(value, INPUT_KEYS, 'LAFEA_MESH_DEPENDENCY_V3_KEYS_INVALID');
  if (value.schema !== LAFEA_MESH_DEPENDENCY_V3_SCHEMA) {
    fail('LAFEA_MESH_DEPENDENCY_V3_SCHEMA_INVALID');
  }
  const stageId = stage(value.stageId);
  const sourceHash = sha256(value.sourceHash, 'SOURCE_HASH');
  const meshInputs = freeze({
    stageId,
    geometryTopologyHash: sha256(value.geometryTopologyHash, 'GEOMETRY_TOPOLOGY_HASH'),
    analysisGeometryHash: sha256(value.analysisGeometryHash, 'ANALYSIS_GEOMETRY_HASH'),
    propertyBoundaryHash: sha256(value.propertyBoundaryHash, 'PROPERTY_BOUNDARY_HASH'),
    meshProfileHash: text(value.meshProfileHash, 'MESH_PROFILE_HASH'),
    meshAffectingPropertyHash: optionalSha256(
      value.meshAffectingPropertyHash,
      'MESH_AFFECTING_PROPERTY_HASH',
    ),
    geometryPredicateProfileHash: sha256(
      value.geometryPredicateProfileHash,
      'GEOMETRY_PREDICATE_PROFILE_HASH',
    ),
  });
  const meshDependencyHash = canonicalLafeaSha256({
    schema: 'lafea-mesh-dependency-hash-input/v3',
    meshInputs,
  });
  const projectionCore = freeze({
    schema: LAFEA_MESH_DEPENDENCY_V3_SCHEMA,
    stageId,
    sourceHash,
    ...meshInputs,
    meshDependencyHash,
  });
  return freeze({
    ...projectionCore,
    projectionHash: canonicalLafeaSha256({
      schema: 'lafea-mesh-dependency-projection-hash-input/v3',
      projection: projectionCore,
    }),
  });
}

/**
 * Mesh custody equivalence ignores whole-source audit changes and compares the
 * governed semantic dependency only.
 */
export function sameLafeaMeshDependencyV3(left, right) {
  const a = validateLafeaMeshDependencyProjectionV3(left);
  const b = validateLafeaMeshDependencyProjectionV3(right);
  return a.meshDependencyHash === b.meshDependencyHash;
}

export function validateLafeaMeshDependencyProjectionV3(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('LAFEA_MESH_DEPENDENCY_V3_PROJECTION_INVALID');
  }
  const rebuilt = createLafeaMeshDependencyProjectionV3({
    schema: value.schema,
    stageId: value.stageId,
    sourceHash: value.sourceHash,
    geometryTopologyHash: value.geometryTopologyHash,
    analysisGeometryHash: value.analysisGeometryHash,
    propertyBoundaryHash: value.propertyBoundaryHash,
    meshProfileHash: value.meshProfileHash,
    meshAffectingPropertyHash: value.meshAffectingPropertyHash,
    geometryPredicateProfileHash: value.geometryPredicateProfileHash,
  });
  if (value.meshDependencyHash !== rebuilt.meshDependencyHash
    || value.projectionHash !== rebuilt.projectionHash) {
    fail('LAFEA_MESH_DEPENDENCY_V3_HASH_INVALID');
  }
  const expectedKeys = [...INPUT_KEYS, 'meshDependencyHash', 'projectionHash'].sort();
  const actualKeys = Object.keys(value).sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    fail('LAFEA_MESH_DEPENDENCY_V3_PROJECTION_KEYS_INVALID');
  }
  return rebuilt;
}

function stage(value) {
  if (!LAFEA_ANALYSIS_MESH_FEA_STAGES.includes(value)) {
    fail('LAFEA_MESH_DEPENDENCY_V3_STAGE_INVALID');
  }
  return value;
}

function exact(value, keys, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) {
    fail(code);
  }
}

function text(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    fail(`LAFEA_MESH_DEPENDENCY_V3_${field}_INVALID`);
  }
  return value.trim();
}

function sha256(value, field) {
  const out = text(value, field);
  if (!/^sha256:[0-9a-f]{64}$/u.test(out)) {
    fail(`LAFEA_MESH_DEPENDENCY_V3_${field}_INVALID`);
  }
  return out;
}

function optionalSha256(value, field) {
  return value === null ? null : sha256(value, field);
}

function fail(code) {
  const error = new TypeError(code);
  error.code = code;
  throw error;
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
