/**
 * Orchestrator actions for the bound analysis-mesh producer.
 *
 * These sit between the store's publication boundary and the generation state
 * slice: they enforce the route precondition, publish once per action, and
 * turn a producer/refinement/recovery rejection into an orchestrator diagnostic
 * rather than an exception escaping into the view.
 */

export function createLafeaMeshGenerationActions(context) {
  const {
    meshGeneration, mesh, rawStage, readStageState, deriveStage, publish,
    invokeRetained, getRetainedState, clearOrchestratorDiagnostic, failOrchestrator,
    storeError,
  } = context;

  /**
   * Bind the governed mesh profile and record the binding on the lifecycle,
   * which is what invalidates any analysis mesh held under the old profile.
   */
  function bindAnalysisMeshProfile(value, stageId = getRetainedState().activeStageId) {
    const result = meshGeneration.bindMeshProfile(value, stageId);
    if (!result.changed) return freeze({ ...result, stage: deriveStage(stageId) });
    const event = {
      changeClass: 'ANALYSIS_MESH_PROFILE',
      profileHash: result.meshProfile.semanticHash,
    };
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
      () => meshGeneration.planMesh(readStageState(stageId), overrides));
  }

  function generateAnalysisMesh(overrides = {}, stageId = getRetainedState().activeStageId) {
    return attempt(stageId, 'LAFEA_ANALYSIS_MESH_GENERATION_REJECTED',
      () => meshGeneration.generateMesh(readStageState(stageId), overrides));
  }

  /**
   * Refine the exact retained v2 parent. The generation-state slice takes the
   * parent artifact/mesh hashes from custody itself, so the caller supplies
   * only target IDs and sizing intent and cannot retarget stale evidence.
   */
  function refineAnalysisMesh(request = {}, stageId = getRetainedState().activeStageId) {
    return attempt(stageId, 'LAFEA_RETAINED_MESH_REFINEMENT_REJECTED',
      () => meshGeneration.refineMesh(readStageState(stageId), request));
  }

  /**
   * Recover portable governed-v2 evidence through the same trust boundary as
   * generation. The embedded profile is reconstructed first and explicitly
   * rebound so imported evidence never depends on an unrelated prior profile.
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
      const binding = bindAnalysisMeshProfile(validated.meshProfile, stageId);
      if (getRetainedState().status === 'FAILED') return null;
      const result = meshGeneration.recoverEvidence(validated, stageId);
      clearOrchestratorDiagnostic();
      return freeze({
        ...result,
        profileChanged: binding.changed,
        stage: publish().stages[stageId],
      });
    } catch (error) {
      failOrchestrator(error, 'LAFEA_ANALYSIS_MESH_V2_RECOVERY_REJECTED');
      publish();
      return null;
    }
  }

  function attempt(stageId, fallbackCode, action) {
    requireGenerationAuthorized(stageId);
    try {
      const result = action();
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
  });
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
