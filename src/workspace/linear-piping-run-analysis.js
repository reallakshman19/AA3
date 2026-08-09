import {
  compileLinearPipingInputXmlAnalysisContext,
  solveInputXmlLinearAnalysis,
} from '../core/linear-piping-analysis-consumer/index.js';
import {
  MULTICASE_APPLICATION_REQUEST_SCHEMA,
  compileLinearPipingMulticaseApplication,
} from '../core/linear-piping-multicase-application/index.js';
import { requireLinearPipingRunGate } from './linear-piping-run-gate.js';
import { requireLinearPipingWorkbenchRunRequest } from './linear-piping-run-request.js';

export {
  LINEAR_PIPING_WORKBENCH_RUN_REQUEST_SCHEMA,
  LINEAR_PIPING_WORKBENCH_RUN_REQUEST_KEYS,
  LINEAR_PIPING_WORKBENCH_RUN_CASE_KEYS,
  requireLinearPipingWorkbenchRunRequest,
} from './linear-piping-run-request.js';

export const LINEAR_PIPING_WORKBENCH_RUN_RESULT_SCHEMA =
  'linear-piping-workbench-run-result/v1';

/**
 * Execute the existing browser-safe production orchestration only after the
 * exact workbench request has a complete sealed pre-FEA Run authorization.
 *
 * The run gate is validated before the factorization cache exists. Each case
 * is then revalidated through solveInputXmlLinearAnalysis immediately before
 * the production InputXML context compiler is invoked. This module supplies no
 * engineering authority and does not reinterpret diagnostics, limitations,
 * loads, constraints, solver settings, recovery, interface mechanics or code
 * stress.
 */
export function runLinearPipingWorkbenchAnalysis(value, runGate) {
  const accepted = requireLinearPipingWorkbenchRunRequest(value);
  const acceptedGate = requireLinearPipingRunGate(runGate, accepted);
  const runtime = { factorizationCache: new Map() };
  const cases = accepted.cases.map((entry) => {
    const gateCase = acceptedGate.cases.find((row) => row.caseId === entry.caseId);
    if (gateCase === undefined) {
      const error = new Error(`Run gate case ${entry.caseId} is missing.`);
      error.code = 'PIPING_RUN_GATE_CASE_MISSING';
      error.evidence = { caseId: entry.caseId };
      error.analysisStage = 'PRE_FEA_RUN_GATE';
      throw error;
    }
    try {
      const inputXmlAnalysisContext = solveInputXmlLinearAnalysis(
        gateCase.preparation,
        gateCase.authorization,
        {
          requestedCaseIds: [entry.caseId],
          executeAuthorizedCases: () => {
            try {
              return compileLinearPipingInputXmlAnalysisContext(
                entry.inputXmlAnalysisRequest,
                runtime,
              );
            } catch (error) {
              throw stagedError(error, `CASE:${entry.caseId}:INPUTXML_ANALYSIS`);
            }
          },
        },
      );
      return Object.freeze({
        caseId: entry.caseId,
        inputXmlAnalysisContext,
      });
    } catch (error) {
      if (error?.analysisStage) throw error;
      throw stagedError(error, `CASE:${entry.caseId}:AUTHORIZED_SOLVE`);
    }
  });

  let multicaseApplication;
  try {
    multicaseApplication = compileLinearPipingMulticaseApplication({
      schema: MULTICASE_APPLICATION_REQUEST_SCHEMA,
      applicationId: accepted.applicationId,
      cases,
      interfaceAuthority: accepted.interfaceAuthority,
      nozzleAllowableProfiles: accepted.nozzleAllowableProfiles,
      b31Authority: accepted.b31Authority,
    });
  } catch (error) {
    throw stagedError(error, 'MULTICASE_APPLICATION');
  }

  return Object.freeze({
    schema: LINEAR_PIPING_WORKBENCH_RUN_RESULT_SCHEMA,
    cases: Object.freeze(cases),
    multicaseApplication,
    runtimeEvidence: Object.freeze({
      factorizationCacheEntryCount: runtime.factorizationCache.size,
      sharedAcrossCaseCount: cases.length,
      runGateSemanticHash: acceptedGate.semanticHash,
      requestedProfileId: acceptedGate.requestedProfileId,
      authorizationSemanticHashes: Object.freeze(acceptedGate.cases
        .map((entry) => entry.authorizationSemanticHash)),
    }),
  });
}

function stagedError(error, analysisStage) {
  const staged = new Error(error?.message ?? String(error));
  staged.name = error?.name ?? 'LinearPipingWorkbenchRunError';
  staged.code = error?.code ?? 'PIPING_WORKBENCH_RUN_FAILED';
  staged.evidence = error?.evidence ?? null;
  staged.analysisStage = analysisStage;
  staged.cause = error;
  return staged;
}
