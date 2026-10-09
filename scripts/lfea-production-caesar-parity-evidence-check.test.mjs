#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  extractMeasurement, validateMeasurement,
} from './lfea-production-caesar-parity-evidence-check.mjs';

const byQuantity = {
  DISPLACEMENT: { compared: 1, failing: 0 },
  ROTATION: { compared: 1, failing: 0 },
  FORCE: { compared: 1, failing: 0 },
  MOMENT: { compared: 1, failing: 0 },
};
const sample = {
  check: 'lfea-production-caesar-parity', status: 'MEASURED',
  editionProfileId: 'B31_3_2022_B31J_2017',
  caseMapping: { 'IXP-W': 'L2', 'IXP-WP': 'L6', 'IXP-WPT': 'L5' },
  sourceElementChains: 96, solverEvidence: [{ caseId: 'IXP-W' }, { caseId: 'IXP-WP' }, { caseId: 'IXP-WPT' }],
  thermalIntervalAuthority: { semanticHash: 'source-bound-authority' },
  elementActionsMeasured: false, elementActionsWithheldBecause: 'Recoveries withheld',
  perCase: ['L2','L5','L6'].map((caseId) => ({
    caseId, comparedComponents: 4, failing: 0,
    byQuantity: structuredClone(byQuantity), passRatePercent: 100,
    worstPercentError: 0, worstRows: [],
  })),
};
const log = `some adapter logging\n${JSON.stringify(sample, null, 2)}\n`;
assert.equal(validateMeasurement(extractMeasurement(log)).comparedComponents, 12);
assert.throws(() => extractMeasurement(JSON.stringify({
  check: 'lfea-production-caesar-parity', status: 'SKIPPED_MODEL_NOT_PRESENT',
})), /MEASURED_REQUIRED/u);
assert.throws(() => extractMeasurement('no benchmark executed'), /EXACTLY_ONE_MEASUREMENT_REQUIRED/u);
assert.throws(() => extractMeasurement(log + log), /EXACTLY_ONE_MEASUREMENT_REQUIRED/u);
assert.throws(() => validateMeasurement({ ...sample, perCase: sample.perCase.slice(1) }),
  /CASE_COVERAGE_REQUIRED/u);
const missingRotation = structuredClone(sample);
missingRotation.perCase[0].byQuantity.ROTATION.compared = 0;
assert.throws(() => validateMeasurement(missingRotation), /QUANTITY_NOT_MEASURED/u);
const invalidCount = structuredClone(sample);
invalidCount.perCase[0].comparedComponents = 3;
assert.throws(() => validateMeasurement(invalidCount), /COMPONENT_TOTAL_INCONSISTENT/u);
const fail = structuredClone(sample);
fail.perCase[0].byQuantity.FORCE.failing = 1;
fail.perCase[0].failing = 1;
const result = validateMeasurement(fail);
assert.equal(result.engineeringQualificationClaimed, false);
assert.equal(result.failedComponents, 1);
console.log('BM4L production parity measurement validator and negative controls PASS');
