/**
 * Pure B02 currentness projection over already-governed LAFEA workbench state.
 *
 * This module creates no engineering evidence and mutates no retained state.
 * It makes the existing source/lifecycle/mesh/execution custody explicit so the
 * presenter cannot confuse a historically qualified receipt with current authority.
 */

export const LAFEA_COMPUTATIONAL_STATES = Object.freeze([
  'EDITED',
  'READY',
  'MESHED',
  'RUNNING',
  'CURRENT_RESULT',
  'STALE_RESULT',
  'REJECTED',
]);

export const LAFEA_WORKBENCH_QUALIFICATION_STATES = Object.freeze([
  'NOT_EVALUATED',
  'FAIL',
  'PASS',
]);

export const LAFEA_WORKBENCH_CURRENTNESS_SCHEMA =
  'lafea-workbench-currentness/v1';

const RESULT_ARTIFACT_KINDS = Object.freeze([
  'EXECUTION',
  'RESULT_EVIDENCE',
  'RECOVERY',
]);

export function projectLafeaWorkbenchCurrentness(stage) {
  requireStage(stage);
  const lifecycle = stage.lifecycle ?? null;
  const readiness = stage.lifecycleReadiness ?? {};
  const binding = stage.lifecycleBinding ?? null;
  const artifacts = lifecycle?.artifacts ?? {};
  const execution = stage.execution ?? null;
  const resultArtifacts = RESULT_ARTIFACT_KINDS
    .map((kind) => artifacts[kind] ?? null)
    .filter(hasRetainedArtifact);
  const retainedPass = resultArtifacts.some((record) => record.qualification === 'PASS')
    || execution?.status === 'QUALIFIED';
  const retainedFailure = resultArtifacts.some((record) =>
    ['FAIL', 'BLOCK'].includes(record.qualification))
    || execution?.status === 'FAILED';
  const hasRetainedResult = resultArtifacts.length > 0 || Boolean(execution);
  const resultCurrent = readiness.resultReady === true;
  const executionStatus = execution?.status ?? null;

  const computationalState = deriveComputationalState({
    readiness,
    executionStatus,
    hasRetainedResult,
    resultCurrent,
    meshCurrent: currentMesh(stage, readiness),
  });
  const qualificationState = resultCurrent && retainedPass
    ? 'PASS'
    : retainedPass
      ? 'PASS'
      : retainedFailure
        ? 'FAIL'
        : 'NOT_EVALUATED';
  const qualificationBasis = resultCurrent && qualificationState === 'PASS'
    ? 'CURRENT_CHAIN'
    : qualificationState === 'PASS'
      ? 'HISTORICAL_RETAINED'
      : qualificationState === 'FAIL' && computationalState === 'REJECTED'
        ? 'CURRENT_REJECTION'
        : qualificationState === 'FAIL'
          ? 'RETAINED_FAILURE'
          : 'NONE';
  const currentAuthority = computationalState === 'CURRENT_RESULT'
    && qualificationState === 'PASS'
    && binding?.status === 'CURRENT';

  return freeze({
    schema: LAFEA_WORKBENCH_CURRENTNESS_SCHEMA,
    stageId: stage.stageId,
    computationalState,
    qualificationState,
    qualificationBasis,
    currentAuthority,
    historicalQualificationRetained: qualificationBasis === 'HISTORICAL_RETAINED',
    identity: freeze({
      sourceRevisionHash: stage.sourceAuthority?.sourceHash
        ?? lifecycle?.source?.sourceHash
        ?? null,
      documentRevisionToken: binding?.currentDocumentDigest ?? null,
      documentRevisionTokenAuthority: 'EDITOR_REVISION_TOKEN_ONLY',
      canonicalModelHash: artifactHash(artifacts.CANONICAL_MODEL),
      meshRevisionHash: stage.analysisMeshCustodyProjection?.meshHash
        ?? artifactHash(artifacts.ANALYSIS_MESH),
      meshProfileHash: execution?.meshProfileHash ?? null,
      solverModelHash: execution?.solverModelHash ?? null,
      executionHash: execution?.compiledExecutionHash
        ?? artifactHash(artifacts.EXECUTION),
      recoveryHash: artifactHash(artifacts.RECOVERY),
      convergenceEvidenceHash: artifactHash(artifacts.CONVERGENCE),
    }),
    retainedResultEvidence: freeze(resultArtifacts.map((record) => freeze({
      kind: record.kind,
      status: record.status,
      artifactHash: record.artifactHash,
      qualification: normalizeQualification(record.qualification),
      producerRef: record.producerRef ?? null,
    }))),
    blockingReasons: freeze([...(readiness.blockingReasons ?? [])]),
  });
}

function deriveComputationalState({
  readiness,
  executionStatus,
  hasRetainedResult,
  resultCurrent,
  meshCurrent,
}) {
  if (executionStatus === 'FAILED') return 'REJECTED';
  if (executionStatus === 'RUNNING') return 'RUNNING';
  if (resultCurrent) return 'CURRENT_RESULT';
  if (hasRetainedResult) return 'STALE_RESULT';
  if (meshCurrent) return 'MESHED';
  if (readiness.modelCurrent === true
    || readiness.preMeshModelCurrent === true
    || readiness.solverModelCurrent === true) return 'READY';
  return 'EDITED';
}

function currentMesh(stage, readiness) {
  if (readiness.meshQualified === true) return true;
  const custody = stage.analysisMeshCustodyProjection;
  return custody?.state === 'CURRENT_PASS' && custody?.usableForRun === true;
}

function hasRetainedArtifact(record) {
  return Boolean(record && record.status !== 'ABSENT' && record.artifactHash);
}

function artifactHash(record) {
  return hasRetainedArtifact(record) ? record.artifactHash : null;
}

function normalizeQualification(value) {
  if (value === 'PASS') return 'PASS';
  if (value === 'FAIL' || value === 'BLOCK') return 'FAIL';
  return 'NOT_EVALUATED';
}

function requireStage(value) {
  if (!value || typeof value !== 'object' || typeof value.stageId !== 'string') {
    throw new TypeError('LAFEA_WORKBENCH_CURRENTNESS_STAGE_INVALID');
  }
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
