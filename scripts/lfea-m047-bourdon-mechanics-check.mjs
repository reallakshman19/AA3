#!/usr/bin/env node

import assert from 'node:assert/strict';
import { deriveMec21BendPressureFreeMovement } from '../src/core/linear-fea-piping-components/bourdon-pressure-expansion.js';

const REL_TOL = 1e-12;

function test(id, name, body) {
  body();
  process.stdout.write(`${id} PASS ${name}\n`);
}

function assertClose(actual, expected, relativeTolerance, message) {
  const scale = Math.max(Math.abs(expected), 1e-300);
  assert.ok(
    Math.abs(actual - expected) <= relativeTolerance * scale,
    `${message}: ${actual} differs from ${expected} beyond ${relativeTolerance} relative`,
  );
}

function independentMec21(input) {
  const ratioSquared = (input.innerRadius / input.bendRadius) ** 2;
  const shellCorrection = (1 - input.poissonRatio)
    + (3 / 4) * (2 - input.poissonRatio) * ratioSquared;
  const curvatureChangeRatio = Math.PI * input.pressure * input.innerRadius ** 4
    * shellCorrection / (input.elasticModulus * input.secondMoment);
  return {
    shellCorrection,
    curvatureChangeRatio,
    translationAbc: [
      curvatureChangeRatio * input.bendRadius * (Math.sin(input.bendAngle) - input.bendAngle),
      0,
      curvatureChangeRatio * input.bendRadius * (Math.cos(input.bendAngle) - 1),
    ],
    rotationAbc: [0, curvatureChangeRatio * input.bendAngle, 0],
  };
}

function realisticFixture(overrides = {}) {
  const outerDiameter = 0.2191;
  const wallThickness = 0.00818;
  const innerDiameter = outerDiameter - 2 * wallThickness;
  return {
    pressure: 2.0e6,
    innerRadius: innerDiameter / 2,
    bendRadius: 0.3048,
    elasticModulus: 200e9,
    secondMoment: Math.PI / 64 * (outerDiameter ** 4 - innerDiameter ** 4),
    poissonRatio: 0.3,
    bendAngle: Math.PI / 2,
    ...overrides,
  };
}

console.log('\n--- M047 MEC-21 rotational Bourdon analytical check ---');

test('M047-I002-T01', '90-degree SI fixture matches an independent Eq. (2.25) evaluation', () => {
  const input = realisticFixture();
  const expected = independentMec21(input);
  const actual = deriveMec21BendPressureFreeMovement(input);

  assertClose(actual.shellCorrection, expected.shellCorrection, REL_TOL, 'shell correction');
  assertClose(actual.curvatureChangeRatio, expected.curvatureChangeRatio, REL_TOL, 'curvature-change ratio');
  actual.translationAbc.forEach((value, index) => assertClose(
    value === 0 ? 1 : value,
    expected.translationAbc[index] === 0 ? 1 : expected.translationAbc[index],
    REL_TOL,
    `translationAbc[${index}]`,
  ));
  actual.rotationAbc.forEach((value, index) => assertClose(
    value === 0 ? 1 : value,
    expected.rotationAbc[index] === 0 ? 1 : expected.rotationAbc[index],
    REL_TOL,
    `rotationAbc[${index}]`,
  ));

  // Retained numerical witness for the exact fixture above. These numbers are
  // independently evaluated from Eq. (2.25), not fitted to BM4_NL results.
  assertClose(actual.translationAbc[0], -1.607955430087716e-5, REL_TOL, '90-degree a translation');
  assertClose(actual.translationAbc[2], -2.8170388536251044e-5, REL_TOL, '90-degree c translation');
  assertClose(actual.rotationAbc[1], 1.4517697781210042e-4, REL_TOL, '90-degree b rotation');
});

test('M047-I002-T02', 'positive pressure opens the bend in the declared a-b-c sign convention', () => {
  const result = deriveMec21BendPressureFreeMovement(realisticFixture());
  assert.ok(result.translationAbc[0] < 0, 'positive pressure must produce negative a movement for 0 < theta < pi');
  assert.equal(result.translationAbc[1], 0);
  assert.ok(result.translationAbc[2] < 0, 'negative c is radially outward because +c points toward the bend centre');
  assert.equal(result.rotationAbc[0], 0);
  assert.ok(result.rotationAbc[1] > 0, 'positive b rotation must open/straighten the bend');
  assert.equal(result.rotationAbc[2], 0);
});

test('M047-I002-T03', 'zero pressure produces exactly zero Bourdon free movement', () => {
  const result = deriveMec21BendPressureFreeMovement(realisticFixture({ pressure: 0 }));
  assert.ok(result.translationAbc.every((value) => value === 0), 'zero pressure translation components');
  assert.ok(result.rotationAbc.every((value) => value === 0), 'zero pressure rotation components');
  assert.equal(result.curvatureChangeRatio, 0);
});

test('M047-I002-T04', 'Eq. (2.25) response is exactly linear in pressure', () => {
  const base = deriveMec21BendPressureFreeMovement(realisticFixture({ pressure: 1.25e6 }));
  const doubled = deriveMec21BendPressureFreeMovement(realisticFixture({ pressure: 2.5e6 }));
  for (const index of [0, 1, 2]) {
    assertClose(
      doubled.translationAbc[index] === 0 ? 1 : doubled.translationAbc[index],
      base.translationAbc[index] === 0 ? 1 : 2 * base.translationAbc[index],
      REL_TOL,
      `pressure scaling translation ${index}`,
    );
    assertClose(
      doubled.rotationAbc[index] === 0 ? 1 : doubled.rotationAbc[index],
      base.rotationAbc[index] === 0 ? 1 : 2 * base.rotationAbc[index],
      REL_TOL,
      `pressure scaling rotation ${index}`,
    );
  }
  assertClose(doubled.curvatureChangeRatio, 2 * base.curvatureChangeRatio, REL_TOL, 'pressure scaling eta');
});

test('M047-I002-T05', 'Eq. (2.25) response is inversely proportional to elastic modulus', () => {
  const base = deriveMec21BendPressureFreeMovement(realisticFixture({ elasticModulus: 200e9 }));
  const doubledE = deriveMec21BendPressureFreeMovement(realisticFixture({ elasticModulus: 400e9 }));
  assertClose(doubledE.translationAbc[0], 0.5 * base.translationAbc[0], REL_TOL, 'E scaling a translation');
  assertClose(doubledE.translationAbc[2], 0.5 * base.translationAbc[2], REL_TOL, 'E scaling c translation');
  assertClose(doubledE.rotationAbc[1], 0.5 * base.rotationAbc[1], REL_TOL, 'E scaling b rotation');
});

test('M047-I002-T06', 'small-angle behavior has the expected asymptotic orders', () => {
  const theta = 1e-3;
  const result = deriveMec21BendPressureFreeMovement(realisticFixture({ bendAngle: theta }));
  const eta = result.curvatureChangeRatio;
  const radius = realisticFixture().bendRadius;
  // sin(theta)-theta = -theta^3/6 + O(theta^5)
  // cos(theta)-1 = -theta^2/2 + O(theta^4)
  assertClose(result.translationAbc[0], -eta * radius * theta ** 3 / 6, 1e-7, 'small-angle a translation');
  assertClose(result.translationAbc[2], -eta * radius * theta ** 2 / 2, 1e-7, 'small-angle c translation');
  assertClose(result.rotationAbc[1], eta * theta, REL_TOL, 'small-angle b rotation');
});

test('M047-I002-T07', 'the derivation rejects unqualified geometry and material inputs', () => {
  assert.throws(
    () => deriveMec21BendPressureFreeMovement(realisticFixture({ bendAngle: Math.PI })),
    /bendAngle must be less than pi radians/u,
  );
  assert.throws(
    () => deriveMec21BendPressureFreeMovement(realisticFixture({ bendAngle: 0 })),
    /bendAngle must be finite and positive/u,
  );
  assert.throws(
    () => deriveMec21BendPressureFreeMovement(realisticFixture({ elasticModulus: 0 })),
    /elasticModulus must be finite and positive/u,
  );
  assert.throws(
    () => deriveMec21BendPressureFreeMovement(realisticFixture({ poissonRatio: 0.5 })),
    /poissonRatio must be finite and in \[0, 0\.5\)/u,
  );
  assert.throws(
    () => deriveMec21BendPressureFreeMovement(realisticFixture({ pressure: -1 })),
    /pressure must be finite and nonnegative/u,
  );
});

process.stdout.write('lfea-m047-bourdon-mechanics-check: PASS\n');
