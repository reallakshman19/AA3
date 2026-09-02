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
  failLinearPipingAnalysis,
  validateLinearPipingAnalysisRequest,
  validateLinearPipingAnalysisResult,
} from './contracts.js';

const SPRING_SUPPORT_DRAFT_CODE = 'DRAFT_SPRING_SUPPORT_NO_REFERENCE';

export function composeLinearPipingAnalysisResult({ request, execution, recovery }) {
  const accepted = validateLinearPipingAnalysisRequest(request);
  // `execution` is the solver's full in-process return value, which carries
  // runtime-only fields (e.g. `factorizationHandle`) alongside the sealed
  // contract keys. Project to the sealed shape before validating it, rather
  // than validating the superset and rejecting a caller that (correctly)
  // passed through the solver's actual return value.
  const publicExecution = requireSolverExecution(
    Object.fromEntries(EXECUTION_RECORD_KEYS.map((key) => [key, execution[key]])),
  );
  if (publicExecution.status === 'BLOCKED') {
    failLinearPipingAnalysis(
      'The retained B-3.3 execution is blocked and cannot enter a public linear piping result chain.',
      'PIPING_ANALYSIS_EXECUTION_BLOCKED',
      { executionHash: publicExecution.executionHash },
    );
  }
  const acceptedRecovery = requireResultRecovery(recovery);
  const status = publicExecution.status === 'CONDITIONAL'
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
  appendSpringSupportDraftLimitation(bindings, request.compilation);
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

function appendSpringSupportDraftLimitation(target, compilation) {
  const springIds = compilation.model.constraints
    .filter((constraint) => constraint.behavior === 'LINEAR_SPRING')
    .map((constraint) => constraint.constraintId)
    .sort(compareAscii);
  if (springIds.length === 0) return;
  target.push(deepFreeze({
    sourceKind: 'MODEL_COMPILATION',
    sourceId: compilation.model.modelIdentity,
    sourceSemanticHash: compilation.semanticHash,
    limitation: {
      code: SPRING_SUPPORT_DRAFT_CODE,
      severity: 'WARNING',
      scope: 'MODEL',
      stiffnessRelevant: true,
      details: {
        disclosure: 'One or more linear spring supports are numerically active but have not been cleared against a CAESAR-solved spring-support reference model.',
        referenceStatus: 'SELF_AUTHORED_EVIDENCE_ONLY',
        springConstraintIds: springIds,
      },
    },
  }));
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
