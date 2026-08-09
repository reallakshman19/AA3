import { semanticHash } from '../core/shared-piping-model/canonical-json.js';
import {
  DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE,
  INPUTXML_LINEAR_PREFEA_REQUEST_SCHEMA,
  STRICT_INPUTXML_LINEAR_STATIC_PROFILE,
  authorizeInputXmlLinearSolve,
  diagnoseInputXmlLinearPreFea,
  prepareInputXmlLinearPreFea,
  requireInputXmlLinearPreFeaPreparation,
  requireInputXmlLinearSolveAuthorization,
} from '../core/linear-piping-analysis-consumer/index.js';
import { requireLinearPipingWorkbenchRunRequest } from './linear-piping-run-request.js';

export const LINEAR_PIPING_RUN_GATE_SCHEMA = 'linear-piping-workbench-run-gate/v1';
export const LINEAR_PIPING_RUN_GATE_PROFILE_IDS = Object.freeze([
  STRICT_INPUTXML_LINEAR_STATIC_PROFILE,
  DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE,
]);

const GATE_KEYS = Object.freeze([
  'schema',
  'applicationId',
  'runRequestSemanticHash',
  'requestedProfileId',
  'status',
  'solveAuthorized',
  'sourceBundleSemanticHashes',
  'cases',
  'semanticHash',
]);
const GATE_CASE_KEYS = Object.freeze([
  'caseId',
  'status',
  'diagnosticsId',
  'diagnosticsSemanticHash',
  'diagnosticsEvidenceHash',
  'preparationId',
  'preparationSemanticHash',
  'preparationEvidenceHash',
  'sourceBundleSemanticHash',
  'sourceBundleEvidenceHash',
  'blockingFindingIds',
  'conditionalFindingIds',
  'limitations',
  'authorizationId',
  'authorizationSemanticHash',
  'authorizationEvidenceHash',
  'approverIdentity',
  'limitationsAccepted',
  'summary',
  'findings',
  'error',
  'preparation',
  'authorization',
]);
const WARN_AUTHORIZATION_KEYS = Object.freeze(['approverIdentity', 'reason']);
const INVALIDATION_POLICY = 'INVALIDATE_ON_PARENT_IDENTITY_CHANGE';

/**
 * Build a runtime-free gate candidate for one exact workbench request.
 *
 * Diagnostics and preparation are executed here, but solver runtime creation
 * remains below solveInputXmlLinearAnalysis. PASS preparations receive the
 * existing automatic authorization. WARN preparations retain no authorization
 * until an engineer explicitly accepts the complete limitation set. BLOCK
 * preparations can never receive an authorization.
 */
export function createLinearPipingRunGate(value, options) {
  if (options === undefined) options = {};
  const accepted = requireLinearPipingWorkbenchRunRequest(value);
  const requestedProfileId = options.requestedProfileId
    ?? STRICT_INPUTXML_LINEAR_STATIC_PROFILE;
  requireProfile(requestedProfileId);
  const diagnose = options.diagnose ?? diagnoseInputXmlLinearPreFea;
  const prepare = options.prepare ?? prepareInputXmlLinearPreFea;
  const authorize = options.authorize ?? authorizeInputXmlLinearSolve;
  const cases = accepted.cases.map((entry) => prepareCase(
    entry,
    requestedProfileId,
    { diagnose, prepare, authorize },
  ));
  return sealGate({
    schema: LINEAR_PIPING_RUN_GATE_SCHEMA,
    applicationId: accepted.applicationId,
    runRequestSemanticHash: semanticHash(accepted),
    requestedProfileId,
    status: foldRunStatus(cases),
    solveAuthorized: cases.every((entry) => entry.authorization !== null),
    sourceBundleSemanticHashes: uniqueAscii(cases
      .map((entry) => entry.sourceBundleSemanticHash).filter((value) => value !== null)),
    cases,
    semanticHash: '',
  });
}

/**
 * Seal explicit engineer acceptance for every WARN case in a gate candidate.
 * The complete retained limitation and warning-finding sets are supplied to
 * the existing core authorization contract; callers cannot approve a subset.
 */
export function authorizeLinearPipingRunGate(record, approval, options) {
  if (options === undefined) options = {};
  const accepted = requireGateEnvelope(record);
  if (accepted.status === 'BLOCK') {
    failGate('PIPING_RUN_GATE_BLOCK_OVERRIDE_PROHIBITED',
      'A BLOCK run gate cannot be authorized.', {
        blockingFindingIds: uniqueAscii(accepted.cases.flatMap((entry) => entry.blockingFindingIds)),
      });
  }
  if (accepted.solveAuthorized) return accepted;
  const reviewer = requireWarnApproval(approval);
  const authorize = options.authorize ?? authorizeInputXmlLinearSolve;
  const cases = accepted.cases.map((entry) => {
    if (entry.status === 'PASS') return entry;
    if (entry.status !== 'WARN' || entry.preparation === null) {
      failGate('PIPING_RUN_GATE_CASE_NOT_AUTHORIZABLE',
        `Case ${entry.caseId} is not eligible for conditional authorization.`, {
          caseId: entry.caseId,
          status: entry.status,
        });
    }
    const preparation = requireInputXmlLinearPreFeaPreparation(entry.preparation);
    const warningFindingIds = uniqueAscii(preparation.findings
      .filter((finding) => finding.disposition === 'CONDITIONAL')
      .map((finding) => finding.findingId));
    const limitationsAccepted = conditionalLimitations(preparation);
    const authorization = authorize(preparation, {
      authorizationSource: 'LFEA_WORKSPACE_CONDITIONAL_REVIEW_V1',
      authorizationRevision: '1',
      approverIdentity: reviewer.approverIdentity,
      reason: reviewer.reason,
      limitationsAccepted,
      authorizedPhysicalCaseIds: [entry.caseId],
      warningFindingIds,
      invalidationPolicy: INVALIDATION_POLICY,
      expiration: null,
    });
    return caseRecord({
      caseId: entry.caseId,
      status: entry.status,
      diagnostics: null,
      preparation,
      authorization,
      summary: entry.summary,
      findings: entry.findings,
      error: null,
      retainedDiagnostics: entry,
    });
  });
  return sealGate({
    schema: accepted.schema,
    applicationId: accepted.applicationId,
    runRequestSemanticHash: accepted.runRequestSemanticHash,
    requestedProfileId: accepted.requestedProfileId,
    status: accepted.status,
    solveAuthorized: cases.every((entry) => entry.authorization !== null),
    sourceBundleSemanticHashes: accepted.sourceBundleSemanticHashes,
    cases,
    semanticHash: '',
  });
}

/**
 * Validate a gate immediately before runtime creation. Request tamper, profile
 * drift, preparation tamper, authorization tamper, stale parent identity,
 * partial WARN acceptance, or an unauthorized case all fail closed here.
 */
export function requireLinearPipingRunGate(record, value) {
  const accepted = requireGateEnvelope(record);
  const runRequest = requireLinearPipingWorkbenchRunRequest(value);
  const currentRequestHash = semanticHash(runRequest);
  if (accepted.applicationId !== runRequest.applicationId
    || accepted.runRequestSemanticHash !== currentRequestHash) {
    failGate('PIPING_RUN_GATE_STALE',
      'The Run authorization belongs to a different or modified workbench request.', {
        authorizedApplicationId: accepted.applicationId,
        currentApplicationId: runRequest.applicationId,
        authorizedRunRequestSemanticHash: accepted.runRequestSemanticHash,
        currentRunRequestSemanticHash: currentRequestHash,
      });
  }
  if (accepted.status === 'BLOCK') {
    failGate('PIPING_RUN_GATE_BLOCKED', 'The pre-FEA gate is BLOCK; solver runtime is prohibited.');
  }
  if (!accepted.solveAuthorized) {
    failGate('PIPING_RUN_GATE_AUTHORIZATION_REQUIRED',
      'The pre-FEA gate is not fully authorized. WARN limitations require explicit acceptance.');
  }
  const requestCaseIds = uniqueAscii(runRequest.cases.map((entry) => entry.caseId));
  const gateCaseIds = uniqueAscii(accepted.cases.map((entry) => entry.caseId));
  requireEqualSets(gateCaseIds, requestCaseIds, 'PIPING_RUN_GATE_CASE_SET_STALE');
  for (const entry of accepted.cases) {
    if (entry.preparation === null || entry.authorization === null) {
      failGate('PIPING_RUN_GATE_AUTHORIZATION_REQUIRED',
        `Case ${entry.caseId} has no complete preparation and authorization receipt.`);
    }
    const preparation = requireInputXmlLinearPreFeaPreparation(entry.preparation);
    if (preparation.status !== entry.status
      || preparation.semanticHash !== entry.preparationSemanticHash
      || preparation.evidenceHash !== entry.preparationEvidenceHash
      || preparation.requestedProfileId !== accepted.requestedProfileId) {
      failGate('PIPING_RUN_GATE_PREPARATION_STALE',
        `Prepared case ${entry.caseId} no longer matches the gate receipt.`);
    }
    const authorization = requireInputXmlLinearSolveAuthorization(
      entry.authorization,
      preparation,
      [entry.caseId],
    );
    if (authorization.semanticHash !== entry.authorizationSemanticHash
      || authorization.evidenceHash !== entry.authorizationEvidenceHash) {
      failGate('PIPING_RUN_GATE_AUTHORIZATION_STALE',
        `Authorization for case ${entry.caseId} no longer matches the gate receipt.`);
    }
  }
  return accepted;
}

function prepareCase(entry, requestedProfileId, operations) {
  try {
    const diagnostics = operations.diagnose({
      schema: INPUTXML_LINEAR_PREFEA_REQUEST_SCHEMA,
      analysisRequest: entry.inputXmlAnalysisRequest,
      requestedProfileId,
      requestedCaseIds: [entry.caseId],
    });
    const preparation = operations.prepare(diagnostics);
    const authorization = preparation.status === 'PASS'
      ? operations.authorize(preparation)
      : null;
    return caseRecord({
      caseId: entry.caseId,
      status: preparation.status,
      diagnostics,
      preparation,
      authorization,
      summary: preparation.summary ?? diagnostics.summary,
      findings: preparation.findings.filter((finding) => finding.disposition !== 'PASS'),
      error: null,
      retainedDiagnostics: null,
    });
  } catch (error) {
    return caseRecord({
      caseId: entry.caseId,
      status: 'BLOCK',
      diagnostics: null,
      preparation: null,
      authorization: null,
      summary: null,
      findings: [],
      error: Object.freeze({
        code: error?.code ?? 'PIPING_RUN_GATE_PREPARATION_FAILED',
        message: error?.message ?? String(error),
      }),
      retainedDiagnostics: null,
    });
  }
}

function caseRecord({
  caseId,
  status,
  diagnostics,
  preparation,
  authorization,
  summary,
  findings,
  error,
  retainedDiagnostics,
}) {
  const retained = retainedDiagnostics ?? {};
  const blockingFindingIds = preparation === null
    ? Object.freeze([...(retained.blockingFindingIds ?? [])])
    : uniqueAscii(preparation.findings
      .filter((finding) => finding.disposition === 'BLOCK')
      .map((finding) => finding.findingId));
  const conditionalFindingIds = preparation === null
    ? Object.freeze([...(retained.conditionalFindingIds ?? [])])
    : uniqueAscii(preparation.findings
      .filter((finding) => finding.disposition === 'CONDITIONAL')
      .map((finding) => finding.findingId));
  const limitations = preparation === null
    ? Object.freeze([...(retained.limitations ?? [])])
    : conditionalLimitations(preparation);
  return Object.freeze({
    caseId,
    status,
    diagnosticsId: diagnostics?.diagnosticsId ?? retained.diagnosticsId ?? null,
    diagnosticsSemanticHash: diagnostics?.semanticHash ?? retained.diagnosticsSemanticHash ?? null,
    diagnosticsEvidenceHash: diagnostics?.evidenceHash ?? retained.diagnosticsEvidenceHash ?? null,
    preparationId: preparation?.preparationId ?? retained.preparationId ?? null,
    preparationSemanticHash: preparation?.semanticHash ?? retained.preparationSemanticHash ?? null,
    preparationEvidenceHash: preparation?.evidenceHash ?? retained.preparationEvidenceHash ?? null,
    sourceBundleSemanticHash: preparation?.sourceBundleSemanticHash
      ?? retained.sourceBundleSemanticHash ?? null,
    sourceBundleEvidenceHash: preparation?.sourceBundleEvidenceHash
      ?? retained.sourceBundleEvidenceHash ?? null,
    blockingFindingIds,
    conditionalFindingIds,
    limitations,
    authorizationId: authorization?.authorizationId ?? null,
    authorizationSemanticHash: authorization?.semanticHash ?? null,
    authorizationEvidenceHash: authorization?.evidenceHash ?? null,
    approverIdentity: authorization?.approverIdentity ?? null,
    limitationsAccepted: Object.freeze([...(authorization?.limitationsAccepted ?? [])]),
    summary,
    findings: Object.freeze([...findings]),
    error,
    preparation,
    authorization,
  });
}

function conditionalLimitations(preparation) {
  return uniqueAscii([
    ...(preparation.limitations ?? []),
    ...preparation.findings
      .filter((finding) => finding.disposition === 'CONDITIONAL')
      .map((finding) => finding.code),
  ]);
}

function sealGate(record) {
  const sealed = {
    ...record,
    sourceBundleSemanticHashes: Object.freeze([...record.sourceBundleSemanticHashes]),
    cases: Object.freeze([...record.cases]),
  };
  sealed.semanticHash = semanticHash(gateIdentity(sealed));
  return Object.freeze(sealed);
}

function requireGateEnvelope(record) {
  requireRecord(record, 'runGate');
  requireExactKeys(record, GATE_KEYS, 'runGate');
  if (record.schema !== LINEAR_PIPING_RUN_GATE_SCHEMA) {
    failGate('PIPING_RUN_GATE_SCHEMA_INVALID',
      `runGate.schema must be ${LINEAR_PIPING_RUN_GATE_SCHEMA}.`);
  }
  requireProfile(record.requestedProfileId);
  if (!['PASS', 'WARN', 'BLOCK'].includes(record.status)) {
    failGate('PIPING_RUN_GATE_STATUS_INVALID', 'runGate.status is invalid.');
  }
  if (typeof record.solveAuthorized !== 'boolean') {
    failGate('PIPING_RUN_GATE_AUTHORIZATION_FLAG_INVALID', 'runGate.solveAuthorized must be boolean.');
  }
  if (!Array.isArray(record.sourceBundleSemanticHashes) || !Array.isArray(record.cases)) {
    failGate('PIPING_RUN_GATE_ARRAY_INVALID', 'Run gate source hashes and cases must be arrays.');
  }
  for (const entry of record.cases) {
    requireRecord(entry, 'runGate.case');
    requireExactKeys(entry, GATE_CASE_KEYS, 'runGate.case');
  }
  const expectedHash = semanticHash(gateIdentity(record));
  if (record.semanticHash !== expectedHash) {
    failGate('PIPING_RUN_GATE_HASH_INVALID', 'The run gate receipt semantic hash is invalid.', {
      expected: expectedHash,
      actual: record.semanticHash,
    });
  }
  return record;
}

function gateIdentity(record) {
  return {
    schema: record.schema,
    applicationId: record.applicationId,
    runRequestSemanticHash: record.runRequestSemanticHash,
    requestedProfileId: record.requestedProfileId,
    status: record.status,
    solveAuthorized: record.solveAuthorized,
    sourceBundleSemanticHashes: record.sourceBundleSemanticHashes,
    cases: record.cases.map((entry) => ({
      caseId: entry.caseId,
      status: entry.status,
      diagnosticsId: entry.diagnosticsId,
      diagnosticsSemanticHash: entry.diagnosticsSemanticHash,
      diagnosticsEvidenceHash: entry.diagnosticsEvidenceHash,
      preparationId: entry.preparationId,
      preparationSemanticHash: entry.preparationSemanticHash,
      preparationEvidenceHash: entry.preparationEvidenceHash,
      sourceBundleSemanticHash: entry.sourceBundleSemanticHash,
      sourceBundleEvidenceHash: entry.sourceBundleEvidenceHash,
      blockingFindingIds: entry.blockingFindingIds,
      conditionalFindingIds: entry.conditionalFindingIds,
      limitations: entry.limitations,
      authorizationId: entry.authorizationId,
      authorizationSemanticHash: entry.authorizationSemanticHash,
      authorizationEvidenceHash: entry.authorizationEvidenceHash,
      approverIdentity: entry.approverIdentity,
      limitationsAccepted: entry.limitationsAccepted,
      error: entry.error,
    })),
  };
}

function foldRunStatus(cases) {
  if (cases.some((entry) => entry.status === 'BLOCK')) return 'BLOCK';
  if (cases.some((entry) => entry.status === 'WARN')) return 'WARN';
  return 'PASS';
}

function requireProfile(profileId) {
  if (!LINEAR_PIPING_RUN_GATE_PROFILE_IDS.includes(profileId)) {
    failGate('PIPING_RUN_GATE_PROFILE_UNSUPPORTED',
      `Run gate profile ${String(profileId)} is unsupported.`);
  }
}

function requireWarnApproval(value) {
  requireRecord(value, 'approval');
  requireExactKeys(value, WARN_AUTHORIZATION_KEYS, 'approval');
  return Object.freeze({
    approverIdentity: requireText(value.approverIdentity, 'approval.approverIdentity'),
    reason: requireText(value.reason, 'approval.reason'),
  });
}

function requireEqualSets(actual, expected, code) {
  if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
    failGate(code, 'Run gate case set no longer matches the workbench request.', { actual, expected });
  }
}

function uniqueAscii(values) {
  return Object.freeze([...new Set(values)].sort(compareAscii));
}

function requireRecord(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    failGate('PIPING_RUN_GATE_RECORD_REQUIRED', `${field} must be a record.`);
  }
}

function requireText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    failGate('PIPING_RUN_GATE_REVIEW_FIELD_REQUIRED', `${field} is required.`);
  }
  return value.trim();
}

function requireExactKeys(value, expected, field) {
  const actual = Object.keys(value).sort(compareAscii);
  const required = [...expected].sort(compareAscii);
  if (actual.length !== required.length
    || actual.some((key, index) => key !== required[index])) {
    failGate('PIPING_RUN_GATE_KEYS_INVALID', `${field} keys are invalid.`, { actual, required });
  }
}

function failGate(code, message, evidence) {
  const error = new TypeError(message);
  error.code = code;
  error.evidence = evidence ?? null;
  error.analysisStage = 'PRE_FEA_RUN_GATE';
  throw error;
}

function compareAscii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
