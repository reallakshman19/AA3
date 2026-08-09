#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  deriveMec21BendPressureFreeMovement,
  deriveMec21BendPressureFreeState,
} from '../src/core/linear-fea-piping-components/index.js';

const INPUT = Object.freeze({
  pressure: 2.3e6,
  innerRadius: 0.049,
  bendRadius: 0.1524,
  elasticModulus: 198e9,
  secondMoment: 8.7e-6,
  poissonRatio: 0.3,
});
const TOTAL_ANGLE = Math.PI / 2;
const COUNTS = Object.freeze([1, 2, 4, 8, 32]);
const TOL = 1e-12;

const radiusRatioSquared = (INPUT.innerRadius / INPUT.bendRadius) ** 2;
const shellCorrection = (1 - INPUT.poissonRatio)
  + 0.75 * (2 - INPUT.poissonRatio) * radiusRatioSquared;
const curvatureChangeRatio = Math.PI * INPUT.pressure * INPUT.innerRadius ** 4
  * shellCorrection / (INPUT.elasticModulus * INPUT.secondMoment);
const translationScale = curvatureChangeRatio * INPUT.bendRadius;
const outerRadius = (INPUT.innerRadius ** 4 + 4 * INPUT.secondMoment / Math.PI) ** 0.25;
const axialStrain = (1 - 2 * INPUT.poissonRatio) * INPUT.pressure * INPUT.innerRadius ** 2
  / (INPUT.elasticModulus * (outerRadius ** 2 - INPUT.innerRadius ** 2));

const literal = deriveMec21BendPressureFreeMovement({ ...INPUT, bendAngle: TOTAL_ANGLE });
assert.equal(literal.basis, 'STATION_FINAL_ABC');
close(literal.curvatureChangeRatio, curvatureChangeRatio);
vectorClose(literal.translationAbc, [
  translationScale * (Math.sin(TOTAL_ANGLE) - TOTAL_ANGLE),
  0,
  translationScale * (Math.cos(TOTAL_ANGLE) - 1),
]);
vectorClose(literal.rotationAbc, [0, curvatureChangeRatio * TOTAL_ANGLE, 0]);

const start = deriveMec21BendPressureFreeState({ ...INPUT, bendAngle: 0 });
assert.equal(start.basis, 'BEND_INITIAL_ABC');
vectorClose(start.translationAbc, [0, 0, 0]);
vectorClose(start.rotationAbc, [0, 0, 0]);
vectorClose(start.uniformPressureTranslationAbc, [0, 0, 0]);
close(start.uniformPressureAxialStrain, axialStrain);

const expectedEnd = analyticalOpeningState(TOTAL_ANGLE);
const expectedUniformEnd = analyticalUniformPressureTranslation(TOTAL_ANGLE);
const subdivisionEvidence = [];
for (const count of COUNTS) {
  const states = Array.from({ length: count + 1 }, (_unused, index) => {
    const angle = TOTAL_ANGLE * index / count;
    return deriveMec21BendPressureFreeState({ ...INPUT, bendAngle: angle });
  });
  vectorClose(states[0].translationAbc, [0, 0, 0]);
  vectorClose(states.at(-1).translationAbc, expectedEnd.translation);
  vectorClose(states.at(-1).rotationAbc, expectedEnd.rotation);
  vectorClose(states.at(-1).uniformPressureTranslationAbc, expectedUniformEnd);
  for (let index = 0; index < states.length; index += 1) {
    const angle = TOTAL_ANGLE * index / count;
    const opening = analyticalOpeningState(angle);
    vectorClose(states[index].translationAbc, opening.translation);
    vectorClose(states[index].bendOpeningTranslationAbc, opening.translation);
    vectorClose(states[index].rotationAbc, opening.rotation);
    vectorClose(states[index].uniformPressureTranslationAbc, analyticalUniformPressureTranslation(angle));
  }
  subdivisionEvidence.push({
    count,
    endTranslation: states.at(-1).translationAbc,
    endRotation: states.at(-1).rotationAbc,
  });
}

const restartedOne = composeHistoricalRestartedOpening(1);
const restartedFour = composeHistoricalRestartedOpening(4);
vectorClose(restartedOne.translation, literal.translationAbc);
vectorClose(restartedOne.rotation, literal.rotationAbc);
vectorClose(restartedFour.rotation, literal.rotationAbc);
const restartRelativeError = norm(subtract(restartedFour.translation, restartedOne.translation))
  / norm(restartedOne.translation);
assert.ok(
  restartRelativeError > 1,
  `Historical per-chord restart unexpectedly appeared subdivision-invariant: ${restartRelativeError}`,
);

// Load-ownership guard: the cumulative MEC-21 opening is the bend-arc state;
// the independently computed closed-end pressure translation remains evidence
// and is intentionally not included in translationAbc.
assert.ok(norm(expectedUniformEnd) > 0);
assert.ok(norm(subtract(expectedEnd.translation, add(expectedEnd.translation, expectedUniformEnd))) > 0);

console.log(JSON.stringify({
  check: 'lfea-issue947-bourdon-subdivision',
  status: 'PASS',
  governingEquation: 'MEC21_PART_II_EQ_2_25',
  bendArcField: 'MEC21_BEND_OPENING_ONLY',
  uniformPressureTranslationOwnership: 'SEPARATE_DIAGNOSTIC_NOT_ADDED_TO_BEND_ARC',
  cumulativeBasis: 'BEND_INITIAL_ABC',
  subdivisionCounts: COUNTS,
  curvatureChangeRatio,
  uniformPressureAxialStrain: axialStrain,
  expectedOpeningEnd: expectedEnd,
  expectedUniformPressureTranslationEnd: expectedUniformEnd,
  subdivisionEvidence,
  historicalRestartHypothesis: 'FALSIFIED',
  historicalFourChordTranslationRelativeError: restartRelativeError,
}, null, 2));

function analyticalOpeningState(angle) {
  const sine = Math.sin(angle);
  const cosine = Math.cos(angle);
  return {
    translation: [
      translationScale * (sine - angle * cosine),
      0,
      translationScale * (1 - cosine - angle * sine),
    ],
    rotation: [0, curvatureChangeRatio * angle, 0],
  };
}

function analyticalUniformPressureTranslation(angle) {
  return [
    axialStrain * INPUT.bendRadius * Math.sin(angle),
    0,
    axialStrain * INPUT.bendRadius * (1 - Math.cos(angle)),
  ];
}

function composeHistoricalRestartedOpening(count) {
  const segmentAngle = TOTAL_ANGLE / count;
  let translation = [0, 0, 0];
  let rotation = [0, 0, 0];
  for (let index = 0; index < count; index += 1) {
    const angle = index * segmentAngle;
    const movement = deriveMec21BendPressureFreeMovement({ ...INPUT, bendAngle: segmentAngle });
    const a = [Math.cos(angle), 0, Math.sin(angle)];
    const c = [-Math.sin(angle), 0, Math.cos(angle)];
    const chord = subtract(point(angle + segmentAngle), point(angle));
    const segmentTranslation = add(scale(a, movement.translationAbc[0]), scale(c, movement.translationAbc[2]));
    translation = add(add(translation, cross(rotation, chord)), segmentTranslation);
    rotation = add(rotation, [0, movement.rotationAbc[1], 0]);
  }
  return { translation, rotation };
}

function point(angle) {
  return [
    INPUT.bendRadius * Math.sin(angle),
    0,
    INPUT.bendRadius * (1 - Math.cos(angle)),
  ];
}

function close(actual, expected, tolerance = TOL) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)),
    `${actual} != ${expected}`,
  );
}

function vectorClose(actual, expected, tolerance = TOL) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => close(value, expected[index], tolerance));
}

function add(left, right) { return left.map((value, index) => value + right[index]); }
function subtract(left, right) { return left.map((value, index) => value - right[index]); }
function scale(vector, factor) { return vector.map((value) => value * factor); }
function norm(vector) { return Math.hypot(...vector); }
function cross(left, right) {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}
