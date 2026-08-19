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
import { BM4_REPAIRED_PATH, BM4_SOURCE_PATH } from './lfea-bm4-cii-output-comparison.mjs';
import { prepareLinearPipingInputXmlPreFlight } from '../src/workspace/linear-piping-inputxml-prefea.js';
import { createLfeaPipelineAnalysisController } from '../src/workspace/lfea-pipeline-analysis-controller.js';
import { buildLfeaPipelineLayoutGrid } from '../src/workspace/lfea-pipeline-layout-grid.js';
import {
  findInputXmlBacktrackingElements,
  repairInputXmlCollinearBacktracks,
} from '../src/core/geometry/adapters/inputxml-collinear-backtrack-repair.js';
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

// ---------------------------------------------------------------------------
// The Layout grid: the model as an element table, in the units read on screen.
// ---------------------------------------------------------------------------
const layout = buildLfeaPipelineLayoutGrid(preFlight);
assert.equal(layout.elementCount, 96, 'BM4 element count');
assert.equal(layout.nodeCount, 97, 'BM4 node count');
assert.equal(layout.rows.length, 96);

// The three repaired backtracking elements must read as -1 mm, not +1 mm --
// the grid shows the model actually being analyzed, not the file as received.
const repaired = layout.rows.filter((row) => Math.abs(row.lengthMm - 1) < 1e-6);
assert.equal(repaired.length, 3, 'BM4 has exactly three 1 mm elements');
for (const row of repaired) {
  assert.ok(row.deltaX < 0, `element ${row.elementIndex} must run in -X after repair`);
}

// Values are unit conversions of sealed data, and must actually convert:
// the conditioned geometry works in metres, kelvin and pascals.
const sample = layout.rows[13];
assert.ok(sample.outsideDiameterMm > 1, 'diameter is shown in millimetres, not metres');
assert.ok(sample.temperatureC > 0 && sample.temperatureC < 1000, 'temperature is shown in degrees Celsius');
assert.ok(sample.pressureBar > 0 && sample.pressureBar < 1000, 'pressure is shown in bar');
assert.equal(typeof sample.material, 'string');

// Restraint labels must disclose the approximations that restraint relies on.
const labels = layout.rows.map((row) => row.restraint).join(' ');
assert.match(labels, /one-way/u, 'one-way supports must be visible in the layout');
assert.match(labels, /friction/u, 'ignored friction must be visible in the layout');
assert.match(labels, /gap/u, 'closed gaps must be visible in the layout');

// An empty projection must be empty, not a crash or a fabricated row.
assert.equal(buildLfeaPipelineLayoutGrid(null).rows.length, 0);

// ---------------------------------------------------------------------------
// The in-app source correction, on the model AS RECEIVED.
// ---------------------------------------------------------------------------
// The repaired benchmark file being committed is not the same thing as the
// product offering the correction: a user loads their real file. This asserts
// the rule the panel runs finds the fault in the as-received model and clears
// it, so the fix is reachable from the UI and not only from a build script.
const asReceived = readFileSync(BM4_SOURCE_PATH, 'utf8');
const candidates = findInputXmlBacktrackingElements(asReceived);
assert.equal(candidates.length, 3, 'the as-received BM4 has three backtracking elements');
for (const candidate of candidates) {
  assert.ok(candidate.length <= 25, 'the rule stays inside its declared bound');
  assert.ok(candidate.vector.some((value) => value !== 0));
}
const repairedInMemory = repairInputXmlCollinearBacktracks(asReceived);
assert.equal(repairedInMemory.repairs.length, 3);
assert.equal(findInputXmlBacktrackingElements(repairedInMemory.xml).length, 0,
  'the correction must be idempotent -- nothing is left for a second pass');
// Byte-identical to the committed repaired variant: one rule, one result.
assert.equal(repairedInMemory.xml, readFileSync(BM4_REPAIRED_PATH, 'utf8'),
  'the in-app correction must produce exactly the committed repaired model');

// It must clear the blocking findings on the real file, not merely change bytes.
const repairedPreFlight = prepareLinearPipingInputXmlPreFlight(createLinearPipingInputXmlIntake(
  { fileName: 'corrected.xml', content: repairedInMemory.xml }, { requestedCaseIds: CASES }));
assert.notEqual(repairedPreFlight.status, 'BLOCK', 'the correction must clear the overlap BLOCK');
assert.equal(
  (repairedPreFlight.preparation.findings ?? []).filter((row) => row.disposition === 'BLOCK').length,
  0,
);

// A model without the fault must yield no candidates, so the panel stays quiet.
assert.equal(findInputXmlBacktrackingElements(repairedInMemory.xml).length, 0);

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
  layout: { elements: layout.elementCount, nodes: layout.nodeCount, repairedShortElements: repaired.length },
}, null, 2));
console.log('LFEA pipeline analysis path PASS');
