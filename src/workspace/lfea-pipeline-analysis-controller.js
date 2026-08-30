import { createLfeaNativeExecutionAuthority } from '../lfea/native-execution-authority.js';
import { recoverInputXmlAuthorizedRawCases } from '../core/linear-piping-analysis-consumer/inputxml-linear-production-recovery.js';
import {
  reviewInputXmlLinearUnilateralRestraints,
  unilateralRestraintReviewSummary,
} from '../core/linear-piping-analysis-consumer/inputxml-linear-unilateral-restraint-review.js';

/**
 * Run a real analysis on a loaded InputXML model, with no hand-authored JSON.
 *
 * This deliberately does NOT go through runLinearPipingWorkbenchAnalysis. That
 * path assembles a multicase APPLICATION -- nozzle interface mechanics and B31
 * code checks -- and genuinely needs the interface/nozzle-allowable/B31
 * authorities a user must supply, because those are licensed and project
 * data no InputXML file carries. Making them optional there would weaken a
 * contract for work that really does require them.
 *
 * The analysis itself needs none of that. Displacements, support loads and
 * element end forces come from the model, the loads and the restraints alone,
 * which is why this reaches them through the same native execution + recovery
 * authorities `lfea.html` has always used, unchanged. Supplying the authority
 * supplement adds the code-stress application on top; it is not a gate in
 * front of the analysis.
 *
 * Human limitation acceptance belongs to Error check. This controller consumes
 * only an already-authorized sealed pre-flight and never manufactures reviewer
 * identity/reason on behalf of the engineer.
 */
export function createLfeaPipelineAnalysisController(options) {
  const executionAuthority = options?.executionAuthority ?? createLfeaNativeExecutionAuthority();
  const recoverCases = options?.recoverAuthorizedCases ?? recoverInputXmlAuthorizedRawCases;
  let state = emptyState();

  function analyze(preFlight, requestedCaseIds) {
    if (!preFlight) throw new TypeError('Load and check a model before analyzing.');
    if (!Array.isArray(requestedCaseIds) || requestedCaseIds.length === 0) {
      throw new TypeError('Select at least one load case to analyze.');
    }
    if (!preFlight.solveAuthorized || preFlight.authorization === null) {
      throw new TypeError('Authorize the current pre-flight at Error check before analyzing.');
    }
    const authorized = preFlight;

    const executionState = executionAuthority.run(authorized, { requestedCaseIds });
    const cases = executionState.execution.caseExecutions.map((row) => caseView(
      row,
      authorized.preparation.structuralPreparation,
    ));

    // Recovery is refused for a whole batch if ANY case in it is BLOCKED. One
    // unqualified case would therefore withhold element end forces from every
    // other case that solved perfectly well, which tells the user less than
    // the truth. When that happens, the cases that DID qualify are re-run as
    // their own batch and recovered on their own merit; the blocked ones keep
    // their real displacements and support loads, with the failing check named.
    const qualifiedCaseIds = cases
      .filter((row) => row.blockingChecks.length === 0)
      .map((row) => row.caseId);
    let recovery = null;
    let recoveryRefusal = null;
    try {
      recovery = recoverCases({ preparation: authorized.preparation, rawExecutionBatch: executionState.execution });
    } catch (error) {
      recoveryRefusal = error instanceof Error ? error.message : String(error);
      if (qualifiedCaseIds.length > 0 && qualifiedCaseIds.length < cases.length) {
        try {
          const qualifiedState = executionAuthority.run(authorized, { requestedCaseIds: qualifiedCaseIds });
          recovery = recoverCases({
            preparation: authorized.preparation,
            rawExecutionBatch: qualifiedState.execution,
          });
          recoveryRefusal = null;
        } catch (retryError) {
          recoveryRefusal = retryError instanceof Error ? retryError.message : String(retryError);
        }
      }
    }
    const unrecoveredCaseIds = cases
      .map((row) => row.caseId)
      .filter((caseId) => !qualifiedCaseIds.includes(caseId));

    state = Object.freeze({
      status: 'CURRENT',
      preFlight: authorized,
      requestedCaseIds: Object.freeze([...requestedCaseIds]),
      cases: Object.freeze(cases),
      recovery,
      recoveryRefusal,
      unrecoveredCaseIds: Object.freeze(unrecoveredCaseIds),
    });
    return state;
  }

  function clear() { state = emptyState(); return state; }

  return Object.freeze({
    analyze,
    clear,
    getState: () => state,
  });
}

function caseView(row, structuralPreparation) {
  const review = reviewInputXmlLinearUnilateralRestraints(
    structuralPreparation,
    row.execution.reactions,
    row.execution.displacement,
  );
  return Object.freeze({
    caseId: row.caseId,
    caseRole: row.caseRole,
    executionStatus: row.executionStatus,
    displacements: row.execution.displacement,
    reactions: row.execution.reactions,
    diagnostics: row.execution.diagnostics,
    blockingChecks: Object.freeze(Object.entries(row.execution.diagnostics)
      .filter(([, check]) => check?.status === 'BLOCK')
      .map(([name, check]) => Object.freeze({ name, checkId: check.checkId, value: check.value, limit: check.limit }))),
    unilateralReview: review,
    unilateralSummary: unilateralRestraintReviewSummary(review),
  });
}

function emptyState() {
  return Object.freeze({
    status: 'EMPTY',
    preFlight: null,
    requestedCaseIds: Object.freeze([]),
    cases: Object.freeze([]),
    recovery: null,
    recoveryRefusal: null,
    unrecoveredCaseIds: Object.freeze([]),
  });
}
