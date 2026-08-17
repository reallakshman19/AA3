/**
 * Orchestrator actions for the bound analysis-mesh producer.
 *
 * These sit between the store's publication boundary and the generation state
 * slice: they enforce the route precondition, publish once per action, and
 * turn a producer/refinement/recovery rejection into an orchestrator diagnostic
 * rather than an exception escaping into the view.
 */
import { createLafeaLifecycleEvent } from './lafea-lifecycle.js';
import {
  createLafea4RetainedMeshParentNormalCompanion,
  isLafea4ParentNormalCompanionSurfaceQualified,
  requireCurrentLafea4RetainedMeshParentNormalCompanion,
  validateLafea4RetainedMeshParentNormalCompanion,
} from './lafea4-shell-retained-mesh-parent-normal-companion.js';

export function createLafeaMeshGenerationActions(context) {
  const {
    meshGeneration, mesh, continuumPreflight, rawStage, readStageState, deriveStage, publish,
    invokeRetained, getRetainedState, clearOrchestratorDiagnostic, failOrchestrator,
    clearDomainFirstExecution, storeError,
  } = context;

  /**
   * Bind the governed mesh profile and record the binding on the lifecycle,
   * which is what invalidates any analysis mesh held under the old profile.
   */
  function bindAnalysisMeshProfile(value, stageId = getRetainedState().activeStageId) {
    const result = meshGeneration.bindMeshProfile(value, stageId);
    if (!result.changed) return freeze({ ...result, stage: deriveStage(stageId) });

    // Profile custody changed immediately. Current preflight/execution is stale
    // even if the subsequent lifecycle event itself fails closed.
    continuumPreflight.clear(stageId);
    clearDomainFirstExecution(stageId);

    const event = createLafeaLifecycleEvent({
      eventId: `MESH_PROFILE_BIND/${result.meshProfile.semanticHash}`,
      stageId,
      changeClass: 'ANALYSIS_MESH_PROFILE',
      previousSourceHash: null,
      currentSourceHash: null,
      profileHash: result.meshProfile.semanticHash,
      originRef: 'LAFEA_WORKBENCH/MESH_PROFILE_BIND',
    });
    invokeRetained('applyLifecycleEvent', [event]);
    const succeeded = getRetainedState().status !== 'FAILED';
    mesh.afterLifecycleEvent(event, succeeded);
    if (succeeded) clearOrchestratorDiagnostic();
    return freeze({ ...result, stage: publish().stages[stageId] });
  }

  /**
   * Bind the separately declared shell midsurface parent. This is intentionally
   * not routed through the LAFEA.3 domain-first geometry state.
   */
  function registerShellMidsurfaceEvidence(
    value,
    stageId = value?.stageId ?? getRetainedState().activeStageId,
  ) {
    try {
      const result = meshGeneration.registerShellMidsurface(value, readStageState(stageId));
      clearOrchestratorDiagnostic();
      return freeze({ ...result, stage: (result.changed ? publish() : deriveState()).stages[stageId] });
    } catch (error) {
      failOrchestrator(error, 'LAFEA_SHELL_MIDSURFACE_REGISTRATION_REJECTED');
      publish();
      return null;
    }
  }

  /** Preview only: runs the producer and reports the result, custody untouched. */
  function planAnalysisMesh(overrides = {}, stageId = getRetainedState().activeStageId) {
    return attempt(stageId, 'LAFEA_ANALYSIS_MESH_PLAN_REJECTED',
      () => meshGeneration.planMesh(readStageState(stageId), overrides), false);
  }

  function generateAnalysisMesh(overrides = {}, stageId = getRetainedState().activeStageId) {
    return attempt(stageId, 'LAFEA_ANALYSIS_MESH_GENERATION_REJECTED', () => {
      const result = meshGeneration.generateMesh(readStageState(stageId), overrides);
      const parentNormalCompanion = parentNormalCompanionForEvidence(stageId, result.evidence);
      return parentNormalCompanion
        ? freeze({ ...result, parentNormalCompanion })
        : result;
    }, true);
  }

  /**
   * Refine the exact retained v2 parent. The generation-state slice takes the
   * parent artifact/mesh hashes from custody itself, so the caller supplies
   * only target IDs and sizing intent and cannot retarget stale evidence.
   */
  function refineAnalysisMesh(request = {}, stageId = getRetainedState().activeStageId) {
    return attempt(stageId, 'LAFEA_RETAINED_MESH_REFINEMENT_REJECTED',
      () => meshGeneration.refineMesh(readStageState(stageId), request), true);
  }

  /**
   * Recover portable governed-v2 evidence through the same trust boundary as
   * generation. Rebind only when the embedded semantic profile differs from
   * the currently retained profile; identical recovery must not manufacture a
   * lifecycle change before conflict detection.
   *
   * For TECH-11-qualified LAFEA.4 surfaces, the parent-normal companion is
   * built before custody mutation. A stale/missing midsurface or incompatible
   * companion therefore cannot be hidden by retaining the mesh first.
   */
  function recoverAnalysisMeshEvidenceV2(
    value,
    stageId = value?.stageId ?? getRetainedState().activeStageId,
  ) {
    requireGenerationAuthorized(stageId);
    try {
      const validated = meshGeneration.validateEvidence(value);
      if (validated.stageId !== stageId) {
        throw storeError('LAFEA_ANALYSIS_MESH_V2_RECOVERY_STAGE_MISMATCH');
      }
      const prevalidatedCompanion = parentNormalCompanionForEvidence(stageId, validated);
      const currentProfile = meshGeneration.selectMeshProfile(stageId);
      const binding = currentProfile?.semanticHash === validated.meshProfileHash
        ? freeze({ changed: false, meshProfile: currentProfile })
        : bindAnalysisMeshProfile(validated.meshProfile, stageId);
      if (getRetainedState().status === 'FAILED') return null;
      const result = meshGeneration.recoverEvidence(validated, stageId);
      const retainedCompanion = parentNormalCompanionForEvidence(stageId, result.evidence);
      if (prevalidatedCompanion && retainedCompanion
        && prevalidatedCompanion.semanticHash !== retainedCompanion.semanticHash) {
        throw storeError('LAFEA4_PARENT_NORMAL_COMPANION_RECOVERY_REPLAY_MISMATCH');
      }
      continuumPreflight.clear(stageId);
      clearDomainFirstExecution(stageId);
      clearOrchestratorDiagnostic();
      return freeze({
        ...result,
        parentNormalCompanion: retainedCompanion,
        profileChanged: binding.changed,
        stage: publish().stages[stageId],
      });
    } catch (error) {
      failOrchestrator(error, 'LAFEA_ANALYSIS_MESH_V2_RECOVERY_REJECTED');
      publish();
      return null;
    }
  }

  /**
   * Select/export the companion from the *currently retained* mesh and
   * midsurface. No independently mutable companion cache exists, so stale
   * copies cannot silently survive a mesh/profile/source change.
   */
  function selectRetainedAnalysisMeshParentNormalCompanion(
    stageId = getRetainedState().activeStageId,
  ) {
    const retained = meshGeneration.selectEvidence(stageId);
    if (!retained) return null;
    return parentNormalCompanionForEvidence(stageId, retained);
  }

  function exportRetainedAnalysisMeshParentNormalCompanion(
    stageId = getRetainedState().activeStageId,
  ) {
    return selectRetainedAnalysisMeshParentNormalCompanion(stageId);
  }

  function validateRetainedAnalysisMeshParentNormalCompanion(
    value,
    stageId = value?.stageId ?? getRetainedState().activeStageId,
  ) {
    const candidate = validateLafea4RetainedMeshParentNormalCompanion(value);
    const retained = meshGeneration.selectEvidence(stageId);
    const midsurface = meshGeneration.selectShellMidsurface(stageId);
    if (!retained || !midsurface) {
      throw storeError('LAFEA4_PARENT_NORMAL_COMPANION_CURRENT_PARENTS_REQUIRED');
    }
    return requireCurrentLafea4RetainedMeshParentNormalCompanion(candidate, {
      meshEvidence: retained,
      midsurfaceEvidence: midsurface,
    });
  }

  function parentNormalCompanionForEvidence(stageId, meshEvidence) {
    if (stageId !== 'LAFEA.4') return null;
    const midsurface = meshGeneration.selectShellMidsurface(stageId);
    if (!midsurface) {
      throw storeError('LAFEA4_PARENT_NORMAL_COMPANION_MIDSURFACE_REQUIRED');
    }
    if (!isLafea4ParentNormalCompanionSurfaceQualified(midsurface)) return null;
    return createLafea4RetainedMeshParentNormalCompanion({
      meshEvidence,
      midsurfaceEvidence: midsurface,
    });
  }

  function attempt(stageId, fallbackCode, action, invalidatesExecution) {
    requireGenerationAuthorized(stageId);
    try {
      const result = action();
      if (invalidatesExecution) {
        continuumPreflight.clear(stageId);
        clearDomainFirstExecution(stageId);
      }
      clearOrchestratorDiagnostic();
      return freeze({ ...result, stage: publish().stages[stageId] });
    } catch (error) {
      failOrchestrator(error, fallbackCode);
      publish();
      return null;
    }
  }

  /**
   * Generation/refinement/recovery needs a governed mesh-independent geometry
   * parent: domain-first continuum geometry for LAFEA.3, or a declared shell
   * midsurface for LAFEA.4/.5.
   */
  function requireGenerationAuthorized(stageId) {
    const stage = rawStage(stageId);
    if (stage.domainFirstProfileActive || stage.shellMidsurfaceProfileActive) return;
    throw storeError(stageId === 'LAFEA.4' || stageId === 'LAFEA.5'
      ? 'LAFEA_ANALYSIS_MESH_GENERATION_REQUIRES_SHELL_MIDSURFACE_EVIDENCE'
      : 'LAFEA_ANALYSIS_MESH_GENERATION_REQUIRES_DOMAIN_FIRST_PROFILE');
  }

  function deriveState() {
    return Object.freeze({
      stages: Object.fromEntries(
        Object.keys(getRetainedState().stages).map((stageId) => [stageId, deriveStage(stageId)]),
      ),
    });
  }

  return Object.freeze({
    bindAnalysisMeshProfile,
    registerShellMidsurfaceEvidence,
    planAnalysisMesh,
    generateAnalysisMesh,
    refineAnalysisMesh,
    recoverAnalysisMeshEvidenceV2,
    selectRetainedAnalysisMeshParentNormalCompanion,
    exportRetainedAnalysisMeshParentNormalCompanion,
    validateRetainedAnalysisMeshParentNormalCompanion,
  });
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
