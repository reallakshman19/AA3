#!/usr/bin/env node

import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];
  if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid argument near ${String(key)}.`);
  args.set(key, value);
}
const modulePath = args.get('--module');
if (!modulePath) throw new TypeError('Usage: --module <patched bourdon-pressure-expansion.js>.');
const mod = await import(`${pathToFileURL(resolve(modulePath)).href}?m047i011=${Date.now()}`);
const derive = mod.deriveMec21BendPressureFreeMovement;
assert.equal(typeof derive, 'function');

const od = 0.2191;
const t = 0.00818;
const id = od - 2 * t;
const fixture = (overrides = {}) => ({
  pressure: 2e6,
  innerRadius: id / 2,
  bendRadius: 0.3048,
  elasticModulus: 200e9,
  secondMoment: Math.PI / 64 * (od ** 4 - id ** 4),
  poissonRatio: 0.3,
  bendAngle: Math.PI / 2,
  ...overrides,
});
const close = (actual, expected, label) => assert.ok(
  Math.abs(actual - expected) <= 1e-12 * Math.max(1, Math.abs(expected)),
  `${label}: ${actual} != ${expected}`,
);
const zeroVector = (vector, label) => vector.forEach((value, index) => {
  assert.equal(Math.abs(value), 0, `${label}[${index}] must be numerically zero; got ${value}`);
});

console.log('\n--- M047 I011 MEC-21 final-axis candidate qualification ---');

{
  const input = fixture();
  const result = derive(input);
  const ratio2 = (input.innerRadius / input.bendRadius) ** 2;
  const shell = (1 - input.poissonRatio) + 0.75 * (2 - input.poissonRatio) * ratio2;
  const eta = Math.PI * input.pressure * input.innerRadius ** 4 * shell
    / (input.elasticModulus * input.secondMoment);
  const scale = eta * input.bendRadius;
  const final = [
    scale * (Math.sin(input.bendAngle) - input.bendAngle),
    0,
    scale * (Math.cos(input.bendAngle) - 1),
  ];
  const c = Math.cos(input.bendAngle);
  const s = Math.sin(input.bendAngle);
  const initial = [c * final[0] - s * final[2], 0, s * final[0] + c * final[2]];
  assert.equal(result.formulation, 'MEC21_PART_II_EQ_2_25_BEND_PRESSURE_FREE_MOVEMENT_FINAL_TO_INITIAL_AXES_V2');
  assert.equal(result.translationAbcFrame, 'INITIAL_POINT_EQUIVALENT_OF_MEC21_FINAL_POINT_AXES');
  final.forEach((value, index) => close(result.equationTranslationFinalAbc[index], value, `Eq.2.25 final ${index}`));
  initial.forEach((value, index) => close(result.translationAbc[index], value, `initial-axis translation ${index}`));
  close(result.rotationAbc[1], eta * input.bendAngle, 'b-axis rotation');
  close(Math.hypot(result.translationAbc[0], result.translationAbc[2]), Math.hypot(final[0], final[2]), 'translation magnitude invariant');
  process.stdout.write('M047-I011-T01 PASS final-to-initial coordinate resolution preserves Eq.2.25 magnitude and rotation\n');
}

{
  const zero = derive(fixture({ pressure: 0 }));
  zeroVector(zero.translationAbc, 'translationAbc');
  zeroVector(zero.equationTranslationFinalAbc, 'equationTranslationFinalAbc');
  zeroVector(zero.rotationAbc, 'rotationAbc');
  process.stdout.write('M047-I011-T02 PASS zero-pressure invariant\n');
}

{
  const input = fixture({ bendAngle: 0.13 });
  const one = derive({ ...input, pressure: 1.1e6 });
  const two = derive({ ...input, pressure: 2.2e6 });
  for (const field of ['equationTranslationFinalAbc', 'translationAbc', 'rotationAbc']) {
    for (let index = 0; index < 3; index += 1) close(two[field][index], 2 * one[field][index], `${field} pressure linearity ${index}`);
  }
  process.stdout.write('M047-I011-T03 PASS pressure linearity survives axis resolution\n');
}

process.stdout.write('lfea-m047-bourdon-final-axis-candidate-check: PASS\n');
