/** Pure canonical orchestration projection for workbench action/readiness policy. */
import { requireLafeaStageAnalysisAdapter } from './lafea-stage-analysis-adapter.js';

export const LAFEA_WORKBENCH_ORCHESTRATION_SCHEMA = 'lafea-workbench-orchestration/v1';
export const LAFEA_WORKBENCH_ORCHESTRATION_SECTION_SCHEMA = 'lafea-workbench-orchestration-section/v1';
export const LAFEA_WORKBENCH_ORCHESTRATION_STATES = Object.freeze([
  'NOT_STARTED', 'READY', 'WARNING', 'BLOCKED', 'COMPLETE',
]);
export const LAFEA_WORKBENCH_ORCHESTRATION_ORDER = Object.freeze([
  'SOURCE', 'MODEL', 'PREPARATION', 'DISCRETIZATION',
  'AUTHORIZATION', 'EXECUTION', 'RESULTS', 'RELEASE',
]);

export function buildLafeaWorkbenchOrchestrationProjection(stageValue) {
  const stage = requireStage(stageValue);
  const adapter = requireLafeaStageAnalysisAdapter(stage.stageId);
  const readiness = stage.lifecycleReadiness;
  const custody = stage.analysisMeshCustodyProjection;
  const preparation = stage.preparationProjection;
  const sections = {
    SOURCE: sourceSection(stage),
    MODEL: modelSection(stage, readiness),
    PREPARATION: preparationSection(stage, adapter, readiness, preparation),
    DISCRETIZATION: discretizationSection(stage, adapter, custody),
    AUTHORIZATION: authorizationSection(stage, adapter, readiness, preparation, custody),
    EXECUTION: executionSection(stage, readiness, preparation, custody),
    RESULTS: resultsSection(stage, readiness),
    RELEASE: releaseSection(readiness),
  };
  return freeze({
    schema: LAFEA_WORKBENCH_ORCHESTRATION_SCHEMA,
    stageId: stage.stageId,
    stageAdapterId: adapter.adapterId,
    order: [...LAFEA_WORKBENCH_ORCHESTRATION_ORDER],
    sections,
    lifecycleInitialized: Boolean(stage.lifecycle),
  });
}

function sourceSection(stage) {
  if (!stage.document) return section('NOT_STARTED', ['SOURCE_DOCUMENT_ABSENT'], [], ['IMPORT_SOURCE']);
  if (!stage.lifecycle) return section('BLOCKED', ['LIFECYCLE_NOT_INITIALIZED'], [ref('DOCUMENT', documentRef(stage))], ['EDIT_SOURCE', 'INITIALIZE_SOURCE_AUTHORITY']);
  const reasons = [];
  if (stage.lifecycleBinding?.status !== 'CURRENT') reasons.push(`LIFECYCLE_SOURCE_BINDING_${stage.lifecycleBinding?.status ?? 'UNKNOWN'}`);
  if (stage.lifecycle.source?.status !== 'CURRENT') reasons.push(`LIFECYCLE_SOURCE_${stage.lifecycle.source?.status ?? 'UNKNOWN'}`);
  if (reasons.length) return section('BLOCKED', reasons, sourceRefs(stage), ['EDIT_SOURCE']);
  return section('COMPLETE', [], sourceRefs(stage), ['EDIT_SOURCE', 'VIEW_SOURCE']);
}

function modelSection(stage, readiness) {
  if (stage.domainFirstProfileActive) {
    const projection = stage.analysisDomainProjection;
    const refs = projection?.analysisDomainHash ? [ref('ANALYSIS_DOMAIN', projection.analysisDomainHash)] : [];
    if (projection?.state === 'CURRENT_PASS' && readiness?.domainCurrent) {
      return section('COMPLETE', [], refs, ['VIEW_MODEL']);
    }
    const state = projection?.state === 'ABSENT' ? 'NOT_STARTED' : 'BLOCKED';
    return section(state, projection?.reasons ?? ['ANALYSIS_DOMAIN_NOT_CURRENT'], refs, []);
  }
  if (!stage.lifecycle) return section('NOT_STARTED', ['SOURCE_AUTHORITY_REQUIRED'], [], []);
  const record = stage.lifecycle.artifacts?.CANONICAL_MODEL;
  if (readiness?.modelCurrent === true && record?.status === 'CURRENT') {
    return section('COMPLETE', [], [artifactRef(record)], ['VIEW_MODEL']);
  }
  return section(record?.status === 'ABSENT' ? 'NOT_STARTED' : 'BLOCKED',
    modelReasons(readiness, record),
    record && record.status !== 'ABSENT' ? [artifactRef(record)] : [], []);
}

function preparationSection(stage, adapter, readiness, projection) {
  if (!readiness?.preMeshModelCurrent) {
    return section('NOT_STARTED', [
      stage.domainFirstProfileActive ? 'ANALYSIS_DOMAIN_NOT_CURRENT' : 'CANONICAL_MODEL_NOT_CURRENT',
    ], [], []);
  }
  if (!adapter.preparation.qualified) return section('BLOCKED', [adapter.preparation.reason], [], []);
  if (!projection) return section('BLOCKED', ['LAFEA_PREPARATION_PROJECTION_ABSENT'], [], []);
  const refs = preparationRefs(projection);
  if (projection.state === 'CURRENT_PASS') return section('COMPLETE', [], refs, ['VIEW_PREPARATION']);
  if (projection.state === 'CURRENT_WARNING' && projection.usableForAuthorization) {
    return section('WARNING', projection.reasons, refs, ['VIEW_PREPARATION', 'VIEW_APPROVAL']);
  }
  if (projection.state === 'ABSENT') {
    return section('BLOCKED', projection.reasons, refs,
      stage.domainFirstProfileActive ? ['RUN_PREFLIGHT'] : ['REGISTER_PREPARATION_EVIDENCE']);
  }
  return section('BLOCKED', projection.reasons, refs,
    stage.domainFirstProfileActive ? ['RUN_PREFLIGHT'] : projection.evidenceHash ? ['VIEW_PREPARATION'] : []);
}

function discretizationSection(stage, adapter, custody) {
  if (!adapter.discretization.applicable) return section('COMPLETE', ['ANALYSIS_MESH_NOT_APPLICABLE'], [], ['VIEW']);
  if (!custody) return section('NOT_STARTED', ['ANALYSIS_MESH_CUSTODY_ABSENT'], [], []);
  const refs = custody.meshHash
    ? [ref('ANALYSIS_MESH', custody.meshHash), ref('ANALYSIS_MESH_PROFILE', custody.meshProfileHash)]
    : [];
  if (custody.state === 'CURRENT_PASS') {
    const reasons = custody.usableForRun === true ? [] : (custody.runBlockingReasons ?? []);
    return section('COMPLETE', reasons, refs, ['VIEW', 'EXPORT_EVIDENCE']);
  }
  if (custody.state === 'CURRENT_WARNING') {
    return section('WARNING', ['ANALYSIS_MESH_WARNING_REVIEW_REQUIRED'], refs, ['VIEW', 'FOCUS_FINDINGS', 'EXPORT_EVIDENCE']);
  }
  if (custody.state === 'ABSENT') {
    const reasons = custody.absenceReasons?.length ? custody.absenceReasons : ['ANALYSIS_MESH_EVIDENCE_ABSENT'];
    return section('NOT_STARTED', reasons, refs,
      stage.domainFirstProfileActive ? [] : ['IMPORT_AUTHORIZED_MESH']);
  }
  return section('BLOCKED', [
    ...(custody.staleReasons ?? []), ...(custody.invalidReasons ?? []),
    ...(custody.state === 'CURRENT_BLOCK' ? ['ANALYSIS_MESH_QUALITY_BLOCK'] : []),
  ], refs, custody.canView ? ['VIEW', 'EXPORT_EVIDENCE'] : []);
}

function authorizationSection(stage, adapter, readiness, preparation, custody) {
  const reasons = []; const refs = [];
  if (!readiness?.preMeshModelCurrent) {
    reasons.push(stage.domainFirstProfileActive ? 'ANALYSIS_DOMAIN_NOT_CURRENT' : 'CANONICAL_MODEL_NOT_CURRENT');
  }
  if ((stage.domainFirstProfileActive || stage.shellMidsurfaceProfileActive)
    && !readiness?.solverModelCurrent) {
    reasons.push('CANONICAL_SOLVER_MODEL_NOT_CURRENT');
  }
  if (!adapter.preparation.qualified) reasons.push(adapter.preparation.reason);
  if (preparation?.usableForAuthorization !== true) {
    reasons.push(...(preparation?.reasons ?? ['LAFEA_PREPARATION_NOT_AUTHORIZED']));
  }
  if (preparation?.evidenceHash) refs.push(ref('PREPARATION_EVIDENCE', preparation.evidenceHash));
  if (preparation?.approvalHash) refs.push(ref('PREPARATION_APPROVAL', preparation.approvalHash));
  if (adapter.discretization.applicable && custody?.usableForAuthorization !== true) {
    reasons.push(`ANALYSIS_MESH_${custody?.state ?? 'ABSENT'}`);
  }
  if (stage.shellMidsurfaceProfileActive === true && custody?.usableForRun !== true) {
    reasons.push(...(custody?.runBlockingReasons?.length
      ? custody.runBlockingReasons
      : ['SHELL_RETAINED_MESH_NOT_BOUND_TO_SOLVER_MODEL']));
  }
  if (custody?.meshHash) refs.push(ref('ANALYSIS_MESH', custody.meshHash));
  if (stage.shellSolverModelProjection?.solverModelHash) {
    refs.push(ref('SOLVER_MODEL', stage.shellSolverModelProjection.solverModelHash));
  }
  if (reasons.length) return section('BLOCKED', reasons, refs, []);
  return section('READY', [], refs, ['AUTHORIZE_SOLVE']);
}

function executionSection(stage, readiness, preparation, custody) {
  const execution = stage.execution;
  if (!execution) {
    const governedMeshRoute = stage.domainFirstProfileActive === true
      || stage.shellMidsurfaceProfileActive === true;
    const runnable = governedMeshRoute
      && readiness?.solverModelCurrent === true
      && preparation?.usableForAuthorization === true
      && custody?.usableForRun === true;
    const reasons = custody?.runBlockingReasons?.length
      ? custody.runBlockingReasons
      : ['EXECUTION_NOT_RUN'];
    return section('NOT_STARTED', reasons, [], runnable ? ['RUN_SOLVE'] : []);
  }
  if (execution.status === 'QUALIFIED') {
    if ((stage.domainFirstProfileActive || stage.shellMidsurfaceProfileActive)
      && readiness?.resultReady !== true) {
      return section('BLOCKED', governedExecutionReasons(readiness), [], ['VIEW']);
    }
    return section('COMPLETE', [], [ref('EXECUTION', executionHash(execution))], ['VIEW']);
  }
  return section('BLOCKED', [`EXECUTION_${execution.status ?? 'UNKNOWN'}`], [], []);
}

function resultsSection(stage, readiness) {
  if (readiness?.resultReady) return section('COMPLETE', [], resultRefs(stage.lifecycle), ['VIEW_RESULTS', 'EXPORT_RESULTS']);
  const executed = stage.execution?.status === 'QUALIFIED';
  return section(executed ? 'BLOCKED' : 'NOT_STARTED',
    executed ? governedExecutionReasons(readiness) : ['EXECUTION_REQUIRED'], [], []);
}

function releaseSection(readiness) {
  const releaseBinding = readiness?.releaseBinding;
  const refs = releaseBinding?.semanticHash
    ? [ref('TEMPLATE_RELEASE_RECORD', releaseBinding.semanticHash)]
    : [];
  if (readiness?.releaseState === 'RELEASE_QUALIFIED') {
    return section('COMPLETE', [], refs, ['VIEW_RELEASE']);
  }
  const reasons = readiness?.releaseBlockingReasons?.length
    ? readiness.releaseBlockingReasons
    : [readiness?.releaseState ?? 'RELEASE_NOT_QUALIFIED'];
  return section('BLOCKED', reasons, refs, refs.length ? ['VIEW_RELEASE'] : []);
}

function governedExecutionReasons(readiness) {
  const reasons = readiness?.blockingReasons?.filter((reason) =>
    reason.startsWith('DOMAIN_FIRST_')
    || reason.startsWith('SHELL_')
    || reason.startsWith('LAFEA4_SHELL_')
    || reason.startsWith('LAFEA5_SHELL_')) ?? [];
  return reasons.length ? reasons : ['RESULT_EVIDENCE_NOT_CURRENT'];
}
function preparationRefs(projection) {
  const refs = [];
  if (projection?.evidenceHash) refs.push(ref('PREPARATION_EVIDENCE', projection.evidenceHash));
  if (projection?.approvalHash) refs.push(ref('PREPARATION_APPROVAL', projection.approvalHash));
  return refs;
}
function modelReasons(readiness, record) {
  const reasons = [...(readiness?.blockingReasons ?? [])];
  if (record?.status && record.status !== 'CURRENT') reasons.push(`CANONICAL_MODEL_${record.status}`);
  if (!reasons.length) reasons.push('CANONICAL_MODEL_NOT_CURRENT');
  return unique(reasons);
}
function sourceRefs(stage) {
  const refs = [ref('DOCUMENT', documentRef(stage))];
  if (stage.lifecycle?.source?.sourceHash) refs.push(ref('SOURCE', stage.lifecycle.source.sourceHash));
  if (stage.sourceAuthority?.sourceHash) refs.push(ref('SOURCE_AUTHORITY', stage.sourceAuthority.sourceHash));
  return refs;
}
function resultRefs(lifecycle) {
  if (!lifecycle?.artifacts) return [];
  return Object.values(lifecycle.artifacts)
    .filter((record) => ['CURRENT', 'BLOCKED'].includes(record.status)
      && ['RESULT_EVIDENCE', 'RECOVERY', 'CONVERGENCE'].includes(record.kind))
    .map((record) => artifactRef(record));
}
function artifactRef(record) { return ref(record.kind, record.artifactHash); }
function ref(kind, identity) { return freeze({ kind, identity: identity ?? null }); }
function section(state, reasons, evidenceRefs, allowedActions) {
  if (!LAFEA_WORKBENCH_ORCHESTRATION_STATES.includes(state)) {
    throw new TypeError('LAFEA_WORKBENCH_ORCHESTRATION_STATE_INVALID');
  }
  return freeze({
    schema: LAFEA_WORKBENCH_ORCHESTRATION_SECTION_SCHEMA,
    state, reasons: unique(reasons), evidenceRefs: [...evidenceRefs],
    allowedActions: unique(allowedActions),
  });
}
function executionHash(execution) { return execution.compiledExecutionHash ?? execution.result?.semanticHash ?? execution.result?.artifactHash ?? execution.canonicalInput?.semanticHash ?? null; }
function documentRef(stage) { return stage.lifecycleBinding?.currentDocumentDigest ?? stage.lifecycleBinding?.boundDocumentDigest ?? null; }
function requireStage(value) { if (!value || typeof value !== 'object' || typeof value.stageId !== 'string') throw new TypeError('LAFEA_WORKBENCH_ORCHESTRATION_STAGE_REQUIRED'); return value; }
function unique(values) { return [...new Set(values.filter((value) => value !== null && value !== undefined))]; }
function freeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.values(value).forEach(freeze); return Object.freeze(value); }
