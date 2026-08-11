/** Governed custody contract for Bucket-01 T6 geometry qualification evidence. */
import {
  LAFEA_LUG_PINHOLE_T6_MESH_PACKAGE_SCHEMA,
  validateLafeaLugPinholeT6MeshPackage,
} from '../core/lafea-meshing/lug-pinhole-t6.js';
import {
  LAFEA_BUCKET_01_MESH_QUALIFICATION_EVIDENCE_SCHEMA,
  validateLafeaBucket01MeshQualificationEvidence,
} from './lafea-bucket-01-mesh-qualification.js';
import { lafeaAnalysisMeshContentHash } from './lafea-analysis-mesh-evidence.js';
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA_T6_GEOMETRY_QUALIFICATION_INTAKE_SCHEMA =
  'lafea-t6-geometry-qualification-intake/v1';
export const LAFEA_T6_GEOMETRY_QUALIFICATION_CUSTODY_SCHEMA =
  'lafea-t6-geometry-qualification-custody/v1';
export const LAFEA_T6_GEOMETRY_QUALIFICATION_STAGE_ID = 'LAFEA.3';

const INTAKE_KEYS = Object.freeze([
  'schema', 'stageId', 'evidence', 'meshPackage',
]);

/**
 * Validate and retain one exact qualification envelope plus its validator-required
 * parent mesh package. This establishes evidence/parent integrity only; current
 * workbench source/mesh/head binding is deliberately a separate projection.
 */
export function createLafeaT6GeometryQualificationCustody(intakeValue) {
  const intake = exactRecord(intakeValue, INTAKE_KEYS, 'T6 qualification intake');
  if (intake.schema !== LAFEA_T6_GEOMETRY_QUALIFICATION_INTAKE_SCHEMA) {
    throw custodyError('LAFEA_T6_GEOMETRY_INTAKE_SCHEMA_INVALID');
  }
  if (intake.stageId !== LAFEA_T6_GEOMETRY_QUALIFICATION_STAGE_ID) {
    throw custodyError('LAFEA_T6_GEOMETRY_STAGE_NOT_SUPPORTED');
  }

  const meshPackage = freeze(structuredClone(intake.meshPackage));
  if (meshPackage?.schema !== LAFEA_LUG_PINHOLE_T6_MESH_PACKAGE_SCHEMA) {
    throw custodyError('LAFEA_T6_GEOMETRY_PARENT_PACKAGE_SCHEMA_INVALID');
  }
  const packageValidation = validateLafeaLugPinholeT6MeshPackage(meshPackage);
  if (!packageValidation.ok) {
    throw custodyError(
      packageValidation.errors?.[0] ?? 'LAFEA_T6_GEOMETRY_PARENT_PACKAGE_INVALID',
    );
  }

  const evidence = freeze(structuredClone(intake.evidence));
  if (evidence?.schema !== LAFEA_BUCKET_01_MESH_QUALIFICATION_EVIDENCE_SCHEMA) {
    throw custodyError('LAFEA_T6_GEOMETRY_EVIDENCE_SCHEMA_INVALID');
  }
  const evidenceValidation = validateLafeaBucket01MeshQualificationEvidence(
    evidence,
    meshPackage,
  );
  if (!evidenceValidation.ok) {
    throw custodyError(
      evidenceValidation.errors?.[0] ?? 'LAFEA_T6_GEOMETRY_EVIDENCE_INVALID',
    );
  }
  requireQualificationScope(evidence, meshPackage);

  const parentMeshPackageDigest = canonicalLafeaSha256({
    schema: 'lafea-t6-geometry-parent-package-digest/v1',
    meshPackage,
  });
  const analysisMeshHash = lafeaAnalysisMeshContentHash(meshPackage.mesh);

  return freeze({
    schema: LAFEA_T6_GEOMETRY_QUALIFICATION_CUSTODY_SCHEMA,
    stageId: LAFEA_T6_GEOMETRY_QUALIFICATION_STAGE_ID,
    status: evidence.status,
    exactHeadSha: evidence.exactHeadSha,
    qualificationProfileHash: evidence.qualificationProfileHash,
    declaredMeshPackageHash: evidence.meshPackageHash,
    parentMeshPackageDigest,
    analysisMeshHash,
    meshIdentity: evidence.meshIdentity,
    evidenceSemanticHash: evidence.semanticHash,
    evidence,
    meshPackage,
    authority: freeze({
      evidenceParentValidated: true,
      currentWorkbenchBindingEstablished: false,
      releaseQualified: false,
    }),
  });
}

export function validateLafeaT6GeometryQualificationCustody(value) {
  try {
    if (!value || value.schema !== LAFEA_T6_GEOMETRY_QUALIFICATION_CUSTODY_SCHEMA) {
      throw custodyError('LAFEA_T6_GEOMETRY_CUSTODY_SCHEMA_INVALID');
    }
    const rebuilt = createLafeaT6GeometryQualificationCustody({
      schema: LAFEA_T6_GEOMETRY_QUALIFICATION_INTAKE_SCHEMA,
      stageId: value.stageId,
      evidence: value.evidence,
      meshPackage: value.meshPackage,
    });
    if (JSON.stringify(rebuilt) !== JSON.stringify(value)) {
      throw custodyError('LAFEA_T6_GEOMETRY_CUSTODY_REBUILD_MISMATCH');
    }
    if (!isDeepFrozen(value)) {
      throw custodyError('LAFEA_T6_GEOMETRY_CUSTODY_NOT_FROZEN');
    }
    return freeze({ ok: true, errors: [] });
  } catch (error) {
    return freeze({
      ok: false,
      errors: [error?.code ?? 'LAFEA_T6_GEOMETRY_CUSTODY_INVALID'],
    });
  }
}

function requireQualificationScope(evidence, meshPackage) {
  if (evidence.elementType !== 'T6'
    || evidence.geometryClass !== 'CONCENTRIC_ANNULAR_LUG_PINHOLE'
    || meshPackage.authority?.elementType !== 'T6'
    || meshPackage.authority?.selectedGeometryClass
      !== 'CONCENTRIC_ANNULAR_LUG_PINHOLE') {
    throw custodyError('LAFEA_T6_GEOMETRY_SCOPE_MISMATCH');
  }
  if (!['PASS', 'BLOCKED'].includes(evidence.status)) {
    throw custodyError('LAFEA_T6_GEOMETRY_STATUS_INVALID');
  }
  if (evidence.authority?.releaseQualified !== false
    || meshPackage.authority?.releaseQualified !== false) {
    throw custodyError('LAFEA_T6_GEOMETRY_RELEASE_AUTHORITY_INVALID');
  }
  if (evidence.meshIdentity !== meshPackage.spec?.meshIdentity
    || evidence.topology?.nodeCount !== meshPackage.mesh?.nodes?.length
    || evidence.topology?.elementCount !== meshPackage.mesh?.elements?.length) {
    throw custodyError('LAFEA_T6_GEOMETRY_PARENT_IDENTITY_MISMATCH');
  }
}

function exactRecord(value, expectedKeys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype) {
    throw custodyError('LAFEA_T6_GEOMETRY_RECORD_INVALID', `${label} must be a plain record.`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (actual.length !== expected.length
    || actual.some((key, index) => key !== expected[index])) {
    throw custodyError('LAFEA_T6_GEOMETRY_EXACT_KEYS_INVALID');
  }
  return value;
}
function custodyError(code, message = code) {
  const error = new TypeError(message);
  error.code = code;
  return error;
}
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
function isDeepFrozen(value) {
  if (!value || typeof value !== 'object') return true;
  return Object.isFrozen(value) && Object.values(value).every(isDeepFrozen);
}
