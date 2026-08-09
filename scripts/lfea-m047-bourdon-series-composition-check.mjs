#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveMec21BendPressureFreeMovement } from '../src/core/linear-fea-piping-components/bourdon-pressure-expansion.js';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SOLVER_SOURCE = readFileSync(
  resolve(ROOT, 'src/core/fea-benchmarks/caesar-accdb-linear-solve.js'),
  'utf8',
);
const SUBDIVISIONS = Object.freeze([1, 2, 4, 8, 18, 36]);
const VECTOR_TOLERANCE = 1e-14;

function test(id, name, body) {
  body();
  process.stdout.write(`${id} PASS ${name}\n`);
}

function fixture(overrides = {}) {
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

function axesAt(angle) {
  const a = [Math.cos(angle), 0, Math.sin(angle)];
  const b = [0, 1, 0];
  const c = [-Math.sin(angle), 0, Math.cos(angle)];
  return { a, b, c };
}

function arcPoint(radius, angle) {
  return [radius * Math.sin(angle), 0, radius * (1 - Math.cos(angle))];
}

function movementToGlobal(local, axes) {
  return {
    translation: add(scale(axes.a, local.translationAbc[0]), scale(axes.c, local.translationAbc[2])),
    rotation: scale(axes.b, local.rotationAbc[1]),
  };
}

function composeSeries(elementCount, axisStation) {
  const input = fixture();
  const angle = input.bendAngle;
  const increment = angle / elementCount;
  let translation = [0, 0, 0];
  let rotation = [0, 0, 0];

  for (let index = 0; index < elementCount; index += 1) {
    const angleI = index * increment;
    const angleJ = (index + 1) * increment;
    const pointI = arcPoint(input.bendRadius, angleI);
    const pointJ = arcPoint(input.bendRadius, angleJ);
    const relative = deriveMec21BendPressureFreeMovement({ ...input, bendAngle: increment });
    const axes = axesAt(axisStation === 'FINAL' ? angleJ : angleI);
    const free = movementToGlobal(relative, axes);

    // MEC-21 Part II section 2.5.2 / 2.6.2: before the next element's
    // relative free movement is added, movement at the upstream point is
    // rigid-body transferred to the downstream point. For small rotations,
    // u_J = u_I + phi_I x r_IJ.
    translation = add(
      add(translation, cross(rotation, subtract(pointJ, pointI))),
      free.translation,
    );
    rotation = add(rotation, free.rotation);
  }
  return { translation, rotation };
}

function naiveSum(elementCount, axisStation) {
  const input = fixture();
  const increment = input.bendAngle / elementCount;
  let translation = [0, 0, 0];
  let rotation = [0, 0, 0];
  for (let index = 0; index < elementCount; index += 1) {
    const stationAngle = (axisStation === 'FINAL' ? index + 1 : index) * increment;
    const relative = deriveMec21BendPressureFreeMovement({ ...input, bendAngle: increment });
    const free = movementToGlobal(relative, axesAt(stationAngle));
    translation = add(translation, free.translation);
    rotation = add(rotation, free.rotation);
  }
  return { translation, rotation };
}

function wholeBendReference() {
  const input = fixture();
  const local = deriveMec21BendPressureFreeMovement(input);
  return movementToGlobal(local, axesAt(input.bendAngle));
}

function curvatureChangeReference() {
  const input = fixture();
  const movement = deriveMec21BendPressureFreeMovement(input);
  const eta = movement.curvatureChangeRatio;
  const theta = input.bendAngle;
  const radius = input.bendRadius;

  // Independent first-order geometry for a circular bend whose curvature
  // decreases from 1/R to (1-eta)/R while centreline arc length is retained.
  // The initial tangent is fixed. This is expressed in the fixed global frame.
  return {
    translation: [
      eta * radius * (Math.sin(theta) - theta * Math.cos(theta)),
      0,
      eta * radius * ((1 - Math.cos(theta)) - theta * Math.sin(theta)),
    ],
    rotation: [0, eta * theta, 0],
  };
}

function assertVectorClose(actual, expected, message) {
  const scaleValue = Math.max(1, norm(expected));
  assert.ok(
    norm(subtract(actual, expected)) <= VECTOR_TOLERANCE * scaleValue,
    `${message}: |delta|=${norm(subtract(actual, expected))}`,
  );
}

console.log('\n--- M047 MEC-21 series-composition diagnostic ---');

test('M047-I005-T01', 'current ACCDB solver assigns Bourdon segment axes at point I', () => {
  const match = /function buildBourdonSegments\([\s\S]*?\n\}/u.exec(SOLVER_SOURCE);
  assert.ok(match, 'buildBourdonSegments source authority must remain present');
  assert.match(
    match[0],
    /const cAxis = unit\(subtract\(centre, pointI\)/u,
    'current solver must explicitly expose its point-I c-axis custody',
  );
  assert.match(match[0], /const nextCAxis = unit\(subtract\(centre, pointJ\)/u);
  assert.match(match[0], /tangentProjection = subtract\(chordDirection, scale\(cAxis,/u);
});

test('M047-I005-T02', 'Eq. (2.25) translated in final-point bend axes matches independent curvature-change geometry', () => {
  const expected = curvatureChangeReference();
  const finalAxes = wholeBendReference();
  assertVectorClose(finalAxes.translation, expected.translation, 'whole-bend translation');
  assertVectorClose(finalAxes.rotation, expected.rotation, 'whole-bend rotation');
});

test('M047-I005-T03', 'final-point axes plus rigid-body transfer are subdivision invariant', () => {
  const expected = wholeBendReference();
  for (const elementCount of SUBDIVISIONS) {
    const composed = composeSeries(elementCount, 'FINAL');
    assertVectorClose(
      composed.translation,
      expected.translation,
      `${elementCount}-element final-axis translation`,
    );
    assertVectorClose(
      composed.rotation,
      expected.rotation,
      `${elementCount}-element final-axis rotation`,
    );
  }
});

test('M047-I005-T04', 'point-I axes do not reproduce the whole-bend Eq. (2.25) movement', () => {
  const expected = wholeBendReference();
  const errors = SUBDIVISIONS.map((elementCount) => ({
    elementCount,
    error: norm(subtract(composeSeries(elementCount, 'INITIAL').translation, expected.translation)),
  }));
  assert.ok(errors.every((entry) => entry.error > 1e-12), 'point-I translation error must be measurable');
  assert.ok(
    errors.at(-1).error < errors[0].error,
    'point-I axis error should diminish under refinement rather than represent a physical cumulative field',
  );
  process.stdout.write(`point-I translation errors: ${JSON.stringify(errors)}\n`);
});

test('M047-I005-T05', 'directly summing segment translations omits required rigid-body transfer', () => {
  const expected = wholeBendReference();
  for (const elementCount of SUBDIVISIONS.slice(1)) {
    const naive = naiveSum(elementCount, 'FINAL');
    const error = norm(subtract(naive.translation, expected.translation));
    assert.ok(error > 1e-8, `${elementCount}-element naive translation sum unexpectedly matched`);
  }
});

test('M047-I005-T06', 'I003 direct-sum incompatibility is not evidence for a cumulative nodal free field', () => {
  const expected = wholeBendReference();
  const correctlyComposed = composeSeries(18, 'FINAL');
  const naive = naiveSum(18, 'FINAL');
  assert.ok(
    norm(subtract(correctlyComposed.translation, expected.translation)) < 1e-18,
    'proper series transfer must close the 18-element endpoint',
  );
  assert.ok(
    norm(subtract(naive.translation, expected.translation)) > 1e-5,
    'the naive direct sum must retain the omitted-transfer signature',
  );
});

process.stdout.write('lfea-m047-bourdon-series-composition-check: PASS\n');

function add(left, right) {
  return left.map((value, index) => value + right[index]);
}

function subtract(left, right) {
  return left.map((value, index) => value - right[index]);
}

function scale(vector, factor) {
  return vector.map((value) => value * factor);
}

function cross(left, right) {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}

function norm(vector) {
  return Math.hypot(...vector);
}
