#!/usr/bin/env node

import assert from 'node:assert/strict';
import { deriveMec21BendPressureFreeMovement } from '../src/core/linear-fea-piping-components/bourdon-pressure-expansion.js';

const REL = 1e-12;
const close = (a, b, label) => assert.ok(Math.abs(a - b) <= REL * Math.max(1, Math.abs(b)), `${label}: ${a} != ${b}`);

function fixture(overrides = {}) {
  const od = 0.2191;
  const t = 0.00818;
  const id = od - 2 * t;
  return {
    pressure: 2e6,
    innerRadius: id / 2,
    bendRadius: 0.3048,
    elasticModulus: 200e9,
    secondMoment: Math.PI / 64 * (od ** 4 - id ** 4),
    poissonRatio: 0.3,
    bendAngle: Math.PI / 2,
    ...overrides,
  };
}

function equation(input) {
  const ratio2 = (input.innerRadius / input.bendRadius) ** 2;
  const shell = (1 - input.poissonRatio) + 0.75 * (2 - input.poissonRatio) * ratio2;
  const eta = Math.PI * input.pressure * input.innerRadius ** 4 * shell
    / (input.elasticModulus * input.secondMoment);
  const s = eta * input.bendRadius;
  return {
    eta,
    shell,
    final: [s * (Math.sin(input.bendAngle) - input.bendAngle), 0, s * (Math.cos(input.bendAngle) - 1)],
    rotation: [0, eta * input.bendAngle, 0],
  };
}

console.log('\n--- M047 MEC-21 final-axis resolution check ---');

{
  const input = fixture();
  const expected = equation(input);
  const actual = deriveMec21BendPressureFreeMovement(input);
  assert.equal(actual.translationAbcFrame, 'INITIAL_POINT_EQUIVALENT_OF_MEC21_FINAL_POINT_AXES');
  expected.final.forEach((value, i) => close(actual.equationTranslationFinalAbc[i], value, `Eq2.25 final ${i}`));
  expected.rotation.forEach((value, i) => close(actual.rotationAbc[i], value, `rotation ${i}`));
  const c = Math.cos(input.bendAngle);
  const s = Math.sin(input.bendAngle);
  close(actual.translationAbc[0], c * expected.final[0] - s * expected.final[2], 'initial a');
  close(actual.translationAbc[2], s * expected.final[0] + c * expected.final[2], 'initial c');
  close(actual.translationAbc[0], 2.8170388536251044e-5, '90deg initial a witness');
  close(actual.translationAbc[2], -1.607955430087716e-5, '90deg initial c witness');
}

{
  const zero = deriveMec21BendPressureFreeMovement(fixture({ pressure: 0 }));
  assert.ok(zero.translationAbc.every((v) => v === 0));
  assert.ok(zero.equationTranslationFinalAbc.every((v) => v === 0));
  assert.ok(zero.rotationAbc.every((v) => v === 0));
}

{
  const one = deriveMec21BendPressureFreeMovement(fixture({ pressure: 1e6 }));
  const two = deriveMec21BendPressureFreeMovement(fixture({ pressure: 2e6 }));
  for (const key of ['translationAbc', 'equationTranslationFinalAbc', 'rotationAbc']) {
    for (let i = 0; i < 3; i += 1) close(two[key][i], 2 * one[key][i], `${key} pressure ${i}`);
  }
}

assert.throws(() => deriveMec21BendPressureFreeMovement(fixture({ bendAngle: Math.PI })), /less than pi/u);
assert.throws(() => deriveMec21BendPressureFreeMovement(fixture({ pressure: -1 })), /nonnegative/u);

process.stdout.write('lfea-m047-bourdon-mechanics-check: PASS\n');
