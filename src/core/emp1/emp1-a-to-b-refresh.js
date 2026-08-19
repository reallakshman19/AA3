import { semanticHash } from '../shared-primitives/canonical-json.js';
import {
  SOURCE_SCHEMA,
  createLocalAttachmentScreeningRequest,
} from '../local-attachment-screening/index.js';

export const EMP1_B_SOURCE_CUSTODY_STATES = Object.freeze({
  MISSING: 'MISSING_A_EVIDENCE_SNAPSHOT',
  A_NOT_QUALIFIED: 'A_NOT_CURRENTLY_QUALIFIED',
  CURRENT: 'CURRENT_A_EVIDENCE',
  STALE_REFRESH_AVAILABLE: 'STALE_A_EVIDENCE_REFRESH_AVAILABLE',
  STALE_REFRESH_BLOCKED: 'STALE_A_EVIDENCE_REFRESH_BLOCKED',
});

export function refreshEmp1BSourceEvidence(options) {
  const aDocument = requireRecord(options?.aDocument, 'EMP1_A_DOCUMENT_REQUIRED');
  const aExecution = requireCurrentQualifiedAExecution(aDocument, options?.aExecution);
  const bDocument = requireRecord(options?.bDocument, 'EMP1_B_DOCUMENT_REQUIRED');
  const rawB = stripScreeningDerivedFields(bDocument);
  rawB.sourceEvidence = {
    schema: SOURCE_SCHEMA,
    foundationModel: aDocument,
    foundationResult: aExecution.result,
  };
  return createLocalAttachmentScreeningRequest(rawB);
}

export function evaluateEmp1BSourceRefresh(options) {
  try {
    return Object.freeze({
      status: 'READY',
      code: null,
      message: null,
      document: refreshEmp1BSourceEvidence(options),
    });
  } catch (error) {
    return Object.freeze({
      status: 'BLOCKED',
      code: typeof error?.code === 'string' ? error.code : 'EMP1_A_TO_B_REFRESH_REJECTED',
      message: error instanceof Error ? error.message : 'EMP.1 A-to-B evidence refresh was rejected.',
      document: null,
    });
  }
}

export function classifyEmp1BSourceCustody(options) {
  const aDocument = options?.aDocument;
  const aExecution = options?.aExecution;
  const bDocument = options?.bDocument;
  if (!bDocument?.sourceEvidence?.foundationResult) {
    return custody(EMP1_B_SOURCE_CUSTODY_STATES.MISSING, false, null);
  }
  if (!isCurrentQualifiedA(aDocument, aExecution)) {
    return custody(EMP1_B_SOURCE_CUSTODY_STATES.A_NOT_QUALIFIED, false, 'EMP1_A_CURRENT_QUALIFIED_RESULT_REQUIRED');
  }
  if (sameEvidence(bDocument.sourceEvidence, aDocument, aExecution.result)) {
    return custody(EMP1_B_SOURCE_CUSTODY_STATES.CURRENT, false, null);
  }
  const refresh = evaluateEmp1BSourceRefresh({ aDocument, aExecution, bDocument });
  if (refresh.status === 'READY') {
    return custody(EMP1_B_SOURCE_CUSTODY_STATES.STALE_REFRESH_AVAILABLE, true, null);
  }
  return custody(EMP1_B_SOURCE_CUSTODY_STATES.STALE_REFRESH_BLOCKED, false, refresh.code);
}

function requireCurrentQualifiedAExecution(aDocument, value) {
  if (!isCurrentQualifiedA(aDocument, value)) {
    fail('EMP1_A_CURRENT_QUALIFIED_RESULT_REQUIRED',
      'EMP.1.B refresh requires the current qualified EMP.1.A result for the retained A document.');
  }
  return value;
}

function isCurrentQualifiedA(aDocument, execution) {
  if (!aDocument || typeof aDocument !== 'object'
    || execution?.stageId !== 'LAFEA.1'
    || execution?.status !== 'QUALIFIED'
    || execution?.result?.qualification?.state !== 'ACCEPTED'
    || !execution?.source) return false;
  try {
    return semanticHash(execution.source) === semanticHash(aDocument);
  } catch {
    return false;
  }
}

function sameEvidence(sourceEvidence, aDocument, aResult) {
  try {
    return semanticHash(sourceEvidence.foundationModel) === semanticHash(aDocument)
      && semanticHash(sourceEvidence.foundationResult) === semanticHash(aResult);
  } catch {
    return false;
  }
}

function stripScreeningDerivedFields(value) {
  const { semanticHash: _semanticHash, ...raw } = value;
  if (!Array.isArray(raw.evaluationLocations)) return { ...raw };
  return {
    ...raw,
    evaluationLocations: raw.evaluationLocations.map(({ radius: _radius, ...row }) => row),
  };
}

function requireRecord(value, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(code, code === 'EMP1_A_DOCUMENT_REQUIRED'
      ? 'A retained source document is required.'
      : 'A retained EMP.1.B request is required so B-owned screening inputs are never invented.');
  }
  return value;
}

function custody(state, canRefresh, blockerCode) {
  return Object.freeze({ state, canRefresh, blockerCode });
}

function fail(code, message) {
  const error = new TypeError(`${code}:${message}`);
  error.code = code;
  throw error;
}
