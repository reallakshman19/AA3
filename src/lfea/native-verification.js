import { requireSolverExecution } from '../core/linear-fea-solver/index.js';
import { deepFreeze } from '../core/shared-piping-model/immutable.js';

export const LFEA_NATIVE_VERIFICATION_SCHEMA = 'lfea-native-verification/v1';
export const LFEA_NATIVE_VERIFICATION_STATUS = Object.freeze({
  CURRENT: 'CURRENT',
  BLOCKED: 'BLOCKED',
});

/** Project exact retained evidence for the current native run. No numerical quantity is recomputed. */
export function createLfeaNativeVerification(context = {}) {
  const reasons = blockingReasons(context);
  if (reasons.length) return blockedVerification(context, reasons);

  const currentEntry = currentHistoryEntry(context.historySnapshot);
  const raw = context.executionState.execution;
  const recovery = context.resultsState.results;
  const recoveryByCase = new Map(recovery.caseRecoveries.map((row) => [row.caseId, row]));
  const cases = raw.caseExecutions.map((rawCase) => verificationCase(
    rawCase,
    recoveryByCase.get(rawCase.caseId),
  ));

  return deepFreeze({
    schema: LFEA_NATIVE_VERIFICATION_SCHEMA,
    status: LFEA_NATIVE_VERIFICATION_STATUS.CURRENT,
    reasonCodes: Object.freeze([]),
    runId: currentEntry.runId,
    source: sourceEvidence(context.sourceSnapshot, raw),
    authority: authorityEvidence(context.preFlight, raw, recovery),
    application: applicationEvidence(context.applicationIdentity),
    publicationReadiness: context.publicationReadiness,
    cases: Object.freeze(cases),
  });
}

function blockingReasons(context) {
  const reasons = [];
  if (context.executionState?.currentness !== 'CURRENT') reasons.push('CURRENT_RAW_EXECUTION_REQUIRED');
  if (context.resultsState?.currentness !== 'CURRENT') reasons.push('CURRENT_RECOVERY_REQUIRED');
  if (!currentHistoryEntry(context.historySnapshot)) reasons.push('CURRENT_HISTORY_RUN_REQUIRED');
  const raw = context.executionState?.execution;
  const recovery = context.resultsState?.results;
  if (raw && !['QUALIFIED', 'CONDITIONAL'].includes(raw.status)) reasons.push('QUALIFIED_RAW_EXECUTION_REQUIRED');
  if (raw && recovery && !sameCurrentEvidence(raw, recovery, currentHistoryEntry(context.historySnapshot))) {
    reasons.push('CURRENT_HISTORY_EVIDENCE_MISMATCH');
  }
  return [...new Set(reasons)].sort(compareAscii);
}

function sameCurrentEvidence(raw, recovery, entry) {
  if (!entry?.record) return false;
  const record = entry.record;
  return record.identity.rawExecution.executionBatchId === raw.executionBatchId
    && record.identity.rawExecution.semanticHash === raw.semanticHash
    && record.identity.recovery.recoveryBatchId === recovery.recoveryBatchId
    && record.identity.recovery.semanticHash === recovery.semanticHash;
}

function blockedVerification(context, reasons) {
  return deepFreeze({
    schema: LFEA_NATIVE_VERIFICATION_SCHEMA,
    status: LFEA_NATIVE_VERIFICATION_STATUS.BLOCKED,
    reasonCodes: Object.freeze(reasons),
    runId: currentHistoryEntry(context.historySnapshot)?.runId ?? null,
    source: null,
    authority: null,
    application: applicationEvidence(context.applicationIdentity),
    publicationReadiness: context.publicationReadiness ?? null,
    cases: Object.freeze([]),
  });
}

function verificationCase(rawCase, recoveryCase) {
  const execution = requireSolverExecution(rawCase.execution);
  if (!recoveryCase || recoveryCase.executionHash !== execution.executionHash) {
    throw verificationError('LFEA_VERIFICATION_RECOVERY_CASE_MISMATCH',
      `Recovery evidence for ${rawCase.caseId} does not match the retained solver execution.`);
  }
  return deepFreeze({
    caseId: rawCase.caseId,
    caseRole: rawCase.caseRole,
    physicalLoadCaseHash: rawCase.physicalLoadCaseHash,
    frameElementProfileSemanticHash: rawCase.frameElementProfileSemanticHash,
    solverProfileSemanticHash: rawCase.solverProfileSemanticHash,
    execution: executionEvidence(execution),
    recovery: recoveryEvidence(recoveryCase),
  });
}

function executionEvidence(execution) {
  return deepFreeze({
    status: execution.status,
    executionHash: execution.executionHash,
    executionEvidenceHash: execution.executionEvidenceHash,
    assemblySemanticHash: execution.assemblySemanticHash,
    assemblyEvidenceHash: execution.assemblyEvidenceHash,
    factorization: deepFreeze({
      status: execution.factorization.status,
      backend: execution.factorization.backend,
      factorizationHash: execution.factorization.factorizationHash,
      evidenceHash: execution.factorization.evidenceHash,
      factorRevision: execution.factorization.factorRevision,
      conditionEstimate: execution.factorization.conditionEstimate,
      pivotIndex: execution.factorization.pivotIndex,
      pivotValue: execution.factorization.pivotValue,
      threshold: execution.factorization.threshold,
    }),
    diagnostics: deepFreeze({ ...execution.diagnostics }),
  });
}

function recoveryEvidence(row) {
  return deepFreeze({
    executionStatus: row.executionStatus,
    executionHash: row.executionHash,
    recoveryHash: row.recoveryHash,
    recoverySemanticHash: row.recoverySemanticHash,
    recoveryEvidenceHash: row.recoveryEvidenceHash,
  });
}

function sourceEvidence(snapshot, raw) {
  return deepFreeze({
    fileName: text(snapshot?.fileName),
    contentSha256: text(snapshot?.contentSha256),
    sourceUnit: text(snapshot?.sourceUnit),
    sourceBundleSemanticHash: raw.sourceBundleSemanticHash,
  });
}

function authorityEvidence(preFlight, raw, recovery) {
  return deepFreeze({
    preFlightSemanticHash: preFlight?.semanticHash ?? null,
    preparationSemanticHash: raw.preparationSemanticHash,
    authorizationSemanticHash: raw.authorizationSemanticHash,
    modelSemanticHash: raw.modelSemanticHash,
    stiffnessStateHash: raw.stiffnessStateHash,
    loadStateHash: raw.loadStateHash,
    requestedProfileId: raw.requestedProfileId,
    requestedCaseIds: Object.freeze([...raw.requestedCaseIds]),
    rawExecutionBatchId: raw.executionBatchId,
    rawExecutionBatchSemanticHash: raw.semanticHash,
    recoveryBatchId: recovery.recoveryBatchId,
    recoveryBatchSemanticHash: recovery.semanticHash,
    recoveryProfileSemanticHash: recovery.recoveryProfileSemanticHash,
  });
}

function applicationEvidence(identity = {}) {
  return deepFreeze({
    application: text(identity.application),
    mode: text(identity.mode),
    applicationVersion: text(identity.applicationVersion),
    buildSha: text(identity.buildSha),
    buildTime: text(identity.buildTime),
  });
}

function currentHistoryEntry(snapshot) {
  return snapshot?.entries?.find((entry) => entry.relation === 'CURRENT') ?? null;
}
function text(value) { const result = String(value ?? '').trim(); return result || null; }
function compareAscii(left, right) { return left < right ? -1 : left > right ? 1 : 0; }
function verificationError(code, message) { const error = new TypeError(message); error.code = code; return error; }
