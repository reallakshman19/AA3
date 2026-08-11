/** Registration/export actions extracted from the canonical orchestrator store. */

export function createLafeaWorkbenchEvidenceActions(context) {
  const c = requireContext(context);

  function activeStageId() { return c.getRetainedState().activeStageId; }

  function registerTemplateReleaseRecord(value, stageId = activeStageId()) {
    const result = c.release.register(value, c.readStageState(stageId));
    const state = result.changed ? c.publish() : c.deriveState();
    return freeze({
      ...result,
      projection: state.stages[stageId].lifecycleReadiness.releaseBinding,
    });
  }

  function registerNumericalVerificationEvidence(value, stageId = activeStageId()) {
    const result = c.verification.register(value, c.readStageState(stageId));
    const state = result.changed ? c.publish() : c.deriveState();
    return freeze({
      ...result,
      projection: state.stages[stageId].numericalVerificationProjection,
    });
  }

  function registerT6GeometryQualification(value, stageId = activeStageId()) {
    const result = c.t6Geometry.register(value, c.readStageState(stageId));
    const state = result.changed ? c.publish() : c.deriveState();
    return freeze({
      ...result,
      projection: state.stages[stageId].t6GeometryQualificationProjection,
    });
  }

  function registerPreparationEvidence(value) {
    const stageId = value?.request?.stageId ?? activeStageId();
    if (c.rawStage(stageId).domainFirstProfileActive) {
      throw c.storeError('LAFEA_DOMAIN_FIRST_PREPARATION_REQUIRES_V2_EVIDENCE');
    }
    const result = c.preparation.registerEvidence(value);
    const resultStageId = result.evidence.request.stageId;
    const state = result.changed ? c.publish() : c.deriveState();
    return freeze({
      ...result,
      projection: state.stages[resultStageId].preparationProjection,
    });
  }

  function registerPreparationApproval(value) {
    const stageId = value?.stageId ?? activeStageId();
    if (c.rawStage(stageId).domainFirstProfileActive) {
      throw c.storeError('LAFEA_DOMAIN_FIRST_PREPARATION_APPROVAL_NOT_QUALIFIED');
    }
    const result = c.preparation.registerApproval(value);
    const resultStageId = result.approval.stageId;
    const state = result.changed ? c.publish() : c.deriveState();
    return freeze({
      ...result,
      projection: state.stages[resultStageId].preparationProjection,
    });
  }

  function activateDomainFirstProfile(stageId = activeStageId()) {
    const result = c.geometry.activate(c.rawStage(stageId));
    if (result.changed) c.clearOrchestratorDiagnostic();
    return freeze({ ...result, stage: c.publish().stages[stageId] });
  }

  function registerAnalysisDomain(value) {
    const stageId = value?.stageId ?? activeStageId();
    const result = c.geometry.registerDomain(value, c.readStageState(stageId));
    if (result.changed) c.meshGeneration.invalidate(stageId);
    const state = result.changed ? c.publish() : c.deriveState();
    return freeze({
      ...result,
      projection: state.stages[stageId].analysisDomainProjection,
    });
  }

  function registerAnalysisGeometryEvidence(value) {
    const stageId = value?.stageId ?? activeStageId();
    const result = c.geometry.registerGeometryEvidence(
      value,
      c.readStageState(stageId),
    );
    if (result.changed) c.meshGeneration.invalidate(stageId);
    const state = result.changed ? c.publish() : c.deriveState();
    return freeze({
      ...result,
      projection: state.stages[stageId].analysisGeometryProjection,
    });
  }

  function registerAnalysisMeshEvidence(value) {
    const stageId = value?.stageId ?? activeStageId();
    const stage = c.rawStage(stageId);
    if (stage.domainFirstProfileActive || stage.shellMidsurfaceProfileActive) {
      throw c.storeError('LAFEA_GOVERNED_V2_ANALYSIS_MESH_REQUIRES_V2_CUSTODY');
    }
    return c.mesh.registerAnalysisMeshEvidence(value);
  }

  function exportLifecycle() {
    const stage = c.deriveStage(activeStageId());
    return freeze({
      ...c.retained.exportLifecycle(),
      schema: 'lafea-workbench-lifecycle-export/v2',
      sourceAuthority: stage.sourceAuthority,
      lastSourceAuthorityEvent: stage.lastSourceAuthorityEvent,
      templateReleaseRecord: stage.retainedTemplateReleaseRecord,
      releaseBinding: stage.lifecycleReadiness.releaseBinding,
      numericalVerificationEvidence: stage.retainedNumericalVerificationEvidence,
      numericalVerification: stage.numericalVerificationProjection,
      t6GeometryQualification: stage.retainedT6GeometryQualification,
      t6GeometryQualificationProjection: stage.t6GeometryQualificationProjection,
      readiness: stage.lifecycleReadiness,
      preparation: stage.preparationProjection,
      domainFirstLifecycle: stage.domainFirstLifecycle,
      analysisDomain: stage.analysisDomainProjection,
      analysisGeometry: stage.analysisGeometryProjection,
      shellMidsurface: stage.retainedShellMidsurfaceEvidence,
      orchestration: stage.orchestration,
    });
  }

  return Object.freeze({
    registerTemplateReleaseRecord,
    registerNumericalVerificationEvidence,
    registerT6GeometryQualification,
    registerPreparationEvidence,
    registerPreparationApproval,
    activateDomainFirstProfile,
    registerAnalysisDomain,
    registerAnalysisGeometryEvidence,
    registerAnalysisMeshEvidence,
    exportLifecycle,
  });
}

function requireContext(value) {
  if (!value || typeof value !== 'object') {
    throw new TypeError('LAFEA_WORKBENCH_EVIDENCE_ACTION_CONTEXT_INVALID');
  }
  return value;
}
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
