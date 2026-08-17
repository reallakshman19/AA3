import { lafeaLifecycleReadiness } from './lafea-lifecycle.js';
import {
  governLafeaWorkbenchReleaseBindingForResultCurrentness,
  projectLafeaWorkbenchReleaseBinding,
} from './lafea-workbench-release-binding.js';

const DOMAIN_FIRST_ROUTE = 'DOMAIN_FIRST_COMPILED_SOLVER_MODEL';
const SHELL_COMPILED_ROUTE = 'SHELL_RETAINED_MESH_COMPILED_SOLVER_MODEL';
const SHELL_SOLVER_BINDING_REQUIRED = 'SHELL_RETAINED_MESH_NOT_BOUND_TO_SOLVER_MODEL';

export function projectLafeaWorkbenchReadiness(stageId, stage) {
  const lifecycle = stage.lifecycle;
  const binding = stage.lifecycleBinding;
  const domainFirst = stage.domainFirstProfileActive === true;
  const shellMidsurface = stage.shellMidsurfaceProfileActive === true;
  const governedMesh = domainFirst || shellMidsurface;
  const domainCurrent = domainFirst && stage.analysisDomainProjection?.state === 'CURRENT_PASS';
  const geometryCurrent = domainFirst && stage.analysisGeometryProjection?.state === 'CURRENT_PASS';
  const custody = stage.analysisMeshCustodyProjection;
  const shellSolverProjection = stage.shellSolverModelProjection;
  const domainMeshCurrent = domainFirst
    && custody?.state === 'CURRENT_PASS' && custody?.usableForRun === true;
  const shellMeshCurrent = shellMidsurface && custody?.state === 'CURRENT_PASS';
  const rawReleaseBinding = projectLafeaWorkbenchReleaseBinding(
    stage,
    stage.retainedTemplateReleaseRecord,
  );
  if (!lifecycle) {
    const releaseBinding = governLafeaWorkbenchReleaseBindingForResultCurrentness(
      rawReleaseBinding, { governedMesh, resultReady: false },
    );
    const releaseState = releaseBinding.releaseQualified
      ? 'RELEASE_QUALIFIED'
      : 'RELEASE_NOT_QUALIFIED';
    return freeze({
      schema: 'lafea-workbench-lifecycle-readiness/v2',
      stageId,
      lifecycleInitialized: false,
      bindingStatus: binding.status,
      calculationState: stage.execution ? 'CALCULATION_NOT_ACCEPTED_BY_STAGE_CONTRACT' : 'CALCULATION_NOT_RUN',
      resultState: 'RESULT_NOT_READY',
      codeState: 'CODE_NOT_READY',
      releaseState,
      releaseBinding,
      releaseBlockingReasons: [...releaseBinding.reasons],
      sourceCurrent: false,
      modelCurrent: false,
      preMeshModelCurrent: false,
      domainFirstProfileActive: domainFirst,
      shellMidsurfaceProfileActive: shellMidsurface,
      domainCurrent: false,
      geometryCurrent: false,
      solverModelCurrent: false,
      meshApplicable: governedMesh,
      meshGenerated: Boolean(custody?.meshHash),
      meshQualified: false,
      resultReady: false,
      assessmentApplicable: false,
      assessmentReady: false,
      convergenceApplicable: false,
      convergenceReady: false,
      codeAssessmentApplicable: false,
      codeReady: false,
      reportCurrent: false,
      reportQualified: false,
      blockingReasons: ['LIFECYCLE_NOT_INITIALIZED'],
    });
  }

  const base = lafeaLifecycleReadiness(lifecycle);
  const current = binding.status === 'CURRENT';
  // For shell stages, a current normalized source document is the pre-mesh
  // model authority. Lifecycle CANONICAL_MODEL is an execution artifact and is
  // intentionally published only after solve; requiring it here would create
  // a first-run circular dependency (authorize -> solve -> publish model).
  const shellPreMeshModelCurrent = shellMidsurface
    && current
    && base.sourceCurrent
    && Boolean(stage.document);
  const shellSolverCurrent = shellMidsurface
    && shellPreMeshModelCurrent
    && shellSolverProjection?.state === 'CURRENT_PASS'
    && shellSolverProjection?.usableForRun === true
    && shellSolverProjection?.meshHash === custody?.meshHash
    && shellSolverProjection?.solverModelHash === custody?.solverModelHash
    && shellSolverProjection?.solverModelBindingHash === custody?.solverModelBindingHash;
  const solverModelCurrent = domainFirst
    ? current && domainCurrent && geometryCurrent && domainMeshCurrent
    : shellMidsurface
      ? shellSolverCurrent
      : current && base.modelCurrent;
  const domainExecutionReasons = domainFirst
    ? authoritativeDomainExecutionReasons(stage, lifecycle, custody, current)
    : [];
  const shellExecutionReasons = shellMidsurface
    ? authoritativeShellExecutionReasons(stage, lifecycle, custody, shellSolverProjection, current)
    : [];
  const authoritativeDomainResultCurrent = domainFirst
    && base.resultReady && domainExecutionReasons.length === 0;
  const authoritativeShellResultCurrent = shellMidsurface
    && base.resultReady && shellExecutionReasons.length === 0;
  const isDomainRoute = stage?.execution?.route === DOMAIN_FIRST_ROUTE;
  const isShellRoute = stage?.execution?.route === SHELL_COMPILED_ROUTE;
  const resultReady = domainFirst
    ? Boolean(stage.execution) && isDomainRoute && authoritativeDomainResultCurrent
    : shellMidsurface
      ? Boolean(stage.execution) && isShellRoute && authoritativeShellResultCurrent
      : current && base.resultReady;
  const calculationState = stage.execution?.status === 'QUALIFIED'
    && (!domainFirst || isDomainRoute)
    && (!shellMidsurface || isShellRoute)
    && (!domainFirst || domainExecutionReasons.length === 0)
    && (!shellMidsurface || shellExecutionReasons.length === 0)
    ? 'CALCULATION_ACCEPTED_BY_STAGE_CONTRACT'
    : stage.execution
      ? 'CALCULATION_NOT_ACCEPTED_BY_STAGE_CONTRACT'
      : 'CALCULATION_NOT_RUN';
  const releaseBinding = governLafeaWorkbenchReleaseBindingForResultCurrentness(
    rawReleaseBinding,
    { governedMesh, resultReady },
  );
  const releaseState = releaseBinding.releaseQualified
    ? 'RELEASE_QUALIFIED'
    : 'RELEASE_NOT_QUALIFIED';
  const codeReady = !governedMesh && current && base.codeReady;
  const blockingReasons = current
    ? unique([...base.blockingReasons, ...domainExecutionReasons, ...shellExecutionReasons])
    : unique([
      `LIFECYCLE_SOURCE_BINDING_${binding.status}`,
      ...base.blockingReasons,
      ...domainExecutionReasons,
      ...shellExecutionReasons,
    ]);

  return freeze({
    ...base,
    schema: 'lafea-workbench-lifecycle-readiness/v2',
    lifecycleInitialized: true,
    bindingStatus: binding.status,
    calculationState,
    resultState: resultReady ? 'RESULT_READY' : 'RESULT_NOT_READY',
    codeState: codeReady ? 'CODE_READY' : 'CODE_NOT_READY',
    releaseState,
    releaseBinding,
    releaseBlockingReasons: [...releaseBinding.reasons],
    sourceCurrent: current && base.sourceCurrent,
    modelCurrent: current && base.modelCurrent,
    preMeshModelCurrent: domainFirst
      ? current && domainCurrent
      : shellMidsurface
        ? shellPreMeshModelCurrent
        : current && base.modelCurrent,
    domainFirstProfileActive: domainFirst,
    shellMidsurfaceProfileActive: shellMidsurface,
    domainCurrent: current && domainCurrent,
    geometryCurrent: current && geometryCurrent,
    solverModelCurrent,
    meshApplicable: governedMesh || base.meshApplicable,
    meshGenerated: governedMesh ? Boolean(custody?.meshHash) : base.meshGenerated,
    meshQualified: governedMesh
      ? current && (domainFirst ? domainMeshCurrent : shellMeshCurrent)
      : current && base.meshQualified,
    resultReady,
    assessmentReady: !governedMesh && current && base.assessmentReady,
    convergenceReady: !governedMesh && current && base.convergenceReady,
    codeReady,
    reportCurrent: !governedMesh && current && base.reportCurrent,
    reportQualified: !governedMesh && current && base.reportQualified,
    blockingReasons,
  });
}

function authoritativeShellExecutionReasons(stage, lifecycle, custody, solverProjection, currentBinding) {
  const reasons = [];
  const execution = stage.execution;
  const sourceHash = stage.sourceAuthority?.sourceHash ?? lifecycle.source?.sourceHash ?? null;
  const artifacts = lifecycle.artifacts ?? {};

  if (!currentBinding) reasons.push('SHELL_EXECUTION_SOURCE_BINDING_NOT_CURRENT');
  if (custody?.state !== 'CURRENT_PASS') reasons.push('SHELL_EXECUTION_MESH_NOT_CURRENT_PASS');
  if (solverProjection?.state !== 'CURRENT_PASS' || solverProjection?.usableForRun !== true) {
    reasons.push(...(solverProjection?.reasons?.length
      ? solverProjection.reasons
      : [SHELL_SOLVER_BINDING_REQUIRED]));
  }
  if (custody?.usableForRun !== true) {
    reasons.push(...(custody?.runBlockingReasons?.length
      ? custody.runBlockingReasons
      : [SHELL_SOLVER_BINDING_REQUIRED]));
  }
  if (!execution || execution.status !== 'QUALIFIED'
    || execution.route !== SHELL_COMPILED_ROUTE) {
    reasons.push('SHELL_EXECUTION_NOT_QUALIFIED');
    return unique(reasons);
  }
  if (execution.sourceHash !== sourceHash) reasons.push('SHELL_EXECUTION_SOURCE_STALE');
  if (execution.analysisDomainHash !== custody?.analysisDomainHash) {
    reasons.push('SHELL_EXECUTION_DOMAIN_STALE');
  }
  if (execution.analysisGeometryHash !== custody?.analysisGeometryHash) {
    reasons.push('SHELL_EXECUTION_GEOMETRY_STALE');
  }
  if (execution.meshHash !== custody?.meshHash) reasons.push('SHELL_EXECUTION_MESH_STALE');
  if (execution.solverModelHash !== solverProjection?.solverModelHash
    || execution.solverModelHash !== custody?.solverModelHash) {
    reasons.push('SHELL_EXECUTION_SOLVER_MODEL_STALE');
  }
  if (execution.solverModelBindingHash !== solverProjection?.solverModelBindingHash
    || execution.solverModelBindingHash !== custody?.solverModelBindingHash) {
    reasons.push('SHELL_EXECUTION_SOLVER_MODEL_BINDING_STALE');
  }
  if (artifacts.ANALYSIS_GEOMETRY?.artifactHash !== execution.analysisGeometryHash
    || artifacts.ANALYSIS_GEOMETRY?.status !== 'CURRENT'
    || artifacts.ANALYSIS_GEOMETRY?.qualification !== 'PASS') {
    reasons.push('SHELL_LIFECYCLE_GEOMETRY_STALE');
  }
  if (artifacts.ANALYSIS_MESH?.artifactHash !== execution.meshHash
    || artifacts.ANALYSIS_MESH?.status !== 'CURRENT'
    || artifacts.ANALYSIS_MESH?.qualification !== 'PASS') {
    reasons.push('SHELL_LIFECYCLE_MESH_STALE');
  }
  if (artifacts.EXECUTION?.artifactHash !== execution.compiledExecutionHash
    || artifacts.EXECUTION?.status !== 'CURRENT'
    || artifacts.EXECUTION?.qualification !== 'PASS') {
    reasons.push('SHELL_LIFECYCLE_EXECUTION_STALE');
  }
  if (artifacts.RECOVERY?.status !== 'CURRENT'
    || artifacts.RECOVERY?.qualification !== 'PASS') {
    reasons.push('SHELL_LIFECYCLE_RECOVERY_NOT_CURRENT');
  }
  return unique(reasons);
}

function authoritativeDomainExecutionReasons(stage, lifecycle, custody, currentBinding) {
  const reasons = [];
  const execution = stage.execution;
  const geometryHash = stage.analysisGeometryProjection?.analysisGeometryHash ?? null;
  const domainHash = stage.analysisDomainProjection?.analysisDomainHash ?? null;
  const meshHash = custody?.meshHash ?? null;
  const sourceHash = stage.sourceAuthority?.sourceHash ?? lifecycle.source?.sourceHash ?? null;
  const artifacts = lifecycle.artifacts ?? {};

  if (!currentBinding) reasons.push('DOMAIN_FIRST_EXECUTION_SOURCE_BINDING_NOT_CURRENT');
  if (stage.analysisDomainProjection?.state !== 'CURRENT_PASS') {
    reasons.push('DOMAIN_FIRST_EXECUTION_DOMAIN_NOT_CURRENT');
  }
  if (stage.analysisGeometryProjection?.state !== 'CURRENT_PASS') {
    reasons.push('DOMAIN_FIRST_EXECUTION_GEOMETRY_NOT_CURRENT');
  }
  if (custody?.state !== 'CURRENT_PASS' || custody?.usableForRun !== true) {
    reasons.push('DOMAIN_FIRST_EXECUTION_MESH_NOT_CURRENT_PASS');
  }
  if (!execution || execution.status !== 'QUALIFIED'
    || execution.route !== DOMAIN_FIRST_ROUTE) {
    reasons.push('DOMAIN_FIRST_EXECUTION_NOT_QUALIFIED');
    return unique(reasons);
  }
  if (execution.sourceHash !== sourceHash) reasons.push('DOMAIN_FIRST_EXECUTION_SOURCE_STALE');
  if (execution.analysisDomainHash !== domainHash) reasons.push('DOMAIN_FIRST_EXECUTION_DOMAIN_STALE');
  if (execution.analysisGeometryHash !== geometryHash) reasons.push('DOMAIN_FIRST_EXECUTION_GEOMETRY_STALE');
  if (execution.meshHash !== meshHash) reasons.push('DOMAIN_FIRST_EXECUTION_MESH_STALE');
  if (artifacts.ANALYSIS_GEOMETRY?.artifactHash !== geometryHash
    || artifacts.ANALYSIS_GEOMETRY?.status !== 'CURRENT'
    || artifacts.ANALYSIS_GEOMETRY?.qualification !== 'PASS') {
    reasons.push('DOMAIN_FIRST_LIFECYCLE_GEOMETRY_STALE');
  }
  if (artifacts.ANALYSIS_MESH?.artifactHash !== meshHash
    || artifacts.ANALYSIS_MESH?.status !== 'CURRENT'
    || artifacts.ANALYSIS_MESH?.qualification !== 'PASS') {
    reasons.push('DOMAIN_FIRST_LIFECYCLE_MESH_STALE');
  }
  if (artifacts.EXECUTION?.artifactHash !== execution.compiledExecutionHash
    || artifacts.EXECUTION?.status !== 'CURRENT'
    || artifacts.EXECUTION?.qualification !== 'PASS') {
    reasons.push('DOMAIN_FIRST_LIFECYCLE_EXECUTION_STALE');
  }
  if (artifacts.RECOVERY?.status !== 'CURRENT'
    || artifacts.RECOVERY?.qualification !== 'PASS') {
    reasons.push('DOMAIN_FIRST_LIFECYCLE_RECOVERY_NOT_CURRENT');
  }
  return unique(reasons);
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined))];
}
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
