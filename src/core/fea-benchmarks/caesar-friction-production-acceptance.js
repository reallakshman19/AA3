import { deepFreeze } from '../shared-piping-model/immutable.js';

export const BM4L_FROZEN_CONTROL_CASE_IDS = Object.freeze(['L2', 'L3', 'L4', 'L5', 'L6', 'L14']);
export const BM4L_FRICTION_ACCEPTANCE_CASE_IDS = Object.freeze(['L13', 'L7', 'L15', 'L1']);

/**
 * Build the governed Stage 2 acceptance decision from already-emitted evidence.
 *
 * The non-friction controls are a qualification gate, not a diagnostic.  A
 * friction implementation may not pass by improving L13/L7/L15 while silently
 * regressing any L2-L6/L14 restraint component.  Missing comparison evidence is
 * BLOCKED rather than treated as a zero-failure result.
 */
export function evaluateBm4lFrictionProductionAcceptance(input) {
  const accuracyCases = input?.accuracy?.cases ?? {};
  const controls = caseGroupGate(accuracyCases, BM4L_FROZEN_CONTROL_CASE_IDS);
  const friction = caseGroupGate(accuracyCases, BM4L_FRICTION_ACCEPTANCE_CASE_IDS);
  const mechanicsStatus = normalized(input?.mechanicsStatus);
  const sourceCustodyStatus = normalized(input?.sourceCustodyStatus);

  let overallStatus;
  if (sourceCustodyStatus !== 'PASS') overallStatus = 'BLOCKED';
  else if (mechanicsStatus !== 'PASS') overallStatus = mechanicsStatus || 'BLOCKED';
  else if (controls.status === 'FAIL' || friction.status === 'FAIL') overallStatus = 'FAIL';
  else if (controls.status !== 'PASS' || friction.status !== 'PASS') overallStatus = 'BLOCKED';
  else overallStatus = 'PASS';

  return deepFreeze({
    schema: 'm047-bm4l-friction-production-acceptance/v2',
    frozenControlRestraintGate: controls,
    frictionRestraintGate: friction,
    mechanicsStatus: mechanicsStatus || 'BLOCKED',
    sourceCustodyStatus: sourceCustodyStatus || 'BLOCKED',
    overallStatus,
    rule: 'PASS_REQUIRES_SOURCE_CUSTODY_AND_MECHANICS_AND_ZERO_RESTRAINT_FAILURES_IN_ALL_FROZEN_CONTROL_AND_FRICTION_CASES',
  });
}

function caseGroupGate(cases, requiredCaseIds) {
  const missingCaseIds = requiredCaseIds.filter((caseId) => !cases?.[caseId]);
  const evaluatedCaseIds = requiredCaseIds.filter((caseId) => cases?.[caseId]);
  const failedCaseIds = evaluatedCaseIds.filter((caseId) => cases[caseId]?.restraint?.status !== 'PASS');
  const failureCount = evaluatedCaseIds.reduce(
    (sum, caseId) => sum + Math.max(0, Number(cases[caseId]?.restraint?.failed ?? 0)),
    0,
  );
  const status = missingCaseIds.length > 0
    ? 'NOT_READY'
    : failedCaseIds.length > 0 || failureCount > 0
      ? 'FAIL'
      : 'PASS';
  return deepFreeze({
    requiredCaseIds: [...requiredCaseIds],
    evaluatedCaseIds,
    missingCaseIds,
    failedCaseIds,
    restraintFailureCount: failureCount,
    status,
  });
}

function normalized(value) {
  return String(value ?? '').trim().toUpperCase();
}
