#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  deriveMec21BendPressureFreeMovement,
  deriveMec21BendPressureFreeState,
} from '../src/core/linear-fea-piping-components/index.js';
import { solveBm1InputXml } from './lfea-b3.15-bm1-inputxml-fixtures.mjs';

const EXPECTED = Object.freeze({
  'IX-S5': { pressure: 2.15e6, k: 8.805996977364236, ii: 2.656692445746295, io: 2.213910371455246 },
  'IX-S6': { pressure: 2.10e6, k: 8.81810588982693, ii: 2.66113953399073, io: 2.217616278325609 },
});
const close = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);

console.log('\n--- LFEA B-3.18 BM1 real BEND components and directional SIFs ---');
const result = solveBm1InputXml();
assert.equal(result.normalized.geometry.nodes.length, 16);
assert.equal(result.normalized.geometry.segments.length, 15);
assert.equal(result.analysisGeometry.nodes.length, 20);
assert.equal(result.analysisGeometry.segments.length, 19);
assert.equal(result.bendDefinitions.length, 2);
assert.equal(result.bendComponents.length, 2);
assert.deepEqual(result.bendDefinitions.map((row) => row.sourceSegment.id), ['IX-S5', 'IX-S6']);

for (const definition of result.bendDefinitions) {
  const expected = EXPECTED[definition.sourceSegment.id];
  assert.ok(expected);
  assert.equal(definition.component.componentType, 'BEND');
  assert.equal(definition.component.elements.length, 2);
  assert.equal(definition.component.codeStations.length, 3);
  assert.deepEqual(definition.stationReferences.map((row) => row.referenceNodeId),
    definition.sourceSegment.id === 'IX-S5' ? ['48', '49', '50'] : ['58', '59', '60']);
  close(definition.bendAngle, Math.PI / 2, 1e-8);
  close(definition.authority.pressure, expected.pressure);
  close(definition.authority.pressureCorrectedFlexibilityFactor, expected.k);
  close(definition.authority.pressureCorrectedInPlaneSif, expected.ii);
  close(definition.authority.pressureCorrectedOutOfPlaneSif, expected.io);
  close(definition.component.flexibility.factor, expected.k);
  assert.equal(definition.component.flexibility.doubleCountGuard.accepted, true);
  assert.equal(definition.component.flexibility.pressureStiffeningRule, 'BEND_PRESSURE_STIFFENING_DECLARED_FACTOR_V1');
  assert.ok(definition.component.flexibility.pressureBasis);
  assert.equal(definition.component.acceptanceState, 'CONDITIONAL');
}

const pairs = result.modelEntries.map((entry) => `${entry.referenceFromNode}->${entry.referenceToNode}`);
for (const pair of ['45->48', '48->49', '49->50', '50->58', '58->59', '59->60']) assert.ok(pairs.includes(pair));
assert.equal(new Set(pairs).size, 19);

const bendEntries = result.modelEntries.filter((entry) => entry.bendAuthority);
assert.equal(bendEntries.length, 4);
for (const entry of bendEntries) {
  const factors = entry.stressFactorSet.displacementSifs;
  assert.ok(factors.inPlaneBending.value > 1);
  assert.ok(factors.outOfPlaneBending.value > 1);
  assert.equal(entry.stressFactorSet.sustainedIndices.inPlaneBending.value, factors.inPlaneBending.value);
  assert.equal(entry.stressFactorSet.sustainedIndices.outOfPlaneBending.value, factors.outOfPlaneBending.value);
}
for (const entry of result.modelEntries.filter((row) => !row.bendAuthority)) {
  assert.equal(entry.stressFactorSet.displacementSifs.inPlaneBending.value, 1);
  assert.equal(entry.stressFactorSet.displacementSifs.outOfPlaneBending.value, 1);
}

assert.equal(result.code.length, 38);
assert.equal(result.sustainedCode.length, 38);
assert.equal(result.caesarStressComparison.cases.every((row) => row.summary.matchedElementCount === 19), true);
assert.equal(result.caesarStressComparison.cases.every((row) => row.summary.unmatchedCaesarElementCount === 0), true);
assert.equal(result.caesarStressComparison.cases.every((row) => row.summary.unmatchedCompiledElementCount === 0), true);
assert.equal(result.report.sifCodePoints.length, 8);

console.log('\n--- LFEA B-3.18 MEC-21 pressure free-movement subdivision invariant ---');
const mec21 = Object.freeze({
  pressure: 2.3e6,
  innerRadius: 0.049,
  bendRadius: 0.1524,
  elasticModulus: 198e9,
  secondMoment: 8.7e-6,
  poissonRatio: 0.3,
});
const quarterTurn = Math.PI / 2;
const radiusRatioSquared = (mec21.innerRadius / mec21.bendRadius) ** 2;
const shellCorrection = (1 - mec21.poissonRatio)
  + 0.75 * (2 - mec21.poissonRatio) * radiusRatioSquared;
const curvatureChangeRatio = Math.PI * mec21.pressure * mec21.innerRadius ** 4
  * shellCorrection / (mec21.elasticModulus * mec21.secondMoment);
const translationScale = curvatureChangeRatio * mec21.bendRadius;
const expectedQuarterTurn = Object.freeze({
  translationAbc: [
    translationScale * (Math.sin(quarterTurn) - quarterTurn),
    0,
    translationScale * (Math.cos(quarterTurn) - 1),
  ],
  rotationAbc: [0, curvatureChangeRatio * quarterTurn, 0],
});
const directQuarterTurn = deriveMec21BendPressureFreeMovement({ ...mec21, bendAngle: quarterTurn });
close(directQuarterTurn.curvatureChangeRatio, curvatureChangeRatio, 1e-12);
close(directQuarterTurn.shellCorrection, shellCorrection, 1e-12);
vectorClose(directQuarterTurn.translationAbc, expectedQuarterTurn.translationAbc, 1e-12);
vectorClose(directQuarterTurn.rotationAbc, expectedQuarterTurn.rotationAbc, 1e-12);

const initialStation = deriveMec21BendPressureFreeState({ ...mec21, bendAngle: 0 });
vectorClose(initialStation.translationAbc, [0, 0, 0], 1e-15);
vectorClose(initialStation.rotationAbc, [0, 0, 0], 1e-15);
close(initialStation.curvatureChangeRatio, curvatureChangeRatio, 1e-12);
for (const subdivision of [1, 2, 4, 8, 32]) {
  const stations = Array.from({ length: subdivision + 1 }, (_unused, index) => {
    const angle = quarterTurn * index / subdivision;
    const state = deriveMec21BendPressureFreeState({ ...mec21, bendAngle: angle });
    const independent = {
      translationAbc: [
        translationScale * (Math.sin(angle) - angle),
        0,
        translationScale * (Math.cos(angle) - 1),
      ],
      rotationAbc: [0, curvatureChangeRatio * angle, 0],
    };
    vectorClose(state.translationAbc, independent.translationAbc, 1e-12);
    vectorClose(state.rotationAbc, independent.rotationAbc, 1e-12);
    return state;
  });
  vectorClose(stations.at(-1).translationAbc, expectedQuarterTurn.translationAbc, 1e-12);
  vectorClose(stations.at(-1).rotationAbc, expectedQuarterTurn.rotationAbc, 1e-12);
}

// Falsification fixture for the historical BM4 adapter hypothesis: treating each
// numerical chord as a new physical bend and restarting Eq. (2.25) at zero.
// MEC-21 rigid-body transfer is applied between chord starts. One chord must
// reproduce the direct bend result; refining the same physical bend must not
// change that endpoint, but the restarted construction does.
const oneChordRestart = composeRestartedMec21QuarterBend(mec21, 1);
const fourChordRestart = composeRestartedMec21QuarterBend(mec21, 4);
vectorClose(oneChordRestart.translation, expectedQuarterTurn.translationAbc, 1e-12);
vectorClose(oneChordRestart.rotation, expectedQuarterTurn.rotationAbc, 1e-12);
vectorClose(fourChordRestart.rotation, expectedQuarterTurn.rotationAbc, 1e-12);
const restartTranslationError = vectorNorm(subtract3(
  fourChordRestart.translation,
  expectedQuarterTurn.translationAbc,
)) / vectorNorm(expectedQuarterTurn.translationAbc);
assert.ok(
  restartTranslationError > 1,
  `Restarted MEC-21 chord construction unexpectedly appeared subdivision-invariant: ${restartTranslationError}`,
);

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
assert.equal(packageJson.scripts['check:lfea-b3.18'], 'node scripts/lfea-b3.18-bm1-bend-check.mjs');
assert.ok(packageJson.scripts['check:lfea-linear-core'].includes('npm run check:lfea-b3.18'));

console.log(JSON.stringify({
  check: 'lfea-b3.18-bm1-real-bends',
  status: 'PASS',
  sourceTopology: { nodes: 16, elements: 15 },
  analysisTopology: { nodes: 20, elements: 19 },
  bends: result.bendDefinitions.map((row) => ({
    sourceSegmentId: row.sourceSegment.id,
    k: row.authority.pressureCorrectedFlexibilityFactor,
    ii: row.authority.pressureCorrectedInPlaneSif,
    io: row.authority.pressureCorrectedOutOfPlaneSif,
  })),
  mec21PressureExpansion: {
    benchmark: 'MEC21_PART_II_EQ_2_25_QUARTER_BEND_CLOSED_FORM',
    curvatureChangeRatio,
    subdivisionCounts: [1, 2, 4, 8, 32],
    cumulativeFieldInvariant: true,
    restartedChordHypothesis: 'FALSIFIED',
    restartedFourChordTranslationRelativeError: restartTranslationError,
  },
}, null, 2));
console.log('LFEA B-3.18 BM1 real BEND components and directional SIFs PASS');

function composeRestartedMec21QuarterBend(input, subdivision) {
  const bendAngle = Math.PI / 2;
  const segmentAngle = bendAngle / subdivision;
  const rotationAxis = [0, 1, 0];
  let translation = [0, 0, 0];
  let rotation = [0, 0, 0];
  for (let index = 0; index < subdivision; index += 1) {
    const angle = index * segmentAngle;
    const pointI = quarterBendPoint(input.bendRadius, angle);
    const pointJ = quarterBendPoint(input.bendRadius, angle + segmentAngle);
    const chord = subtract3(pointJ, pointI);
    const aAxis = [Math.cos(angle), 0, Math.sin(angle)];
    const cAxis = [-Math.sin(angle), 0, Math.cos(angle)];
    const segmentMovement = deriveMec21BendPressureFreeMovement({
      ...input,
      bendAngle: segmentAngle,
    });
    const segmentTranslation = add3(
      scale3(aAxis, segmentMovement.translationAbc[0]),
      scale3(cAxis, segmentMovement.translationAbc[2]),
    );
    translation = add3(
      add3(translation, cross3(rotation, chord)),
      segmentTranslation,
    );
    rotation = add3(rotation, scale3(rotationAxis, segmentMovement.rotationAbc[1]));
  }
  return { translation, rotation };
}

function quarterBendPoint(radius, angle) {
  return [
    radius * Math.sin(angle),
    0,
    radius * (1 - Math.cos(angle)),
  ];
}

function vectorClose(actual, expected, tolerance) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => close(value, expected[index], tolerance));
}

function vectorNorm(value) {
  return Math.hypot(...value);
}

function add3(left, right) {
  return left.map((value, index) => value + right[index]);
}

function subtract3(left, right) {
  return left.map((value, index) => value - right[index]);
}

function scale3(value, factor) {
  return value.map((entry) => entry * factor);
}

function cross3(left, right) {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}
