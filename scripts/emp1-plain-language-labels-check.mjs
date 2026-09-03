/**
 * EMP.1 plain-language label check.
 *
 * Guards the §4.2 fix: the codes that actually reach the screen must resolve to
 * sentences rather than shouted constants, and the composed step labels must be
 * mapped half by half.
 */
import assert from 'node:assert/strict';
import {
  EMP1_PLAIN_LANGUAGE_LABEL_COUNT,
  emp1HasPlainLanguageLabel,
  emp1PlainLanguageLabel,
} from '../src/workspace/emp1-plain-language-labels.js';

// Every code observed on the rendered EMP tab must be mapped.
const RENDERED_ON_SCREEN = [
  // readiness dimensions
  'INPUT_REQUIRED', 'NOT_ESTABLISHED', 'NOT_READY', 'NOT_REVIEWED',
  'NOT_ASSESSED', 'NOT_QUALIFIED',
  // authority summary values, already space separated upstream
  'SOURCE INPUT REQUIRED', 'SOURCE INCOMPLETE', 'TRANSFER INPUT REQUIRED',
  'SCREENING INPUT REQUIRED', 'LOCAL METHOD BLOCKED', 'LOCAL RESULT NOT CALCULATED',
  'RELEASE PROFILE NOT QUALIFIED', 'CODE COMPLIANCE NOT ASSESSED',
  // blockers surfaced in the blocking-evidence list and the failure banner
  'EMP1_READINESS_A_SOURCE_REQUIRED', 'EMP1_READINESS_B_SOURCE_REQUIRED',
  'EMP1_WORKBENCH_A_DOCUMENT_REQUIRED', 'EMP1_WORKBENCH_B_DOCUMENT_REQUIRED',
  'EMP1_WORKBENCH_RUN_INPUT_REQUIRED', 'EMP1_A_CURRENT_QUALIFIED_RESULT_REQUIRED',
  'EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENDED',
];
for (const code of RENDERED_ON_SCREEN) {
  assert.ok(emp1HasPlainLanguageLabel(code), `${code} must have a plain-language label`);
  const label = emp1PlainLanguageLabel(code);
  assert.notEqual(label, code, `${code} must not render as itself`);
  assert.ok(/[a-z]/.test(label), `${code} label must not be all caps: ${label}`);
  assert.equal(label.includes('_'), false, `${code} label must not carry underscores: ${label}`);
}

// Composed step labels are mapped half by half.
const composed = emp1PlainLanguageLabel('LOCAL METHOD BLOCKED · LOCAL RESULT NOT CALCULATED');
assert.equal(composed, 'Local method blocked · Local result not calculated');
assert.equal(
  emp1PlainLanguageLabel('LOCAL RESULT NOT CALCULATED · RELEASE PROFILE NOT QUALIFIED'),
  'Local result not calculated · Release profile not qualified',
);

// Unmapped codes degrade to the previous underscore-stripping behaviour, not to nothing.
assert.equal(emp1PlainLanguageLabel('SOME_FUTURE_CODE'), 'SOME FUTURE CODE');
assert.equal(emp1HasPlainLanguageLabel('SOME_FUTURE_CODE'), false);
assert.equal(emp1PlainLanguageLabel(null), 'UNRESOLVED');

assert.ok(EMP1_PLAIN_LANGUAGE_LABEL_COUNT >= RENDERED_ON_SCREEN.length);
console.log(`  ${RENDERED_ON_SCREEN.length} rendered codes mapped, ${EMP1_PLAIN_LANGUAGE_LABEL_COUNT} labels total`);
console.log('EMP1_PLAIN_LANGUAGE_LABELS_CHECK_PASS');
