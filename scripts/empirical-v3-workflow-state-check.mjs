import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  EMPIRICAL_V3_WORKFLOW_ACTIONS,
  canPerformEmpiricalV3WorkflowAction,
  projectEmpiricalV3Workflow,
  requireEmpiricalV3WorkflowAction,
} from '../src/core/empirical-v3-safety/workflow-state.js';

const H = Object.freeze({
  source: 'fnv1a64:0000000000000001',
  authorities: 'fnv1a64:0000000000000002',
  branches: 'fnv1a64:0000000000000003',
  branchReview: 'fnv1a64:0000000000000004',
  riskSet: 'fnv1a64:0000000000000005',
  authorization: 'fnv1a64:0000000000000006',
  result: 'fnv1a64:0000000000000007',
  resultReview: 'fnv1a64:0000000000000008',
  audit: 'fnv1a64:0000000000000009',
});

function makeFacts(overrides = {}) {
  const base = {
    source: { bound: true, current: true, semanticHash: H.source },
    authorities: { built: true, current: true, semanticHash: H.authorities },
    branches: {
      built: true,
      current: true,
      reviewCurrent: true,
      semanticHash: H.branches,
      reviewSemanticHash: H.branchReview,
    },
    riskSet: {
      evaluated: true,
      current: true,
      semanticHash: H.riskSet,
      highBlockCount: 0,
      highConfirmPendingCount: 0,
    },
    calculationAuthorization: { present: false, current: false, semanticHash: null },
    calculationResult: { present: false, current: false, reviewRequired: false, semanticHash: null },
    resultReview: { present: false, current: false, semanticHash: null },
    audit: { ready: false, current: false, semanticHash: null },
  };
  return Object.fromEntries(Object.entries(base).map(([key, value]) => [
    key,
    { ...value, ...(overrides[key] ?? {}) },
  ]));
}

function expectState(expected, overrides = {}) {
  const projection = projectEmpiricalV3Workflow(makeFacts(overrides));
  assert.equal(projection.state, expected);
  assert.equal(Object.isFrozen(projection), true);
  return projection;
}

expectState('NO_SOURCE', { source: { bound: false, current: false, semanticHash: null } });
expectState('SOURCE_READY', { source: { current: false, semanticHash: null } });
expectState('AUTHORITY_BUILD_REQUIRED', { authorities: { built: false, current: false, semanticHash: null } });
expectState('BRANCH_REVIEW_REQUIRED', { branches: { reviewCurrent: false, reviewSemanticHash: null } });
expectState('SAFETY_REVIEW_REQUIRED', { riskSet: { evaluated: false, current: false, semanticHash: null } });
expectState('HIGH_BLOCK_PRESENT', { riskSet: { highBlockCount: 1 } });
expectState('HIGH_CONFIRM_PENDING', { riskSet: { highConfirmPendingCount: 1 } });
expectState('SAFETY_CLEARED');

const authorized = expectState('CALCULATION_AUTHORIZED', {
  calculationAuthorization: { present: true, current: true, semanticHash: H.authorization },
});
assert.equal(authorized.canRunCalculation, true);
assert.equal(authorized.calculationAuthorizationRef, H.authorization);

const calculated = expectState('CALCULATED', {
  calculationAuthorization: { present: true, current: true, semanticHash: H.authorization },
  calculationResult: { present: true, current: true, reviewRequired: false, semanticHash: H.result },
});
assert.equal(calculated.canRunCalculation, false);

expectState('RESULT_REVIEW_REQUIRED', {
  calculationAuthorization: { present: true, current: true, semanticHash: H.authorization },
  calculationResult: { present: true, current: true, reviewRequired: true, semanticHash: H.result },
});

expectState('RESULT_REVIEWED', {
  calculationAuthorization: { present: true, current: true, semanticHash: H.authorization },
  calculationResult: { present: true, current: true, reviewRequired: true, semanticHash: H.result },
  resultReview: { present: true, current: true, semanticHash: H.resultReview },
});

const auditReady = expectState('AUDIT_EXPORT_READY', {
  calculationAuthorization: { present: true, current: true, semanticHash: H.authorization },
  calculationResult: { present: true, current: true, reviewRequired: true, semanticHash: H.result },
  resultReview: { present: true, current: true, semanticHash: H.resultReview },
  audit: { ready: true, current: true, semanticHash: H.audit },
});

// Backward invalidation outranks obsolete downstream receipts/results.
expectState('BRANCH_REVIEW_REQUIRED', {
  branches: { current: false },
  calculationAuthorization: { present: true, current: true, semanticHash: H.authorization },
  calculationResult: { present: true, current: true, reviewRequired: true, semanticHash: H.result },
  resultReview: { present: true, current: true, semanticHash: H.resultReview },
  audit: { ready: true, current: true, semanticHash: H.audit },
});

expectState('SAFETY_CLEARED', {
  calculationAuthorization: { present: true, current: false, semanticHash: H.authorization },
  calculationResult: { present: true, current: true, reviewRequired: true, semanticHash: H.result },
  resultReview: { present: true, current: true, semanticHash: H.resultReview },
  audit: { ready: true, current: true, semanticHash: H.audit },
});

// A boolean cannot manufacture a sealed authorization.
assert.throws(
  () => projectEmpiricalV3Workflow(makeFacts({
    calculationAuthorization: { present: true, current: true, semanticHash: null },
  })),
  /calculationAuthorization\.semanticHash is required/,
);

const highBlock = expectState('HIGH_BLOCK_PRESENT', { riskSet: { highBlockCount: 1 } });
assert.equal(
  canPerformEmpiricalV3WorkflowAction(highBlock, EMPIRICAL_V3_WORKFLOW_ACTIONS.REVIEW_HIGH_CONFIRM),
  false,
);
assert.equal(
  canPerformEmpiricalV3WorkflowAction(highBlock, EMPIRICAL_V3_WORKFLOW_ACTIONS.RUN_CALCULATION),
  false,
);

const highConfirm = expectState('HIGH_CONFIRM_PENDING', { riskSet: { highConfirmPendingCount: 1 } });
assert.equal(
  canPerformEmpiricalV3WorkflowAction(highConfirm, EMPIRICAL_V3_WORKFLOW_ACTIONS.REVIEW_HIGH_CONFIRM),
  true,
);

assert.equal(
  canPerformEmpiricalV3WorkflowAction(authorized, EMPIRICAL_V3_WORKFLOW_ACTIONS.RUN_CALCULATION),
  true,
);
assert.doesNotThrow(() => requireEmpiricalV3WorkflowAction(
  authorized,
  EMPIRICAL_V3_WORKFLOW_ACTIONS.RUN_CALCULATION,
));
assert.throws(
  () => requireEmpiricalV3WorkflowAction(highBlock, EMPIRICAL_V3_WORKFLOW_ACTIONS.RUN_CALCULATION),
  /not permitted/,
);
assert.equal(
  canPerformEmpiricalV3WorkflowAction(auditReady, EMPIRICAL_V3_WORKFLOW_ACTIONS.EXPORT_AUDIT),
  true,
);

// Presentation-only/unknown input cannot perturb engineering workflow identity.
const identityA = projectEmpiricalV3Workflow({ ...makeFacts(), ui: { sort: 'branch', expanded: ['B1'] } });
const identityB = projectEmpiricalV3Workflow({ ...makeFacts(), ui: { sort: 'risk', expanded: [] } });
assert.equal(identityA.semanticHash, identityB.semanticHash);

const modulePath = fileURLToPath(new URL('../src/core/empirical-v3-safety/workflow-state.js', import.meta.url));
const source = readFileSync(modulePath, 'utf8');
const imports = source.split('\n').filter((line) => line.trimStart().startsWith('import ')).join('\n');
for (const forbidden of ['/workspace/', 'fallbackResolver', 'chainageDistribution', 'renderer', 'react']) {
  assert.equal(imports.includes(forbidden), false, `workflow domain imports forbidden authority: ${forbidden}`);
}
assert.equal(source.includes('Accept all High'), false);

console.log('PASS empirical V3 governed workflow state contract');
