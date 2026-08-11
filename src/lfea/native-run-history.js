import { semanticHash } from '../core/shared-piping-model/canonical-json.js';
import { deepFreeze } from '../core/shared-piping-model/immutable.js';
import { requireLinearPipingInputXmlPreFlight } from '../workspace/linear-piping-inputxml-prefea.js';

export const LFEA_NATIVE_RUN_HISTORY_SCHEMA = 'lfea-native-run-history/v1';
export const LFEA_NATIVE_RUN_RECORD_SCHEMA = 'lfea-native-run-record/v1';
export const LFEA_NATIVE_RUN_RELATION = Object.freeze({
  CURRENT: 'CURRENT',
  HISTORIC: 'HISTORIC',
  STALE: 'STALE',
});

/** In-memory LFEA product history. Persistence is intentionally a later stage. */
export function createLfeaNativeRunHistory() {
  let records = Object.freeze([]);
  let selectedRunId = null;

  function archive(input) {
    const candidate = createRunRecord(input);
    const existing = records.find((record) => record.runId === candidate.runId) ?? null;
    if (existing) {
      selectedRunId = existing.runId;
      return existing;
    }
    records = Object.freeze([...records, candidate]);
    selectedRunId = candidate.runId;
    return candidate;
  }

  function selectRun(runId) {
    const record = requireRecord(records, runId);
    selectedRunId = record.runId;
    return record;
  }

  function clearSelection() {
    selectedRunId = null;
  }

  function clear() {
    records = Object.freeze([]);
    selectedRunId = null;
  }

  function getSnapshot(context = {}) {
    const entries = records.map((record) => deepFreeze({
      runId: record.runId,
      relation: relationToCurrent(record, context),
      record,
    }));
    return deepFreeze({
      schema: LFEA_NATIVE_RUN_HISTORY_SCHEMA,
      entries,
      selectedRunId,
      selectedRecord: records.find((record) => record.runId === selectedRunId) ?? null,
    });
  }

  return Object.freeze({
    archive,
    selectRun,
    clearSelection,
    clear,
    getSnapshot,
    getRecord: (runId) => records.find((record) => record.runId === String(runId ?? '')) ?? null,
    getSelectedRecord: () => records.find((record) => record.runId === selectedRunId) ?? null,
  });
}

export function createRunRecord({
  applicationIdentity,
  sourceSnapshot,
  preFlight: preFlightRecord,
  executionState,
  resultsState,
}) {
  const preFlight = requireLinearPipingInputXmlPreFlight(preFlightRecord);
  const raw = requireCurrentRaw(executionState);
  const recovery = requireCurrentRecovery(resultsState, raw);
  requireLineage(preFlight, raw, recovery);

  const identity = deepFreeze({
    source: sourceIdentity(sourceSnapshot, preFlight),
    authority: authorityIdentity(preFlight),
    rawExecution: rawIdentity(raw),
    recovery: recoveryIdentity(recovery),
    application: applicationIdentityRecord(applicationIdentity),
  });
  const runSemanticHash = semanticHash(identity);
  const runId = `LFEA-RUN-${runSemanticHash.slice('fnv1a64:'.length).toUpperCase()}`;

  return deepFreeze({
    schema: LFEA_NATIVE_RUN_RECORD_SCHEMA,
    runId,
    semanticHash: runSemanticHash,
    identity,
    evidence: {
      rawExecutionBatch: raw,
      recoveryBatch: recovery,
    },
  });
}

function relationToCurrent(record, context) {
  const preFlight = validatedPreFlight(context.preFlight);
  if (!preFlight) return LFEA_NATIVE_RUN_RELATION.STALE;

  const raw = context.executionState?.currentness === 'CURRENT'
    ? context.executionState.execution
    : null;
  const recovery = context.resultsState?.currentness === 'CURRENT'
    ? context.resultsState.results
    : null;
  if (raw && recovery
    && record.identity.rawExecution.executionBatchId === raw.executionBatchId
    && record.identity.rawExecution.semanticHash === raw.semanticHash
    && record.identity.recovery.recoveryBatchId === recovery.recoveryBatchId
    && record.identity.recovery.semanticHash === recovery.semanticHash) {
    return LFEA_NATIVE_RUN_RELATION.CURRENT;
  }
  return sameGovernedContext(record, preFlight, context.sourceSnapshot)
    ? LFEA_NATIVE_RUN_RELATION.HISTORIC
    : LFEA_NATIVE_RUN_RELATION.STALE;
}

function sameGovernedContext(record, preFlight, sourceSnapshot) {
  const authority = record.identity.authority;
  return record.identity.source.contentSha256 === text(sourceSnapshot?.contentSha256)
    && authority.preFlightSemanticHash === preFlight.semanticHash
    && authority.authorizationSemanticHash === preFlight.authorization?.semanticHash
    && authority.sourceBundleSemanticHash === preFlight.preparation.sourceBundleSemanticHash
    && authority.modelSemanticHash === preFlight.preparation.modelSemanticHash
    && authority.stiffnessStateHash === preFlight.preparation.stiffnessStateHash
    && authority.loadStateHash === preFlight.preparation.loadStateHash
    && authority.requestedProfileId === preFlight.preparation.requestedProfileId;
}

function requireCurrentRaw(state) {
  const raw = state?.currentness === 'CURRENT' ? state.execution : null;
  if (!raw || raw.schema !== 'fea-inputxml-linear-raw-execution-batch/v1') {
    throw historyError('LFEA_HISTORY_CURRENT_RAW_REQUIRED',
      'LFEA History can archive only a CURRENT governed native raw execution.');
  }
  if (!['QUALIFIED', 'CONDITIONAL'].includes(raw.status)) {
    throw historyError('LFEA_HISTORY_RAW_UNQUALIFIED',
      `Raw execution status ${raw.status ?? 'UNKNOWN'} cannot be archived as a qualified run.`);
  }
  return raw;
}

function requireCurrentRecovery(state, raw) {
  const recovery = state?.currentness === 'CURRENT' ? state.results : null;
  if (!recovery || recovery.schema !== 'fea-inputxml-linear-recovery-batch/v1') {
    throw historyError('LFEA_HISTORY_CURRENT_RECOVERY_REQUIRED',
      'LFEA History can archive only CURRENT governed recovered Results.');
  }
  if (recovery.rawExecutionBatchId !== raw.executionBatchId
    || recovery.rawExecutionBatchSemanticHash !== raw.semanticHash) {
    throw historyError('LFEA_HISTORY_RECOVERY_RAW_MISMATCH',
      'Recovered Results do not belong to the current raw execution batch.');
  }
  return recovery;
}

function requireLineage(preFlight, raw, recovery) {
  const preparation = preFlight.preparation;
  if (raw.preparationSemanticHash !== preparation.semanticHash
    || raw.authorizationSemanticHash !== preFlight.authorization?.semanticHash
    || raw.sourceBundleSemanticHash !== preparation.sourceBundleSemanticHash
    || raw.modelSemanticHash !== preparation.modelSemanticHash
    || raw.stiffnessStateHash !== preparation.stiffnessStateHash
    || raw.loadStateHash !== preparation.loadStateHash) {
    throw historyError('LFEA_HISTORY_RAW_LINEAGE_MISMATCH',
      'Raw execution lineage does not match the current governed pre-flight authority.');
  }
  if (recovery.preparationSemanticHash !== preparation.semanticHash
    || recovery.modelSemanticHash !== preparation.modelSemanticHash
    || recovery.stiffnessStateHash !== preparation.stiffnessStateHash
    || recovery.loadStateHash !== preparation.loadStateHash) {
    throw historyError('LFEA_HISTORY_RECOVERY_LINEAGE_MISMATCH',
      'Recovered Results lineage does not match the current governed preparation.');
  }
}

function sourceIdentity(snapshot, preFlight) {
  const sha = text(snapshot?.contentSha256);
  if (!sha) throw historyError('LFEA_HISTORY_SOURCE_IDENTITY_REQUIRED',
    'LFEA History requires the retained InputXML source content SHA.');
  if (snapshot?.preFlightSemanticHash !== preFlight.semanticHash
    || snapshot?.authorizationSemanticHash !== preFlight.authorization?.semanticHash) {
    throw historyError('LFEA_HISTORY_SOURCE_PREFLIGHT_MISMATCH',
      'The retained source snapshot does not belong to the governed pre-flight being archived.');
  }
  return {
    fileName: text(snapshot?.fileName),
    contentSha256: sha,
    sourceUnit: text(snapshot?.sourceUnit),
    sourceBundleSemanticHash: preFlight.preparation.sourceBundleSemanticHash,
  };
}

function authorityIdentity(preFlight) {
  const preparation = preFlight.preparation;
  return {
    preFlightSemanticHash: preFlight.semanticHash,
    preparationSemanticHash: preparation.semanticHash,
    authorizationSemanticHash: preFlight.authorization?.semanticHash ?? null,
    authorizationEvidenceHash: preFlight.authorization?.evidenceHash ?? null,
    sourceBundleSemanticHash: preparation.sourceBundleSemanticHash,
    modelSemanticHash: preparation.modelSemanticHash,
    stiffnessStateHash: preparation.stiffnessStateHash,
    loadStateHash: preparation.loadStateHash,
    requestedProfileId: preparation.requestedProfileId,
  };
}

function rawIdentity(raw) {
  return {
    executionBatchId: raw.executionBatchId,
    semanticHash: raw.semanticHash,
    status: raw.status,
    requestedCaseIds: [...raw.requestedCaseIds],
    frameElementProfileSemanticHash: raw.frameElementProfileSemanticHash,
    solverProfileSemanticHash: raw.solverProfileSemanticHash,
  };
}

function recoveryIdentity(recovery) {
  return {
    recoveryBatchId: recovery.recoveryBatchId,
    semanticHash: recovery.semanticHash,
    status: recovery.status,
    recoveryProfileSemanticHash: recovery.recoveryProfileSemanticHash,
    requestedCaseIds: [...recovery.requestedCaseIds],
  };
}

function applicationIdentityRecord(identity = {}) {
  const application = text(identity.application);
  const mode = text(identity.mode);
  const applicationVersion = text(identity.applicationVersion);
  if (application !== 'LFEA' || mode !== 'STANDALONE' || !applicationVersion) {
    throw historyError('LFEA_HISTORY_APPLICATION_IDENTITY_INVALID',
      'LFEA History requires explicit standalone LFEA application/version identity.');
  }
  return {
    application,
    mode,
    applicationVersion,
    buildSha: text(identity.buildSha),
    buildTime: text(identity.buildTime),
  };
}

function validatedPreFlight(value) {
  try { return value ? requireLinearPipingInputXmlPreFlight(value) : null; }
  catch { return null; }
}

function requireRecord(records, runId) {
  const normalized = String(runId ?? '');
  const record = records.find((candidate) => candidate.runId === normalized) ?? null;
  if (!record) throw historyError('LFEA_HISTORY_RUN_NOT_FOUND', `LFEA History run is not available: ${normalized}.`);
  return record;
}

function text(value) {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

function historyError(code, message) {
  const error = new TypeError(message);
  error.code = code;
  error.analysisStage = 'LFEA_NATIVE_RUN_HISTORY';
  return error;
}
