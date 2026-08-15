import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ENGINEERING_RISK_FINDING_SCHEMA,
  sealEngineeringRiskFinding,
  sealEngineeringRiskSet,
} from '../src/core/empirical-v3-safety/risk-finding.js';
import {
  createEngineeringConfirmationReceipt,
  isEngineeringConfirmationCurrent,
} from '../src/core/empirical-v3-safety/confirmation-receipt.js';
import {
  assessEmpiricalV3CalculationAuthorizationCurrent,
  sealEmpiricalV3CalculationAuthorization,
} from '../src/core/empirical-v3-safety/calculation-authorization.js';

const RUN_ID = 'run:empirical-v3:test';
const POLICY_ID = 'EMPIRICAL_V3_P0_RISK_POLICY';
const POLICY_VERSION = '1';

function risk({
  riskCode,
  riskClass,
  dependencyHash = 'hash:dep-a',
  reasonCode = 'TEST_REASON',
  messageParameters = {},
  presentationState,
}) {
  return sealEngineeringRiskFinding({
    schema: ENGINEERING_RISK_FINDING_SCHEMA,
    riskCode,
    riskClass,
    runId: RUN_ID,
    scope: {
      branchId: 'branch:A',
      entityIds: ['component:C1'],
      quantityIds: ['quantity:Q1'],
    },
    reasonCode,
    messageParameters,
    valueSnapshot: {
      value: 7.11,
      unit: 'mm',
      authorityClass: riskClass === 'HIGH_BLOCK' ? 'UNRESOLVED' : 'INFERRED_REVIEW_REQUIRED',
    },
    authorityRefs: [{ ref: 'authority:A1', semanticHash: 'hash:authority-a' }],
    sourceRefs: [{ ref: 'source:S1', semanticHash: 'hash:source-a' }],
    governingDependencyRefs: [{ ref: 'branch:A', semanticHash: dependencyHash }],
    presentationState,
  });
}

function dependencies(branchHash = 'hash:branch-a') {
  return [
    { kind: 'METHOD', ref: 'EMPIRICAL_V3', semanticHash: 'hash:method-v3' },
    { kind: 'TOPOLOGY', ref: 'topology:1', semanticHash: 'hash:topology-exact' },
    { kind: 'BRANCH', ref: 'branch:A', semanticHash: branchHash },
    { kind: 'RESTRAINT_SET', ref: 'restraints:1', semanticHash: 'hash:restraints-a' },
  ];
}

function authorize(riskSet, confirmations = [], deps = dependencies()) {
  return sealEmpiricalV3CalculationAuthorization({
    runId: RUN_ID,
    policyId: POLICY_ID,
    policyVersion: POLICY_VERSION,
    dependencies: deps,
    riskSet,
    confirmations,
  });
}

// Risk identity is deterministic and independent of UI-only input/order.
const mediumA = risk({
  riskCode: 'MEDIUM_TEST',
  riskClass: 'MEDIUM',
  presentationState: { expanded: true, sortIndex: 99 },
});
const mediumB = risk({
  riskCode: 'MEDIUM_TEST',
  riskClass: 'MEDIUM',
  presentationState: { expanded: false, sortIndex: 1 },
});
assert.equal(mediumA.semanticHash, mediumB.semanticHash);
assert.equal(mediumA.riskId, mediumB.riskId);

const low = risk({ riskCode: 'LOW_TEST', riskClass: 'LOW' });
const orderedSet = sealEngineeringRiskSet({ runId: RUN_ID, risks: [mediumA, low] });
const permutedSet = sealEngineeringRiskSet({ runId: RUN_ID, risks: [low, mediumA] });
assert.equal(orderedSet.semanticHash, permutedSet.semanticHash);
assert.deepEqual(
  orderedSet.risks.map((item) => item.riskId),
  permutedSet.risks.map((item) => item.riskId),
);

// HIGH_BLOCK has no confirmation path and blocks authorization.
const blocker = risk({ riskCode: 'TOPOLOGY_GAP_UNRESOLVED', riskClass: 'HIGH_BLOCK' });
assert.throws(() => createEngineeringConfirmationReceipt({
  risk: blocker,
  basisCode: 'ENGINEER_ACCEPTED',
}), /Only HIGH_CONFIRM risks are confirmable/);
assert.throws(() => authorize(sealEngineeringRiskSet({ runId: RUN_ID, risks: [blocker] })), /HIGH_BLOCK/);

// HIGH_CONFIRM requires one current receipt. Audit actor/time are evidence metadata,
// not deterministic engineering identity.
const highConfirm = risk({
  riskCode: 'WALL_THICKNESS_INFERRED',
  riskClass: 'HIGH_CONFIRM',
  messageParameters: { basis: 'screening-table' },
});
const highConfirmSet = sealEngineeringRiskSet({ runId: RUN_ID, risks: [highConfirm, mediumA] });
assert.throws(() => authorize(highConfirmSet), /pending HIGH_CONFIRM/);

const receiptA = createEngineeringConfirmationReceipt({
  risk: highConfirm,
  basisCode: 'REVIEWED_ASSUMPTION',
  basisParameters: { acceptedValue: 7.11, unit: 'mm' },
  authorityRefs: [{ ref: 'authority:A1', semanticHash: 'hash:authority-a' }],
  auditMetadata: { actor: 'engineer:A', timestamp: '2026-08-15T09:50:00Z', comment: 'Reviewed.' },
});
const receiptB = createEngineeringConfirmationReceipt({
  risk: highConfirm,
  basisCode: 'REVIEWED_ASSUMPTION',
  basisParameters: { acceptedValue: 7.11, unit: 'mm' },
  authorityRefs: [{ ref: 'authority:A1', semanticHash: 'hash:authority-a' }],
  auditMetadata: { actor: 'engineer:B', timestamp: '2026-08-15T09:51:00Z', comment: 'Independent audit.' },
});
assert.equal(receiptA.semanticHash, receiptB.semanticHash);
assert.notEqual(receiptA.evidenceHash, receiptB.evidenceHash);
assert.equal(isEngineeringConfirmationCurrent(receiptA, highConfirm), true);
assert.throws(() => authorize(highConfirmSet, [receiptA, receiptB]), /multiple active confirmation receipts/);

const authorization = authorize(highConfirmSet, [receiptA]);
assert.ok(authorization.authorizationId.startsWith('calc-auth:'));
assert.equal(authorization.confirmationRefs.length, 1);

const current = assessEmpiricalV3CalculationAuthorizationCurrent(authorization, {
  runId: RUN_ID,
  policyId: POLICY_ID,
  policyVersion: POLICY_VERSION,
  dependencies: dependencies().reverse(),
  riskSet: highConfirmSet,
  confirmations: [receiptA],
});
assert.deepEqual(current, { current: true, reasons: [] });

// Governing source/branch mutation regenerates the risk identity and makes the
// prior confirmation visibly stale rather than silently reusable.
const changedRisk = risk({
  riskCode: 'WALL_THICKNESS_INFERRED',
  riskClass: 'HIGH_CONFIRM',
  dependencyHash: 'hash:dep-b',
  messageParameters: { basis: 'screening-table' },
});
assert.notEqual(changedRisk.semanticHash, highConfirm.semanticHash);
assert.equal(isEngineeringConfirmationCurrent(receiptA, changedRisk), false);
const changedRiskSet = sealEngineeringRiskSet({ runId: RUN_ID, risks: [changedRisk, mediumA] });
assert.throws(() => authorize(changedRiskSet, [receiptA]), /does not belong|pending HIGH_CONFIRM|stale/);

const staleDependency = assessEmpiricalV3CalculationAuthorizationCurrent(authorization, {
  runId: RUN_ID,
  policyId: POLICY_ID,
  policyVersion: POLICY_VERSION,
  dependencies: dependencies('hash:branch-b'),
  riskSet: highConfirmSet,
  confirmations: [receiptA],
});
assert.equal(staleDependency.current, false);
assert.ok(staleDependency.reasons.includes('DEPENDENCY_IDENTITY_CHANGED'));

const stalePolicy = assessEmpiricalV3CalculationAuthorizationCurrent(authorization, {
  runId: RUN_ID,
  policyId: POLICY_ID,
  policyVersion: '2',
  dependencies: dependencies(),
  riskSet: highConfirmSet,
  confirmations: [receiptA],
});
assert.equal(stalePolicy.current, false);
assert.ok(stalePolicy.reasons.includes('RISK_POLICY_CHANGED'));

// MEDIUM/LOW remain auditable but do not require confirmation.
const auditOnlyAuthorization = authorize(orderedSet);
assert.equal(auditOnlyAuthorization.confirmationRefs.length, 0);

// Source guards: this safety core must not import mechanics/UI implementations
// and must not grow an Accept-All/bulk-confirm escape hatch.
for (const relativePath of [
  '../src/core/empirical-v3-safety/risk-finding.js',
  '../src/core/empirical-v3-safety/confirmation-receipt.js',
  '../src/core/empirical-v3-safety/calculation-authorization.js',
]) {
  const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
  assert.doesNotMatch(source, /restraint-compatibility|rooted-tree-component-flexibility|linear-piping-results-workbench/);
  assert.doesNotMatch(source, /acceptAll|confirmAll|bulkConfirm|bulkAccept/i);
}

console.log('PASS empirical v3 risk / confirmation / authorization contract');
