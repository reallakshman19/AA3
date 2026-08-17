import { validateLafeaAnalysisMeshEvidenceV2 } from './lafea-analysis-mesh-evidence-v2.js';
import { canonicalLafeaAnalysisMeshProfile } from './lafea-analysis-mesh-contract.js';
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import { validateLafeaAnyShellMidsurfaceEvidence } from './lafea-shell-midsurface-dispatch.js';
import {
  qualifyLafea4ShellParentNormalOrientation,
  validateLafea4ShellParentNormalQualification,
} from './lafea4-shell-parent-normal-qualification.js';
import {
  validateLafea4ShellProductRefinementAdapterResult,
} from './lafea4-shell-product-refinement-adapter.js';

export const LAFEA4_SHELL_PRODUCT_REFINEMENT_ACCEPTANCE_SCHEMA =
  'lafea4-shell-product-refinement-acceptance/v1';
export const LAFEA4_SHELL_PRODUCT_REFINEMENT_ACCEPTANCE_BLOCK_CODE =
  'LAFEA4_SHELL_PRODUCT_REFINEMENT_CANDIDATE_BLOCKED';

const REQUIRED_QUALITY_METRICS = Object.freeze([
  'ASPECT_RATIO',
  'SCALED_JACOBIAN',
  'MINIMUM_ANGLE_DEGREES',
  'ADJACENT_SIZE_RATIO',
  'SHELL_ORIENTATION_TOPOLOGY',
]);

/**
 * Evaluate a TECH-13B product candidate against the current product custody.
 * This function is deliberately pure: it can authorize a candidate for future
 * atomic retention after TECH-13E, but it never mutates mesh custody itself.
 */
export function evaluateLafea4ShellProductRefinementAcceptance(value) {
  const adapter = validateLafea4ShellProductRefinementAdapterResult(value?.adapterResult);
  const parentEvidence = validateLafeaAnalysisMeshEvidenceV2(value?.parentEvidence);
  const midsurfaceEvidence = validateLafeaAnyShellMidsurfaceEvidence(value?.midsurfaceEvidence);
  const meshProfile = canonicalLafeaAnalysisMeshProfile(value?.meshProfile);
  const stage = requireObject(value?.stage, 'LAFEA4_SHELL_PRODUCT_REFINEMENT_ACCEPTANCE_STAGE_REQUIRED');

  const reasons = [];
  if (stage.stageId !== 'LAFEA.4') reasons.push('STAGE_NOT_LAFEA4');
  if (stage.lifecycleBinding?.status !== 'CURRENT') reasons.push('SOURCE_BINDING_NOT_CURRENT');
  if (parentEvidence.status !== 'CURRENT' || parentEvidence.qualification !== 'PASS') {
    reasons.push('PARENT_NOT_CURRENT_PASS');
  }
  if (adapter.scope.parentMeshArtifactHash !== parentEvidence.artifactHash
    || adapter.scope.parentMeshHash !== parentEvidence.meshHash) {
    reasons.push('PARENT_MESH_CUSTODY_MISMATCH');
  }
  if (adapter.scope.midsurfaceEvidenceHash !== midsurfaceEvidence.semanticHash
    || parentEvidence.sourceHash !== midsurfaceEvidence.sourceHash
    || parentEvidence.analysisDomainHash !== midsurfaceEvidence.analysisDomainHash
    || parentEvidence.analysisGeometryHash !== midsurfaceEvidence.analysisGeometryHash) {
    reasons.push('MIDSURFACE_CUSTODY_MISMATCH');
  }
  if (adapter.scope.meshProfileHash !== meshProfile.semanticHash
    || parentEvidence.meshProfileHash !== meshProfile.semanticHash) {
    reasons.push('MESH_PROFILE_CUSTODY_MISMATCH');
  }
  if (adapter.boundaryMatchesPlan !== true) reasons.push('BOUNDARY_CONFORMITY_BLOCK');

  const child = validateLafeaAnalysisMeshEvidenceV2(adapter.productEvidence);
  const quality = Object.fromEntries(REQUIRED_QUALITY_METRICS.map((metric) => {
    const gate = child.quality?.gateResults?.find((row) => row.metric === metric) ?? null;
    if (!gate) reasons.push(`QUALITY_GATE_MISSING:${metric}`);
    else if (gate.status === 'BLOCK') reasons.push(`QUALITY_GATE_BLOCK:${metric}`);
    return [metric, gate];
  }));
  if (child.qualification !== 'PASS' || child.quality?.worstStatus === 'BLOCK'
    || child.quality?.blockingElementIds?.length) {
    reasons.push('V2_MESH_QUALITY_BLOCK');
  }
  const adjacency = quality.ADJACENT_SIZE_RATIO;
  if (!adjacency
    || adjacency.value > adapter.scope.adjacentSizeRatioMax + 64 * Number.EPSILON) {
    reasons.push('ADJACENT_SIZE_RATIO_BLOCK');
  }

  let parentNormal = null;
  try {
    parentNormal = validateLafea4ShellParentNormalQualification(
      qualifyLafea4ShellParentNormalOrientation({
        meshEvidence: child,
        midsurfaceEvidence,
      }),
    );
    if (parentNormal.qualification !== 'PASS'
      || parentNormal.blockedElementCount !== 0
      || !(parentNormal.minimumParentDirectedJacobian > parentNormal.witness.roundoffEnvelope)) {
      reasons.push('PARENT_NORMAL_BLOCK');
    }
  } catch {
    reasons.push('PARENT_NORMAL_QUALIFICATION_ERROR');
  }

  const uniqueReasons = [...new Set(reasons)];
  const qualification = uniqueReasons.length ? 'BLOCK' : 'PASS';
  const gateCore = {
    schema: LAFEA4_SHELL_PRODUCT_REFINEMENT_ACCEPTANCE_SCHEMA,
    stageId: 'LAFEA.4',
    parentMeshArtifactHash: parentEvidence.artifactHash,
    parentMeshHash: parentEvidence.meshHash,
    childMeshArtifactHash: child.artifactHash,
    childMeshHash: child.meshHash,
    midsurfaceEvidenceHash: midsurfaceEvidence.semanticHash,
    meshProfileHash: meshProfile.semanticHash,
    productPlanHash: adapter.plan.planHash,
    productScopeHash: adapter.scope.semanticHash,
    qualification,
    candidateRetentionEligible: qualification === 'PASS',
    productRetentionAuthorized: false,
    uiBindingAuthorized: false,
    releaseQualified: false,
    quality: {
      aspectRatio: metricSummary(quality.ASPECT_RATIO),
      scaledJacobian: metricSummary(quality.SCALED_JACOBIAN),
      minimumAngleDegrees: metricSummary(quality.MINIMUM_ANGLE_DEGREES),
      adjacentSizeRatio: metricSummary(quality.ADJACENT_SIZE_RATIO),
      shellOrientationTopology: metricSummary(quality.SHELL_ORIENTATION_TOPOLOGY),
      blockingElementCount: child.quality?.blockingElementIds?.length ?? null,
    },
    parentNormal: parentNormal ? {
      qualification: parentNormal.qualification,
      minimumParentDirectedJacobian: parentNormal.minimumParentDirectedJacobian,
      minimumAlignmentCosine: parentNormal.minimumAlignmentCosine,
      roundoffEnvelope: parentNormal.witness.roundoffEnvelope,
      blockedElementCount: parentNormal.blockedElementCount,
      negativeElementCount: parentNormal.negativeElementCount,
      roundoffBandElementCount: parentNormal.roundoffBandElementCount,
      semanticHash: parentNormal.semanticHash,
    } : null,
    boundaryMatchesPlan: adapter.boundaryMatchesPlan,
    blockingReasons: uniqueReasons,
    publicationPolicy: 'PURE_CANDIDATE_GATE_NO_CUSTODY_MUTATION_TECH13C',
  };
  return freeze({
    ...gateCore,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea4-shell-product-refinement-acceptance-hash-input/v1',
      acceptance: gateCore,
    }),
  });
}

export function validateLafea4ShellProductRefinementAcceptance(value) {
  if (!value || value.schema !== LAFEA4_SHELL_PRODUCT_REFINEMENT_ACCEPTANCE_SCHEMA
    || value.stageId !== 'LAFEA.4'
    || !['PASS', 'BLOCK'].includes(value.qualification)
    || typeof value.candidateRetentionEligible !== 'boolean'
    || value.candidateRetentionEligible !== (value.qualification === 'PASS')
    || value.productRetentionAuthorized !== false
    || value.uiBindingAuthorized !== false
    || value.releaseQualified !== false
    || !Array.isArray(value.blockingReasons)
    || value.publicationPolicy !== 'PURE_CANDIDATE_GATE_NO_CUSTODY_MUTATION_TECH13C'
    || typeof value.semanticHash !== 'string') {
    fail('LAFEA4_SHELL_PRODUCT_REFINEMENT_ACCEPTANCE_INVALID');
  }
  if (value.qualification === 'PASS' && value.blockingReasons.length !== 0) {
    fail('LAFEA4_SHELL_PRODUCT_REFINEMENT_ACCEPTANCE_PASS_WITH_BLOCKING_REASON');
  }
  if (value.qualification === 'BLOCK' && value.blockingReasons.length === 0) {
    fail('LAFEA4_SHELL_PRODUCT_REFINEMENT_ACCEPTANCE_BLOCK_WITHOUT_REASON');
  }
  const base = { ...value };
  delete base.semanticHash;
  const expected = canonicalLafeaSha256({
    schema: 'lafea4-shell-product-refinement-acceptance-hash-input/v1',
    acceptance: base,
  });
  if (expected !== value.semanticHash) fail('LAFEA4_SHELL_PRODUCT_REFINEMENT_ACCEPTANCE_TAMPERED');
  return value;
}

export function requireLafea4ShellProductRefinementCandidatePass(value) {
  const accepted = validateLafea4ShellProductRefinementAcceptance(value);
  if (accepted.qualification !== 'PASS') {
    const error = new TypeError(LAFEA4_SHELL_PRODUCT_REFINEMENT_ACCEPTANCE_BLOCK_CODE);
    error.code = LAFEA4_SHELL_PRODUCT_REFINEMENT_ACCEPTANCE_BLOCK_CODE;
    error.blockingReasons = accepted.blockingReasons;
    throw error;
  }
  return accepted;
}

function metricSummary(value) {
  return value ? freeze({
    metric: value.metric,
    value: value.value,
    status: value.status,
    warningThreshold: value.warningThreshold ?? null,
    blockingThreshold: value.blockingThreshold ?? null,
    maximum: value.maximum ?? null,
  }) : null;
}
function requireObject(value, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code);
  return value;
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
