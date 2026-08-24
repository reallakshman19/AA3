import {
  LINEAR_PIPING_ANALYSIS_REQUEST_SCHEMA,
  composeLinearPipingAnalysisResult,
  deriveLinearPipingParentSet,
} from '../core/linear-piping-analysis-consumer/index.js';
import { compileInputXmlExecutionElementAuthorities } from '../core/linear-piping-analysis-consumer/inputxml-linear-execution-elements.js';
import { inputXmlProductionRecoveryProfile } from '../core/linear-piping-analysis-consumer/inputxml-linear-recovery-profile.js';
import {
  inputXmlStiffnessFrameElementProfile,
  inputXmlStiffnessSolverProfile,
} from '../core/linear-piping-analysis-consumer/inputxml-linear-stiffness-profile.js';
import { PRODUCTION_CAPABILITY_PROFILE } from '../core/linear-piping-analysis-consumer/production-capability-profile.js';
import { deepFreeze } from '../core/shared-piping-model/immutable.js';
import {
  lfeaNativeSupportError,
  requireRunnableSupportPreFlight,
} from './native-support-authority-contract.js';

/**
 * Bind exact retained native B-3.3/B-3.4 evidence into the public result-chain
 * contract required by interface recovery. No solve or recovery is repeated.
 */
export function buildLfeaNativeSupportCaseChains(
  preFlightRecord,
  executionState,
  resultsState,
) {
  const preFlight = requireRunnableSupportPreFlight(preFlightRecord);
  const raw = requireCurrentRaw(executionState);
  const recoveryBatch = requireCurrentRecovery(resultsState, raw);
  const preparation = preFlight.preparation;
  const physicalById = new Map(
    preparation.physicalPreparation.physicalCases.map((row) => [row.caseId, row]),
  );
  const recoveredById = new Map(
    recoveryBatch.caseRecoveries.map((row) => [row.caseId, row]),
  );
  const frameProfile = inputXmlStiffnessFrameElementProfile();
  const solverProfile = inputXmlStiffnessSolverProfile();
  const recoveryProfile = inputXmlProductionRecoveryProfile();

  return Object.freeze(raw.caseExecutions.map((rawCase) => {
    const physical = physicalById.get(rawCase.caseId);
    const recovered = recoveredById.get(rawCase.caseId);
    if (!physical || !recovered) {
      throw lfeaNativeSupportError(
        'LFEA_NATIVE_SUPPORT_CASE_AUTHORITY_MISSING',
        `Current case ${rawCase.caseId} lacks physical or B-3.4 recovery authority.`,
      );
    }
    const elements = compileInputXmlExecutionElementAuthorities(
      preparation.structuralPreparation,
      frameProfile,
      physical.loadCase,
      {
        sourcePreparation: preparation.sourcePreparation,
        bendFactorAuthority: preparation.stiffnessPreflight.bendFactorAuthority,
        capabilityProfile: PRODUCTION_CAPABILITY_PROFILE,
      },
    );
    const requestBase = {
      schema: LINEAR_PIPING_ANALYSIS_REQUEST_SCHEMA,
      analysisIdentity: `LFEA-SUPPORT-${raw.executionBatchId}-${rawCase.caseId}`,
      analysisRevision: 1,
      compilation: preparation.structuralPreparation.compilation,
      loadCase: physical.loadCase,
      frameElements: elements.frameElements,
      pipingComponents: elements.pipingComponents,
      solverProfile,
      recoveryProfile,
      expectedParents: null,
    };
    const request = {
      ...requestBase,
      expectedParents: deriveLinearPipingParentSet(requestBase),
    };
    return deepFreeze({
      caseId: rawCase.caseId,
      loadCase: physical.loadCase,
      analysisResult: composeLinearPipingAnalysisResult({
        request,
        execution: rawCase.execution,
        recovery: recovered.recovery,
      }),
    });
  }));
}

export function lfeaNativeSupportPublicationCurrentnessReasons(
  executionState,
  resultsState,
  expected,
) {
  if (expected === null) return Object.freeze([]);
  const reasons = [];
  const raw = executionState?.currentness === 'CURRENT'
    ? executionState.execution
    : null;
  const recovery = resultsState?.currentness === 'CURRENT'
    ? resultsState.results
    : null;
  if (!raw) reasons.push('RAW_EXECUTION_NO_LONGER_CURRENT');
  if (!recovery) reasons.push('B3_4_RECOVERY_NO_LONGER_CURRENT');
  if (raw && expected.rawExecutionSemanticHash !== raw.semanticHash) {
    reasons.push('RAW_EXECUTION_CHANGED');
  }
  if (recovery && expected.recoveryBatchSemanticHash !== recovery.semanticHash) {
    reasons.push('B3_4_RECOVERY_CHANGED');
  }
  return Object.freeze([...new Set(reasons)].sort(compareAscii));
}

export function lfeaNativeSupportPublicationParent(executionState, resultsState, authority) {
  return deepFreeze({
    rawExecutionSemanticHash: executionState.execution.semanticHash,
    recoveryBatchSemanticHash: resultsState.results.semanticHash,
    supportAuthoritySemanticHash: authority.semanticHash,
  });
}

function requireCurrentRaw(state) {
  const raw = state?.currentness === 'CURRENT' ? state.execution : null;
  if (!raw || !['QUALIFIED', 'CONDITIONAL'].includes(raw.status)) {
    throw lfeaNativeSupportError(
      'LFEA_NATIVE_SUPPORT_CURRENT_RAW_REQUIRED',
      'Support publication requires current qualified/conditional B-3.3 execution.',
    );
  }
  return raw;
}

function requireCurrentRecovery(state, raw) {
  const recovery = state?.currentness === 'CURRENT' ? state.results : null;
  if (!recovery || recovery.rawExecutionBatchSemanticHash !== raw.semanticHash) {
    throw lfeaNativeSupportError(
      'LFEA_NATIVE_SUPPORT_CURRENT_RECOVERY_REQUIRED',
      'Support publication requires current B-3.4 recovery for the exact raw execution.',
    );
  }
  return recovery;
}

function compareAscii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
