import {
  LINEAR_PIPING_RUN_GATE_PROFILE_IDS,
  authorizeLinearPipingRunGate,
  createLinearPipingRunGate,
} from './linear-piping-run-gate.js';

export const LINEAR_PIPING_PRERUN_CHECK_SCHEMA = 'linear-piping-workbench-prerun-check/v2';

/** Profiles the governed pre-FEA diagnostics and preparation authorities accept. */
export const LINEAR_PIPING_PRERUN_PROFILE_IDS = LINEAR_PIPING_RUN_GATE_PROFILE_IDS;

/**
 * Run the governed pre-FEA diagnostics and preparation chain for every case of
 * one workbench request. PASS receives the existing automatic sealed solve
 * authorization. WARN remains unauthorized until explicit engineer acceptance
 * is recorded. BLOCK can never be authorized.
 *
 * Solver runtime creation is prohibited in this function and remains below the
 * validated run gate in runLinearPipingWorkbenchAnalysis.
 */
export function checkLinearPipingRunRequest(value, options) {
  if (options === undefined) options = {};
  const gate = createLinearPipingRunGate(value, options);
  return projectGate(gate);
}

/**
 * Accept the complete retained WARN limitation set under an explicit reviewer
 * identity and reason, then return a new immutable pre-run record whose nested
 * gate contains the sealed core authorization receipts.
 */
export function authorizeLinearPipingPreRunCheck(check, approval, options) {
  if (!check || check.schema !== LINEAR_PIPING_PRERUN_CHECK_SCHEMA || !check.gate) {
    const error = new TypeError('A current governed pre-run check is required.');
    error.code = 'PIPING_PRERUN_CHECK_REQUIRED';
    error.evidence = null;
    throw error;
  }
  const gate = authorizeLinearPipingRunGate(check.gate, approval, options);
  return projectGate(gate);
}

function projectGate(gate) {
  return Object.freeze({
    schema: LINEAR_PIPING_PRERUN_CHECK_SCHEMA,
    applicationId: gate.applicationId,
    requestedProfileId: gate.requestedProfileId,
    runRequestSemanticHash: gate.runRequestSemanticHash,
    status: gate.status,
    solveAuthorized: gate.solveAuthorized,
    gateSemanticHash: gate.semanticHash,
    sourceBundleSemanticHashes: gate.sourceBundleSemanticHashes,
    authorizationSemanticHashes: Object.freeze(gate.cases
      .map((entry) => entry.authorizationSemanticHash)
      .filter((value) => value !== null)),
    cases: Object.freeze(gate.cases.map((entry) => Object.freeze({
      caseId: entry.caseId,
      status: entry.status,
      diagnosticsId: entry.diagnosticsId,
      diagnosticsSemanticHash: entry.diagnosticsSemanticHash,
      preparationId: entry.preparationId,
      preparationSemanticHash: entry.preparationSemanticHash,
      sourceBundleSemanticHash: entry.sourceBundleSemanticHash,
      blockingFindingIds: entry.blockingFindingIds,
      conditionalFindingIds: entry.conditionalFindingIds,
      limitations: entry.limitations,
      authorizationId: entry.authorizationId,
      authorizationSemanticHash: entry.authorizationSemanticHash,
      approverIdentity: entry.approverIdentity,
      limitationsAccepted: entry.limitationsAccepted,
      summary: entry.summary,
      findings: entry.findings,
      error: entry.error,
    }))),
    gate,
  });
}
