#!/usr/bin/env node

import assert from 'node:assert/strict';
import { deriveMec21BendPressureFreeMovement } from '../src/core/linear-fea-piping-components/bourdon-pressure-expansion.js';

const TRANSLATION_TOLERANCE_M = 1e-12;
const ROTATION_TOLERANCE_RAD = 1e-12;

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

function movement(input, angle) {
  return deriveMec21BendPressureFreeMovement({ ...input, bendAngle: angle });
}

/**
 * Reproduce the current ACCDB solve's physical interpretation: each bend
 * sub-element receives Eq. (2.25) for only its own central angle, with the I
 * end of that sub-element treated as zero initial deformation. To chain those
 * fixed-I movements physically, the already accumulated nodal rotation must
 * rigidly transport the next chord by omega x L.
 */
function composeCurrentSegmentRelativeField(input, elementCount) {
  const deltaTheta = input.bendAngle / elementCount;
  let translation = [0, 0, 0];
  let rotation = [0, 0, 0];
  const ledger = [];
  for (let index = 0; index < elementCount; index += 1) {
    const angleI = index * deltaTheta;
    const angleJ = (index + 1) * deltaTheta;
    const pointI = pointOnArc(input.bendRadius, angleI);
    const pointJ = pointOnArc(input.bendRadius, angleJ);
    const chord = subtract(pointJ, pointI);
    const axes = axesAt(angleI);
    const segment = movement(input, deltaTheta);
    const relativeTranslation = add(
      scale(axes.a, segment.translationAbc[0]),
      scale(axes.c, segment.translationAbc[2]),
    );
    const relativeRotation = scale(axes.b, segment.rotationAbc[1]);
    const rigidTransport = cross(rotation, chord);
    const nextTranslation = add(translation, add(rigidTransport, relativeTranslation));
    const nextRotation = add(rotation, relativeRotation);
    ledger.push({
      index,
      angleI,
      angleJ,
      chord,
      axes,
      relativeTranslation,
      relativeRotation,
      rigidTransport,
      translationI: translation,
      translationJ: nextTranslation,
      rotationI: rotation,
      rotationJ: nextRotation,
    });
    translation = nextTranslation;
    rotation = nextRotation;
  }
  return { translation, rotation, ledger };
}

/**
 * Compatible reference field: evaluate Eq. (2.25) at cumulative arc angle
 * from the physical bend tangent start, always in that bend's single a-b-c
 * reference frame. Every subdivision samples the same continuous nodal field.
 */
function compatibleCumulativeField(input, elementCount) {
  const startAxes = axesAt(0);
  const deltaTheta = input.bendAngle / elementCount;
  const nodes = [];
  for (let index = 0; index <= elementCount; index += 1) {
    const angle = index * deltaTheta;
    if (index === 0) {
      nodes.push({ angle, translation: [0, 0, 0], rotation: [0, 0, 0] });
      continue;
    }
    const cumulative = movement(input, angle);
    nodes.push({
      angle,
      translation: add(
        scale(startAxes.a, cumulative.translationAbc[0]),
        scale(startAxes.c, cumulative.translationAbc[2]),
      ),
      rotation: scale(startAxes.b, cumulative.rotationAbc[1]),
    });
  }
  return { nodes, translation: nodes.at(-1).translation, rotation: nodes.at(-1).rotation };
}

function fullBendReference(input) {
  const axes = axesAt(0);
  const full = movement(input, input.bendAngle);
  return {
    translation: add(
      scale(axes.a, full.translationAbc[0]),
      scale(axes.c, full.translationAbc[2]),
    ),
    rotation: scale(axes.b, full.rotationAbc[1]),
  };
}

function axesAt(angle) {
  const a = [-Math.sin(angle), Math.cos(angle), 0];
  const c = [-Math.cos(angle), -Math.sin(angle), 0];
  const b = cross(c, a);
  return { a, b, c };
}

function pointOnArc(radius, angle) {
  return [radius * Math.cos(angle), radius * Math.sin(angle), 0];
}

function add(left, right) {
  return left.map((value, index) => value + right[index]);
}

function subtract(left, right) {
  return left.map((value, index) => value - right[index]);
}

function scale(vector, scalar) {
  return vector.map((value) => value * scalar);
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

function error(left, right) {
  return norm(subtract(left, right));
}

console.log('\n--- M047 Bourdon subdivision compatibility experiment ---');

const input = fixture();
const reference = fullBendReference(input);
const counts = [1, 2, 4, 8, 18, 36];
const observations = counts.map((elementCount) => {
  const current = composeCurrentSegmentRelativeField(input, elementCount);
  const compatible = compatibleCumulativeField(input, elementCount);
  return {
    elementCount,
    currentTranslationErrorM: error(current.translation, reference.translation),
    currentRotationErrorRad: error(current.rotation, reference.rotation),
    compatibleTranslationErrorM: error(compatible.translation, reference.translation),
    compatibleRotationErrorRad: error(compatible.rotation, reference.rotation),
  };
});

process.stdout.write('elements,current_translation_error_m,current_rotation_error_rad,compatible_translation_error_m,compatible_rotation_error_rad\n');
for (const row of observations) {
  process.stdout.write([
    row.elementCount,
    row.currentTranslationErrorM.toExponential(9),
    row.currentRotationErrorRad.toExponential(9),
    row.compatibleTranslationErrorM.toExponential(9),
    row.compatibleRotationErrorRad.toExponential(9),
  ].join(',') + '\n');
}

test('M047-I003-T01', 'one unsplit bend reproduces the full-angle Eq. (2.25) movement', () => {
  const row = observations.find((entry) => entry.elementCount === 1);
  assert.ok(row.currentTranslationErrorM <= TRANSLATION_TOLERANCE_M);
  assert.ok(row.currentRotationErrorRad <= ROTATION_TOLERANCE_RAD);
});

test('M047-I003-T02', 'the current segment-relative construction is not subdivision invariant', () => {
  const subdivided = observations.filter((entry) => entry.elementCount > 1);
  for (const row of subdivided) {
    assert.ok(
      row.currentTranslationErrorM > 1e-6,
      `${row.elementCount} segments unexpectedly reproduced the full-bend translation`,
    );
    assert.ok(
      row.currentRotationErrorRad <= ROTATION_TOLERANCE_RAD,
      `${row.elementCount} segments changed the total Bourdon rotation`,
    );
  }
  assert.ok(
    observations.at(-1).currentTranslationErrorM > observations[1].currentTranslationErrorM,
    'refinement should expose that the current translation field converges to a different endpoint, not the physical Eq. (2.25) endpoint',
  );
});

test('M047-I003-T03', 'a cumulative physical nodal field is invariant to subdivision', () => {
  for (const row of observations) {
    assert.ok(
      row.compatibleTranslationErrorM <= TRANSLATION_TOLERANCE_M,
      `${row.elementCount} compatible segments changed the full-bend translation`,
    );
    assert.ok(
      row.compatibleRotationErrorRad <= ROTATION_TOLERANCE_RAD,
      `${row.elementCount} compatible segments changed the full-bend rotation`,
    );
  }
});

test('M047-I003-T04', 'the discrepancy is translation compatibility, not Eq. (2.25) rotation accumulation', () => {
  const eighteen = observations.find((entry) => entry.elementCount === 18);
  assert.ok(eighteen.currentTranslationErrorM > 4e-5);
  assert.ok(eighteen.currentRotationErrorRad <= ROTATION_TOLERANCE_RAD);
});

process.stdout.write('M047-I003 RESULT: CURRENT_SEGMENT_RELATIVE_TRANSLATION_IS_NOT_SUBDIVISION_INVARIANT\n');
