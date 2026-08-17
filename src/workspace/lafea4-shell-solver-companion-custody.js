import {
  LAFEA_SHELL_SURFACE_KINDS,
  shellMidsurfaceKind,
  validateLafeaAnyShellMidsurfaceEvidence,
} from './lafea-shell-midsurface-dispatch.js';
import {
  LAFEA4_RETAINED_MESH_PARENT_NORMAL_HARD_GATE,
  createLafea4RetainedMeshParentNormalCompanion,
  validateLafea4RetainedMeshParentNormalCompanion,
} from './lafea4-shell-retained-mesh-parent-normal-companion.js';
import { validateLafeaAnalysisMeshEvidenceV2 } from './lafea-analysis-mesh-evidence-v2.js';
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA4_SHELL_SOLVER_COMPANION_CUSTODY_SCHEMA =
  'lafea4-shell-solver-parent-normal-custody/v1';
export const LAFEA4_SHELL_SOLVER_COMPANION_AUTHORIZATION_EFFECT =
  'NONE_PENDING_QUALIFICATION';

const SUPPORTED_SURFACES = new Set([
  LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL,
  LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL_HOLES,
]);

/**
 * Bind the exact TECH-12B companion to the solver compiler without granting it
 * solve or release authority. The artifact is rebuilt from the exact retained
 * mesh and midsurface parents; caller-supplied companion identities are never
 * trusted.
 */
export function createLafea4ShellSolverCompanionCustody({
  stageId,
  meshEvidence,
  midsurfaceEvidence,
}) {
  if (stageId !== 'LAFEA.4') return notApplicable(stageId);
  const mesh = validateLafeaAnalysisMeshEvidenceV2(meshEvidence);
  const midsurface = validateLafeaAnyShellMidsurfaceEvidence(midsurfaceEvidence);
  if (mesh.stageId !== 'LAFEA.4' || midsurface.stageId !== 'LAFEA.4') {
    fail('LAFEA4_SHELL_SOLVER_COMPANION_STAGE_MISMATCH');
  }
  const surfaceKind = shellMidsurfaceKind(midsurface.geometry);
  if (!SUPPORTED_SURFACES.has(surfaceKind)) return notApplicable(stageId, surfaceKind);

  const companion = validateLafea4RetainedMeshParentNormalCompanion(
    createLafea4RetainedMeshParentNormalCompanion({
      meshEvidence: mesh,
      midsurfaceEvidence: midsurface,
    }),
  );
  const core = {
    schema: LAFEA4_SHELL_SOLVER_COMPANION_CUSTODY_SCHEMA,
    stageId: 'LAFEA.4',
    status: 'BOUND_SHADOW_ONLY',
    surfaceKind,
    parentNormalCompanionHash: companion.semanticHash,
    companionCandidateQualification: companion.candidateQualification,
    companionWouldBlockIfActivated: companion.wouldBlockIfActivated,
    hardGateStatus: LAFEA4_RETAINED_MESH_PARENT_NORMAL_HARD_GATE,
    authorizationEffect: LAFEA4_SHELL_SOLVER_COMPANION_AUTHORIZATION_EFFECT,
    sourceHash: mesh.sourceHash,
    analysisDomainHash: mesh.analysisDomainHash,
    analysisGeometryHash: mesh.analysisGeometryHash,
    meshArtifactHash: mesh.artifactHash,
    meshHash: mesh.meshHash,
    meshProfileHash: mesh.meshProfileHash,
    midsurfaceEvidenceHash: midsurface.semanticHash,
    executionAuthorizationChanged: false,
    releaseQualificationChanged: false,
  };
  return freeze({
    ...core,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea4-shell-solver-parent-normal-custody-hash-input/v1',
      custody: core,
    }),
  });
}

export function validateLafea4ShellSolverCompanionCustody(value) {
  if (!value || value.schema !== LAFEA4_SHELL_SOLVER_COMPANION_CUSTODY_SCHEMA
    || value.stageId !== 'LAFEA.4'
    || value.status !== 'BOUND_SHADOW_ONLY'
    || !SUPPORTED_SURFACES.has(value.surfaceKind)
    || !['PASS', 'BLOCK'].includes(value.companionCandidateQualification)
    || value.companionWouldBlockIfActivated
      !== (value.companionCandidateQualification === 'BLOCK')
    || value.hardGateStatus !== LAFEA4_RETAINED_MESH_PARENT_NORMAL_HARD_GATE
    || value.authorizationEffect !== LAFEA4_SHELL_SOLVER_COMPANION_AUTHORIZATION_EFFECT
    || value.executionAuthorizationChanged !== false
    || value.releaseQualificationChanged !== false) {
    fail('LAFEA4_SHELL_SOLVER_COMPANION_CUSTODY_INVALID');
  }
  for (const hash of [
    value.parentNormalCompanionHash,
    value.sourceHash,
    value.analysisDomainHash,
    value.analysisGeometryHash,
    value.meshArtifactHash,
    value.meshHash,
    value.midsurfaceEvidenceHash,
    value.semanticHash,
  ]) requireSha256(hash);
  if (typeof value.meshProfileHash !== 'string' || !value.meshProfileHash) {
    fail('LAFEA4_SHELL_SOLVER_COMPANION_PROFILE_HASH_INVALID');
  }
  const core = { ...value };
  delete core.semanticHash;
  const expected = canonicalLafeaSha256({
    schema: 'lafea4-shell-solver-parent-normal-custody-hash-input/v1',
    custody: core,
  });
  if (value.semanticHash !== expected) {
    fail('LAFEA4_SHELL_SOLVER_COMPANION_CUSTODY_HASH_INVALID');
  }
  return freeze(structuredClone(value));
}

function notApplicable(stageId, surfaceKind = null) {
  return freeze({
    schema: LAFEA4_SHELL_SOLVER_COMPANION_CUSTODY_SCHEMA,
    stageId,
    status: 'NOT_APPLICABLE',
    surfaceKind,
    parentNormalCompanionHash: null,
    companionCandidateQualification: null,
    companionWouldBlockIfActivated: false,
    hardGateStatus: LAFEA4_RETAINED_MESH_PARENT_NORMAL_HARD_GATE,
    authorizationEffect: 'NOT_APPLICABLE',
    executionAuthorizationChanged: false,
    releaseQualificationChanged: false,
  });
}

function requireSha256(value) {
  if (typeof value !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(value)) {
    fail('LAFEA4_SHELL_SOLVER_COMPANION_HASH_INVALID');
  }
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
