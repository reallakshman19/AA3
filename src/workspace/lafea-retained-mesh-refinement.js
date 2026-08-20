import {
  buildLafea3MappedRetainedRefinementMesh,
  minimumLafea3RetainedRefinementInfluenceRadius,
} from './lafea-retained-mesh-refinement-grading.js';
import { canonicalLafeaAnalysisMeshProfile } from './lafea-analysis-mesh-contract.js';
import { validateLafeaAnalysisGeometryEvidence } from './lafea-analysis-geometry-evidence.js';
import {
  LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE,
  LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
  LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
  createLafeaAnalysisMeshEvidenceV2,
  validateLafeaAnalysisMeshEvidenceV2,
} from './lafea-analysis-mesh-evidence-v2.js';
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import {
  LAFEA_MESH_PRODUCER_OUTPUT_V2_SCHEMA,
  createLafeaMeshProducerOutputV2,
} from './lafea-mesh-producer-v2-contracts.js';
import {
  LAFEA_RETAINED_MESH_REFINEMENT_COMMAND_SCHEMA,
  createLafeaRetainedMeshRefinementCommand,
} from './lafea-mesh-refinement-command.js';
import { estimateLafeaMeshDofs } from './lafea-mesh-dof-policy.js';
import {
  lafeaCoreMeshProducerCapability,
  lafeaCoreMeshProducerQualification,
} from './lafea-mesh-producer-binding.js';
import { LAFEA_MESH_PRODUCER_REF } from './lafea-mesh-producer-registry.js';

export const LAFEA_RETAINED_MESH_REFINEMENT_PLAN_SCHEMA =
  'lafea-retained-mesh-refinement-plan/v1';
export const LAFEA_RETAINED_MESH_REFINEMENT_RESULT_SCHEMA =
  'lafea-retained-mesh-refinement-result/v1';
export const LAFEA_RETAINED_MESH_REFINEMENT_POLICY = Object.freeze({
  minimumTargetRatio: 0.25,
  influenceRadiusGlobalFactor: 2,
  minimumElementsPerTransitionBand: 2,
  maximumTargets: 1,
});

/**
 * Build an auditable refinement plan against one exact retained v2 mesh.
 * Parent canonical NODE/ELEMENT IDs are resolved to coordinates before the
 * plan is hashed, so replay cannot silently retarget a later mesh revision.
 */
export function planLafeaRetainedMeshRefinement({
  stage, meshProfile: meshProfileValue, parentEvidence: parentValue, command: commandValue,
}) {
  const parentEvidence = validateLafeaAnalysisMeshEvidenceV2(parentValue);
  const meshProfile = canonicalLafeaAnalysisMeshProfile(meshProfileValue);
  const command = requireCommand(commandValue);
  requireCurrentParents(stage, parentEvidence, meshProfile);

  if (command.stageId !== 'LAFEA.3' || parentEvidence.stageId !== 'LAFEA.3') {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_STAGE_NOT_QUALIFIED');
  }
  if (command.parentMeshArtifactHash !== parentEvidence.artifactHash
    || command.parentMeshHash !== parentEvidence.meshHash) {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_PARENT_MESH_STALE');
  }
  if (!command.executionAuthorized) {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_COMMAND_NOT_AUTHORIZED');
  }
  if (command.targetIds.length > LAFEA_RETAINED_MESH_REFINEMENT_POLICY.maximumTargets) {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_SINGLE_TARGET_ONLY');
  }

  const elementFamily = meshProfile.fields.continuumElement;
  if (!['T3', 'T6'].includes(elementFamily)) {
    fail(elementFamily === 'Q8'
      ? 'LAFEA_RETAINED_MESH_REFINEMENT_Q8_NOT_QUALIFIED'
      : 'LAFEA_RETAINED_MESH_REFINEMENT_ELEMENT_FAMILY_NOT_QUALIFIED');
  }
  if (parentEvidence.mesh.elements.some((row) => row.elementType !== elementFamily)) {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_PARENT_FAMILY_MISMATCH');
  }

  const globalTargetElementLength = meshProfile.fields.globalTargetSize;
  if (!(command.targetElementLength < globalTargetElementLength)) {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_TARGET_MUST_BE_SMALLER_THAN_GLOBAL');
  }
  if (command.targetElementLength
      < globalTargetElementLength * LAFEA_RETAINED_MESH_REFINEMENT_POLICY.minimumTargetRatio) {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_TARGET_RATIO_BELOW_QUALIFIED_LIMIT');
  }

  const targets = resolveTargets(parentEvidence.mesh, command.targetType, command.targetIds);
  const minimumGradedInfluenceRadius = minimumLafea3RetainedRefinementInfluenceRadius({
    localTargetElementLength: command.targetElementLength,
    globalTargetElementLength,
    adjacentSizeRatioMax: meshProfile.fields.adjacentSizeRatioMax,
    minimumElementsPerTransitionBand:
      LAFEA_RETAINED_MESH_REFINEMENT_POLICY.minimumElementsPerTransitionBand,
  });
  const influenceRadius = Math.max(
    globalTargetElementLength * LAFEA_RETAINED_MESH_REFINEMENT_POLICY.influenceRadiusGlobalFactor,
    minimumGradedInfluenceRadius,
  );
  const capability = lafeaCoreMeshProducerCapability();
  const qualification = lafeaCoreMeshProducerQualification();
  if (!capability.supportsLocalRefinement
    || !capability.generationModes.includes('REFINEMENT_REGENERATION')
    || !qualification.localRefinementAuthorized
    || !qualification.authorizedGenerationModes.includes('REFINEMENT_REGENERATION')) {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_PRODUCER_NOT_QUALIFIED');
  }

  const base = {
    schema: LAFEA_RETAINED_MESH_REFINEMENT_PLAN_SCHEMA,
    stageId: 'LAFEA.3',
    generationMode: 'REFINEMENT_REGENERATION',
    parentMeshArtifactHash: parentEvidence.artifactHash,
    parentMeshHash: parentEvidence.meshHash,
    parentPlanHash: parentEvidence.authority.planHash,
    sourceHash: parentEvidence.sourceHash,
    analysisDomainHash: parentEvidence.analysisDomainHash,
    analysisGeometryHash: parentEvidence.analysisGeometryHash,
    meshProfileHash: meshProfile.semanticHash,
    elementFamily,
    commandHash: command.semanticHash,
    refinementKind: command.kind,
    targetType: command.targetType,
    targetIds: [...command.targetIds],
    targetElementLength: command.targetElementLength,
    globalTargetElementLength,
    influenceRadius,
    targets,
    capabilityHash: capability.capabilityHash,
    qualificationHash: qualification.qualificationHash,
    producerId: capability.producerId,
    producerRevision: capability.producerRevision,
    producerRef: LAFEA_MESH_PRODUCER_REF,
    repeatabilityPolicy: capability.repeatabilityPolicy,
  };
  return freeze({
    ...base,
    planHash: canonicalLafeaSha256({
      schema: 'lafea-retained-mesh-refinement-plan-hash-input/v1', plan: base,
    }),
  });
}

/** Preview a child mesh/evidence without mutating workbench custody. */
export function previewLafeaRetainedMeshRefinement(input) {
  const parentEvidence = validateLafeaAnalysisMeshEvidenceV2(input.parentEvidence);
  const meshProfile = canonicalLafeaAnalysisMeshProfile(input.meshProfile);
  const command = requireCommand(input.command);
  const plan = planLafeaRetainedMeshRefinement({
    stage: input.stage, meshProfile, parentEvidence, command,
  });
  const geometryEvidence = requireCurrentRefinementGeometry(input.stage, plan);
  const generated = buildLafea3MappedRetainedRefinementMesh({
    geometry: geometryEvidence.geometry,
    targets: plan.targets,
    elementFamily: plan.elementFamily,
    localTargetElementLength: plan.targetElementLength,
    globalTargetElementLength: plan.globalTargetElementLength,
    adjacentSizeRatioMax: meshProfile.fields.adjacentSizeRatioMax,
    producerRevision: plan.producerRevision,
  });
  const capability = lafeaCoreMeshProducerCapability();
  const qualification = lafeaCoreMeshProducerQualification();
  const estimatedDofs = estimateLafeaMeshDofs('LAFEA.3', generated.mesh.nodes.length);
  if (generated.mesh.nodes.length > capability.maximumNodes
    || generated.mesh.elements.length > capability.maximumElements
    || estimatedDofs > capability.maximumEstimatedDofs) {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_RESOURCE_LIMIT_EXCEEDED');
  }

  const output = createLafeaMeshProducerOutputV2({
    schema: LAFEA_MESH_PRODUCER_OUTPUT_V2_SCHEMA,
    stageId: 'LAFEA.3',
    intentHash: command.semanticHash,
    planHash: plan.planHash,
    capabilityHash: capability.capabilityHash,
    qualificationHash: qualification.qualificationHash,
    producerId: capability.producerId,
    producerRevision: capability.producerRevision,
    sourceHash: plan.sourceHash,
    analysisDomainHash: plan.analysisDomainHash,
    analysisGeometryHash: plan.analysisGeometryHash,
    meshProfileHash: plan.meshProfileHash,
    elementFamily: plan.elementFamily,
    mesh: generated.mesh,
  });
  const evidence = createLafeaAnalysisMeshEvidenceV2({
    schema: LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
    stageId: 'LAFEA.3',
    sourceHash: output.sourceHash,
    analysisDomainHash: output.analysisDomainHash,
    analysisGeometryHash: output.analysisGeometryHash,
    meshProfile,
    mesh: output.mesh,
    authority: {
      schema: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
      stageId: 'LAFEA.3',
      authorityRole: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE,
      status: 'ACCEPTED_BY_STAGE_CONTRACT',
      producerRef: LAFEA_MESH_PRODUCER_REF,
      sourceHash: output.sourceHash,
      analysisDomainHash: output.analysisDomainHash,
      analysisGeometryHash: output.analysisGeometryHash,
      meshProfileHash: output.meshProfileHash,
      meshHash: output.meshHash,
      capabilityHash: output.capabilityHash,
      qualificationHash: output.qualificationHash,
      planHash: output.planHash,
    },
  });
  return freeze({
    schema: LAFEA_RETAINED_MESH_REFINEMENT_RESULT_SCHEMA,
    plan,
    output,
    evidence,
    parentEvidenceHash: parentEvidence.artifactHash,
    localPointCount: generated.localPointCount,
    construction: generated.construction,
    estimatedDofs,
    changed: evidence.meshHash !== parentEvidence.meshHash,
    qualification: evidence.qualification,
  });
}

/** Produce a custody-eligible child. BLOCK evidence is never returned as accepted. */
export function produceLafeaRetainedMeshRefinement(input) {
  const result = previewLafeaRetainedMeshRefinement(input);
  if (!result.changed) fail('LAFEA_RETAINED_MESH_REFINEMENT_NO_MESH_CHANGE');
  if (result.qualification !== 'PASS') {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_QUALITY_BLOCKED');
  }
  return result;
}

function resolveTargets(mesh, targetType, ids) {
  const nodeById = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  const elementById = new Map(mesh.elements.map((element) => [element.elementId, element]));
  return freeze(ids.map((targetId) => {
    if (targetType === 'NODE') {
      const node = nodeById.get(targetId);
      if (!node) fail('LAFEA_RETAINED_MESH_REFINEMENT_TARGET_NODE_NOT_FOUND');
      return freeze({ targetId, targetType, x: node.x, y: node.y, z: node.z });
    }
    const element = elementById.get(targetId);
    if (!element) fail('LAFEA_RETAINED_MESH_REFINEMENT_TARGET_ELEMENT_NOT_FOUND');
    const corners = element.nodeIds.slice(0, 3).map((id) => nodeById.get(id));
    if (corners.some((node) => !node)) fail('LAFEA_RETAINED_MESH_REFINEMENT_TARGET_CONNECTIVITY_INVALID');
    return freeze({
      targetId,
      targetType,
      x: corners.reduce((sum, node) => sum + node.x, 0) / 3,
      y: corners.reduce((sum, node) => sum + node.y, 0) / 3,
      z: corners.reduce((sum, node) => sum + node.z, 0) / 3,
    });
  }));
}

function requireCurrentRefinementGeometry(stage, plan) {
  if (!stage?.retainedAnalysisGeometryEvidence) {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_GEOMETRY_EVIDENCE_REQUIRED');
  }
  const evidence = validateLafeaAnalysisGeometryEvidence(stage.retainedAnalysisGeometryEvidence);
  if (evidence.sourceHash !== plan.sourceHash
    || evidence.analysisDomainHash !== plan.analysisDomainHash
    || evidence.analysisGeometryHash !== plan.analysisGeometryHash) {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_GEOMETRY_EVIDENCE_STALE');
  }
  return evidence;
}

function requireCurrentParents(stage, parentEvidence, meshProfile) {
  if (parentEvidence.qualification !== 'PASS') fail('LAFEA_RETAINED_MESH_REFINEMENT_PARENT_QUALITY_BLOCKED');
  if (parentEvidence.meshProfileHash !== meshProfile.semanticHash) {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_PROFILE_MISMATCH');
  }
  const sourceHash = stage?.sourceAuthority?.sourceHash ?? stage?.lifecycle?.source?.sourceHash ?? null;
  if (!sourceHash || parentEvidence.sourceHash !== sourceHash) {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_SOURCE_STALE');
  }
  if (stage?.analysisDomainProjection?.state !== 'CURRENT_PASS'
    || parentEvidence.analysisDomainHash !== stage.analysisDomainProjection.analysisDomainHash) {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_DOMAIN_STALE');
  }
  if (stage?.analysisGeometryProjection?.state !== 'CURRENT_PASS'
    || parentEvidence.analysisGeometryHash !== stage.analysisGeometryProjection.analysisGeometryHash) {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_GEOMETRY_STALE');
  }
}

function requireCommand(value) {
  if (!value || value.schema !== LAFEA_RETAINED_MESH_REFINEMENT_COMMAND_SCHEMA) {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_COMMAND_REQUIRED');
  }
  const { semanticHash, status, executionAuthorized, rollbackPolicy, ...input } = value;
  const rebuilt = createLafeaRetainedMeshRefinementCommand(input);
  if (rebuilt.semanticHash !== semanticHash
    || rebuilt.status !== status
    || rebuilt.executionAuthorized !== executionAuthorized
    || rebuilt.rollbackPolicy !== rollbackPolicy) {
    fail('LAFEA_RETAINED_MESH_REFINEMENT_COMMAND_TAMPERED');
  }
  return rebuilt;
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
