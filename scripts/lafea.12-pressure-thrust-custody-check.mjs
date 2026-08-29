import assert from 'node:assert/strict';
import {
  AXIAL_PRESSURE_THRUST_BASES,
  calculateLocalAttachmentScreening,
} from '../src/core/local-attachment-screening/index.js';
import { rawRequestFixture, screeningRequestFixture } from './lafea.2-fixtures.mjs';

const excludes = calculateLocalAttachmentScreening(screeningRequestFixture());
assert.equal(excludes.qualification.state, 'ACCEPTED');
const excludesCase = excludes.screeningCases.find((row) => row.screeningCaseId === 'CASE-A');
const excludesPoint = excludes.pointStressStates.find((row) => row.screeningCaseId === 'CASE-A');
assert.equal(excludesCase.axialPressureThrustBasis, AXIAL_PRESSURE_THRUST_BASES.EXCLUDES_PRESSURE_THRUST);
assert.equal(excludesPoint.pressureStress.axialPressureThrustBasis, AXIAL_PRESSURE_THRUST_BASES.EXCLUDES_PRESSURE_THRUST);
assert.equal(excludesPoint.pressureStress.axialPressureTreatment, 'ADDED_FROM_FOUNDATION_CLOSED_END_STRESS');
assert.notEqual(excludesPoint.pressureStress.sigmaXPressure, 0);

const includes = calculateLocalAttachmentScreening(screeningRequestFixture((raw) => {
  raw.screeningCases[0].axialPressureThrustBasis = AXIAL_PRESSURE_THRUST_BASES.INCLUDES_PRESSURE_THRUST;
}));
assert.equal(includes.qualification.state, 'ACCEPTED');
const includesPoint = includes.pointStressStates.find((row) => row.screeningCaseId === 'CASE-A');
assert.equal(includesPoint.pressureStress.axialPressureThrustBasis, AXIAL_PRESSURE_THRUST_BASES.INCLUDES_PRESSURE_THRUST);
assert.equal(includesPoint.pressureStress.axialPressureTreatment, 'SUPPRESSED_ALREADY_INCLUDED_IN_MECHANICAL_RESULTANT');
assert.equal(includesPoint.pressureStress.sigmaXPressure, 0);
assert.equal(includesPoint.pressureStress.sigmaThetaPressure, excludesPoint.pressureStress.sigmaThetaPressure);
assert.equal(includesPoint.pressureStress.sigmaRPressure, excludesPoint.pressureStress.sigmaRPressure);
assert.equal(includesPoint.mechanicalStress.sigmaXMechanical, excludesPoint.mechanicalStress.sigmaXMechanical);
assert.equal(
  excludesPoint.stressTensor.sigmaX - includesPoint.stressTensor.sigmaX,
  excludesPoint.pressureStress.sigmaXPressure,
  'Only the duplicate closed-end axial pressure term may differ for otherwise identical inputs.',
);

assert.throws(() => screeningRequestFixture((raw) => {
  raw.screeningCases[0].axialPressureThrustBasis = AXIAL_PRESSURE_THRUST_BASES.UNKNOWN;
}), (error) => {
  assert.equal(error?.state, 'UNSUPPORTED_REQUEST');
  assert.equal(error?.code, 'AXIAL_PRESSURE_THRUST_BASIS_REQUIRED');
  return true;
});

assert.throws(() => screeningRequestFixture((raw) => {
  delete raw.screeningCases[0].axialPressureThrustBasis;
}), (error) => {
  assert.equal(error?.state, 'UNSUPPORTED_REQUEST');
  assert.equal(error?.code, 'AXIAL_PRESSURE_THRUST_BASIS_REQUIRED');
  return true;
});

const openLegacy = rawRequestFixture((raw) => {
  delete raw.screeningCases[1].axialPressureThrustBasis;
});
const openCase = openLegacy.screeningCases[1];
openCase.pressureFactor = 0;
const normalizedZeroPressureRequest = screeningRequestFixture((raw) => {
  raw.screeningCases[1] = openCase;
});
assert.equal(normalizedZeroPressureRequest.screeningCases[1].axialPressureThrustBasis, AXIAL_PRESSURE_THRUST_BASES.UNKNOWN);

console.log('LAFEA.1 -> LAFEA.2 pressure-thrust semantic custody checks passed.');
