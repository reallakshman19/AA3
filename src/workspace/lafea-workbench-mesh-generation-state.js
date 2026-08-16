/**
 * Generation and custody slice for governed v2 analysis-mesh evidence.
 *
 * The legacy v1 slice in `lafea-workbench-mesh-state.js` retains a mesh the
 * user imported. This slice retains the bound mesh profile and the mesh the
 * qualified producer generated. LAFEA.3 consumes domain-first continuum
 * geometry; LAFEA.4 consumes declared shell midsurface evidence; LAFEA.5 may
 * consume declared shell midsurface evidence or losslessly adopt its
 * caller-authored host-shell template as the governed analysis mesh.
 *
 * Custody is only mutated after evidence has been fully built and validated
 * (`NO_CUSTODY_MUTATION_UNTIL_FULL_EVIDENCE_ACCEPTED`): generation,
 * retained-mesh refinement, recovery, or shell-parent registration that throws
 * leaves the previously retained child mesh exactly as it was.
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
  produceLafeaAnalysisMeshEvidenceWithV3Candidate,
} from './lafea-mesh-producer-binding.js';
import { produceLafeaRetainedMeshRefinement } from './lafea-retained-mesh-refinement.js';
import {
  planLafeaShellAnalysisMesh,
  produceLafeaShellAnalysisMesh,
} from './lafea-shell-mesh-producer.js';
import {
  planLafeaMultiPatchShellAnalysisMesh,
  produceLafeaMultiPatchShellAnalysisMesh,
} from './lafea-shell-multipatch-mesh-producer.js';
import {
  LAFEA_SHELL_SURFACE_KINDS,
  shellMidsurfaceKind,
  validateLafeaAnyShellMidsurfaceEvidence,
} from './lafea-shell-midsurface-dispatch.js';
import {
  planLafea5SourceShellMeshAdoption,
  produceLafea5SourceShellMeshAdoption,
} from './lafea-source-shell-mesh-adoption.js';

export function createLafeaWorkbenchMeshGenerationState(stageIds) {
  const profiles = new Map(stageIds.map((stageId) => [stageId, null]));
  const evidence = new Map(stageIds.map((stageId) => [stageId, null]));
  const v3Candidates = new Map(stageIds.map((stageId) => [stageId, null]));
  const shellMidsurfaces = new Map(stageIds.map((stageId) => [stageId, null]));
  const lastPlan = new Map(stageIds.map((stageId) => [stageId, null]));

  function fields(stageId) {
    requireStage(stageId);
    const shellMidsurface = shellMidsurfaces.get(stageId);
    return freeze({
      retainedAnalysisMeshProfile: profiles.get(stageId),
      retainedAnalysisMeshEvidenceV2: evidence.get(stageId),
      retainedAnalysisMeshCandidateV3: v3Candidates.get(stageId),
      shellMidsurfaceProfileActive: Boolean(shellMidsurface),
      retainedShellMidsurfaceEvidence: shellMidsurface,
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
    v3Candidates.set(stageId, null);
    lastPlan.set(stageId, null);
    return freeze({ changed: true, meshProfile: profile });
  }

  /**
   * Bind mesh-independent shell evidence as the parent of any LAFEA.4/.5
   * analysis mesh. A LAFEA.5 caller-authored source-shell parent is accepted by
   * the same source-binding boundary but is losslessly adopted, never remeshed.
   */
  function registerShellMidsurface(value, stage) {
    const stageId = stage?.stageId;
    requireStage(stageId);
    const retained = validateLafeaAnyShellMidsurfaceEvidence(value);
    if (retained.stageId !== stageId) fail('LAFEA_SHELL_MIDSURFACE_WORKBENCH_STAGE_MISMATCH');
    if (stage.lifecycleBinding?.status !== 'CURRENT') {
      fail('LAFEA_SHELL_MIDSURFACE_SOURCE_BINDING_NOT_CURRENT');
    }
    const sourceHash = currentSourceHash(stage);
    if (retained.sourceHash !== sourceHash) fail('LAFEA_SHELL_MIDSURFACE_SOURCE_PARENT_STALE');
    const current = shellMidsurfaces.get(stageId);
    if (current?.semanticHash === retained.semanticHash) {
      return freeze({ changed: false, evidence: current });
    }
    shellMidsurfaces.set(stageId, retained);
    evidence.set(stageId, null);
    v3Candidates.set(stageId, null);
    lastPlan.set(stageId, null);
    return freeze({ changed: true, evidence: retained });
  }

  /** Run the qualified stage producer and describe the result, custody untouched. */
  function planMesh(stage, overrides = {}) {
    const stageId = stage.stageId;
    if (shellMidsurfaces.get(stageId)) {
      requireNoShellOverrides(overrides);
      const profile = requireProfile(stageId);
      const parent = requireShellMidsurface(stageId);
      const kind = shellMidsurfaceKind(parent);
      const planned = kind === LAFEA_SHELL_SURFACE_KINDS.SOURCE_MESH
        ? planLafea5SourceShellMeshAdoption({ parent, meshProfile: profile })
        : kind === LAFEA_SHELL_SURFACE_KINDS.PLANAR_MULTIPATCH
          ? planLafeaMultiPatchShellAnalysisMesh({ midsurfaceEvidence: parent, meshProfile: profile })
          : planLafeaShellAnalysisMesh({ midsurfaceEvidence: parent, meshProfile: profile });
      lastPlan.set(stageId, summarizeShell(planned));
      return freeze({
        configuration: shellConfiguration(profile, planned),
        planned,
        summary: lastPlan.get(stageId),
      });
    }
    const configuration = configurationFor(stageId, overrides);
    const planned = planLafeaAnalysisMesh(stage, configuration);
    lastPlan.set(stageId, summarize(planned));
    return freeze({ configuration, planned, summary: lastPlan.get(stageId) });
  }

  /** Generate, validate, and only then retain as the stage's analysis mesh. */
  function generateMesh(stage, overrides = {}) {
    const stageId = stage.stageId;
    if (shellMidsurfaces.get(stageId)) {
      requireNoShellOverrides(overrides);
      const profile = requireProfile(stageId);
      const parent = requireShellMidsurface(stageId);
      const kind = shellMidsurfaceKind(parent);
      const produced = kind === LAFEA_SHELL_SURFACE_KINDS.SOURCE_MESH
        ? produceLafea5SourceShellMeshAdoption({ parent, meshProfile: profile })
        : kind === LAFEA_SHELL_SURFACE_KINDS.PLANAR_MULTIPATCH
          ? produceLafeaMultiPatchShellAnalysisMesh({ midsurfaceEvidence: parent, meshProfile: profile })
          : produceLafeaShellAnalysisMesh({ midsurfaceEvidence: parent, meshProfile: profile });
      const validated = validateLafeaAnalysisMeshEvidenceV2(produced.evidence);
      evidence.set(stageId, validated);
      v3Candidates.set(stageId, null);
      lastPlan.set(stageId, summarizeShell(produced.plan));
      return freeze({ changed: true, evidence: validated, summary: lastPlan.get(stageId) });
    }
    const profile = requireProfile(stageId);
    const configuration = lafeaMeshGenerationConfiguration(profile, overrides);
    const produced = produceLafeaAnalysisMeshEvidenceWithV3Candidate(stage, configuration);
    const validated = validateLafeaAnalysisMeshEvidenceV2(produced.evidence);
    evidence.set(stageId, validated);
    v3Candidates.set(stageId, stageId === 'LAFEA.3' ? produced.candidateV3 : null);
    lastPlan.set(stageId, summarize(produced.planned));
    return freeze({
      changed: true,
      evidence: validated,
      summary: lastPlan.get(stageId),
    });
  }

  /**
   * Refine the exact retained v2 parent. Parent artifact/mesh hashes are taken
   * from custody here rather than trusted from UI input. Shell local refinement
   * is deliberately outside the first shell qualification and fails closed.
   */
  function refineMesh(stage, request = {}) {
    const stageId = stage.stageId;
    requireStage(stageId);
    if (shellMidsurfaces.get(stageId)) fail('LAFEA_SHELL_LOCAL_REFINEMENT_NOT_QUALIFIED');
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
    // Local refinement has not yet crossed the v3 qualification boundary.
    v3Candidates.set(stageId, null);
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
   * here; the governed v2 custody projection classifies the retained evidence
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
    // A portable v2 artifact lacks the full v3 producer/validation parent chain.
    v3Candidates.set(stageId, null);
    lastPlan.set(stageId, null);
    return freeze({ changed: true, evidence: validated, meshProfile: profile });
  }

  function selectEvidence(stageId) { requireStage(stageId); return evidence.get(stageId); }
  function selectMeshProfile(stageId) { requireStage(stageId); return profiles.get(stageId); }
  function selectPlan(stageId) { requireStage(stageId); return lastPlan.get(stageId); }
  function selectShellMidsurface(stageId) { requireStage(stageId); return shellMidsurfaces.get(stageId); }
  function exportEvidence(stageId) { return selectEvidence(stageId); }
  function exportShellMidsurface(stageId) { return selectShellMidsurface(stageId); }

  /** Any source/domain/geometry change invalidates descendants; shell parent is source-bound. */
  function invalidate(stageId) {
    requireStage(stageId);
    const changed = Boolean(
      evidence.get(stageId) || v3Candidates.get(stageId)
      || lastPlan.get(stageId) || shellMidsurfaces.get(stageId),
    );
    evidence.set(stageId, null);
    v3Candidates.set(stageId, null);
    lastPlan.set(stageId, null);
    if (shellMidsurfaces.get(stageId)) shellMidsurfaces.set(stageId, null);
    return changed;
  }

  function clear(stageId) {
    requireStage(stageId);
    profiles.set(stageId, null);
    evidence.set(stageId, null);
    v3Candidates.set(stageId, null);
    shellMidsurfaces.set(stageId, null);
    lastPlan.set(stageId, null);
  }

  return Object.freeze({
    fields, bindMeshProfile, registerShellMidsurface, planMesh, generateMesh, refineMesh,
    validateEvidence, recoverEvidence, exportEvidence, exportShellMidsurface,
    selectEvidence, selectMeshProfile, selectPlan, selectShellMidsurface, invalidate, clear,
  });

  function requireProfile(stageId) {
    const profile = profiles.get(stageId);
    if (!profile) fail('LAFEA_ANALYSIS_MESH_PROFILE_BINDING_REQUIRED');
    return profile;
  }
  function configurationFor(stageId, overrides) {
    return lafeaMeshGenerationConfiguration(requireProfile(stageId), overrides);
  }
  function requireShellMidsurface(stageId) {
    const retained = shellMidsurfaces.get(stageId);
    if (!retained) fail('LAFEA_SHELL_MIDSURFACE_EVIDENCE_REQUIRED');
    return retained;
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

function summarizeShell(plan) {
  return freeze({
    schema: 'lafea-analysis-mesh-plan-summary/v1',
    stageId: plan.stageId,
    generationMode: plan.generationMode ?? 'AUTOMATIC_MESH',
    elementFamily: plan.elementFamily,
    strategy: plan.strategy ?? 'PLANAR_SHELL_MIDSURFACE_TRIANGULATION',
    strategyReason: plan.scope,
    nodeCount: plan.nodeCount,
    elementCount: plan.elementCount,
    estimatedDofs: plan.estimatedDofs,
    boundarySegmentCount: null,
    characteristicLengthMin: plan.characteristicLengthMin,
    characteristicLengthMedian: plan.characteristicLengthMedian,
    characteristicLengthMax: plan.characteristicLengthMax,
    resourceDisposition: plan.resourceDisposition,
    intentHash: plan.midsurfaceEvidenceHash,
    planHash: plan.planHash,
    capabilityHash: plan.capabilityHash,
    qualificationHash: plan.qualificationHash,
    producerRef: plan.producerRef,
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

function shellConfiguration(profile, plan) {
  const requestedTarget = plan.generationMode === 'SOURCE_MESH_ADOPTION'
    ? null
    : plan.targetElementLength ?? plan.requestedTargetElementLength;
  return freeze({
    meshProfileHash: profile.semanticHash,
    targetElementLength: requestedTarget,
    effectiveTargetElementLength: plan.generationMode === 'SOURCE_MESH_ADOPTION'
      ? null
      : plan.effectiveTargetElementLength ?? requestedTarget,
    elementFamily: plan.elementFamily,
    lengthUnit: plan.lengthUnit,
  });
}
function requireNoShellOverrides(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('LAFEA_SHELL_MESH_GENERATION_OVERRIDES_INVALID');
  }
  if (Object.keys(value).length) fail('LAFEA_SHELL_MESH_PROFILE_OVERRIDE_NOT_SUPPORTED');
}
function currentSourceHash(stage) {
  const value = stage?.sourceAuthority?.sourceHash ?? stage?.lifecycle?.source?.sourceHash ?? null;
  if (!value || !/^sha256:[0-9a-f]{64}$/u.test(value)) fail('LAFEA_SHELL_MIDSURFACE_SOURCE_AUTHORITY_REQUIRED');
  return value;
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
