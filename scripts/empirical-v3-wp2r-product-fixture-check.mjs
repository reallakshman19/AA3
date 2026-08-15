import assert from 'node:assert/strict';
import { createEmpiricalV3Wp2rProductFixture } from '../e2e/fixtures/empirical-v3-wp2r-product-fixture.js';
import {
  requireEmpiricalV3CoupledCalculationEvidence,
  requireEmpiricalV3SafetyPresentationPackage,
} from '../src/core/empirical-v3-safety/index.js';

const fixtureA = createEmpiricalV3Wp2rProductFixture();
const fixtureB = createEmpiricalV3Wp2rProductFixture();

assert.equal(fixtureA.fixturePolicy.validatesMixedBrowserExecution, false);
assert.equal(fixtureA.fixturePolicy.validatesSolverExecution, false);
assert.equal(fixtureA.fixturePolicy.realRunQualificationRequiredSeparately, true);

for (const key of ['blocked', 'reviewRequired', 'authorized', 'resultRequired']) {
  const packageA = requireEmpiricalV3SafetyPresentationPackage(fixtureA.packages[key]);
  const packageB = requireEmpiricalV3SafetyPresentationPackage(fixtureB.packages[key]);
  assert.equal(packageA.semanticHash, packageB.semanticHash, `${key} package must be deterministic.`);
}

assert.equal(fixtureA.packages.blocked.workflow.state, 'HIGH_BLOCK_PRESENT');
assert.equal(fixtureA.packages.blocked.riskSet.counts.HIGH_BLOCK, 1);
assert.equal(fixtureA.packages.blocked.riskSet.counts.HIGH_CONFIRM, 1);
assert.equal(fixtureA.packages.blocked.riskSet.counts.MEDIUM, 1);
assert.equal(fixtureA.packages.blocked.calculationAuthorization, null);

assert.equal(fixtureA.packages.reviewRequired.workflow.state, 'HIGH_CONFIRM_PENDING');
assert.equal(fixtureA.packages.reviewRequired.riskSet.counts.HIGH_BLOCK, 0);
assert.equal(fixtureA.packages.reviewRequired.confirmations.length, 0);

assert.equal(fixtureA.packages.authorized.workflow.state, 'CALCULATION_AUTHORIZED');
assert.equal(fixtureA.packages.authorized.confirmations.length, 1);
assert.equal(fixtureA.packages.authorized.confirmations[0].riskRef.riskId, fixtureA.risks.highConfirm.riskId);
assert.equal(fixtureA.packages.authorized.calculationAuthorization.semanticHash, fixtureA.authorization.semanticHash);

const evidence = requireEmpiricalV3CoupledCalculationEvidence(fixtureA.evidence);
assert.equal(fixtureA.packages.resultRequired.workflow.state, 'RESULT_REVIEW_REQUIRED');
assert.equal(fixtureA.packages.resultRequired.workflow.facts.calculationResult.semanticHash, evidence.semanticHash);
assert.equal(evidence.coordinates.length, 2);
assert.equal(evidence.coupledSystem.flexibilityMatrixMPerN[0][1], fixtureA.expected.flexibilityMatrixMPerN[0][1]);
assert.equal(evidence.coupledSystem.flexibilityMatrixMPerN[1][0], fixtureA.expected.flexibilityMatrixMPerN[1][0]);
assert.equal(evidence.coordinates.find((row) => row.coordinateId === 'TIP-X').reactionN, fixtureA.expected.reactionN['TIP-X']);
assert.equal(evidence.coordinates.find((row) => row.coordinateId === 'TIP-Y').reactionN, fixtureA.expected.reactionN['TIP-Y']);
assert.ok(evidence.coordinates.every((row) => row.pairEvidence.some((pair) => pair.componentContributions.some((item) => item.componentId === 'E102'))));
assert.equal(evidence.evidencePolicy.mechanicsRecomputed, false);
assert.equal(evidence.evidencePolicy.reactionRecomputed, false);
assert.equal(evidence.evidencePolicy.uiOrReportMayResolveMechanics, false);

const branchA = fixtureA.branches.find((row) => row.componentIds.includes('P101'));
const branchB = fixtureA.branches.find((row) => row.componentIds.includes('P203'));
assert.ok(branchA);
assert.ok(branchB);
assert.notEqual(branchA.branchId, branchB.branchId);
assert.notEqual(branchA.branchSamenessHash, branchB.branchSamenessHash, '180→210 °C process split must create distinct branch basis.');
assert.equal(fixtureA.components.find((row) => row.componentId === 'P101').branchRef.branchId, branchA.branchId);
assert.equal(fixtureA.components.find((row) => row.componentId === 'P203').branchRef.branchId, branchB.branchId);

console.log('PASS empirical-v3 WP2R sealed product fixture integrity');
