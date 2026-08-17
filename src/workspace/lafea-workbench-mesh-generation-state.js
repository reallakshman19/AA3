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
  LAFEA4_SHELL_REFINEMENT_COMMAND_SCHEMA,
  createLafea4ShellRefinementCommand,
} from './lafea4-shell-refinement-authority.js';
import {
  lafeaMeshGenerationConfiguration,
  planLafeaAnalysisMesh,
  produceLafeaAnalysisMeshEvidence,
} from './lafea-mesh-producer-binding.js';
import { produceLafeaRetainedMeshRefinement } from './lafea-retained-mesh-refinement.js';
import { produceLafea4ShellRetainedMeshRefinement } from './lafea-shell-retained-mesh-refinement.js';
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
  const shellMidsurfaces = new Map(stageIds.map((stageId) => [stageId, null]));
  const lastPlan = new Map(stageIds.map((stageId) => [stageId, null]));

  function fields(stageId) {
    requireStage(stageId);
    const shellMidsurface = shellMidsurfaces.get(stageId);
    return freeze({
      retainedAnalysisMeshProfile: profiles.get(stageId),
      retainedAnalysisMeshEvidenceV2: evidence.get(stageId),
      shellMidsurfaceProfileActive: Boolean(shellMidsurface),
      retainedShellMidsurfaceEvidence: shellMidsurface,
      lastAnalysisMeshPlan: lastPlan.get(stageId),
    });
  }

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
    lastPlan.set(stageId, null);
    return freeze({ changed: true, evidence: retained });
  }

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
      lastPlan.set(stageId, summarizeShell(produced.plan));
      return freeze({ changed: true, evidence: validated, summary: lastPlan.get(stageId) });
    }
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
   * from custody here rather than trusted from UI input. LAFEA.4 shell parents
   * route through the separate UV-space refinement authority; LAFEA.5 shell
   * refinement remains fail-closed.
   */
  function refineMesh(stage, request = {}) {
    const stageId = stage.stageId;
    requireStage(stageId);
    const shellParent = shellMidsurfaces.get(stageId);
    if (shellParent && stageId !== 'LAFEA.4') {
      fail('LAFEA_SHELL_LOCAL_REFINEMENT_NOT_QUALIFIED');
    }
    const profile = profiles.get(stageId);
    if (!profile) fail('LAFEA_ANALYSIS_MESH_PROFILE_BINDING_REQUIRED');
    const parentEvidence = evidence.get(stageId);
    if (!parentEvidence) fail('LAFEA_RETAINED_MESH_REFINEMENT_PARENT_REQUIRED');

    const command = shellParent
      ? createLafea4ShellRefinementCommand({
        schema: LAFEA4_SHELL_REFINEMENT_COMMAND_SCHEMA,
        commandId: request.commandId ?? `LAFEA-${stageId}-SHELL-RETAINED-REFINEMENT`,
        stageId,
        parentMeshArtifactHash: parentEvidence.artifactHash,
        parentMeshHash: parentEvidence.meshHash,
        kind: request.kind ?? 'TARGET_LENGTH',
        targetType: request.targetType,
        targetIds: request.targetIds,
        targetElementLength: request.targetElementLength,
        lengthUnit: request.lengthUnit,
        reason: request.reason ?? 'User-governed retained shell analysis-mesh refinement',
      })
      : createLafeaRetainedMeshRefinementCommand({
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

    const produced = shellParent
      ? produceLafea4ShellRetainedMeshRefinement({
        stage,
        midsurfaceEvidence: shellParent,
        meshProfile: profile,
        parentEvidence,
        command,
      })
      : produceLafeaRetainedMeshRefinement({
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
  function selectShellMidsurface(stageId) { requireStage(stageId); return shellMidsurfaces.get(stageId); }
  function exportEvidence(stageId) { return selectEvidence(stageId); }
  function exportShellMidsurface(stageId) { return selectShellMidsurface(stageId); }

  function invalidate(stageId) {
    requireStage(stageId);
    const changed = Boolean(
      evidence.get(stageId) || lastPlan.get(stageId) || shellMidsurfaces.get(stageId),
    );
    evidence.set(stageId, null);
    lastPlan.set(stageId, null);
    if (shellMidsurfaces.get(stageId)) shellMidsurfaces.set(stageId, null);
    return changed;
  }

  function clear(stageId) {
    requireStage(stageId);
    profiles.set(stageId, null);
    evidence.set(stageId, null);
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
    strategy: produced.plan.stageId === 'LAFEA.4'
      ? 'SHELL_UV_RETAINED_LOCAL_REFINEMENT'
      : 'RETAINED_LOCAL_REFINEMENT',
    strategyReason: produced.plan.scope
      ?? 'TARGETED_STEINER_INSERTION_WITH_CONSTRAINED_LAWSON_RESTORATION',
    nodeCount: produced.evidence.mesh.nodes.length,
    elementCount: produced.evidence.mesh.elements.length,
    estimatedDofs: produced.estimatedDofs,
    boundarySegmentCount: produced.childBoundaryEdgeCount ?? null,
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
