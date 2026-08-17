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
import {
  evaluateLafea4ParentNormalProductionGate,
  validateLafea4ParentNormalProductionGate,
} from './lafea4-parent-normal-production-gate.js';
import { validateLafeaAnalysisMeshEvidenceV2 } from './lafea-analysis-mesh-evidence-v2.js';
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA4_SHELL_SOLVER_COMPANION_CUSTODY_SCHEMA =
  'lafea4-shell-solver-parent-normal-custody/v1';
export const LAFEA4_SHELL_SOLVER_COMPANION_AUTHORIZATION_EFFECT =
  'NONE_PENDING_QUALIFICATION';
export const LAFEA4_SHELL_SOLVER_COMPANION_ACTIVE_AUTHORIZATION_EFFECT =
  'HARD_GATE_ENFORCED_ALLOW';

const SUPPORTED_SURFACES = new Set([
  LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL,
  LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL_HOLES,
]);

/**
 * Bind the exact TECH-12B companion to the solver compiler and evaluate the
 * code-owned TECH-12E production gate. Current TECH-12E source has an empty
 * activation trust root, so this remains shadow-only. Once a separately
 * reviewed trusted TECH-12D record is pinned, a candidate BLOCK fails here
 * before the solver model can be compiled or executed.
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
  const productionGate = validateLafea4ParentNormalProductionGate(
    evaluateLafea4ParentNormalProductionGate({ companion }),
  );
  if (productionGate.solverExecutionAuthorized !== true) {
    fail(productionGate.diagnosticCode ?? 'LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_BLOCKED');
  }

  const active = productionGate.hardGateActivated === true;
  const core = {
    schema: LAFEA4_SHELL_SOLVER_COMPANION_CUSTODY_SCHEMA,
    stageId: 'LAFEA.4',
    status: active ? 'BOUND_PRODUCTION_GATE_ALLOW' : 'BOUND_SHADOW_ONLY',
    surfaceKind,
    parentNormalCompanionHash: companion.semanticHash,
    companionCandidateQualification: companion.candidateQualification,
    companionWouldBlockIfActivated: companion.wouldBlockIfActivated,
    parentNormalProductionGateHash: productionGate.semanticHash,
    productionGateDecision: productionGate.gateDisposition,
    hardGateStatus: active
      ? 'ACTIVE_TRUSTED_TECH12D_RECORD'
      : LAFEA4_RETAINED_MESH_PARENT_NORMAL_HARD_GATE,
    authorizationEffect: active
      ? LAFEA4_SHELL_SOLVER_COMPANION_ACTIVE_AUTHORIZATION_EFFECT
      : LAFEA4_SHELL_SOLVER_COMPANION_AUTHORIZATION_EFFECT,
    sourceHash: mesh.sourceHash,
    analysisDomainHash: mesh.analysisDomainHash,
    analysisGeometryHash: mesh.analysisGeometryHash,
    meshArtifactHash: mesh.artifactHash,
    meshHash: mesh.meshHash,
    meshProfileHash: mesh.meshProfileHash,
    midsurfaceEvidenceHash: midsurface.semanticHash,
    executionAuthorizationChanged: active,
    productionBindingAuthorized: productionGate.productionBindingAuthorized,
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
  const active = value?.status === 'BOUND_PRODUCTION_GATE_ALLOW';
  if (!value || value.schema !== LAFEA4_SHELL_SOLVER_COMPANION_CUSTODY_SCHEMA
    || value.stageId !== 'LAFEA.4'
    || !['BOUND_SHADOW_ONLY', 'BOUND_PRODUCTION_GATE_ALLOW'].includes(value.status)
    || !SUPPORTED_SURFACES.has(value.surfaceKind)
    || !['PASS', 'BLOCK'].includes(value.companionCandidateQualification)
    || value.companionWouldBlockIfActivated
      !== (value.companionCandidateQualification === 'BLOCK')
    || value.hardGateStatus !== (active
      ? 'ACTIVE_TRUSTED_TECH12D_RECORD'
      : LAFEA4_RETAINED_MESH_PARENT_NORMAL_HARD_GATE)
    || value.authorizationEffect !== (active
      ? LAFEA4_SHELL_SOLVER_COMPANION_ACTIVE_AUTHORIZATION_EFFECT
      : LAFEA4_SHELL_SOLVER_COMPANION_AUTHORIZATION_EFFECT)
    || value.executionAuthorizationChanged !== active
    || value.productionBindingAuthorized !== active
    || value.releaseQualificationChanged !== false) {
    fail('LAFEA4_SHELL_SOLVER_COMPANION_CUSTODY_INVALID');
  }
  for (const hash of [
    value.parentNormalCompanionHash,
    value.parentNormalProductionGateHash,
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
  if (value.productionGateDecision !== (active ? 'ALLOW' : 'NOT_ENFORCED')) {
    fail('LAFEA4_SHELL_SOLVER_COMPANION_GATE_DECISION_INVALID');
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
    parentNormalProductionGateHash: null,
    productionGateDecision: 'NOT_APPLICABLE',
    hardGateStatus: LAFEA4_RETAINED_MESH_PARENT_NORMAL_HARD_GATE,
    authorizationEffect: 'NOT_APPLICABLE',
    executionAuthorizationChanged: false,
    productionBindingAuthorized: false,
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
