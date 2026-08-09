import {
  DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE,
  INPUTXML_LINEAR_PREFEA_REQUEST_SCHEMA,
  STRICT_INPUTXML_LINEAR_STATIC_PROFILE,
  diagnoseInputXmlLinearPreFea,
} from '../core/linear-piping-analysis-consumer/index.js';
import { requireLinearPipingWorkbenchRunRequest } from './linear-piping-run-analysis.js';

export const LINEAR_PIPING_PRERUN_CHECK_SCHEMA = 'linear-piping-workbench-prerun-check/v1';

/** Profiles the governed pre-FEA diagnostics authority accepts. */
export const LINEAR_PIPING_PRERUN_PROFILE_IDS = Object.freeze([
  STRICT_INPUTXML_LINEAR_STATIC_PROFILE,
  DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE,
]);

/**
 * Run governed pre-FEA diagnostics over every case of one workbench run
 * request without compiling, assembling, factorizing or solving anything.
 *
 * This module supplies no engineering authority of its own. It restates the
 * existing production diagnostics record per case and folds the per-case
 * dispositions into one run-level readiness status, so the reviewer can see
 * what would block a solve before paying for one.
 */
export function checkLinearPipingRunRequest(value, options = {}) {
  const accepted = requireLinearPipingWorkbenchRunRequest(value);
  const requestedProfileId = options.requestedProfileId
    ?? STRICT_INPUTXML_LINEAR_STATIC_PROFILE;
  if (!LINEAR_PIPING_PRERUN_PROFILE_IDS.includes(requestedProfileId)) {
    failPreRun(
      `Pre-run profile ${String(requestedProfileId)} is unsupported.`,
      'PIPING_PRERUN_PROFILE_UNSUPPORTED',
    );
  }
  const diagnose = options.diagnose ?? diagnoseInputXmlLinearPreFea;
  const cases = accepted.cases.map((entry) => caseOutcome(entry, requestedProfileId, diagnose));
  return Object.freeze({
    schema: LINEAR_PIPING_PRERUN_CHECK_SCHEMA,
    applicationId: accepted.applicationId,
    requestedProfileId,
    status: foldRunStatus(cases),
    solveAuthorized: cases.every((entry) => entry.status === 'PASS'),
    cases: Object.freeze(cases),
  });
}

function caseOutcome(entry, requestedProfileId, diagnose) {
  try {
    const record = diagnose({
      schema: INPUTXML_LINEAR_PREFEA_REQUEST_SCHEMA,
      analysisRequest: entry.inputXmlAnalysisRequest,
      requestedProfileId,
      requestedCaseIds: [entry.caseId],
    });
    return Object.freeze({
      caseId: entry.caseId,
      status: record.status,
      diagnosticsId: record.diagnosticsId,
      summary: record.summary,
      findings: Object.freeze(record.findings.filter((row) => row.disposition !== 'PASS')),
      error: null,
    });
  } catch (error) {
    return Object.freeze({
      caseId: entry.caseId,
      status: 'BLOCK',
      diagnosticsId: null,
      summary: null,
      findings: Object.freeze([]),
      error: Object.freeze({
        code: error?.code ?? 'PIPING_PRERUN_DIAGNOSTICS_FAILED',
        message: error?.message ?? String(error),
      }),
    });
  }
}

function foldRunStatus(cases) {
  if (cases.some((entry) => entry.status === 'BLOCK')) return 'BLOCK';
  if (cases.some((entry) => entry.status === 'WARN')) return 'WARN';
  return 'PASS';
}

function failPreRun(message, code) {
  const error = new TypeError(message);
  error.code = code;
  error.evidence = null;
  throw error;
}
