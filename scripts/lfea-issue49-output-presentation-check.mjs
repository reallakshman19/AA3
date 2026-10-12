#!/usr/bin/env node
/**
 * #49 Output display-contract regression. Uses the existing governed B3.4
 * cantilever fixture and sealed recovery record; no numerical oracles changed.
 * Tests presentation readback, not engineering results or an ACCDB approval.
 */
import assert from 'node:assert/strict';
import { compileResultRecovery } from '../src/core/linear-fea-result-recovery/index.js';
import { compileSolverExecution } from '../src/core/linear-fea-solver/index.js';
import { lfeaElementActionDisplayRows, ELEMENT_ACTION_COMPONENTS } from '../src/workspace/lfea-pipeline-results-panel.js';
import { cantileverCompilation, solverProfile } from './lfea-b3.3-solver-fixtures.mjs';
import {
  elementContributionFromFrameElement,
  frameElementsWithUdl,
  recoveryProfile,
  udlLoadCase,
} from './lfea-b3.4-recovery-fixtures.mjs';

const compilation = cantileverCompilation();
const elements = frameElementsWithUdl(compilation);
const loadCase = udlLoadCase(compilation);
const execution = compileSolverExecution({
  compilation,
  elementContributions: elements.map((element) => elementContributionFromFrameElement(element)),
  loadCase,
  solverProfile: solverProfile(),
});
const recovery = compileResultRecovery({
  compilation, execution, loadCase,
  frameElements: elements, pipingComponents: [], recoveryProfile: recoveryProfile(),
});
const display = lfeaElementActionDisplayRows(recovery.elementActions);
assert.equal(display.length, recovery.elementActions.length * 2, 'one global I and J row per recovered element');
for (let index = 0; index < recovery.elementActions.length; index += 1) {
  const source = recovery.elementActions[index];
  for (const [endOffset, end] of ['I', 'J'].entries()) {
    const row = display[index * 2 + endOffset];
    assert.equal(row.elementId, source.elementId);
    assert.equal(row.end, end);
    for (const component of ELEMENT_ACTION_COMPONENTS) {
      assert.equal(row[component], source.global[end][component],
        'present the sealed global end action without computing a replacement');
      assert.ok(Number.isFinite(row[component]));
    }
  }
}
assert.throws(
  () => lfeaElementActionDisplayRows([{ ...recovery.elementActions[0], global: { I: recovery.elementActions[0].global.I } }]),
  /missing or nonfinite.*end J/u,
  'missing J-end must fail closed, not fabricate a blank row',
);
assert.throws(
  () => lfeaElementActionDisplayRows([{ ...recovery.elementActions[0], global: {
    I: { ...recovery.elementActions[0].global.I, fx: Number.NaN },
    J: recovery.elementActions[0].global.J,
  } }]),
  /missing or nonfinite.*end I/u,
  'nonfinite component must fail closed',
);
console.log(JSON.stringify({
  check: 'issue49-output-presentation-contract',
  status: 'PASS',
  recoveredElements: recovery.elementActions.length,
  displayedEndRows: display.length,
  basis: 'GLOBAL_I_J',
  source: 'sealed B3.4 recovery fixture',
}));
