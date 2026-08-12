/**
 * Explicit LAFEA.3 geometry/mesh revalidation without solver execution.
 *
 * Revalidation derives current canonical identities from the current normalized
 * source, compares them with retained REVALIDATION_REQUIRED evidence, and only
 * then produces new exact-parent lifecycle records. Stable identity is evidence
 * to rebind current parents; it is never authority to copy an old parent hash.
 */
import {
  createLafeaArtifactRecord,
  registerLafeaArtifact,
} from './lafea-lifecycle.js';
import { LAFEA_PRODUCER_REVISION } from './lafea-lifecycle-producers.js';
import { requireLafeaStageRegistryEntry } from './lafea-stage-registry.js';
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import { lafeaAnalysisMeshContentHash } from './lafea-analysis-mesh-contract.js';
import { createLafeaContinuumGeometryProjection } from './lafea-continuum-geometry-projection.js';
import { createLafeaContinuumSourceAnalysisMesh } from './lafea-continuum-source-mesh.js';
import {
  sourceAuthorityDocument,
  validateLafeaSourceAuthority,
} from './lafea-source-authority.js';

export const LAFEA_CONTINUUM_REVALIDATION_BATCH_SCHEMA = 'lafea-continuum-revalidation-batch/v1';
export const LAFEA_CONTINUUM_REVALIDATION_RESULT_SCHEMA = 'lafea-continuum-revalidation-result/v1';

const STAGE_ID = 'LAFEA.3';
const ELIGIBLE_CHANGE_CLASSES = Object.freeze([
  'MATERIAL_PROPERTY', 'SECTION_PROPERTY', 'LOAD_OR_BC', 'MODEL_METADATA',
]);

/** Build a fully prevalidated revalidation batch; this function runs no solver. */
export function createLafeaContinuumRevalidationBatch(options) {
  const stageId = options?.stageId ?? STAGE_ID;
  if (stageId !== STAGE_ID) fail('LAFEA_CONTINUUM_REVALIDATION_STAGE_NOT_AUTHORIZED');
  const stage = requireLafeaStageRegistryEntry(stageId);
  const lifecycle = requireCandidateLifecycle(options?.lifecycle);
  const authority = validateLafeaSourceAuthority(options?.sourceAuthority);
  const source = options?.source;
  const canonicalInput = options?.canonicalInput;

  if (authority.stageId !== stageId || lifecycle.stageId !== stageId) {
    fail('LAFEA_CONTINUUM_REVALIDATION_STAGE_MISMATCH');
  }
  if (lifecycle.source.sourceHash !== authority.sourceHash) {
    fail('LAFEA_CONTINUUM_REVALIDATION_SOURCE_PARENT_STALE');
  }
  const expectedAuthority = canonicalLafeaSha256({
    schema: 'lafea-source-authority-payload/v1',
    stageId,
    source: sourceAuthorityDocument(source),
  });
  if (expectedAuthority !== authority.sourceHash) {
    fail('LAFEA_CONTINUUM_REVALIDATION_SOURCE_AUTHORITY_MISMATCH');
  }

  const changeClass = lifecycle.lastEvent?.changeClass ?? null;
  if (!ELIGIBLE_CHANGE_CLASSES.includes(changeClass)) {
    fail('LAFEA_CONTINUUM_REVALIDATION_CHANGE_CLASS_NOT_ELIGIBLE');
  }
  requireStatus(lifecycle, 'CANONICAL_MODEL', 'STALE');
  requireStatus(lifecycle, 'ANALYSIS_GEOMETRY', 'REVALIDATION_REQUIRED');
  requireStatus(lifecycle, 'ANALYSIS_MESH', 'REVALIDATION_REQUIRED');

  const retainedGeometry = lifecycle.artifacts.ANALYSIS_GEOMETRY;
  const retainedMesh = lifecycle.artifacts.ANALYSIS_MESH;
  const canonicalModelHash = engineeringHash(stageId, 'CANONICAL_MODEL', {
    sourceHash: authority.sourceHash,
    canonicalInput,
  });
  const analysisGeometryHash = createLafeaContinuumGeometryProjection(canonicalInput).semanticHash;
  const meshProfileHash = engineeringHash(stageId, 'ANALYSIS_MESH_PROFILE', {
    authority: 'CALLER_AUTHORED_SOURCE_MESH_ONLY',
    previewPolicy: stage.previewPolicy,
    meshConfigIncluded: false,
    renderPacketIncluded: false,
    producerRevision: LAFEA_PRODUCER_REVISION,
  });
  const meshHash = lafeaAnalysisMeshContentHash(
    createLafeaContinuumSourceAnalysisMesh(canonicalInput),
  );

  if (analysisGeometryHash !== retainedGeometry.artifactHash) {
    fail('LAFEA_CONTINUUM_REVALIDATION_GEOMETRY_IDENTITY_CHANGED');
  }
  if (meshProfileHash !== retainedMesh.parentHashes.meshProfileHash) {
    fail('LAFEA_CONTINUUM_REVALIDATION_MESH_PROFILE_CHANGED');
  }
  if (meshHash !== retainedMesh.artifactHash) {
    fail('LAFEA_CONTINUUM_REVALIDATION_MESH_IDENTITY_CHANGED');
  }

  const producerRef = `NB-T2-REVALIDATION/${stageId}/${stage.enginePackage}/${LAFEA_PRODUCER_REVISION}`;
  const records = [
    record(stageId, 'CANONICAL_MODEL', canonicalModelHash, {
      sourceHash: authority.sourceHash,
    }, producerRef),
    record(stageId, 'ANALYSIS_GEOMETRY', analysisGeometryHash, {
      sourceHash: authority.sourceHash,
      canonicalModelHash,
    }, producerRef),
    record(stageId, 'ANALYSIS_MESH', meshHash, {
      analysisGeometryHash,
      meshProfileHash,
    }, producerRef),
  ];
  const registrations = records.map((value) => ({
    registrationId: registrationId(authority.sourceHash, value),
    kind: value.kind,
    artifactHash: value.artifactHash,
    producerRef: value.producerRef,
  }));
  const batch = deepFreeze({
    schema: LAFEA_CONTINUUM_REVALIDATION_BATCH_SCHEMA,
    stageId,
    sourceHash: authority.sourceHash,
    changeClass,
    calculationState: 'CALCULATION_NOT_RUN',
    retainedIdentity: {
      analysisGeometryHash: retainedGeometry.artifactHash,
      meshHash: retainedMesh.artifactHash,
      meshProfileHash: retainedMesh.parentHashes.meshProfileHash,
    },
    currentIdentity: {
      canonicalModelHash,
      analysisGeometryHash,
      meshHash,
      meshProfileHash,
    },
    records,
    registrations,
    releaseQualified: false,
  });

  // Pure dry-run of the exact lifecycle writes prevents predictable partial commits.
  registerLafeaContinuumRevalidationBatch(lifecycle, batch);
  return batch;
}

/** Purely apply a revalidation batch to a lifecycle value; no store mutation. */
export function registerLafeaContinuumRevalidationBatch(lifecycleValue, batchValue) {
  const batch = requireBatch(batchValue);
  let lifecycle = requireCandidateLifecycle(lifecycleValue);
  if (lifecycle.stageId !== batch.stageId
    || lifecycle.source.sourceHash !== batch.sourceHash) {
    fail('LAFEA_CONTINUUM_REVALIDATION_BATCH_LIFECYCLE_MISMATCH');
  }
  for (let index = 0; index < batch.records.length; index += 1) {
    lifecycle = registerLafeaArtifact(
      lifecycle,
      batch.records[index],
      batch.registrations[index].registrationId,
    );
  }
  for (const kind of ['CANONICAL_MODEL', 'ANALYSIS_GEOMETRY', 'ANALYSIS_MESH']) {
    if (lifecycle.artifacts[kind]?.status !== 'CURRENT'
      || lifecycle.artifacts[kind]?.qualification !== 'PASS') {
      fail('LAFEA_CONTINUUM_REVALIDATION_CURRENTNESS_NOT_ESTABLISHED');
    }
  }
  for (const kind of ['EXECUTION', 'RECOVERY', 'CONVERGENCE', 'REPORT_EVIDENCE']) {
    if (lifecycle.artifacts[kind]?.status === 'CURRENT') {
      fail('LAFEA_CONTINUUM_REVALIDATION_DESCENDANT_CURRENTNESS_ESCALATED');
    }
  }
  return lifecycle;
}

function requireCandidateLifecycle(value) {
  if (!value || value.stageId !== STAGE_ID || !value.artifacts || !value.source) {
    fail('LAFEA_CONTINUUM_REVALIDATION_LIFECYCLE_INVALID');
  }
  return value;
}

function requireStatus(lifecycle, kind, expected) {
  if (lifecycle.artifacts[kind]?.status !== expected) {
    fail(`LAFEA_CONTINUUM_REVALIDATION_${kind}_${expected}_REQUIRED`);
  }
}

function requireBatch(value) {
  if (!value || value.schema !== LAFEA_CONTINUUM_REVALIDATION_BATCH_SCHEMA
    || value.stageId !== STAGE_ID
    || value.calculationState !== 'CALCULATION_NOT_RUN'
    || value.releaseQualified !== false
    || !Array.isArray(value.records) || value.records.length !== 3
    || !Array.isArray(value.registrations)
    || value.registrations.length !== value.records.length) {
    fail('LAFEA_CONTINUUM_REVALIDATION_BATCH_INVALID');
  }
  return value;
}

function record(stageId, kind, artifactHash, parentHashes, producerRef) {
  return createLafeaArtifactRecord({
    stageId,
    kind,
    status: 'CURRENT',
    artifactHash,
    parentHashes,
    qualification: 'PASS',
    producerRef,
    diagnostics: [],
  });
}

function engineeringHash(stageId, role, payload) {
  return canonicalLafeaSha256({
    schema: 'lafea-engineering-evidence-hash-input/v1',
    stageId,
    role,
    payload,
  });
}

function registrationId(sourceHash, value) {
  return `NB-T2-RV-${value.kind}-${sourceHash.slice(7, 19).toUpperCase()}-${value.artifactHash.slice(7, 19).toUpperCase()}`;
}

function fail(code) {
  const error = new TypeError(code);
  error.code = code;
  throw error;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
