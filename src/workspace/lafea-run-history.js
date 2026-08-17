/** Append-only LAFEA run-history ledger. Historic evidence never becomes current authority. */
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA_RUN_HISTORY_ENTRY_SCHEMA = 'lafea-run-history-entry/v1';
export const LAFEA_RUN_HISTORY_SCHEMA = 'lafea-run-history/v1';
export const LAFEA_RUN_CURRENT_AUTHORITY_SCHEMA = 'lafea-run-current-authority/v1';

export function createLafeaRunHistory(options = {}) {
  const buildSha = optionalBuildSha(options.buildSha);
  const entries = [];

  function append(stageValue) {
    const stage = requireQualifiedStage(stageValue);
    const ordinal = entries.length + 1;
    const evidence = runEvidenceSnapshot(stage, buildSha);
    const base = {
      schema: LAFEA_RUN_HISTORY_ENTRY_SCHEMA,
      ordinal,
      stageId: stage.stageId,
      buildSha,
      evidence,
      evidenceHash: canonicalLafeaSha256(evidence),
    };
    const semanticHash = canonicalLafeaSha256(base);
    const entry = deepFreeze({
      ...base,
      runId: `LAFEA-RUN-${String(ordinal).padStart(4, '0')}-${semanticHash.slice(7, 19).toUpperCase()}`,
      semanticHash,
    });
    entries.push(entry);
    return entry;
  }

  function list() {
    return deepFreeze(entries.map((entry) => ({
      runId: entry.runId,
      ordinal: entry.ordinal,
      stageId: entry.stageId,
      buildSha: entry.buildSha,
      sourceHash: entry.evidence.source.sourceHash,
      profileId: entry.evidence.profile.lifecycleProfileId,
      geometryHash: entry.evidence.geometry.analysisGeometryHash,
      meshHash: entry.evidence.mesh.meshHash,
      resultHash: entry.evidence.execution.resultHash,
      verificationStatus: entry.evidence.verification.bindingStatus,
      releaseBindingStatus: entry.evidence.release.bindingStatus,
      releaseQualified: entry.evidence.release.releaseQualified,
      currentResultAcceptedAtCapture:
        entry.evidence.currentAuthority?.currentResultAccepted ?? null,
      calculationStateAtCapture:
        entry.evidence.currentAuthority?.calculationState ?? null,
      resultReadyAtCapture:
        entry.evidence.currentAuthority?.resultReady ?? null,
      semanticHash: entry.semanticHash,
    })));
  }

  function get(runId) {
    const entry = entries.find((candidate) => candidate.runId === runId);
    if (!entry) throw historyError('LAFEA_RUN_HISTORY_ENTRY_NOT_FOUND');
    return entry;
  }

  return Object.freeze({ append, list, get, latest: () => entries.at(-1) ?? null });
}

export function validateLafeaRunHistoryEntry(value) {
  if (!value || value.schema !== LAFEA_RUN_HISTORY_ENTRY_SCHEMA
    || !Number.isInteger(value.ordinal) || value.ordinal < 1
    || typeof value.stageId !== 'string' || !value.stageId
    || typeof value.runId !== 'string' || !value.runId
    || typeof value.evidenceHash !== 'string' || typeof value.semanticHash !== 'string') {
    throw historyError('LAFEA_RUN_HISTORY_ENTRY_INVALID');
  }
  const expectedEvidence = canonicalLafeaSha256(value.evidence);
  if (expectedEvidence !== value.evidenceHash) throw historyError('LAFEA_RUN_HISTORY_EVIDENCE_HASH_INVALID');
  const { runId: _runId, semanticHash: _semanticHash, ...base } = value;
  if (canonicalLafeaSha256(base) !== value.semanticHash) throw historyError('LAFEA_RUN_HISTORY_HASH_INVALID');
  return value;
}

/**
 * Exact identity used by run-history/dossier custody. It deliberately mirrors
 * the retained evidence identity ladder so live-currentness checks cannot be
 * satisfied by merely retaining execution.status = QUALIFIED.
 */
export function lafeaRunExecutionIdentity(executionValue) {
  const execution = executionValue && typeof executionValue === 'object'
    ? executionValue : {};
  return execution.compiledExecutionHash
    ?? execution.executionHash
    ?? execution.result?.semanticHash
    ?? execution.result?.evidenceHash
    ?? canonicalLafeaSha256(execution.result ?? execution);
}

/**
 * Current engineering authority projection at one instant. This is evidence,
 * not an authority source: governed routes delegate currentness to workbench
 * readiness, while legacy/non-governed history preserves prior semantics.
 */
export function projectLafeaRunStageCurrentAuthority(stageValue) {
  const stage = stageValue && typeof stageValue === 'object' ? stageValue : {};
  const governedRoute = stage.domainFirstProfileActive === true
    || stage.shellMidsurfaceProfileActive === true;
  const executionQualified = stage.execution?.status === 'QUALIFIED';
  const readiness = stage.lifecycleReadiness;
  const calculationState = readiness?.calculationState ?? null;
  const resultReady = readiness?.resultReady ?? null;
  const currentResultAccepted = governedRoute
    ? executionQualified
      && calculationState === 'CALCULATION_ACCEPTED_BY_STAGE_CONTRACT'
      && resultReady === true
    : executionQualified;
  return deepFreeze({
    schema: LAFEA_RUN_CURRENT_AUTHORITY_SCHEMA,
    stageId: stage.stageId ?? null,
    governedRoute,
    executionQualified,
    calculationState,
    resultReady,
    releaseState: readiness?.releaseState ?? null,
    currentResultAccepted,
    blockingReasons: clone(readiness?.blockingReasons ?? []),
  });
}

function runEvidenceSnapshot(stage, buildSha) {
  const meshEvidence = stage.retainedAnalysisMeshEvidenceV2 ?? stage.retainedAnalysisMeshEvidence ?? null;
  const units = stage.retainedAnalysisDomain?.units ?? stage.document?.units ?? null;
  const execution = clone(stage.execution);
  const lifecycle = clone(stage.lifecycle);
  const verification = clone(stage.numericalVerificationProjection);
  const release = clone(stage.lifecycleReadiness?.releaseBinding);
  return deepFreeze({
    stageId: stage.stageId,
    build: { buildSha, candidateHeadSha: stage.releaseCandidateHeadSha ?? null },
    currentAuthority: projectLafeaRunStageCurrentAuthority(stage),
    source: {
      sourceHash: stage.sourceAuthority?.sourceHash ?? stage.lifecycle?.source?.sourceHash ?? null,
      sourceAuthority: clone(stage.sourceAuthority),
      lifecycleBinding: clone(stage.lifecycleBinding),
      document: clone(stage.document),
    },
    profile: {
      lifecycleProfileId: stage.lifecycle?.profileId ?? null,
      domainFirstProfileId: stage.domainFirstLifecycle?.profileId ?? null,
      meshProfile: clone(stage.retainedAnalysisMeshProfile),
    },
    geometry: {
      analysisDomain: clone(stage.retainedAnalysisDomain),
      analysisDomainHash: stage.analysisDomainProjection?.analysisDomainHash ?? null,
      analysisGeometryEvidence: clone(stage.retainedAnalysisGeometryEvidence),
      analysisGeometryHash: stage.analysisGeometryProjection?.analysisGeometryHash ?? null,
      analysisGeometryState: stage.analysisGeometryProjection?.state ?? null,
    },
    mesh: {
      meshHash: stage.analysisMeshCustodyProjection?.meshHash ?? null,
      custody: clone(stage.analysisMeshCustodyProjection),
      evidence: clone(meshEvidence),
      summary: meshSummary(stage, meshEvidence),
      t6GeometryQualification: clone(stage.t6GeometryQualificationProjection),
      retainedT6GeometryQualification: clone(stage.retainedT6GeometryQualification),
    },
    execution: {
      status: execution.status,
      route: execution.route ?? null,
      compiledExecutionHash: execution.compiledExecutionHash ?? null,
      solverModelHash: execution.solverModelHash ?? null,
      resultHash: lafeaRunExecutionIdentity(execution),
      evidence: execution,
      quantities: resultQuantities(execution, units),
    },
    verification: {
      bindingStatus: verification?.bindingStatus ?? 'ABSENT',
      method: verification?.method ?? null,
      lifecycleArtifactHash: verification?.lifecycleArtifactHash ?? null,
      retainedIdentity: verification?.retainedIdentity ?? null,
      projection: verification,
      retainedEvidence: clone(stage.retainedNumericalVerificationEvidence),
    },
    release: {
      bindingStatus: release?.bindingStatus ?? 'ABSENT',
      releaseQualified: release?.releaseQualified === true,
      authorityState: release?.authorityState ?? null,
      recordId: release?.recordId ?? null,
      semanticHash: release?.semanticHash ?? null,
      evidenceHash: release?.evidenceHash ?? null,
      projection: release,
      retainedRecord: clone(stage.retainedTemplateReleaseRecord),
    },
    lifecycle,
    limitations: clone(stage.document?.limitations ?? execution.result?.limitations ?? []),
  });
}

function meshSummary(stage, evidence) {
  const mesh = evidence?.mesh ?? evidence ?? {};
  const nodes = Array.isArray(mesh.nodes) ? mesh.nodes : [];
  const elements = Array.isArray(mesh.elements) ? mesh.elements : [];
  const quality = evidence?.quality ?? {};
  return deepFreeze({
    nodeCount: nodes.length,
    elementCount: elements.length,
    elementFamily: stage.analysisMeshCustodyProjection?.elementFamily ?? evidence?.elementFamily ?? null,
    declaredTargetElementLength: stage.retainedAnalysisMeshProfile?.fields?.globalTargetSize ?? null,
    lengthUnit: stage.retainedAnalysisDomain?.units?.length ?? stage.document?.units?.length ?? null,
    qualityStatus: quality.worstStatus ?? quality.status ?? null,
    warningElementCount: Array.isArray(quality.warningElementIds) ? quality.warningElementIds.length : 0,
    blockingElementCount: Array.isArray(quality.blockingElementIds) ? quality.blockingElementIds.length : 0,
    gateResults: clone(quality.gateResults ?? []),
  });
}

function resultQuantities(execution, units) {
  const result = execution.result ?? {};
  const lengthUnit = units?.length ?? null;
  const stressUnit = units?.stress ?? null;
  const forceUnit = units?.force ?? null;
  const energyUnit = forceUnit && lengthUnit ? `${forceUnit}*${lengthUnit}` : null;
  const rows = [];
  for (const loadCase of result.loadCaseResults ?? []) {
    const caseId = loadCase.loadCaseId ?? loadCase.caseId ?? 'CASE';
    if (Number.isFinite(loadCase.totalStrainEnergy)) rows.push(quantity(
      caseId, 'TOTAL_STRAIN_ENERGY', 'GLOBAL_RESPONSE', caseId,
      'TOTAL_STRAIN_ENERGY', energyUnit, loadCase.totalStrainEnergy,
    ));
    for (const row of loadCase.nodalDisplacements ?? []) {
      if (!Number.isFinite(row.value)) continue;
      rows.push(quantity(caseId, `DISPLACEMENT_${row.component}`, 'NODE_DOF',
        `${row.nodeId}:${row.component}`, 'NODAL_DISPLACEMENT', lengthUnit, row.value));
    }
    for (const row of loadCase.vonMisesStress ?? []) {
      if (!Number.isFinite(row.value)) continue;
      rows.push(quantity(caseId, 'VON_MISES', 'ELEMENT', row.elementId,
        'SOLVER_PUBLISHED_ELEMENT_VON_MISES', stressUnit, row.value));
    }
    for (const row of loadCase.integrationPointResults ?? []) {
      const locationId = `${row.elementId}:${row.integrationPointId ?? 'IP'}`;
      const components = [['SIGMA_X', 0], ['SIGMA_Y', 1], ['TAU_XY', 2]];
      for (const [quantityId, index] of components) {
        const value = row.stress?.[index];
        if (Number.isFinite(value)) rows.push(quantity(caseId, quantityId,
          'INTEGRATION_POINT', locationId, 'RAW_INTEGRATION_POINT_STRESS', stressUnit, value));
      }
      if (Number.isFinite(row.vonMisesStress)) rows.push(quantity(caseId, 'VON_MISES',
        'INTEGRATION_POINT', locationId, 'RAW_INTEGRATION_POINT_VON_MISES', stressUnit,
        row.vonMisesStress));
    }
  }
  return deepFreeze(rows.sort((a, b) => quantityKey(a).localeCompare(quantityKey(b))));
}

function quantity(loadCaseId, quantityId, locationKind, locationId, interpretation, unit, value) {
  return { loadCaseId, quantityId, locationKind, locationId, interpretation, unit, value };
}
function quantityKey(row) {
  return [row.loadCaseId, row.quantityId, row.locationKind, row.locationId, row.interpretation, row.unit ?? ''].join('|');
}
function requireQualifiedStage(value) {
  if (!value || typeof value !== 'object' || typeof value.stageId !== 'string'
    || value.execution?.status !== 'QUALIFIED') throw historyError('LAFEA_RUN_HISTORY_QUALIFIED_EXECUTION_REQUIRED');
  return value;
}
function optionalBuildSha(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string' || !/^[0-9a-f]{40}$/u.test(value)) throw historyError('LAFEA_RUN_HISTORY_BUILD_SHA_INVALID');
  return value;
}
function clone(value) { return value === null || value === undefined ? null : JSON.parse(JSON.stringify(value)); }
function historyError(code) { const error = new TypeError(code); error.code = code; return error; }
function deepFreeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.values(value).forEach(deepFreeze); return Object.freeze(value); }
