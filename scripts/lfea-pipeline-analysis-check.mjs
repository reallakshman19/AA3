#!/usr/bin/env node
/**
 * The LFEA tab's own analysis path, exercised on the real BM4 model.
 *
 * This is the path a user actually takes: load a model, pick standard load
 * cases, press Analyze. It must reach real displacements and support loads
 * with NO hand-authored authority JSON, and it must be honest about what it
 * could not qualify rather than failing opaquely.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createLinearPipingInputXmlIntake } from '../src/workspace/linear-piping-inputxml-intake.js';
import { prepareLinearPipingInputXmlPreFlight } from '../src/workspace/linear-piping-inputxml-prefea.js';
import { createLfeaPipelineAnalysisController } from '../src/workspace/lfea-pipeline-analysis-controller.js';
import {
  reviewInputXmlLinearUnilateralRestraints,
  unilateralRestraintReviewSummary,
} from '../src/core/linear-piping-analysis-consumer/inputxml-linear-unilateral-restraint-review.js';

console.log('\n--- LFEA pipeline analysis path ---');

const content = readFileSync(
  fileURLToPath(new URL('../benchmarks/LFEA/BM4/InputXML_BM4.repaired.xml', import.meta.url)), 'utf8');
const CASES = Object.freeze(['IXP-W', 'IXP-WP', 'IXP-WT', 'IXP-WPT']);

const preFlight = prepareLinearPipingInputXmlPreFlight(
  createLinearPipingInputXmlIntake({ fileName: 'InputXML_BM4.repaired.xml', content }, { requestedCaseIds: CASES }));
assert.notEqual(preFlight.status, 'BLOCK');
// Analyze must not require a pre-authorized pre-flight: accepting the
// disclosed limitation set is what the Error-check step's own action does.
assert.equal(preFlight.solveAuthorized, false);

const controller = createLfeaPipelineAnalysisController({});
const state = controller.analyze(preFlight, [...CASES]);
assert.equal(state.status, 'CURRENT');
assert.equal(state.cases.length, 4);

for (const row of state.cases) {
  // Every case yields real solved values, qualified or not. 97 nodes x 6 DOF.
  assert.equal(row.displacements.length, 582, `${row.caseId} displacement rows`);
  assert.ok(row.reactions.length > 0, `${row.caseId} reactions`);
  assert.ok(['QUALIFIED', 'CONDITIONAL', 'BLOCKED'].includes(row.executionStatus));
  // A blocked case must NAME its failing check rather than fail opaquely.
  if (row.executionStatus === 'BLOCKED') {
    assert.ok(row.blockingChecks.length > 0, `${row.caseId} must name why it did not qualify`);
  }
}

// One unqualified case must not withhold element end forces from the cases
// that solved. BM4 is exactly this situation: W/W+P1 trip the residual gate,
// W+P1+T1 does not.
const blocked = state.cases.filter((row) => row.executionStatus === 'BLOCKED');
const qualified = state.cases.filter((row) => row.blockingChecks.length === 0);
assert.ok(blocked.length > 0 && qualified.length > 0, 'BM4 exercises the mixed-qualification path');
assert.notEqual(state.recovery, null, 'qualified cases must still be recovered');
for (const row of qualified) {
  const recovered = state.recovery.caseRecoveries.find((entry) => entry.caseId === row.caseId);
  assert.ok(recovered, `${row.caseId} must be recovered`);
  assert.ok(recovered.recovery.elementActions.length > 0, `${row.caseId} element end forces`);
}
assert.deepEqual(
  [...state.unrecoveredCaseIds].sort(),
  blocked.map((row) => row.caseId).sort(),
  'exactly the unqualified cases are reported as unrecovered',
);

// ---------------------------------------------------------------------------
// The unilateral-restraint review, which is what makes a linear result on a
// model like this trustworthy or not.
// ---------------------------------------------------------------------------
const structural = state.preFlight.preparation.structuralPreparation;
const review = reviewInputXmlLinearUnilateralRestraints(structural, state.cases[0].reactions);
// CAESAR's own RESTRAINT_REPORT for BM4 lists 29 "Rigid +Y" supports; the
// classification chain must find the same 29 independently.
assert.equal(review.unilateralRestraintCount, 29, 'BM4 one-way support count');
assert.equal(review.schema, 'inputxml-linear-unilateral-restraint-review/v1');

const operating = state.cases.find((row) => row.caseId === 'IXP-WPT');
assert.equal(operating.unilateralReview.status, 'LINEARIZATION_EXCEEDED');
assert.equal(operating.unilateralReview.violations.length, 4, 'BM4 operating-case lift-off count');
assert.ok(operating.unilateralSummary.includes('one-way supports'));
for (const violation of operating.unilateralReview.violations) {
  // A "+Y" support resists upward; a violation means the solved reaction runs
  // the other way, which is the whole point of the check.
  assert.equal(Math.sign(violation.reaction), -violation.resistedSign);
}

// A clean result must report nothing rather than always warning.
const clean = reviewInputXmlLinearUnilateralRestraints(structural, []);
assert.equal(clean.status, 'CONSISTENT');
assert.equal(unilateralRestraintReviewSummary(clean), null);

// Fail-closed inputs.
assert.throws(() => controller.analyze(null, CASES), /before analyzing/u);
assert.throws(() => controller.analyze(preFlight, []), /at least one load case/u);

assert.equal(controller.clear().status, 'EMPTY');

console.log(JSON.stringify({
  check: 'lfea-pipeline-analysis',
  status: 'PASS',
  cases: state.cases.map((row) => ({
    caseId: row.caseId,
    executionStatus: row.executionStatus,
    blockingChecks: row.blockingChecks.map((check) => check.checkId),
    unilateralViolations: row.unilateralReview.violations.length,
  })),
  unilateralRestraintCount: review.unilateralRestraintCount,
  recoveredCaseIds: state.recovery.caseRecoveries.map((row) => row.caseId),
  unrecoveredCaseIds: state.unrecoveredCaseIds,
}, null, 2));
console.log('LFEA pipeline analysis path PASS');
