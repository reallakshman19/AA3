import {
  EMP1_AUTHORITY_BOUNDARY,
  EMP1_DECISION_STATES,
  EMP1_SCHEMAS,
  requireEmp1DecisionState,
} from './emp1-identity.js';

export function createEmp1Assessment(options = {}) {
  const loadTransfer = requireResult(options.loadTransfer, 'EMP1_LOAD_TRANSFER_RESULT_REQUIRED');
  const screening = requireResult(options.sectionScreening, 'EMP1_SECTION_SCREENING_RESULT_REQUIRED');
  const localCorrelation = options.localCorrelation ?? null;

  const decision = resolveDecision({ loadTransfer, screening, localCorrelation });
  const reasons = collectReasons({ loadTransfer, screening, localCorrelation, decision });

  return deepFreeze({
    schema: EMP1_SCHEMAS.ASSESSMENT,
    productId: 'EMP.1',
    decision,
    reasons,
    parents: {
      sourceHash: options.sourceHash ?? null,
      loadTransferResultHash: loadTransfer.resultHash ?? null,
      sectionScreeningResultHash: screening.resultHash ?? null,
      localCorrelationResultHash: localCorrelation?.resultHash ?? null,
    },
    authority: EMP1_AUTHORITY_BOUNDARY,
    interpretation: {
      passIsCodeCompliance: false,
      releaseQualified: false,
      localCorrelationRequiredWhenScreeningEscalates: true,
    },
  });
}

function resolveDecision({ loadTransfer, screening, localCorrelation }) {
  if (loadTransfer.qualification !== 'PASS') return 'BLOCKED';
  if (screening.qualification !== 'PASS' || screening.decision === 'BLOCKED') return 'BLOCKED';
  if (screening.decision === 'PASS') return 'PASS';
  if (screening.decision !== 'ESCALATE') {
    throw new TypeError(`EMP1_SCREENING_DECISION_UNSUPPORTED:${screening.decision}`);
  }
  if (!localCorrelation || localCorrelation.state === 'BLOCKED') return 'ESCALATE';
  if (localCorrelation.decision == null) return 'ESCALATE';
  return requireEmp1DecisionState(localCorrelation.decision);
}

function collectReasons({ loadTransfer, screening, localCorrelation, decision }) {
  const reasons = [];
  append(reasons, loadTransfer.reasons);
  append(reasons, screening.reasons);
  append(reasons, localCorrelation?.reasons);
  if (decision === 'ESCALATE' && (!localCorrelation || localCorrelation.state === 'BLOCKED')) {
    reasons.push('EMP1_LOCAL_CORRELATION_REQUIRED_FOR_ESCALATED_SCREENING');
  }
  return [...new Set(reasons)];
}

function requireResult(value, code) {
  if (!value || typeof value !== 'object') throw new TypeError(code);
  return value;
}

function append(target, values) {
  if (!Array.isArray(values)) return;
  values.forEach((value) => target.push(String(value)));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

export { EMP1_DECISION_STATES };
