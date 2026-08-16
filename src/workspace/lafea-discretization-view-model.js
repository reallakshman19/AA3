/** Pure presentation model for the governed Discretization step. */
import { buildMeshQualityPanel } from './lafea-mesh-quality-panel.js';
import { requireLafeaLifecycleProfileForStage } from './lafea-lifecycle-profiles.js';
import { lafeaMeshCapabilities } from './lafea-mesh-capabilities.js';
import {
  LAFEA_MESH_PRODUCER_GOVERNANCE_REF,
  LAFEA_MESH_PRODUCER_REF,
  lafeaMeshProducerElementFamilies,
} from './lafea-mesh-producer-registry.js';
import {
  LAFEA5_SOURCE_SHELL_ADOPTION_PRODUCER_REF,
  LAFEA5_SOURCE_SHELL_PARENT_SCHEMA,
} from './lafea-source-shell-mesh-adoption.js';

export const LAFEA_DISCRETIZATION_VIEW_MODEL_SCHEMA =
  'lafea-discretization-view-model/v1';

export const LAFEA_DISCRETIZATION_MODES = Object.freeze([
  'RETAIN_AUTHORIZED_MESH',
  'SOURCE_DISCRETIZATION',
  'AUTOMATIC_MESH',
  'MANUAL_REFINEMENT',
]);

export function buildLafeaDiscretizationViewModel(stageValue) {
  const stage = requireStage(stageValue);
  const profile = requireLafeaLifecycleProfileForStage(stage.stageId);
  const capabilities = lafeaMeshCapabilities(stage.stageId);
  // Governed producer routes retain v2 evidence. Legacy routes retain v1
  // evidence imported by the user.
  const evidence = governedV2Route(stage)
    ? stage.retainedAnalysisMeshEvidenceV2 ?? null
    : stage.retainedAnalysisMeshEvidence ?? null;
  const custody = requireCustody(stage.analysisMeshCustodyProjection, stage.stageId, evidence);
  const generation = buildGenerationModel(stage, capabilities);
  const reasons = custodyReasons(custody);
  const qualityPanel = custody.gateResults.length && custody.meshProfileIdentity
    ? buildMeshQualityPanel(custody.gateResults, {
      stageId: stage.stageId,
      meshProfileIdentity: custody.meshProfileIdentity,
    })
    : null;
  const retainedElementFamily = retainedFamily(stage.stageId, evidence?.meshProfile ?? null);
  const manualRefinementEnabled = capabilities.manualRefinementQualified === true
    && evidence?.qualification === 'PASS'
    && ['CURRENT_PASS', 'CURRENT_WARNING'].includes(custody.state)
    && capabilities.localRefinementElementFamilies.includes(retainedElementFamily);

  return freeze({
    schema: LAFEA_DISCRETIZATION_VIEW_MODEL_SCHEMA,
    stageId: stage.stageId,
    applicable: profile.meshApplicable,
    state: custody.state,
    stepStatus: stepStatus(custody.state),
    reasons,
    generation,
    configuration: {
      declaredMode: profile.meshApplicable
        ? generation.generationMode === 'SOURCE_MESH_ADOPTION'
          ? 'SOURCE_DISCRETIZATION'
          : generation.available ? 'AUTOMATIC_MESH' : 'RETAIN_AUTHORIZED_MESH'
        : null,
      modes: modeOptions(
        profile.meshApplicable,
        capabilities,
        generation,
        manualRefinementEnabled,
        retainedElementFamily,
      ),
      meshProfileHash: stage.analysisMeshProfileHash ?? null,
      retainedProfileIdentity: custody.meshProfileIdentity,
      retainedProfileHash: custody.meshProfileHash,
      legacyMeshConfigStatus: isRecord(stage.document?.meshConfig)
        ? 'UNAPPLIED_PREFERENCE'
        : 'NOT_CONFIGURED',
      legacyMeshConfig: isRecord(stage.document?.meshConfig)
        ? structuredClone(stage.document.meshConfig)
        : null,
      legacyMeshConfigEngineeringEffect: 'NONE',
    },
    preview: {
      status: generation.plan
        ? 'PROPOSED_MESH_AVAILABLE'
        : previewStatus(custody.state, generation.available),
      producerQualified: generation.producerQualified,
      proposedMesh: generation.plan ? generation.plan.strategy : null,
      proposedNodeCount: generation.plan?.nodeCount ?? null,
      proposedElementCount: generation.plan?.elementCount ?? null,
      proposedDofCount: generation.plan?.estimatedDofs ?? null,
      resourceEstimate: generation.plan?.resourceDisposition ?? null,
      configurationSemanticHash: generation.plan?.intentHash ?? null,
      retainedNodeCount: custody.nodeCount,
      retainedElementCount: custody.elementCount,
    },
    evidence: evidence ? {
      present: true,
      meshIdentity: custody.meshIdentity,
      meshHash: custody.meshHash,
      meshProfileIdentity: custody.meshProfileIdentity,
      meshProfileHash: custody.meshProfileHash,
      elementFamily: retainedElementFamily,
      sourceHash: custody.sourceHash,
      canonicalModelHash: custody.canonicalModelHash,
      analysisGeometryHash: custody.analysisGeometryHash,
      artifactHash: custody.artifactHash,
      registrationId: custody.registrationId,
      producerRef: custody.producerRef,
      authorityStatus: custody.authorityStatus,
      nodeCount: custody.nodeCount,
      elementCount: custody.elementCount,
      warningElementIds: [...custody.warningElementIds],
      blockingElementIds: [...custody.blockingElementIds],
      qualityPanel,
    } : {
      present: false,
      meshIdentity: null,
      meshHash: null,
      meshProfileIdentity: null,
      meshProfileHash: null,
      elementFamily: null,
      sourceHash: null,
      canonicalModelHash: null,
      analysisGeometryHash: null,
      artifactHash: null,
      registrationId: null,
      producerRef: null,
      authorityStatus: null,
      nodeCount: 0,
      elementCount: 0,
      warningElementIds: [],
      blockingElementIds: [],
      qualityPanel: null,
    },
    actions: {
      canImportAuthorizedMesh: profile.meshApplicable,
      canValidateEvidence: profile.meshApplicable,
      canExportEvidence: custody.canView === true,
      canFocusWarnings: custody.canFocusFindings === true
        && custody.warningElementIds.length > 0,
      canFocusBlocking: custody.canFocusFindings === true
        && custody.blockingElementIds.length > 0,
      canAdvance: custody.usableForAdvance === true,
      canAuthorize: custody.usableForAuthorization === true,
      canRun: custody.usableForRun === true,
      warningReviewRequired: custody.state === 'CURRENT_WARNING',
      automaticMeshEnabled: generation.generationMode === 'AUTOMATIC_MESH'
        && generation.available,
      manualRefinementEnabled,
      canPlanMesh: generation.available,
      canGenerateMesh: generation.available
        && generation.plan?.resourceDisposition !== 'BLOCK',
      canRefineMesh: manualRefinementEnabled,
    },
  });
}

function requireStage(value) {
  if (!isRecord(value) || typeof value.stageId !== 'string') {
    throw new TypeError('LAFEA_DISCRETIZATION_STAGE_REQUIRED');
  }
  return value;
}

/**
 * Two custody projections reach this surface: the legacy v1 one and the
 * governed-v2 one, which classifies continuum or shell children against their
 * current mesh-independent parents. Both are accepted and normalized here.
 */
const CUSTODY_SCHEMAS = Object.freeze([
  'lafea-analysis-mesh-custody-projection/v1',
  'lafea-domain-first-mesh-custody/v1',
]);

function requireCustody(value, stageId, evidence) {
  if (!isRecord(value)
    || !CUSTODY_SCHEMAS.includes(value.schema)
    || (value.stageId !== stageId && value.state !== 'NOT_APPLICABLE')
    || !Array.isArray(value.gateResults ?? [])
    || !Array.isArray(value.warningElementIds ?? [])
    || !Array.isArray(value.blockingElementIds ?? [])) {
    throw new TypeError('LAFEA_DISCRETIZATION_CUSTODY_PROJECTION_REQUIRED');
  }
  const mesh = evidence?.mesh ?? null;
  return Object.freeze({
    ...value,
    gateResults: value.gateResults ?? [],
    warningElementIds: value.warningElementIds ?? [],
    blockingElementIds: value.blockingElementIds ?? [],
    staleReasons: value.staleReasons ?? [],
    invalidReasons: value.invalidReasons ?? [],
    absenceReasons: value.absenceReasons ?? [],
    meshIdentity: value.meshIdentity ?? mesh?.meshIdentity ?? null,
    meshProfileIdentity: value.meshProfileIdentity
      ?? evidence?.meshProfile?.profileIdentity ?? null,
    sourceHash: value.sourceHash ?? evidence?.sourceHash ?? null,
    canonicalModelHash: value.canonicalModelHash ?? evidence?.canonicalModelHash ?? null,
    analysisDomainHash: value.analysisDomainHash ?? evidence?.analysisDomainHash ?? null,
    analysisGeometryHash: value.analysisGeometryHash ?? evidence?.analysisGeometryHash ?? null,
    artifactHash: value.artifactHash ?? evidence?.artifactHash ?? null,
    registrationId: value.registrationId ?? evidence?.registrationId ?? null,
    authorityStatus: value.authorityStatus ?? evidence?.authority?.status ?? null,
    nodeCount: value.nodeCount ?? mesh?.nodes.length ?? 0,
    elementCount: value.elementCount ?? mesh?.elements.length ?? 0,
  });
}

function modeOptions(
  applicable,
  capabilities,
  generation,
  manualRefinementEnabled,
  retainedElementFamily,
) {
  if (!applicable) {
    return LAFEA_DISCRETIZATION_MODES.map((mode) => ({
      mode,
      enabled: false,
      reason: 'ANALYSIS_MESH_NOT_APPLICABLE',
    }));
  }
  const sourceAdoption = generation.generationMode === 'SOURCE_MESH_ADOPTION';
  return [
    { mode: 'RETAIN_AUTHORIZED_MESH', enabled: true, reason: null },
    {
      mode: 'SOURCE_DISCRETIZATION',
      enabled: sourceAdoption && generation.available,
      reason: sourceAdoption
        ? generation.available ? null : generation.unavailableReason
        : 'NO_STAGE_SOURCE_DISCRETIZATION_AUTHORITY',
    },
    {
      mode: 'AUTOMATIC_MESH',
      enabled: !sourceAdoption && generation.available,
      reason: sourceAdoption
        ? 'LAFEA5_CALLER_AUTHORED_SOURCE_MESH_IS_PRESERVED_NO_REMESHING'
        : generation.available ? null : generation.unavailableReason,
    },
    {
      mode: 'MANUAL_REFINEMENT',
      enabled: manualRefinementEnabled,
      reason: manualRefinementEnabled
        ? null
        : refinementUnavailableReason(capabilities, retainedElementFamily),
    },
  ];
}

function refinementUnavailableReason(capabilities, retainedElementFamily) {
  if (retainedElementFamily === 'CST_DKT_TRI3_THIN_SHELL_V1') {
    return 'SHELL_LOCAL_REFINEMENT_NOT_QUALIFIED';
  }
  if (capabilities.manualRefinementQualified !== true) {
    return 'GOVERNED_REFINEMENT_COMMAND_NOT_AVAILABLE';
  }
  if (!retainedElementFamily) return 'RETAINED_ANALYSIS_MESH_REQUIRED';
  if (!capabilities.localRefinementElementFamilies.includes(retainedElementFamily)) {
    return retainedElementFamily === 'Q8'
      ? 'Q8_LOCAL_REFINEMENT_NOT_QUALIFIED'
      : 'RETAINED_ELEMENT_FAMILY_NOT_QUALIFIED_FOR_LOCAL_REFINEMENT';
  }
  return 'RETAINED_ANALYSIS_MESH_NOT_CURRENT_PASS_OR_WARNING';
}

/**
 * What the Discretization surface needs to offer automatic meshing or exact
 * source-mesh adoption: whether a producer is qualified for the stage, whether
 * the current mesh parent is ready, and the last plan the producer returned.
 */
function buildGenerationModel(stage, capabilities) {
  const producerQualified = capabilities.automaticMeshProducerQualified === true;
  const meshProfile = stage.retainedAnalysisMeshProfile ?? null;
  const domainFirst = stage.domainFirstProfileActive === true;
  const shellMidsurface = stage.shellMidsurfaceProfileActive === true;
  const geometryCurrent = stage.analysisGeometryProjection?.state === 'CURRENT_PASS'
    && stage.analysisDomainProjection?.state === 'CURRENT_PASS';
  const shellParent = stage.retainedShellMidsurfaceEvidence ?? null;
  const sourceMeshAdoption = shellParent?.schema === LAFEA5_SOURCE_SHELL_PARENT_SCHEMA;
  const sourceHash = stage.sourceAuthority?.sourceHash ?? stage.lifecycle?.source?.sourceHash ?? null;
  const shellCurrent = shellMidsurface
    && shellParent?.qualification === 'PASS'
    && shellParent.stageId === stage.stageId
    && shellParent.sourceHash === sourceHash;

  const unavailableReason = !producerQualified
    ? 'QUALIFIED_MESH_PRODUCER_NOT_AVAILABLE'
    : stage.stageId === 'LAFEA.4' || stage.stageId === 'LAFEA.5'
      ? !shellMidsurface
        ? 'ANALYSIS_MESH_GENERATION_REQUIRES_SHELL_MIDSURFACE_EVIDENCE'
        : !shellCurrent
          ? 'SHELL_MIDSURFACE_NOT_CURRENT'
          : !meshProfile
            ? 'ANALYSIS_MESH_PROFILE_BINDING_REQUIRED'
            : null
      : !domainFirst
        ? 'ANALYSIS_MESH_GENERATION_REQUIRES_DOMAIN_FIRST_PROFILE'
        : !geometryCurrent
          ? 'ANALYSIS_GEOMETRY_NOT_CURRENT'
          : !meshProfile
            ? 'ANALYSIS_MESH_PROFILE_BINDING_REQUIRED'
            : null;

  return {
    producerQualified,
    available: unavailableReason === null,
    unavailableReason,
    generationMode: sourceMeshAdoption ? 'SOURCE_MESH_ADOPTION' : 'AUTOMATIC_MESH',
    producerRef: producerQualified
      ? sourceMeshAdoption ? LAFEA5_SOURCE_SHELL_ADOPTION_PRODUCER_REF : LAFEA_MESH_PRODUCER_REF
      : null,
    governanceRef: producerQualified
      ? sourceMeshAdoption
        ? 'LAFEA.5 caller-authored host-shell footprint source-mesh identity preservation'
        : LAFEA_MESH_PRODUCER_GOVERNANCE_REF
      : null,
    elementFamilies: lafeaMeshProducerElementFamilies(stage.stageId),
    localRefinementElementFamilies: [...capabilities.localRefinementElementFamilies],
    meshProfileBound: Boolean(meshProfile),
    meshProfileIdentity: meshProfile?.profileIdentity ?? null,
    targetElementLength: sourceMeshAdoption ? null : meshProfile?.fields.globalTargetSize ?? null,
    declaredElementFamily: declaredFamily(stage.stageId, meshProfile),
    lengthUnit: shellMidsurface
      ? shellParent?.geometry?.lengthUnit ?? shellParent?.lengthUnit ?? null
      : stage.retainedAnalysisGeometryEvidence?.geometry?.lengthUnit ?? null,
    plan: stage.lastAnalysisMeshPlan ?? null,
  };
}

function governedV2Route(stage) {
  return stage.domainFirstProfileActive === true || stage.shellMidsurfaceProfileActive === true;
}
function declaredFamily(stageId, meshProfile) {
  if (!meshProfile) return null;
  return stageId === 'LAFEA.4' || stageId === 'LAFEA.5'
    ? meshProfile.fields.shellElement ?? null
    : meshProfile.fields.continuumElement ?? null;
}
function retainedFamily(stageId, meshProfile) {
  return declaredFamily(stageId, meshProfile);
}

function custodyReasons(custody) {
  const reasons = [
    ...custody.staleReasons,
    ...custody.invalidReasons,
    ...custody.absenceReasons,
  ];
  if (custody.state === 'ABSENT' && !reasons.length) {
    reasons.push('ANALYSIS_MESH_EVIDENCE_ABSENT');
  }
  return [...new Set(reasons)];
}

function stepStatus(state) {
  if (state === 'NOT_APPLICABLE' || state === 'CURRENT_PASS') return 'COMPLETE';
  if (state === 'CURRENT_WARNING') return 'WARNING';
  if (state === 'ABSENT') return 'NOT_STARTED';
  return 'BLOCKED';
}

function previewStatus(state, generationAvailable) {
  if (state === 'STALE') return 'STALE_RETAINED_EVIDENCE';
  if (state === 'CURRENT_PASS' || state === 'CURRENT_WARNING'
    || state === 'CURRENT_BLOCK') return 'RETAINED_EVIDENCE_AVAILABLE';
  if (state === 'INVALID') return 'INVALID_RETAINED_EVIDENCE';
  if (state === 'NOT_APPLICABLE') return 'NOT_APPLICABLE';
  return generationAvailable ? 'READY_TO_GENERATE' : 'NO_QUALIFIED_PRODUCER';
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
