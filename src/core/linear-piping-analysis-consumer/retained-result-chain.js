/**
 * Compose an already-executed B-3.3/B-3.4 pair into the public linear piping
 * result chain without re-solving or re-recovering engineering quantities.
 */
import { semanticHash } from '../shared-piping-model/canonical-json.js';
import { deepFreeze } from '../shared-piping-model/immutable.js';
import {
  EXECUTION_RECORD_KEYS,
  requireSolverExecution,
} from '../linear-fea-solver/index.js';
import { requireResultRecovery } from '../linear-fea-result-recovery/index.js';
import {
  LINEAR_PIPING_ANALYSIS_RESULT_SCHEMA,
  NOT_EVALUATED,
  computeResultChainEvidenceHash,
  computeResultChainSemanticHash,
  validateLinearPipingAnalysisRequest,
  validateLinearPipingAnalysisResult,
} from './contracts.js';

export function composeLinearPipingAnalysisResult({ request, execution, recovery }) {
  const accepted = validateLinearPipingAnalysisRequest(request);
  const acceptedExecution = requireSolverExecution(execution);
  const acceptedRecovery = requireResultRecovery(recovery);
  const publicExecution = Object.fromEntries(
    EXECUTION_RECORD_KEYS.map((key) => [key, acceptedExecution[key]]),
  );
  const status = acceptedExecution.status === 'CONDITIONAL'
    || accepted.pipingComponents.some((entry) => entry.acceptanceState === 'CONDITIONAL')
    ? 'CONDITIONAL'
    : 'QUALIFIED';
  const draft = {
    schema: LINEAR_PIPING_ANALYSIS_RESULT_SCHEMA,
    analysisIdentity: accepted.analysisIdentity,
    analysisRevision: accepted.analysisRevision,
    status,
    parents: { ...accepted.expectedParents },
    execution: publicExecution,
    recovery: acceptedRecovery,
    interfaceLoadResults: null,
    nozzleAssessments: null,
    codeResults: null,
    limitations: collectLinearPipingLimitations(accepted),
    notEvaluated: [...NOT_EVALUATED],
    semanticHash: '',
    evidenceHash: '',
  };
  draft.semanticHash = computeResultChainSemanticHash(draft);
  draft.evidenceHash = computeResultChainEvidenceHash(draft);
  return validateLinearPipingAnalysisResult(draft);
}

export function collectLinearPipingLimitations(request) {
  const bindings = [];
  appendLimitations(
    bindings,
    'MODEL_COMPILATION',
    request.compilation.model.modelIdentity,
    request.compilation.semanticHash,
    request.compilation.limitations,
  );
  appendLimitations(
    bindings,
    'PHYSICAL_LOAD_CASE',
    request.loadCase.loadCaseId,
    request.loadCase.semanticHash,
    request.loadCase.limitations,
  );
  request.frameElements.forEach((element) => appendLimitations(
    bindings,
    'FRAME_ELEMENT',
    element.elementId,
    element.semanticHash,
    element.limitations,
  ));
  request.pipingComponents.forEach((component) => appendLimitations(
    bindings,
    'PIPING_COMPONENT',
    component.componentId,
    component.semanticHash,
    component.approximations,
  ));
  return bindings.sort((left, right) => {
    const identity = compareAscii(
      `${left.sourceKind}:${left.sourceId}`,
      `${right.sourceKind}:${right.sourceId}`,
    );
    return identity !== 0
      ? identity
      : compareAscii(semanticHash(left.limitation), semanticHash(right.limitation));
  });
}

function appendLimitations(target, sourceKind, sourceId, sourceSemanticHash, limitations) {
  limitations.forEach((limitation) => target.push(deepFreeze({
    sourceKind,
    sourceId,
    sourceSemanticHash,
    limitation: structuredClone(limitation),
  })));
}

function compareAscii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
