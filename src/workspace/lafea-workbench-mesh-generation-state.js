/**
 * Generation and custody slice for domain-first (v2) analysis-mesh evidence.
 *
 * The legacy v1 slice in `lafea-workbench-mesh-state.js` retains a mesh the
 * user imported. This slice retains the bound mesh profile and the mesh the
 * qualified producer generated, so the domain-first custody projection has
 * something to classify. It holds no listeners and publishes nothing itself.
 *
 * Custody is only mutated after evidence has been fully built and validated
 * (`NO_CUSTODY_MUTATION_UNTIL_FULL_EVIDENCE_ACCEPTED`): a generation,
 * retained-mesh refinement, or recovery that throws leaves the previously
 * retained mesh exactly as it was.
 */
import { canonicalLafeaAnalysisMeshProfile } from './lafea-analysis-mesh-contract.js';
import { validateLafeaAnalysisMeshEvidenceV2 } from './lafea-analysis-mesh-evidence-v2.js';
import {
  LAFEA_RETAINED_MESH_REFINEMENT_COMMAND_SCHEMA,
  createLafeaRetainedMeshRefinementCommand,
} from './lafea-mesh-refinement-command.js';
import {
  lafeaMeshGenerationConfiguration,
  planLafeaAnalysisMesh,
  produceLafeaAnalysisMeshEvidence,
} from './lafea-mesh-producer-binding.js';
import { produceLafeaRetainedMeshRefinement } from './lafea-retained-mesh-refinement.js';

export function createLafeaWorkbenchMeshGenerationState(stageIds) {
  const profiles = new Map(stageIds.map((stageId) => [stageId, null]));
  const evidence = new Map(stageIds.map((stageId) => [stageId, null]));
  const lastPlan = new Map(stageIds.map((stageId) => [stageId, null]));

  function fields(stageId) {
    requireStage(stageId);
    return freeze({
      retainedAnalysisMeshProfile: profiles.get(stageId),
      retainedAnalysisMeshEvidenceV2: evidence.get(stageId),
      lastAnalysisMeshPlan: lastPlan.get(stageId),
    });
  }

  /**
   * Bind the governed mesh profile. Its semantic hash is the binding the
   * custody layer checks, so rebinding a different profile discards any mesh
   * generated under the previous one rather than leaving a mismatched pair.
   */
  function bindMeshProfile(value, stageId) {
    requireStage(stageId);
    const profile = canonicalLafeaAnalysisMeshProfile(value);
    const current = profiles.get(stageId);
    if (current?.semanticHash === profile.semanticHash) {
      return freeze({ changed: false, meshProfile: current });
    }
    profiles.set(stageId, profile);
    evidence.set(stageId, null);
    lastPlan.set(stageId, null);
    return freeze({ changed: true, meshProfile: profile });
  }

  /** Run the producer and describe the result without touching custody. */
  function planMesh(stage, overrides = {}) {
    const stageId = stage.stageId;
    const configuration = configurationFor(stageId, overrides);
    const planned = planLafeaAnalysisMesh(stage, configuration);
    lastPlan.set(stageId, summarize(planned));
    return freeze({ configuration, planned, summary: lastPlan.get(stageId) });
  }

  /** Generate, validate, and only then retain as the stage's analysis mesh. */
  function generateMesh(stage, overrides = {}) {
    const stageId = stage.stageId;
    const configuration = configurationFor(stageId, overrides);
    const produced = produceLafeaAnalysisMeshEvidence(stage, configuration);
    const validated = validateLafeaAnalysisMeshEvidenceV2(produced.evidence);
    evidence.set(stageId, validated);
    lastPlan.set(stageId, summarize(produced.planned));
    return freeze({
      changed: true,
      evidence: validated,
      summary: lastPlan.get(stageId),
    });
  }

  /**
   * Refine the exact retained v2 parent. Parent artifact/mesh hashes are taken
   * from custody here rather than trusted from UI input. The child replaces
   * custody only after generation, quality qualification and v2 evidence
   * validation all succeed.
   */
  function refineMesh(stage, request = {}) {
    const stageId = stage.stageId;
    requireStage(stageId);
    const profile = profiles.get(stageId);
    if (!profile) fail('LAFEA_ANALYSIS_MESH_PROFILE_BINDING_REQUIRED');
    const parentEvidence = evidence.get(stageId);
    if (!parentEvidence) fail('LAFEA_RETAINED_MESH_REFINEMENT_PARENT_REQUIRED');
    const command = createLafeaRetainedMeshRefinementCommand({
      schema: LAFEA_RETAINED_MESH_REFINEMENT_COMMAND_SCHEMA,
      commandId: request.commandId ?? `LAFEA-${stageId}-RETAINED-REFINEMENT`,
      stageId,
      parentMeshArtifactHash: parentEvidence.artifactHash,
      parentMeshHash: parentEvidence.meshHash,
      kind: request.kind ?? 'TARGET_LENGTH',
      targetType: request.targetType,
      targetIds: request.targetIds,
      targetElementLength: request.targetElementLength,
      lengthUnit: request.lengthUnit,
      reason: request.reason ?? 'User-governed retained analysis-mesh refinement',
    });
    const produced = produceLafeaRetainedMeshRefinement({
      stage,
      meshProfile: profile,
      parentEvidence,
      command,
    });
    const validated = validateLafeaAnalysisMeshEvidenceV2(produced.evidence);
    evidence.set(stageId, validated);
    lastPlan.set(stageId, summarizeRefinement(produced));
    return freeze({
      changed: true,
      command,
      parentEvidence,
      evidence: validated,
      summary: lastPlan.get(stageId),
      localPointCount: produced.localPointCount,
    });
  }

  function validateEvidence(value) {
    return validateLafeaAnalysisMeshEvidenceV2(value);
  }

  /**
   * Recover a portable v2 evidence artifact after its profile has been rebound
   * by the orchestrator action. Parent currentness is deliberately not guessed
   * here; the domain-first custody projection classifies the retained evidence
   * as CURRENT_PASS/CURRENT_BLOCK/STALE after publication.
   */
  function recoverEvidence(value, stageId) {
    requireStage(stageId);
    const validated = validateEvidence(value);
    if (validated.stageId !== stageId) {
      fail('LAFEA_ANALYSIS_MESH_V2_RECOVERY_STAGE_MISMATCH');
    }
    const profile = profiles.get(stageId);
    if (!profile || profile.semanticHash !== validated.meshProfileHash) {
      fail('LAFEA_ANALYSIS_MESH_V2_RECOVERY_PROFILE_NOT_BOUND');
    }
    const retained = evidence.get(stageId);
    if (sameEvidence(retained, validated)) {
      return freeze({ changed: false, evidence: retained, meshProfile: profile });
    }
    if (retained) fail('LAFEA_ANALYSIS_MESH_V2_RECOVERY_CONFLICTING_REPLAY');
    evidence.set(stageId, validated);
    lastPlan.set(stageId, null);
    return freeze({ changed: true, evidence: validated, meshProfile: profile });
  }

  function selectEvidence(stageId) { requireStage(stageId); return evidence.get(stageId); }
  function selectMeshProfile(stageId) { requireStage(stageId); return profiles.get(stageId); }
  function selectPlan(stageId) { requireStage(stageId); return lastPlan.get(stageId); }
  function exportEvidence(stageId) { return selectEvidence(stageId); }

  /** Any change to the source, domain or geometry invalidates a generated mesh. */
  function invalidate(stageId) {
    requireStage(stageId);
    if (!evidence.get(stageId) && !lastPlan.get(stageId)) return false;
    evidence.set(stageId, null);
    lastPlan.set(stageId, null);
    return true;
  }

  function clear(stageId) {
    requireStage(stageId);
    profiles.set(stageId, null);
    evidence.set(stageId, null);
    lastPlan.set(stageId, null);
  }

  return Object.freeze({
    fields, bindMeshProfile, planMesh, generateMesh, refineMesh,
    validateEvidence, recoverEvidence, exportEvidence,
    selectEvidence, selectMeshProfile, selectPlan, invalidate, clear,
  });

  function configurationFor(stageId, overrides) {
    const profile = profiles.get(stageId);
    if (!profile) fail('LAFEA_ANALYSIS_MESH_PROFILE_BINDING_REQUIRED');
    return lafeaMeshGenerationConfiguration(profile, overrides);
  }
  function requireStage(stageId) {
    if (!profiles.has(stageId)) fail('LAFEA_ANALYSIS_MESH_GENERATION_STAGE_NOT_FOUND');
  }
}

/** The plan facts the Discretization surface displays, without the mesh itself. */
function summarize(planned) {
  return freeze({
    schema: 'lafea-analysis-mesh-plan-summary/v1',
    stageId: planned.plan.stageId,
    generationMode: 'AUTOMATIC_MESH',
    elementFamily: planned.plan.elementFamily,
    strategy: planned.generated.strategy,
    strategyReason: planned.generated.strategyReason,
    nodeCount: planned.plan.estimatedNodes,
    elementCount: planned.plan.estimatedElements,
    estimatedDofs: planned.plan.estimatedDofs,
    boundarySegmentCount: planned.generated.boundarySegmentCount,
    characteristicLengthMin: planned.plan.characteristicLengthMin,
    characteristicLengthMedian: planned.plan.characteristicLengthMedian,
    characteristicLengthMax: planned.plan.characteristicLengthMax,
    resourceDisposition: planned.plan.resourceDisposition,
    intentHash: planned.intent.semanticHash,
    planHash: planned.plan.planHash,
    capabilityHash: planned.capabilityHash,
    qualificationHash: planned.qualificationHash,
    producerRef: planned.producerRef,
  });
}

function summarizeRefinement(produced) {
  return freeze({
    schema: 'lafea-analysis-mesh-plan-summary/v1',
    stageId: produced.plan.stageId,
    generationMode: 'REFINEMENT_REGENERATION',
    elementFamily: produced.plan.elementFamily,
    strategy: 'RETAINED_LOCAL_REFINEMENT',
    strategyReason: 'TARGETED_STEINER_INSERTION_WITH_CONSTRAINED_LAWSON_RESTORATION',
    nodeCount: produced.evidence.mesh.nodes.length,
    elementCount: produced.evidence.mesh.elements.length,
    estimatedDofs: produced.estimatedDofs,
    boundarySegmentCount: null,
    characteristicLengthMin: null,
    characteristicLengthMedian: produced.plan.targetElementLength,
    characteristicLengthMax: produced.plan.globalTargetElementLength,
    resourceDisposition: 'WITHIN_LIMITS',
    intentHash: produced.plan.commandHash,
    planHash: produced.plan.planHash,
    capabilityHash: produced.plan.capabilityHash,
    qualificationHash: produced.plan.qualificationHash,
    producerRef: produced.plan.producerRef,
    parentMeshArtifactHash: produced.plan.parentMeshArtifactHash,
    parentMeshHash: produced.plan.parentMeshHash,
    targetType: produced.plan.targetType,
    targetIds: [...produced.plan.targetIds],
    targetElementLength: produced.plan.targetElementLength,
    localPointCount: produced.localPointCount,
  });
}

function sameEvidence(left, right) {
  return Boolean(left)
    && left.artifactHash === right.artifactHash
    && JSON.stringify(left) === JSON.stringify(right);
}

function fail(code) { const error = new Error(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
