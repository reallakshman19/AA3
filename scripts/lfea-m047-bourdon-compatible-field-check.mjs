#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  deriveMec21BendPressureCumulativeField,
  deriveMec21BendPressureFreeMovement,
} from '../src/core/linear-fea-piping-components/bourdon-pressure-expansion.js';

const TOLERANCE = 1e-12;

function test(id, name, body) {
  body();
  process.stdout.write(`${id} PASS ${name}\n`);
}

function fixture() {
  const outerDiameter = 0.2191;
  const wallThickness = 0.00818;
  const innerDiameter = outerDiameter - 2 * wallThickness;
  return {
    pressure: 2e6,
    innerRadius: innerDiameter / 2,
    bendRadius: 0.3048,
    elasticModulus: 200e9,
    secondMoment: Math.PI / 64 * (outerDiameter ** 4 - innerDiameter ** 4),
    poissonRatio: 0.3,
    bendAngle: Math.PI / 2,
  };
}

const referenceAxes = Object.freeze({
  a: Object.freeze([0, 1, 0]),
  b: Object.freeze([0, 0, -1]),
  c: Object.freeze([-1, 0, 0]),
});

function vectorClose(actual, expected, tolerance, message) {
  assert.equal(actual.length, expected.length, `${message}: vector length`);
  actual.forEach((value, index) => {
    const scale = Math.max(Math.abs(expected[index]), 1);
    assert.ok(
      Math.abs(value - expected[index]) <= tolerance * scale,
      `${message}[${index}]: ${value} differs from ${expected[index]}`,
    );
  });
}

function add(left, right) {
  return left.map((value, index) => value + right[index]);
}

function scale(vector, factor) {
  return vector.map((value) => value * factor);
}

function globalFullMovement(input) {
  const result = deriveMec21BendPressureFreeMovement(input);
  return {
    translation: add(
      scale(referenceAxes.a, result.translationAbc[0]),
      scale(referenceAxes.c, result.translationAbc[2]),
    ),
    rotation: scale(referenceAxes.b, result.rotationAbc[1]),
  };
}

console.log('\n--- M047 compatible cumulative Bourdon field check ---');

const input = fixture();
const full = globalFullMovement(input);

for (const elementCount of [1, 2, 4, 8, 18, 36]) {
  test(
    `M047-I004-N${String(elementCount).padStart(2, '0')}`,
    `${elementCount}-segment field is continuous and preserves the physical endpoint`,
    () => {
      const delta = input.bendAngle / elementCount;
      let previousTranslationJ = [0, 0, 0];
      let previousRotationJ = [0, 0, 0];
      let rotationSum = 0;
      let last = null;
      for (let index = 0; index < elementCount; index += 1) {
        const field = deriveMec21BendPressureCumulativeField({
          pressure: input.pressure,
          innerRadius: input.innerRadius,
          bendRadius: input.bendRadius,
          elasticModulus: input.elasticModulus,
          secondMoment: input.secondMoment,
          poissonRatio: input.poissonRatio,
          cumulativeAngleI: index * delta,
          cumulativeAngleJ: (index + 1) * delta,
          referenceAxes,
        });
        vectorClose(field.translationGlobalI, previousTranslationJ, TOLERANCE, `segment ${index} shared translation`);
        vectorClose(field.rotationGlobalI, previousRotationJ, TOLERANCE, `segment ${index} shared rotation`);
        rotationSum += field.incrementalRotationRadians;
        previousTranslationJ = field.translationGlobalJ;
        previousRotationJ = field.rotationGlobalJ;
        last = field;
      }
      vectorClose(last.translationGlobalJ, full.translation, TOLERANCE, 'full-bend translation');
      vectorClose(last.rotationGlobalJ, full.rotation, TOLERANCE, 'full-bend rotation');
      assert.ok(
        Math.abs(rotationSum - Math.abs(full.rotation[2])) <= TOLERANCE,
        `rotation increments ${rotationSum} do not reproduce full rotation magnitude ${Math.abs(full.rotation[2])}`,
      );
    },
  );
}

test('M047-I004-T07', 'zero-pressure cumulative field is exactly zero at every station', () => {
  const field = deriveMec21BendPressureCumulativeField({
    ...input,
    pressure: 0,
    cumulativeAngleI: input.bendAngle / 3,
    cumulativeAngleJ: 2 * input.bendAngle / 3,
    referenceAxes,
  });
  assert.deepEqual(field.translationGlobalI, [0, 0, 0]);
  assert.deepEqual(field.translationGlobalJ, [0, 0, 0]);
  assert.deepEqual(field.rotationGlobalI, [0, 0, 0]);
  assert.deepEqual(field.rotationGlobalJ, [0, 0, 0]);
  assert.equal(field.incrementalRotationRadians, 0);
});

test('M047-I004-T08', 'cumulative stations and a-b-c basis fail closed when invalid', () => {
  assert.throws(
    () => deriveMec21BendPressureCumulativeField({
      ...input,
      cumulativeAngleI: input.bendAngle / 2,
      cumulativeAngleJ: input.bendAngle / 2,
      referenceAxes,
    }),
    /cumulativeAngleJ must be greater than cumulativeAngleI/u,
  );
  assert.throws(
    () => deriveMec21BendPressureCumulativeField({
      ...input,
      cumulativeAngleI: 0,
      cumulativeAngleJ: input.bendAngle,
      referenceAxes: { a: [1, 0, 0], b: [0, 1, 0], c: [0, 0, -1] },
    }),
    /right-handed with c = a x b/u,
  );
});

process.stdout.write('lfea-m047-bourdon-compatible-field-check: PASS\n');
