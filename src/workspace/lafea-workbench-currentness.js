/**
 * Pure Gate-0 currentness projection for the governed LAFEA.3 workbench route.
 *
 * This module creates no engineering evidence. It only compares current
 * immutable identities and retained receipts that are already owned by the
 * lifecycle, mesh-custody, preflight, execution and run-transaction layers.
 */
import { deriveLafeaSolverConfigHash } from './lafea-workbench-run-transaction-state.js';

export const LAFEA_COMPUTATIONAL_STATES = Object.freeze([
  'EDITED', 'READY', 'MESHED', 'RUNNING', 'CURRENT_RESULT', 'STALE_RESULT', 'REJECTED',
]);
export const LAFEA_WORKBENCH_QUALIFICATION_STATES = Object.freeze([
  'NOT_EVALUATED', 'FAIL', 'PASS',
]);
export const LAFEA_WORKBENCH_CURRENTNESS_SCHEMA = 'lafea-workbench-currentness/v1';

const STAGE_ID = 'LAFEA.3';
const ROUTE = 'DOMAIN_FIRST_COMPILED_SOLVER_MODEL';

export function projectLafeaWorkbenchCurrentness(stage) {
  if (!stage || stage.stageId !== STAGE_ID) fail('LAFEA_WORKBENCH_CURRENTNESS_STAGE_INVALID');

  const lifecycle = stage.lifecycle ?? null;
  const artifacts = lifecycle?.artifacts ?? {};
  const sourceRevisionHash = stage.sourceAuthority?.sourceHash
    ?? lifecycle?.source?.sourceHash
    ?? null;
  const canonical = artifacts.CANONICAL_MODEL ?? null;
  const geometry = artifacts.ANALYSIS_GEOMETRY ?? null;
  const mesh = artifacts.ANALYSIS_MESH ?? null;
  const executionRecord = artifacts.EXECUTION ?? null;
  const recovery = artifacts.RECOVERY ?? null;
  const convergence = artifacts.CONVERGENCE ?? null;
  const custody = stage.analysisMeshCustodyProjection ?? null;
  const meshEvidence = stage.retainedAnalysisMeshEvidenceV2 ?? null;
  const preflight = stage.retainedContinuumPreflightEvidence ?? null;
  const execution = stage.execution ?? null;
  const activeTransaction = stage.activeRunTransaction ?? execution?.runTransaction ?? null;
  const transactionReceipt = execution?.runTransactionReceipt
    ?? stage.latestRunTransactionReceipt
    ?? null;
  const solverConfigHash = preflight ? deriveLafeaSolverConfigHash(preflight) : null;

  const reasons = exactCurrentChainReasons({
    stage,
    sourceRevisionHash,
    canonical,
    geometry,
    mesh,
    executionRecord,
    recovery,
    custody,
    meshEvidence,
    preflight,
    execution,
    transactionReceipt,
    solverConfigHash,
  });
  const exactCurrentChain = reasons.length === 0;
  const rejected = isRejected(execution, transactionReceipt);
  const hasResultHistory = hasRetainedResultHistory(
    executionRecord,
    recovery,
    execution,
    transactionReceipt,
  );
  const qualificationState = qualificationStateFor({
    executionRecord,
    recovery,
    execution,
    transactionReceipt,
    rejected,
  });

  const computationalState = running(activeTransaction, execution)
    ? 'RUNNING'
    : rejected
      ? 'REJECTED'
      : exactCurrentChain
        ? 'CURRENT_RESULT'
        : hasResultHistory
          ? 'STALE_RESULT'
          : meshCurrent(custody, mesh)
            ? 'MESHED'
            : readyCurrent(stage, canonical)
              ? 'READY'
              : 'EDITED';
  const currentAuthority = computationalState === 'CURRENT_RESULT'
    && qualificationState === 'PASS';

  return freeze({
    schema: LAFEA_WORKBENCH_CURRENTNESS_SCHEMA,
    stageId: STAGE_ID,
    computationalState,
    qualificationState,
    qualificationBasis: qualificationBasisFor(
      computationalState,
      qualificationState,
      rejected,
    ),
    currentAuthority,
    historicalQualificationRetained: qualificationState === 'PASS'
      && computationalState !== 'CURRENT_RESULT',
    exactCurrentParentChain: exactCurrentChain,
    identity: freeze({
      sourceRevisionHash,
      canonicalModelHash: retainedHash(canonical),
      meshRevisionHash: retainedHash(mesh) ?? custody?.meshHash ?? null,
      solverConfigHash: solverConfigHash ?? transactionReceipt?.solverConfigHash ?? null,
      executionHash: retainedHash(executionRecord)
        ?? execution?.compiledExecutionHash
        ?? transactionReceipt?.executionHash
        ?? null,
      recoveryHash: retainedHash(recovery),
      convergenceEvidenceHash: retainedHash(convergence),
    }),
    transactionIdentity: freeze({
      activeTransactionHash: activeTransaction?.transactionHash ?? null,
      latestReceiptHash: transactionReceipt?.semanticHash ?? null,
      latestReceiptStatus: transactionReceipt?.status ?? null,
    }),
    blockingReasons: freeze([...reasons]),
  });
}

function exactCurrentChainReasons(input) {
  const reasons = [];
  const require = (condition, code) => { if (!condition) reasons.push(code); };
  const {
    stage, sourceRevisionHash, canonical, geometry, mesh, executionRecord,
    recovery, custody, meshEvidence, preflight, execution, transactionReceipt,
    solverConfigHash,
  } = input;

  require(stage.lifecycleBinding?.status === 'CURRENT', 'CURRENTNESS_SOURCE_BINDING_NOT_CURRENT');
  require(hash(sourceRevisionHash), 'CURRENTNESS_SOURCE_REVISION_ABSENT');
  require(current(canonical), 'CURRENTNESS_CANONICAL_MODEL_NOT_CURRENT');
  require(canonical?.parentHashes?.sourceHash === sourceRevisionHash,
    'CURRENTNESS_CANONICAL_SOURCE_PARENT_MISMATCH');
  require(current(geometry), 'CURRENTNESS_ANALYSIS_GEOMETRY_NOT_CURRENT');
  require(geometry?.parentHashes?.sourceHash === sourceRevisionHash,
    'CURRENTNESS_GEOMETRY_SOURCE_PARENT_MISMATCH');
  require(geometry?.parentHashes?.canonicalModelHash === canonical?.artifactHash,
    'CURRENTNESS_GEOMETRY_CANONICAL_PARENT_MISMATCH');

  require(custody?.state === 'CURRENT_PASS' && custody?.usableForRun === true,
    'CURRENTNESS_MESH_CUSTODY_NOT_CURRENT_PASS');
  require(current(mesh), 'CURRENTNESS_MESH_RECEIPT_NOT_CURRENT');
  require(mesh?.artifactHash === custody?.meshHash,
    'CURRENTNESS_MESH_RECEIPT_CUSTODY_MISMATCH');
  require(mesh?.parentHashes?.analysisGeometryHash === geometry?.artifactHash,
    'CURRENTNESS_MESH_GEOMETRY_PARENT_MISMATCH');
  require(mesh?.parentHashes?.meshProfileHash === meshEvidence?.meshProfileHash,
    'CURRENTNESS_MESH_PROFILE_PARENT_MISMATCH');
  require(meshEvidence?.sourceHash === sourceRevisionHash,
    'CURRENTNESS_MESH_SOURCE_PARENT_MISMATCH');
  require(meshEvidence?.analysisGeometryHash === geometry?.artifactHash,
    'CURRENTNESS_MESH_EVIDENCE_GEOMETRY_MISMATCH');

  require(preflight?.status === 'PASS' && preflight?.executionAuthorized === true,
    'CURRENTNESS_SOLVER_CONFIG_PREFLIGHT_NOT_CURRENT_PASS');
  require(preflight?.sourceHash === sourceRevisionHash,
    'CURRENTNESS_SOLVER_CONFIG_SOURCE_PARENT_MISMATCH');
  require(preflight?.analysisGeometryHash === geometry?.artifactHash,
    'CURRENTNESS_PREFLIGHT_GEOMETRY_PARENT_MISMATCH');
  require(preflight?.meshHash === mesh?.artifactHash,
    'CURRENTNESS_PREFLIGHT_MESH_PARENT_MISMATCH');
  require(preflight?.meshProfileHash === meshEvidence?.meshProfileHash,
    'CURRENTNESS_PREFLIGHT_MESH_PROFILE_MISMATCH');
  require(preflight?.analysisDomainHash === stage.analysisDomainProjection?.analysisDomainHash,
    'CURRENTNESS_PREFLIGHT_DOMAIN_PARENT_MISMATCH');
  require(hash(preflight?.solverModelHash), 'CURRENTNESS_SOLVER_MODEL_HASH_ABSENT');
  require(hash(solverConfigHash), 'CURRENTNESS_SOLVER_CONFIG_HASH_ABSENT');

  require(execution?.status === 'QUALIFIED' && execution?.route === ROUTE,
    'CURRENTNESS_EXECUTION_NOT_QUALIFIED');
  require(execution?.sourceHash === sourceRevisionHash,
    'CURRENTNESS_EXECUTION_SOURCE_PARENT_MISMATCH');
  require(execution?.analysisDomainHash === preflight?.analysisDomainHash,
    'CURRENTNESS_EXECUTION_DOMAIN_PARENT_MISMATCH');
  require(execution?.analysisGeometryHash === geometry?.artifactHash,
    'CURRENTNESS_EXECUTION_GEOMETRY_PARENT_MISMATCH');
  require(execution?.meshHash === mesh?.artifactHash,
    'CURRENTNESS_EXECUTION_MESH_PARENT_MISMATCH');
  require(execution?.meshProfileHash === meshEvidence?.meshProfileHash,
    'CURRENTNESS_EXECUTION_MESH_PROFILE_MISMATCH');
  require(execution?.solverModelHash === preflight?.solverModelHash,
    'CURRENTNESS_EXECUTION_SOLVER_PARENT_MISMATCH');
  require(current(executionRecord), 'CURRENTNESS_EXECUTION_RECEIPT_NOT_CURRENT');
  require(executionRecord?.artifactHash === execution?.compiledExecutionHash,
    'CURRENTNESS_EXECUTION_RECEIPT_HASH_MISMATCH');
  require(executionRecord?.parentHashes?.canonicalModelHash === canonical?.artifactHash,
    'CURRENTNESS_EXECUTION_CANONICAL_PARENT_MISMATCH');
  require(executionRecord?.parentHashes?.meshHash === mesh?.artifactHash,
    'CURRENTNESS_EXECUTION_MESH_RECEIPT_PARENT_MISMATCH');

  require(transactionReceipt?.status === 'COMPLETED',
    'CURRENTNESS_TRANSACTION_RECEIPT_NOT_COMPLETED');
  require(transactionReceipt?.solverConfigHash === solverConfigHash,
    'CURRENTNESS_TRANSACTION_SOLVER_CONFIG_MISMATCH');
  require(transactionReceipt?.executionHash === execution?.compiledExecutionHash,
    'CURRENTNESS_TRANSACTION_EXECUTION_HASH_MISMATCH');
  for (const key of [
    'sourceHash', 'analysisDomainHash', 'analysisGeometryHash', 'meshHash',
    'meshProfileHash', 'solverModelHash',
  ]) {
    require(transactionReceipt?.parents?.[key] === preflight?.[key],
      `CURRENTNESS_TRANSACTION_PARENT_MISMATCH:${key}`);
  }

  require(current(recovery), 'CURRENTNESS_RECOVERY_RECEIPT_NOT_CURRENT');
  require(recovery?.parentHashes?.executionHash === execution?.compiledExecutionHash,
    'CURRENTNESS_RECOVERY_EXECUTION_PARENT_MISMATCH');
  require(recovery?.parentHashes?.meshHash === mesh?.artifactHash,
    'CURRENTNESS_RECOVERY_MESH_PARENT_MISMATCH');
  return reasons;
}

function qualificationStateFor(input) {
  const retained = [input.executionRecord, input.recovery].filter(Boolean);
  if (retained.some((row) => row.qualification === 'PASS')) return 'PASS';
  if (retained.some((row) => ['FAIL', 'BLOCK'].includes(row.qualification))) return 'FAIL';
  if (input.execution?.status === 'FAILED' || input.rejected) return 'FAIL';
  return 'NOT_EVALUATED';
}

function qualificationBasisFor(computationalState, qualificationState, rejected) {
  if (qualificationState === 'NOT_EVALUATED') return 'NONE';
  if (computationalState === 'CURRENT_RESULT') return 'CURRENT_CHAIN';
  if (qualificationState === 'PASS') return 'HISTORICAL_RETAINED';
  if (rejected) return 'CURRENT_REJECTION';
  return 'RETAINED_FAILURE';
}

function hasRetainedResultHistory(executionRecord, recovery, execution, receipt) {
  return retained(executionRecord) || retained(recovery)
    || execution?.status === 'QUALIFIED'
    || receipt?.status === 'COMPLETED';
}

function isRejected(execution, receipt) {
  return execution?.status === 'FAILED'
    || (receipt?.status === 'SUPERSEDED' && Boolean(receipt?.reasonCode));
}

function running(activeTransaction, execution) {
  return activeTransaction?.status === 'RUNNING' || execution?.status === 'RUNNING';
}

function meshCurrent(custody, mesh) {
  return custody?.state === 'CURRENT_PASS'
    && custody?.usableForRun === true
    && current(mesh)
    && custody.meshHash === mesh.artifactHash;
}

function readyCurrent(stage, canonical) {
  return stage.lifecycleBinding?.status === 'CURRENT'
    && (current(canonical)
      || stage.lifecycleReadiness?.modelCurrent === true
      || stage.lifecycleReadiness?.preMeshModelCurrent === true);
}

function current(record) {
  return record?.status === 'CURRENT' && hash(record?.artifactHash);
}
function retained(record) {
  return record && record.status !== 'ABSENT' && hash(record.artifactHash);
}
function retainedHash(record) {
  return retained(record) ? record.artifactHash : null;
}
function hash(value) {
  return typeof value === 'string' && /^sha256:[0-9a-f]{64}$/u.test(value);
}
function fail(code) {
  const error = new TypeError(code);
  error.code = code;
  throw error;
}
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
