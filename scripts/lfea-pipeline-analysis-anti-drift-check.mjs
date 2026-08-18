#!/usr/bin/env node
/**
 * Guards for the LFEA tab's analysis path: the properties that make it a
 * reusing, honest path rather than a parallel one.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (name) => readFileSync(fileURLToPath(new URL(`../src/workspace/${name}`, import.meta.url)), 'utf8');
const readCore = (name) => readFileSync(
  fileURLToPath(new URL(`../src/core/linear-piping-analysis-consumer/${name}`, import.meta.url)), 'utf8');

const controller = read('lfea-pipeline-analysis-controller.js');
const casePanel = read('lfea-pipeline-case-selection-panel.js');
const resultsPanel = read('lfea-pipeline-results-panel.js');
const review = readCore('inputxml-linear-unilateral-restraint-review.js');
const main = readFileSync(fileURLToPath(new URL('../src/main.js', import.meta.url)), 'utf8');

// --- Reuse, not reimplementation -------------------------------------------
assert.match(controller, /createLfeaNativeExecutionAuthority/u,
  'the analysis must run through the existing native execution authority');
assert.match(controller, /recoverInputXmlAuthorizedRawCases/u,
  'recovery must run through the existing governed recovery entry point');
for (const forbidden of [/compileSolverExecution/u, /assembleGlobal/u, /factorize/u, /stiffnessMatrix/u]) {
  assert.doesNotMatch(controller, forbidden, 'the pipeline controller must not reimplement the solver');
}

// --- No authority supplement in front of the analysis ----------------------
// Checked as a property READ (`.field` / `field:`), not as a bare mention --
// the module's header names all three to explain why it needs none of them.
for (const field of ['interfaceAuthority', 'nozzleAllowableProfiles', 'b31Authority']) {
  assert.doesNotMatch(controller, new RegExp(`[.]${field}\\b|${field}\\s*:`, 'u'),
    `the analysis path must not consult ${field}; those belong to the code-stress application`);
}
// Matched import-shaped, not by bare mention: the module's own header
// explains why it deliberately avoids that path, and that sentence is worth
// keeping.
assert.doesNotMatch(controller, /import[^;]*runLinearPipingWorkbenchAnalysis/u,
  'the analysis path must not route through the multicase run-request path');

// --- The governed run-request contract stays strict -------------------------
// Making the three authorities optional there would weaken a contract for
// work that genuinely needs them. The tab avoids the wall by not using that
// path for the analysis, not by relaxing it.
const runRequest = read('linear-piping-run-request.js');
for (const field of ['interfaceAuthority', 'nozzleAllowableProfiles', 'b31Authority']) {
  assert.match(runRequest, new RegExp(`'${field}',`, 'u'),
    `${field} must remain a required key of the multicase run request`);
}

// --- Unit conversion happens for display only ------------------------------
assert.match(resultsPanel, /180 \/ Math\.PI/u, 'rotations are shown in degrees');
assert.match(resultsPanel, /1000/u, 'translations are shown in millimetres');
for (const forbidden of [/elasticModulus/u, /\bstress\b/u, /allowable/u]) {
  assert.doesNotMatch(resultsPanel, forbidden,
    'the results panel presents solved values; it must not derive engineering quantities');
}

// --- Blocked cases stay visible and explained ------------------------------
assert.match(controller, /blockingChecks/u, 'a case that did not qualify must name its failing checks');
assert.match(resultsPanel, /elementForceUnavailableReason/u,
  'withheld element forces must say which case failed and why');
assert.match(controller, /qualifiedCaseIds/u,
  'one unqualified case must not withhold recovery from cases that qualified');

// --- The unilateral review is measured, never assumed ----------------------
assert.match(review, /resistedSign/u);
assert.match(review, /Math\.sign/u, 'the review compares the solved reaction against the resistable direction');
assert.doesNotMatch(review, /0\.6|tributary|percentageOfWeight/u,
  'the review must not carry empirical reaction factors');

// --- Load cases come from the model, not from a hardcoded list -------------
assert.match(casePanel, /physicalPreparation\?\.physicalCases/u,
  'offered cases must come from the model\'s own compiled physical cases');
assert.doesNotMatch(casePanel, /caseId: 'IXP-/u, 'case IDs must never be hardcoded');
assert.match(casePanel, /setRequestedCaseIds|onApplyCaseSelection/u,
  'changing the selection must re-run governed preparation');

// --- The continuum workbench is off the F LFEA tab -------------------------
const layout = readFileSync(fileURLToPath(new URL('../src/workspace/workspace-layout.js', import.meta.url)), 'utf8');
const viewStart = layout.indexOf('application-view--lfea');
const detachedStart = layout.indexOf('application-detached-host');
assert.ok(viewStart > 0 && detachedStart > viewStart,
  'the LFEA view must precede the detached continuum host in the layout');
const lfeaView = layout.slice(viewStart, detachedStart);
assert.doesNotMatch(lfeaView, /data-role="lfea-consumer-root"/u,
  'the T3/Q4 continuum workbench must not render inside the F LFEA tab');
assert.match(layout, /data-role="lfea-detached-host"/u,
  'its root must still exist so the workspace public API and lfea.html keep working');

// --- main.js wires Analyze without the supplement --------------------------
assert.match(main, /runLfeaPipelineAnalysis/u);
assert.match(main, /onAnalyze:/u);

console.log(JSON.stringify({ check: 'lfea-pipeline-analysis-anti-drift', status: 'PASS' }));
