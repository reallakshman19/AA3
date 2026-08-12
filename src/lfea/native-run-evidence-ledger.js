import { semanticHash } from '../core/shared-piping-model/canonical-json.js';
import { deepFreeze } from '../core/shared-piping-model/immutable.js';
import { requireLfeaNativeB31Authorization } from './native-b31-authorization.js';
import { requireLfeaNativeSupportAuthorization } from './native-support-authorization.js';

export const LFEA_NATIVE_RUN_EVIDENCE_LEDGER_SCHEMA = 'lfea-native-run-evidence-ledger/v1';
export const LFEA_NATIVE_RUN_EVIDENCE_ATTACHMENT_SCHEMA = 'lfea-native-run-evidence-attachment/v1';
export const LFEA_NATIVE_RUN_EVIDENCE_KIND = Object.freeze({
  SUPPORT_ACTIONS: 'SUPPORT_ACTIONS',
  B31_CODE: 'B31_CODE',
});

/**
 * Append-only post-run engineering evidence. The archived run record remains
 * immutable; later governed publications are attached only when their retained
 * raw/recovery parents match that exact run.
 */
export function createLfeaNativeRunEvidenceLedger() {
  let attachments = Object.freeze([]);

  function attachSupport(runRecord, state) {
    return append(sealSupportAttachment(requireRun(runRecord), state));
  }

  function attachB31(runRecord, state) {
    return append(sealB31Attachment(requireRun(runRecord), state));
  }

  function append(attachment) {
    const existing = attachments.find((row) => row.semanticHash === attachment.semanticHash) ?? null;
    if (existing) return existing;
    attachments = Object.freeze([...attachments, attachment]);
    return attachment;
  }

  function getForRun(runId) {
    const normalized = requiredText(runId, 'runId');
    return Object.freeze(attachments.filter((row) => row.runId === normalized));
  }

  function getSnapshot() {
    return deepFreeze({
      schema: LFEA_NATIVE_RUN_EVIDENCE_LEDGER_SCHEMA,
      attachments,
    });
  }

  function clear() {
    attachments = Object.freeze([]);
  }

  return Object.freeze({ attachSupport, attachB31, getForRun, getSnapshot, clear });
}

function sealSupportAttachment(run, state) {
  requireCurrentPublicationState(state, 'SUPPORT_ACTIONS');
  requireReviewedSupportState(state);
  requireParentRunMatch(run, state.publicationParent, 'support');
  if (state.publicationParent.supportAuthoritySemanticHash !== state.authority.semanticHash) {
    throw ledgerError('LFEA_RUN_EVIDENCE_SUPPORT_AUTHORITY_MISMATCH',
      'Support publication authority identity does not match its retained publication parent.');
  }
  const evidence = deepFreeze({
    authority: state.authority,
    authorization: state.authorization,
    publications: state.publications,
  });
  return sealAttachment(run, LFEA_NATIVE_RUN_EVIDENCE_KIND.SUPPORT_ACTIONS, evidence, {
    authoritySemanticHash: state.authority.semanticHash,
    authorizationSemanticHash: state.authorization.semanticHash,
    publicationCount: state.publications.length,
  });
}

function sealB31Attachment(run, state) {
  requireCurrentPublicationState(state, 'B31_CODE');
  requireReviewedB31State(state);
  requireParentRunMatch(run, state.publicationParent, 'B31');
  if (state.publicationParent.b31AuthoritySemanticHash !== state.authority.semanticHash) {
    throw ledgerError('LFEA_RUN_EVIDENCE_B31_AUTHORITY_MISMATCH',
      'B31 publication authority identity does not match its retained publication parent.');
  }
  if (!state.application || !Array.isArray(state.codeRecoveries)) {
    throw ledgerError('LFEA_RUN_EVIDENCE_B31_PUBLICATION_INCOMPLETE',
      'Current B31 publication lacks retained application/code-recovery evidence.');
  }
  const evidence = deepFreeze({
    authority: state.authority,
    authorization: state.authorization,
    codeRecoveries: state.codeRecoveries,
    application: state.application,
  });
  return sealAttachment(run, LFEA_NATIVE_RUN_EVIDENCE_KIND.B31_CODE, evidence, {
    authoritySemanticHash: state.authority.semanticHash,
    authorizationSemanticHash: state.authorization.semanticHash,
    applicationSemanticHash: state.application.semanticHash,
    applicationEvidenceHash: state.application.evidenceHash,
    codeResultCount: state.application.results.length,
  });
}

function sealAttachment(run, kind, evidence, summary) {
  const base = {
    schema: LFEA_NATIVE_RUN_EVIDENCE_ATTACHMENT_SCHEMA,
    runId: run.runId,
    runSemanticHash: run.semanticHash,
    kind,
    parentRawExecutionSemanticHash: run.identity.rawExecution.semanticHash,
    parentRecoveryBatchSemanticHash: run.identity.recovery.semanticHash,
    summary: deepFreeze({ ...summary }),
    evidence,
  };
  return deepFreeze({ ...base, semanticHash: semanticHash(base) });
}

function requireReviewedSupportState(state) {
  try {
    requireLfeaNativeSupportAuthorization(state.authorization, state.authority);
  } catch (cause) {
    throw ledgerError('LFEA_RUN_EVIDENCE_SUPPORT_REVIEW_INVALID',
      `Support review authorization is invalid: ${cause?.code ?? 'UNKNOWN_REVIEW_ERROR'}`);
  }
}

function requireReviewedB31State(state) {
  try {
    requireLfeaNativeB31Authorization(state.authorization, state.authority);
  } catch (cause) {
    throw ledgerError('LFEA_RUN_EVIDENCE_B31_REVIEW_INVALID',
      `B31 review authorization is invalid: ${cause?.code ?? 'UNKNOWN_REVIEW_ERROR'}`);
  }
}

function requireCurrentPublicationState(state, label) {
  if (!state || state.authorityCurrentness !== 'CURRENT'
    || state.publicationCurrentness !== 'CURRENT'
    || !state.authority || !state.authorization || !state.publicationParent) {
    throw ledgerError('LFEA_RUN_EVIDENCE_CURRENT_PUBLICATION_REQUIRED',
      `${label} attachment requires one CURRENT reviewed publication state.`);
  }
  if (label === 'SUPPORT_ACTIONS' && !Array.isArray(state.publications)) {
    throw ledgerError('LFEA_RUN_EVIDENCE_SUPPORT_PUBLICATION_INCOMPLETE',
      'Current support publication lacks retained case publications.');
  }
}

function requireParentRunMatch(run, parent, label) {
  if (parent.rawExecutionSemanticHash !== run.identity.rawExecution.semanticHash
    || parent.recoveryBatchSemanticHash !== run.identity.recovery.semanticHash) {
    throw ledgerError('LFEA_RUN_EVIDENCE_PARENT_RUN_MISMATCH',
      `${label} publication does not belong to the exact archived run evidence.`);
  }
}

function requireRun(record) {
  if (!record || record.schema !== 'lfea-native-run-record/v1') {
    throw ledgerError('LFEA_RUN_EVIDENCE_RUN_REQUIRED',
      'Run evidence attachment requires an archived native run record.');
  }
  requiredText(record.runId, 'runRecord.runId');
  requireHash(record.semanticHash, 'runRecord.semanticHash');
  requireHash(record.identity?.rawExecution?.semanticHash, 'runRecord.identity.rawExecution.semanticHash');
  requireHash(record.identity?.recovery?.semanticHash, 'runRecord.identity.recovery.semanticHash');
  const expectedHash = semanticHash(record.identity);
  const expectedRunId = `LFEA-RUN-${expectedHash.slice('fnv1a64:'.length).toUpperCase()}`;
  if (record.semanticHash !== expectedHash || record.runId !== expectedRunId) {
    throw ledgerError('LFEA_RUN_EVIDENCE_RUN_IDENTITY_MISMATCH',
      'Run record semantic hash/run ID does not match its retained identity.');
  }
  return record;
}

function requiredText(value, field) {
  const text = String(value ?? '').trim();
  if (!text) throw ledgerError('LFEA_RUN_EVIDENCE_INVALID', `${field} is required.`);
  return text;
}
function requireHash(value, field) {
  if (typeof value !== 'string' || !/^fnv1a64:[0-9a-f]{16}$/u.test(value)) {
    throw ledgerError('LFEA_RUN_EVIDENCE_INVALID', `${field} must be a semantic hash.`);
  }
}
function ledgerError(code, message) {
  const error = new TypeError(message);
  error.code = code;
  error.analysisStage = 'LFEA_NATIVE_RUN_EVIDENCE';
  return error;
}
