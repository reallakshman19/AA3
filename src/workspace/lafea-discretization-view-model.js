/** Pure presentation model for the governed Discretization step. */
import { jacobianDeterminantStatisticsOf } from '../core/lafea-meshing/index.js';
import { qualifiedMeshQualityPolicyForStage } from '../core/lafea-profile-contract/index.js';
import { buildLafea4ThicknessCurvatureObservation } from './lafea-shell-thickness-curvature-observation.js';
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
  lafea5SourceShellProfileReference,
} from './lafea-source-shell-mesh-adoption.js';
import { buildLafea4ShellProductRefinementUiPolicy } from './lafea4-shell-product-refinement-ui-policy.js';

export const LAFEA_DISCRETIZATION_VIEW_MODEL_SCHEMA =
  'lafea-discretization-view-model/v1';

export const LAFEA_DISCRETIZATION_MODES = Object.freeze([
  'RETAIN_AUTHORIZED_MESH',
  'SOURCE_DISCRETIZATION',
  'AUTOMATIC_MESH',
  'MANUAL_REFINEMENT',
]);

export const LAFEA_MESH_UI_PHASES = Object.freeze([
  'NOT_APPLICABLE',
  'PRODUCER_UNAVAILABLE',
  'PARENT_REQUIRED',
  'PROFILE_REQUIRED',
  'READY_TO_PLAN',
  'PLAN_AVAILABLE',
  'PLAN_BLOCKED',
  'MESH_CURRENT_PASS',
  'MESH_CURRENT_WARNING',
  'MESH_CURRENT_BLOCK',
  'MESH_STALE',
  'MESH_INVALID',
  'MESH_NOT_READY',
]);

export function buildLafeaDiscretizationViewModel(stageValue) {
  const stage = requireStage(stageValue);
  const profile = requireLafeaLifecycleProfileForStage(stage.stageId);
  const capabilities = lafeaMeshCapabilities(stage.stageId);
  const evidence = governedV2Route(stage)
    ? stage.retainedAnalysisMeshEvidenceV2 ?? null
    : stage.retainedAnalysisMeshEvidence ?? null;
  const custody = requireCustody(stage.analysisMeshCustodyProjection, stage.stageId, evidence);
  const generation = buildGenerationModel(stage, capabilities);
  const uiPhase = lafeaMeshUiPhase({
    applicable: profile.meshApplicable,
    custodyState: custody.state,
    generation,
  });
  const reasons = custodyReasons(custody);
  const mappingInspection = buildHighOrderMappingInspection(evidence, generation.lengthUnit);
  const qualityPanel = custody.gateResults.length && custody.meshProfileIdentity
    ? buildMeshQualityPanel(custody.gateResults, {
      stageId: stage.stageId,
      meshProfileIdentity: custody.meshProfileIdentity,
      quality: evidence?.quality ?? null,
    })
    : null;
  const retainedElementFamily = retainedFamily(stage.stageId, evidence?.meshProfile ?? null);
  const productRefinement = buildLafea4ShellProductRefinementUiPolicy(stage);
  const legacyManualRefinementEnabled = capabilities.manualRefinementQualified === true
    && evidence?.qualification === 'PASS'
    && ['CURRENT_PASS', 'CURRENT_WARNING'].includes(custody.state)
    && capabilities.localRefinementElementFamilies.includes(retainedElementFamily);
  const manualRefinementEnabled = stage.stageId === 'LAFEA.4'
    ? productRefinement.canRefine === true
    : legacyManualRefinementEnabled;

  return freeze({
    schema: LAFEA_DISCRETIZATION_VIEW_MODEL_SCHEMA,
    stageId: stage.stageId,
    applicable: profile.meshApplicable,
    state: custody.state,
    uiPhase,
    stepStatus: stepStatus(custody.state),
    reasons,
    generation,
    refinement: productRefinement,
    configuration: {
      declaredMode: declaredMode(profile.meshApplicable, generation),
      modes: modeOptions(
        profile.meshApplicable,
        capabilities,
        generation,
        manualRefinementEnabled,
        retainedElementFamily,
        productRefinement,
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
      status: previewStatus(uiPhase),
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
    evidence: evidence
      ? evidenceModel(custody, retainedElementFamily, qualityPanel, mappingInspection)
      : emptyEvidence(),
    actions: {
      canImportAuthorizedMesh: profile.meshApplicable,
      canValidateEvidence: profile.meshApplicable,
      canExportEvidence: custody.canView === true,
      canFocusWarnings: custody.canFocusFindings === true && custody.warningElementIds.length > 0,
      canFocusBlocking: custody.canFocusFindings === true && custody.blockingElementIds.length > 0,
      canAdvance: custody.usableForAdvance === true,
      canAuthorize: custody.usableForAuthorization === true,
      canRun: custody.usableForRun === true,
      warningReviewRequired: custody.state === 'CURRENT_WARNING',
      automaticMeshEnabled: generation.generationMode === 'AUTOMATIC_MESH'
        && (generation.available || generation.profileBindingAvailable),
      manualRefinementEnabled,
      canBindMeshProfile: generation.profileBindingAvailable && !generation.meshProfileBound,
      canPlanMesh: generation.available,
      canGenerateMesh: generation.available && generation.plan?.resourceDisposition !== 'BLOCK',
      canRefineMesh: manualRefinementEnabled,
    },
  });
}

export function lafeaMeshUiPhase({ applicable = true, custodyState, generation }) {
  if (!applicable || custodyState === 'NOT_APPLICABLE') return 'NOT_APPLICABLE';
  if (custodyState === 'CURRENT_PASS') return 'MESH_CURRENT_PASS';
  if (custodyState === 'CURRENT_WARNING') return 'MESH_CURRENT_WARNING';
  if (custodyState === 'CURRENT_BLOCK') return 'MESH_CURRENT_BLOCK';
  if (custodyState === 'STALE') return 'MESH_STALE';
  if (custodyState === 'INVALID') return 'MESH_INVALID';
  if (!generation?.producerQualified) return 'PRODUCER_UNAVAILABLE';
  if (!generation.parentReady) return 'PARENT_REQUIRED';
  if (!generation.meshProfileBound) return 'PROFILE_REQUIRED';
  if (generation.plan?.resourceDisposition === 'BLOCK') return 'PLAN_BLOCKED';
  if (generation.plan) return 'PLAN_AVAILABLE';
  if (generation.available) return 'READY_TO_PLAN';
  return 'MESH_NOT_READY';
}

function requireStage(value) {
  if (!isRecord(value) || typeof value.stageId !== 'string') {
    throw new TypeError('LAFEA_DISCRETIZATION_STAGE_REQUIRED');
  }
  return value;
}

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
    meshProfileIdentity: value.meshProfileIdentity ?? evidence?.meshProfile?.profileIdentity ?? null,
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

function declaredMode(applicable, generation) {
  if (!applicable) return null;
  if (generation.generationMode === 'SOURCE_MESH_ADOPTION') return 'SOURCE_DISCRETIZATION';
  return generation.available || generation.profileBindingAvailable
    ? 'AUTOMATIC_MESH'
    : 'RETAIN_AUTHORIZED_MESH';
}

function modeOptions(
  applicable,
  capabilities,
  generation,
  manualRefinementEnabled,
  retainedElementFamily,
  productRefinement,
) {
  if (!applicable) {
    return LAFEA_DISCRETIZATION_MODES.map((mode) => ({
      mode,
      enabled: false,
      reason: 'ANALYSIS_MESH_NOT_APPLICABLE',
    }));
  }
  const sourceAdoption = generation.generationMode === 'SOURCE_MESH_ADOPTION';
  const configurationAvailable = generation.available || generation.profileBindingAvailable;
  return [
    { mode: 'RETAIN_AUTHORIZED_MESH', enabled: true, reason: null },
    {
      mode: 'SOURCE_DISCRETIZATION',
      enabled: sourceAdoption && configurationAvailable,
      reason: sourceAdoption
        ? configurationAvailable ? null : generation.unavailableReason
        : 'NO_STAGE_SOURCE_DISCRETIZATION_AUTHORITY',
    },
    {
      mode: 'AUTOMATIC_MESH',
      enabled: !sourceAdoption && configurationAvailable,
      reason: sourceAdoption
        ? 'LAFEA5_CALLER_AUTHORED_SOURCE_MESH_IS_PRESERVED_NO_REMESHING'
        : configurationAvailable ? null : generation.unavailableReason,
    },
    {
      mode: 'MANUAL_REFINEMENT',
      enabled: manualRefinementEnabled,
      reason: manualRefinementEnabled
        ? null
        : refinementUnavailableReason(
          capabilities, retainedElementFamily, productRefinement,
        ),
    },
  ];
}

function refinementUnavailableReason(capabilities, retainedElementFamily, productRefinement) {
  if (productRefinement?.scopeEligible === true
    && retainedElementFamily === 'CST_DKT_TRI3_THIN_SHELL_V1') {
    return productRefinement.reason;
  }
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

function buildGenerationModel(stage, capabilities) {
  const producerQualified = capabilities.automaticMeshProducerQualified === true;
  const meshProfile = stage.retainedAnalysisMeshProfile ?? null;
  const domainFirst = stage.domainFirstProfileActive === true;
  const shellMidsurface = stage.shellMidsurfaceProfileActive === true;
  const geometryCurrent = stage.analysisGeometryProjection?.state === 'CURRENT_PASS'
    && stage.analysisDomainProjection?.state === 'CURRENT_PASS';
  const shellParent = stage.retainedShellMidsurfaceEvidence ?? null;
  const sourceMeshAdoption = shellParent?.schema === LAFEA5_SOURCE_SHELL_PARENT_SCHEMA;
  const sourceProfileReference = sourceMeshAdoption
    ? lafea5SourceShellProfileReference(shellParent)
    : null;
  const sourceHash = stage.sourceAuthority?.sourceHash ?? stage.lifecycle?.source?.sourceHash ?? null;
  const shellCurrent = shellMidsurface
    && shellParent?.qualification === 'PASS'
    && shellParent.stageId === stage.stageId
    && shellParent.sourceHash === sourceHash;
  const shellStage = stage.stageId === 'LAFEA.4' || stage.stageId === 'LAFEA.5';
  const parentReady = shellStage ? shellCurrent : domainFirst && geometryCurrent;
  const profileBindingAvailable = producerQualified && parentReady;

  const unavailableReason = !producerQualified
    ? 'QUALIFIED_MESH_PRODUCER_NOT_AVAILABLE'
    : shellStage
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
    parentReady,
    profileBindingAvailable,
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
    qualifiedQualityPolicy: qualifiedMeshQualityPolicyForStage(stage.stageId),
    thicknessCurvatureObservation: buildLafea4ThicknessCurvatureObservation(stage),
    targetElementLength: sourceMeshAdoption ? null : meshProfile?.fields.globalTargetSize ?? null,
    sourceProfileReference,
    declaredElementFamily: declaredFamily(stage.stageId, meshProfile),
    lengthUnit: shellMidsurface
      ? shellParent?.geometry?.lengthUnit ?? shellParent?.lengthUnit ?? null
      : stage.retainedAnalysisGeometryEvidence?.geometry?.lengthUnit ?? null,
    plan: stage.lastAnalysisMeshPlan ?? null,
  };
}

function evidenceModel(custody, retainedElementFamily, qualityPanel, mappingInspection) {
  return {
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
    mappingInspection,
  };
}

function emptyEvidence() {
  return {
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
    mappingInspection: null,
  };
}

function buildHighOrderMappingInspection(evidence, lengthUnit) {
  const mesh = evidence?.mesh;
  const elements = mesh?.elements?.filter((element) => (
    element.elementType === 'T6' || element.elementType === 'Q8'
  )) ?? [];
  if (!elements.length) return null;
  const nodeById = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  const rows = elements.map((element) => {
    const nodes = element.nodeIds.map((nodeId) => nodeById.get(nodeId));
    if (nodes.some((node) => !node)) {
      throw new TypeError('LAFEA_MAPPING_INSPECTION_NODE_NOT_FOUND');
    }
    return Object.freeze({
      elementId: element.elementId,
      elementType: element.elementType,
      ...jacobianDeterminantStatisticsOf(element.elementType, nodes),
    });
  });
  const minimumDeterminant = Math.min(...rows.map((row) => row.minimum));
  const maximumDeterminant = Math.max(...rows.map((row) => row.maximum));
  const positiveRows = rows.filter((row) => Number.isFinite(row.positiveDeterminantRatio));
  const minimumPositiveDeterminantRatio = positiveRows.length
    ? Math.min(...positiveRows.map((row) => row.positiveDeterminantRatio))
    : null;
  return Object.freeze({
    schema: 'lafea-high-order-mapping-inspection/v1',
    authority: 'DERIVED_INSPECTION_ONLY_NO_QUALIFIED_LIMIT',
    sampleDomain: 'SCALED_JACOBIAN_CORNERS_PLUS_FORMULATION_INTEGRATION_POINTS',
    lengthUnit: lengthUnit ?? null,
    elementCount: rows.length,
    sampleCount: rows.reduce((sum, row) => sum + row.sampleCount, 0),
    minimumDeterminant,
    maximumDeterminant,
    minimumDeterminantElementIds: Object.freeze(rows
      .filter((row) => sameNumber(row.minimum, minimumDeterminant))
      .map((row) => row.elementId)
      .sort()),
    minimumPositiveDeterminantRatio,
    minimumPositiveRatioElementIds: Object.freeze(minimumPositiveDeterminantRatio === null
      ? []
      : rows
        .filter((row) => sameNumber(
          row.positiveDeterminantRatio, minimumPositiveDeterminantRatio,
        ))
        .map((row) => row.elementId)
        .sort()),
    nonPositiveSampleCount: rows.reduce((sum, row) => sum + row.nonPositiveSampleCount, 0),
    nonPositiveElementIds: Object.freeze(rows
      .filter((row) => row.nonPositiveSampleCount > 0)
      .map((row) => row.elementId)
      .sort()),
  });
}

function sameNumber(left, right) {
  const scale = Math.max(1, Math.abs(left ?? 0), Math.abs(right ?? 0));
  return Number.isFinite(left) && Number.isFinite(right)
    && Math.abs(left - right) <= 64 * Number.EPSILON * scale;
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
function retainedFamily(stageId, meshProfile) { return declaredFamily(stageId, meshProfile); }

function custodyReasons(custody) {
  const reasons = [...custody.staleReasons, ...custody.invalidReasons, ...custody.absenceReasons];
  if (custody.state === 'ABSENT' && !reasons.length) reasons.push('ANALYSIS_MESH_EVIDENCE_ABSENT');
  return [...new Set(reasons)];
}
function stepStatus(state) {
  if (state === 'NOT_APPLICABLE' || state === 'CURRENT_PASS') return 'COMPLETE';
  if (state === 'CURRENT_WARNING') return 'WARNING';
  if (state === 'ABSENT') return 'NOT_STARTED';
  return 'BLOCKED';
}
function previewStatus(uiPhase) {
  if (uiPhase === 'PLAN_AVAILABLE' || uiPhase === 'PLAN_BLOCKED') return 'PROPOSED_MESH_AVAILABLE';
  if (uiPhase === 'READY_TO_PLAN') return 'READY_TO_PLAN';
  if (uiPhase === 'PROFILE_REQUIRED') return 'PROFILE_CONFIGURATION_REQUIRED';
  if (uiPhase === 'PARENT_REQUIRED') return 'MESH_PARENT_REQUIRED';
  if (uiPhase === 'PRODUCER_UNAVAILABLE') return 'NO_QUALIFIED_PRODUCER';
  if (uiPhase === 'MESH_STALE') return 'STALE_RETAINED_EVIDENCE';
  if (uiPhase === 'MESH_INVALID') return 'INVALID_RETAINED_EVIDENCE';
  if (uiPhase.startsWith('MESH_CURRENT_')) return 'RETAINED_EVIDENCE_AVAILABLE';
  if (uiPhase === 'NOT_APPLICABLE') return 'NOT_APPLICABLE';
  return 'NOT_READY';
}
function isRecord(value) { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
