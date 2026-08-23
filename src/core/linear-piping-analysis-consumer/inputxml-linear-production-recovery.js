import {
  compileResultRecovery,
  requireResultRecovery,
} from '../linear-fea-result-recovery/index.js';
import { requireSolverExecution } from '../linear-fea-solver/index.js';
import { semanticHash } from '../shared-piping-model/canonical-json.js';
import { deepFreeze } from '../shared-piping-model/immutable.js';
import { compileInputXmlExecutionElementAuthorities } from './inputxml-linear-execution-elements.js';
import { requireInputXmlLinearPreFeaPreparation } from './inputxml-linear-prefea-preparation.js';
import { rawExecutionSemanticProjection } from './inputxml-linear-production-executor.js';
import { inputXmlProductionRecoveryProfile } from './inputxml-linear-recovery-profile.js';
import { inputXmlStiffnessFrameElementProfile } from './inputxml-linear-stiffness-profile.js';
import { PRODUCTION_CAPABILITY_PROFILE } from './production-capability-profile.js';

export const INPUTXML_LINEAR_RECOVERY_BATCH_SCHEMA =
  'fea-inputxml-linear-recovery-batch/v1';

/** Recover only the exact raw cases already solved under governed preparation. */
export function recoverInputXmlAuthorizedRawCases({ preparation, rawExecutionBatch }) {
  const accepted = requireInputXmlLinearPreFeaPreparation(preparation);
  const raw = requireRawBatch(rawExecutionBatch, accepted);
  const frameProfile = inputXmlStiffnessFrameElementProfile();
  const recoveryProfile = inputXmlProductionRecoveryProfile();
  requireProfileCustody(raw, accepted, frameProfile);

  const physicalById = new Map((accepted.physicalPreparation?.physicalCases ?? [])
    .map((row) => [row.caseId, row]));
  const caseRecoveries = raw.caseExecutions.map((row) => recoverCase({
    accepted,
    row,
    physical: physicalById.get(row.caseId),
    frameProfile,
    recoveryProfile,
  }));

  const identity = batchIdentity(accepted, raw, recoveryProfile, caseRecoveries);
  const recoveryBatchId = `IXREC-${semanticHash(identity).slice('fnv1a64:'.length).toUpperCase()}`;
  const draft = { ...identity, recoveryBatchId, caseRecoveries, semanticHash: '' };
  draft.semanticHash = semanticHash(recoveryBatchSemanticProjection(draft));
  return deepFreeze(draft);
}

export function recoveryBatchSemanticProjection(record) {
  return {
    schema: record.schema,
    recoveryBatchId: record.recoveryBatchId,
    rawExecutionBatchId: record.rawExecutionBatchId,
    rawExecutionBatchSemanticHash: record.rawExecutionBatchSemanticHash,
    preparationSemanticHash: record.preparationSemanticHash,
    sourceBundleSemanticHash: record.sourceBundleSemanticHash,
    modelSemanticHash: record.modelSemanticHash,
    stiffnessStateHash: record.stiffnessStateHash,
    loadStateHash: record.loadStateHash,
    recoveryProfile: record.recoveryProfile,
    recoveryProfileSemanticHash: record.recoveryProfileSemanticHash,
    requestedCaseIds: record.requestedCaseIds,
    caseRecoveries: record.caseRecoveries.map(caseIdentity),
    status: record.status,
  };
}

function recoverCase({ accepted, row, physical, frameProfile, recoveryProfile }) {
  if (!physical) {
    throw recoveryError('INPUTXML_RECOVERY_CASE_MISSING',
      `Raw case ${row.caseId} is missing from current retained physical preparation.`);
  }
  const execution = requireSolverExecution(row.execution);
  requireCaseCustody(row, physical, execution);
  const elements = compileInputXmlExecutionElementAuthorities(
    accepted.structuralPreparation,
    frameProfile,
    physical.loadCase,
    {
      sourcePreparation: accepted.sourcePreparation,
      bendFactorAuthority: accepted.stiffnessPreflight.bendFactorAuthority,
      capabilityProfile: PRODUCTION_CAPABILITY_PROFILE,
    },
  );
  requireEffectiveStiffnessCustody(accepted, elements);
  requireElementLedgerCustody(row, elements.elementLedger);
  const recovery = requireResultRecovery(compileResultRecovery({
    compilation: accepted.structuralPreparation.compilation,
    execution,
    loadCase: physical.loadCase,
    frameElements: elements.frameElements,
    pipingComponents: elements.pipingComponents,
    recoveryProfile,
  }));
  return {
    caseId: row.caseId,
    caseRole: row.caseRole,
    physicalLoadCaseHash: row.physicalLoadCaseHash,
    executionHash: execution.executionHash,
    executionStatus: execution.status,
    recovery,
    recoveryHash: recovery.recoveryHash,
    recoverySemanticHash: recovery.semanticHash,
    recoveryEvidenceHash: recovery.evidenceHash,
  };
}

function requireRawBatch(raw, preparation) {
  if (!raw || raw.schema !== 'fea-inputxml-linear-raw-execution-batch/v1') {
    throw recoveryError('INPUTXML_RECOVERY_RAW_BATCH_INVALID', 'A governed native raw execution batch is required.');
  }
  if (!['QUALIFIED', 'CONDITIONAL'].includes(raw.status)) {
    throw recoveryError('INPUTXML_RECOVERY_RAW_BATCH_UNQUALIFIED',
      `Raw execution batch status ${raw.status ?? 'UNKNOWN'} cannot authorize recovery.`);
  }
  if (raw.preparationSemanticHash !== preparation.semanticHash
    || raw.modelSemanticHash !== preparation.modelSemanticHash
    || raw.stiffnessStateHash !== preparation.stiffnessStateHash
    || raw.loadStateHash !== preparation.loadStateHash) {
    throw recoveryError('INPUTXML_RECOVERY_RAW_BATCH_STALE',
      'Raw execution batch does not match the supplied governed preparation.');
  }
  if (raw.semanticHash !== semanticHash(rawExecutionSemanticProjection(raw))) {
    throw recoveryError('INPUTXML_RECOVERY_RAW_BATCH_HASH_MISMATCH', 'Raw execution batch semantic hash is stale.');
  }
  if (!Array.isArray(raw.caseExecutions) || raw.caseExecutions.length === 0) {
    throw recoveryError('INPUTXML_RECOVERY_CASE_SET_EMPTY', 'Raw execution batch contains no solved physical case.');
  }
  return raw;
}

function requireProfileCustody(raw, preparation, frameProfile) {
  const preflight = preparation.stiffnessPreflight;
  const qualifiedHash = preflight?.frameElementProfileSemanticHash;
  if (raw.frameElementProfileSemanticHash !== frameProfile.semanticHash
    || qualifiedHash !== frameProfile.semanticHash) {
    throw recoveryError('INPUTXML_RECOVERY_FRAME_PROFILE_STALE',
      'Recovery frame-element profile is not the profile qualified and used by raw execution.');
  }
  const currentCapability = semanticHash(PRODUCTION_CAPABILITY_PROFILE);
  if (preflight.productionCapabilityProfileHash !== currentCapability) {
    throw recoveryError('INPUTXML_RECOVERY_CAPABILITY_PROFILE_STALE',
      'Production component capability changed after the solved pre-flight.');
  }
}

function requireEffectiveStiffnessCustody(preparation, elements) {
  const rebuilt = elements.bendExactMechanicsApplied
    ? elements.effectiveStiffnessStateHash
    : preparation.structuralPreparation.compilation.stiffnessStateHash;
  if (rebuilt !== preparation.stiffnessStateHash
    || rebuilt !== preparation.stiffnessPreflight.effectiveStiffnessStateHash) {
    throw recoveryError(
      'INPUTXML_RECOVERY_EFFECTIVE_STIFFNESS_STALE',
      'Recovery rebuilt a different effective stiffness authority from the solved preparation.',
    );
  }
}

function requireCaseCustody(row, physical, execution) {
  if (row.physicalLoadCaseHash !== physical.loadCase.physicalLoadCaseHash
    || row.loadCaseSemanticHash !== physical.loadCase.semanticHash
    || execution.physicalLoadCaseHash !== row.physicalLoadCaseHash
    || execution.executionHash !== row.executionHash) {
    throw recoveryError('INPUTXML_RECOVERY_CASE_IDENTITY_STALE',
      `Raw case ${row.caseId} does not match current physical-case/execution custody.`);
  }
  if (!['QUALIFIED', 'CONDITIONAL'].includes(execution.status)) {
    throw recoveryError('INPUTXML_RECOVERY_EXECUTION_UNQUALIFIED',
      `Raw case ${row.caseId} execution status ${execution.status} cannot authorize recovery.`);
  }
}

function requireElementLedgerCustody(row, rebuiltLedger) {
  if (!Array.isArray(row.elementLedger)
    || semanticHash(row.elementLedger) !== semanticHash(rebuiltLedger)) {
    throw recoveryError('INPUTXML_RECOVERY_ELEMENT_LEDGER_MISMATCH',
      `Raw case ${row.caseId} element authority does not match recovery reconstruction.`);
  }
}

function batchIdentity(preparation, raw, recoveryProfile, cases) {
  return {
    schema: INPUTXML_LINEAR_RECOVERY_BATCH_SCHEMA,
    rawExecutionBatchId: raw.executionBatchId,
    rawExecutionBatchSemanticHash: raw.semanticHash,
    preparationSemanticHash: preparation.semanticHash,
    sourceBundleSemanticHash: preparation.sourceBundleSemanticHash,
    modelSemanticHash: preparation.modelSemanticHash,
    stiffnessStateHash: preparation.stiffnessStateHash,
    loadStateHash: preparation.loadStateHash,
    recoveryProfile,
    recoveryProfileSemanticHash: recoveryProfile.semanticHash,
    requestedCaseIds: [...raw.requestedCaseIds],
    caseRecoveries: cases.map(caseIdentity),
    status: aggregateStatus(cases.map((row) => row.executionStatus)),
  };
}

function caseIdentity(row) {
  return {
    caseId: row.caseId,
    caseRole: row.caseRole,
    physicalLoadCaseHash: row.physicalLoadCaseHash,
    executionHash: row.executionHash,
    executionStatus: row.executionStatus,
    recoveryHash: row.recoveryHash,
    recoverySemanticHash: row.recoverySemanticHash,
    recoveryEvidenceHash: row.recoveryEvidenceHash,
  };
}

function aggregateStatus(statuses) {
  return statuses.some((status) => status === 'CONDITIONAL') ? 'CONDITIONAL' : 'QUALIFIED';
}

function recoveryError(code, message) {
  const error = new TypeError(message);
  error.code = code;
  error.analysisStage = 'INPUTXML_GOVERNED_RECOVERY';
  return error;
}
