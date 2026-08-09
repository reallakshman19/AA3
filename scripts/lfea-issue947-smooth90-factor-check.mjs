#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  COMPONENT_GEOMETRY_SCHEMA,
  FACTOR_CALCULATION_REQUEST_SCHEMA,
  calculateB31Factors,
} from '../src/core/linear-fea-b31-factor-calculator/index.js';

const baseGeometry = Object.freeze({
  schema: COMPONENT_GEOMETRY_SCHEMA,
  componentType: 'BEND',
  lengthUnit: 'm',
  outerDiameter: 0.273,
  wallThickness: 0.0182626,
  bendRadius: 0.381,
  pressure: 11_600_000,
  elasticModulus: 203_395_008_000,
  bendAngleDegrees: 90,
  sourceEvidence: Object.freeze({
    sourceId: 'BM4_NL:BEND_PTR:1',
    sourceRevision: '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21',
  }),
});

const general = calculate(false, 90, 'GENERAL');
const smooth90 = calculate(true, 90, 'SMOOTH90');
assert.equal(general.status, 'QUALIFIED');
assert.equal(smooth90.status, 'QUALIFIED');
assert.equal(general.factors.flexibilityRule.coefficient, 1.65);
assert.equal(general.factors.flexibilityRule.smooth90CorrectionApplied, false);
assert.equal(smooth90.factors.flexibilityRule.coefficient, 1.3);
assert.equal(smooth90.factors.flexibilityRule.smooth90CorrectionApplied, true);

const meanRadius = (baseGeometry.outerDiameter - baseGeometry.wallThickness) / 2;
const h = baseGeometry.wallThickness * baseGeometry.bendRadius / meanRadius ** 2;
const pressureDenominator = 1
  + 6
    * (baseGeometry.pressure / baseGeometry.elasticModulus)
    * (meanRadius / baseGeometry.wallThickness) ** (7 / 3)
    * (baseGeometry.bendRadius / meanRadius) ** (1 / 3);
const expectedGeneral = (1.65 / h) / pressureDenominator;
const expectedSmooth90 = (1.3 / h) / pressureDenominator;
close(general.factors.flexibility.inPlane, expectedGeneral);
close(general.factors.flexibility.outOfPlane, expectedGeneral);
close(smooth90.factors.flexibility.inPlane, expectedSmooth90);
close(smooth90.factors.flexibility.outOfPlane, expectedSmooth90);
close(smooth90.factors.flexibility.inPlane / general.factors.flexibility.inPlane, 1.3 / 1.65);

const invalid45 = calculate(true, 45, 'INVALID45');
assert.equal(invalid45.status, 'BLOCKED');
assert.ok(invalid45.applicability.violations.some((entry) => entry.field === 'bendAngleDegrees'));

console.log(JSON.stringify({
  check: 'lfea-issue947-smooth90-factor',
  status: 'PASS',
  sourceAccdbSha256: baseGeometry.sourceEvidence.sourceRevision,
  bendPointer: 1,
  bendAngleDegrees: 90,
  flexibilityCharacteristic: h,
  pressureDenominator,
  generalCoefficient: 1.65,
  smooth90Coefficient: 1.3,
  generalPressureCorrectedFlexibility: general.factors.flexibility.inPlane,
  smooth90PressureCorrectedFlexibility: smooth90.factors.flexibility.inPlane,
  ratio: smooth90.factors.flexibility.inPlane / general.factors.flexibility.inPlane,
  non90Policy: 'BLOCKED',
}, null, 2));

function calculate(enabled, bendAngleDegrees, suffix) {
  return calculateB31Factors({
    schema: FACTOR_CALCULATION_REQUEST_SCHEMA,
    calculationId: `ISSUE947-${suffix}`,
    componentId: `ISSUE947-${suffix}`,
    editionProfileId: 'B31_3_2022_B31J_2017',
    componentType: 'BEND',
    geometry: {
      ...baseGeometry,
      bendAngleDegrees,
      smooth90FlexibilityCorrection: enabled,
    },
    momentDirectionMapping: { inPlaneField: 'my', outOfPlaneField: 'mz' },
    semanticHash: '',
  });
}

function close(actual, expected, tolerance = 1e-12) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)),
    `${actual} != ${expected}`,
  );
}
