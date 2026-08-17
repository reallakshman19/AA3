import { lafeaAnalysisMeshContentHash } from './lafea-analysis-mesh-contract.js';
import {
  LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE,
  LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
  LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
  createLafeaAnalysisMeshEvidenceV2,
  validateLafeaAnalysisMeshEvidenceV2,
} from './lafea-analysis-mesh-evidence-v2.js';
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import {
  LAFEA4_GRADED_REFINEMENT_COMMAND_SCHEMA,
  LAFEA4_GRADED_REFINEMENT_PRODUCER_REF,
  createLafea4GradedRefinementCommand,
} from './lafea4-shell-graded-refinement-authority.js';
import { previewLafea4GradedShellRefinement } from './lafea4-shell-graded-refinement-executor.js';
import {
  evaluateLafea4ShellProductRefinementScope,
  validateLafea4ShellProductRefinementScope,
} from './lafea4-shell-product-refinement-contract.js';

export const LAFEA4_SHELL_PRODUCT_REFINEMENT_ADAPTER_RESULT_SCHEMA =
  'lafea4-shell-product-refinement-adapter-result/v1';
export const LAFEA4_SHELL_PRODUCT_REFINEMENT_PLAN_SCHEMA =
  'lafea4-shell-product-refinement-plan/v1';
export const LAFEA4_SHELL_PRODUCT_REFINEMENT_PRODUCER_ID =
  'LAFEA4_SHELL_UV_GRADED_REFINER_PRODUCT_ADAPTER';
export const LAFEA4_SHELL_PRODUCT_REFINEMENT_PRODUCER_REVISION =
  'TECH7_KERNEL_REWRAP_PRODUCT_CANDIDATE_V1';
export const LAFEA4_SHELL_PRODUCT_REFINEMENT_QUALIFICATION_ID =
  'LAFEA4-SHELL-PRODUCT-REFINE-Q1';
export const LAFEA4_SHELL_PRODUCT_REFINEMENT_PRODUCER_REF =
  `${LAFEA4_SHELL_PRODUCT_REFINEMENT_PRODUCER_ID}/${LAFEA4_SHELL_PRODUCT_REFINEMENT_PRODUCER_REVISION}/${LAFEA4_SHELL_PRODUCT_REFINEMENT_QUALIFICATION_ID}`;

const capabilityCore = Object.freeze({
  schema: 'lafea4-shell-product-refinement-capability/v1',
  producerId: LAFEA4_SHELL_PRODUCT_REFINEMENT_PRODUCER_ID,
  producerRevision: LAFEA4_SHELL_PRODUCT_REFINEMENT_PRODUCER_REVISION,
  stageId: 'LAFEA.4',
  elementFamily: 'CST_DKT_TRI3_THIN_SHELL_V1',
  surfaceKinds: Object.freeze(['CYLINDRICAL', 'CYLINDRICAL_HOLES']),
  targetTypes: Object.freeze(['ELEMENT']),
  numericalKernel: 'LAFEA4_SHELL_UV_GRADED_REFINER/BOUNDARY_GRADED_TRI3_V1',
  numericalKernelAuthority: 'REUSED_NUMERICAL_KERNEL_ONLY_NOT_REUSED_PRODUCT_AUTHORITY',
  evidencePolicy: 'REWRAP_EXACT_CHILD_MESH_WITH_DISTINCT_PRODUCT_CANDIDATE_AUTHORITY_V1',
  custodyPolicy: 'CANDIDATE_ONLY_NO_PRODUCT_RETENTION_TECH13B',
  productBindingAuthorized: false,
  uiBindingAuthorized: false,
  releaseQualified: false,
});
export const LAFEA4_SHELL_PRODUCT_REFINEMENT_CAPABILITY = freeze({
  ...capabilityCore,
  capabilityHash: canonicalLafeaSha256({
    schema: 'lafea4-shell-product-refinement-capability-hash-input/v1',
    capability: capabilityCore,
  }),
});

const qualificationCore = Object.freeze({
  schema: 'lafea4-shell-product-refinement-qualification/v1',
  qualificationId: LAFEA4_SHELL_PRODUCT_REFINEMENT_QUALIFICATION_ID,
  qualificationRevision: 'TECH13B-R1',
  capabilityHash: LAFEA4_SHELL_PRODUCT_REFINEMENT_CAPABILITY.capabilityHash,
  status: 'PENDING_TECH13C_AND_TECH13E_EXACT_HEAD_QUALIFICATION',
  exactHeadQualificationRequired: true,
  productBindingAuthorized: false,
  uiBindingAuthorized: false,
  releaseQualified: false,
});
export const LAFEA4_SHELL_PRODUCT_REFINEMENT_QUALIFICATION = freeze({
  ...qualificationCore,
  qualificationHash: canonicalLafeaSha256({
    schema: 'lafea4-shell-product-refinement-qualification-hash-input/v1',
    qualification: qualificationCore,
  }),
});

/**
 * Build a product-candidate child without changing product custody.
 *
 * TECH-7 supplies only the numerical mesh construction. Its qualification-only
 * authority is never retained. The exact mesh bytes are re-issued under a
 * separate TECH-13B product-candidate producer/capability/qualification/plan.
 */
export function previewLafea4ShellProductRefinement(value) {
  const scope = validateLafea4ShellProductRefinementScope(
    evaluateLafea4ShellProductRefinementScope(value),
  );
  const parentEvidence = validateLafeaAnalysisMeshEvidenceV2(value.parentEvidence);
  const command = createLafea4GradedRefinementCommand({
    schema: LAFEA4_GRADED_REFINEMENT_COMMAND_SCHEMA,
    commandId: value.request.commandId ?? `TECH13B/${scope.parentMeshHash.slice(-12)}`,
    stageId: 'LAFEA.4',
    parentMeshArtifactHash: scope.parentMeshArtifactHash,
    parentMeshHash: scope.parentMeshHash,
    targetType: scope.targetType,
    targetIds: [...scope.targetIds],
    targetElementLength: scope.targetElementLength,
    lengthUnit: value.request.lengthUnit,
    reason: value.request.reason ?? 'TECH-13 product-candidate local refinement',
  });
  if (command.productionBindingAuthorized !== false
    || command.executionScope !== 'QUALIFICATION_HARNESS_ONLY') {
    fail('LAFEA4_SHELL_PRODUCT_REFINEMENT_TECH7_COMMAND_AUTHORITY_INVALID');
  }

  const kernel = previewLafea4GradedShellRefinement({
    parentEvidence,
    midsurfaceEvidence: value.midsurfaceEvidence,
    meshProfile: value.meshProfile,
    command,
  });
  if (kernel.productionBindingAuthorized !== false
    || kernel.plan?.producerRef !== LAFEA4_GRADED_REFINEMENT_PRODUCER_REF
    || kernel.plan?.parentMeshHash !== scope.parentMeshHash
    || kernel.plan?.parentMeshArtifactHash !== scope.parentMeshArtifactHash
    || kernel.plan?.midsurfaceEvidenceHash !== scope.midsurfaceEvidenceHash
    || kernel.plan?.meshProfileHash !== scope.meshProfileHash) {
    fail('LAFEA4_SHELL_PRODUCT_REFINEMENT_TECH7_KERNEL_LINEAGE_INVALID');
  }

  const capability = LAFEA4_SHELL_PRODUCT_REFINEMENT_CAPABILITY;
  const qualification = LAFEA4_SHELL_PRODUCT_REFINEMENT_QUALIFICATION;
  const planCore = {
    schema: LAFEA4_SHELL_PRODUCT_REFINEMENT_PLAN_SCHEMA,
    stageId: 'LAFEA.4',
    executionScope: 'PRODUCT_CANDIDATE_NOT_RETAINABLE',
    productBindingAuthorized: false,
    uiBindingAuthorized: false,
    surfaceKind: scope.surfaceKind,
    elementFamily: scope.elementFamily,
    sourceHash: scope.sourceHash,
    analysisDomainHash: scope.analysisDomainHash,
    analysisGeometryHash: scope.analysisGeometryHash,
    midsurfaceEvidenceHash: scope.midsurfaceEvidenceHash,
    meshProfileHash: scope.meshProfileHash,
    parentMeshArtifactHash: scope.parentMeshArtifactHash,
    parentMeshHash: scope.parentMeshHash,
    scopeHash: scope.semanticHash,
    targetType: scope.targetType,
    targetIds: [...scope.targetIds],
    targetElementLength: scope.targetElementLength,
    globalTargetElementLength: scope.globalTargetElementLength,
    adjacentSizeRatioMax: scope.adjacentSizeRatioMax,
    reusedKernelProducerRef: LAFEA4_GRADED_REFINEMENT_PRODUCER_REF,
    reusedKernelPlanHash: kernel.plan.planHash,
    reusedKernelCommandHash: command.semanticHash,
    capabilityHash: capability.capabilityHash,
    qualificationHash: qualification.qualificationHash,
    producerId: capability.producerId,
    producerRevision: capability.producerRevision,
    producerRef: LAFEA4_SHELL_PRODUCT_REFINEMENT_PRODUCER_REF,
    releaseQualified: false,
  };
  const plan = freeze({
    ...planCore,
    planHash: canonicalLafeaSha256({
      schema: 'lafea4-shell-product-refinement-plan-hash-input/v1',
      plan: planCore,
    }),
  });

  const childMeshHash = lafeaAnalysisMeshContentHash(kernel.evidence.mesh);
  if (childMeshHash !== kernel.evidence.meshHash) {
    fail('LAFEA4_SHELL_PRODUCT_REFINEMENT_KERNEL_MESH_HASH_MISMATCH');
  }
  const productEvidence = createLafeaAnalysisMeshEvidenceV2({
    schema: LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
    stageId: 'LAFEA.4',
    sourceHash: scope.sourceHash,
    analysisDomainHash: scope.analysisDomainHash,
    analysisGeometryHash: scope.analysisGeometryHash,
    meshProfile: value.meshProfile,
    mesh: kernel.evidence.mesh,
    authority: {
      schema: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
      stageId: 'LAFEA.4',
      authorityRole: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE,
      status: 'ACCEPTED_BY_STAGE_CONTRACT',
      producerRef: plan.producerRef,
      sourceHash: scope.sourceHash,
      analysisDomainHash: scope.analysisDomainHash,
      analysisGeometryHash: scope.analysisGeometryHash,
      meshProfileHash: scope.meshProfileHash,
      meshHash: childMeshHash,
      capabilityHash: plan.capabilityHash,
      qualificationHash: plan.qualificationHash,
      planHash: plan.planHash,
    },
  });
  if (productEvidence.meshHash !== kernel.evidence.meshHash
    || JSON.stringify(productEvidence.mesh) !== JSON.stringify(kernel.evidence.mesh)) {
    fail('LAFEA4_SHELL_PRODUCT_REFINEMENT_PRODUCT_REWRAP_CHANGED_MESH');
  }

  return freeze({
    schema: LAFEA4_SHELL_PRODUCT_REFINEMENT_ADAPTER_RESULT_SCHEMA,
    stageId: 'LAFEA.4',
    scope,
    command,
    plan,
    productEvidence,
    kernelEvidenceArtifactHash: kernel.evidence.artifactHash,
    kernelEvidenceMeshHash: kernel.evidence.meshHash,
    kernelPlanHash: kernel.plan.planHash,
    insertedGradedPointCount: kernel.insertedGradedPointCount,
    boundaryMatchesPlan: kernel.boundaryMatchesPlan,
    maximumSurfaceRoundTripUvError: kernel.maximumSurfaceRoundTripUvError,
    productRetentionAuthorized: false,
    uiBindingAuthorized: false,
    releaseQualified: false,
  });
}

export function validateLafea4ShellProductRefinementAdapterResult(value) {
  if (!value || value.schema !== LAFEA4_SHELL_PRODUCT_REFINEMENT_ADAPTER_RESULT_SCHEMA
    || value.stageId !== 'LAFEA.4'
    || value.productRetentionAuthorized !== false
    || value.uiBindingAuthorized !== false
    || value.releaseQualified !== false
    || value.plan?.producerRef !== LAFEA4_SHELL_PRODUCT_REFINEMENT_PRODUCER_REF
    || value.plan?.productBindingAuthorized !== false
    || value.plan?.uiBindingAuthorized !== false
    || value.productEvidence?.authority?.producerRef !== LAFEA4_SHELL_PRODUCT_REFINEMENT_PRODUCER_REF
    || value.productEvidence?.authority?.qualificationHash
      !== LAFEA4_SHELL_PRODUCT_REFINEMENT_QUALIFICATION.qualificationHash
    || value.kernelEvidenceMeshHash !== value.productEvidence?.meshHash
    || value.plan?.parentMeshHash !== value.scope?.parentMeshHash
    || value.plan?.scopeHash !== value.scope?.semanticHash) {
    fail('LAFEA4_SHELL_PRODUCT_REFINEMENT_ADAPTER_RESULT_INVALID');
  }
  validateLafea4ShellProductRefinementScope(value.scope);
  validateLafeaAnalysisMeshEvidenceV2(value.productEvidence);
  return value;
}

function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
