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
const close = (actual, expected, tolerance = 1e-9) => assert.ok(
  Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)),
  `${actual} != ${expected}`,
);

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

console.log('\n--- LFEA B-3.18 Bourdon Trans + Rot pressure free-field qualification ---');
const mec21 = Object.freeze({
  pressure: 2.3e6,
  innerRadius: 0.049,
  bendRadius: 0.1524,
  elasticModulus: 198e9,
  secondMoment: 8.7e-6,
  poissonRatio: 0.3,
});
const quarterTurn = Math.PI / 2;
const outerRadius = (mec21.innerRadius ** 4 + 4 * mec21.secondMoment / Math.PI) ** 0.25;
const annulusArea = Math.PI * (outerRadius ** 2 - mec21.innerRadius ** 2);
const documentedBourdonForce = (1 - 2 * mec21.poissonRatio)
  * mec21.pressure * Math.PI * mec21.innerRadius ** 2;
const uniformPressureAxialStrain = documentedBourdonForce / (mec21.elasticModulus * annulusArea);
const directAxialStrain = (1 - 2 * mec21.poissonRatio) * mec21.pressure * mec21.innerRadius ** 2
  / (mec21.elasticModulus * (outerRadius ** 2 - mec21.innerRadius ** 2));
close(uniformPressureAxialStrain, directAxialStrain, 1e-12);

const radiusRatioSquared = (mec21.innerRadius / mec21.bendRadius) ** 2;
const shellCorrection = (1 - mec21.poissonRatio)
  + 0.75 * (2 - mec21.poissonRatio) * radiusRatioSquared;
const curvatureChangeRatio = Math.PI * mec21.pressure * mec21.innerRadius ** 4
  * shellCorrection / (mec21.elasticModulus * mec21.secondMoment);
const translationScale = curvatureChangeRatio * mec21.bendRadius;

// Literal MEC-21 Eq. (2.25): bend-opening components at the final point in that
// final station's local a-b-c basis. This is the rotational/opening contribution,
// not the separate uniform pressure-elongation term.
const expectedQuarterTurnLocalFinal = Object.freeze({
  translationAbc: [
    translationScale * (Math.sin(quarterTurn) - quarterTurn),
    0,
    translationScale * (Math.cos(quarterTurn) - 1),
  ],
  rotationAbc: [0, curvatureChangeRatio * quarterTurn, 0],
});
const directQuarterTurn = deriveMec21BendPressureFreeMovement({ ...mec21, bendAngle: quarterTurn });
assert.equal(directQuarterTurn.basis, 'STATION_FINAL_ABC');
close(directQuarterTurn.curvatureChangeRatio, curvatureChangeRatio, 1e-12);
close(directQuarterTurn.shellCorrection, shellCorrection, 1e-12);
vectorClose(directQuarterTurn.translationAbc, expectedQuarterTurnLocalFinal.translationAbc, 1e-12);
vectorClose(directQuarterTurn.rotationAbc, expectedQuarterTurnLocalFinal.rotationAbc, 1e-12);

const initialStation = deriveMec21BendPressureFreeState({ ...mec21, bendAngle: 0 });
assert.equal(initialStation.basis, 'BEND_INITIAL_ABC');
vectorClose(initialStation.translationAbc, [0, 0, 0], 1e-15);
vectorClose(initialStation.rotationAbc, [0, 0, 0], 1e-15);
vectorClose(initialStation.uniformPressureTranslationAbc, [0, 0, 0], 1e-15);
vectorClose(initialStation.bendOpeningTranslationAbc, [0, 0, 0], 1e-15);
vectorClose(initialStation.localFinalTranslationAbc, [0, 0, 0], 1e-15);
vectorClose(initialStation.localFinalRotationAbc, [0, 0, 0], 1e-15);
close(initialStation.uniformPressureAxialStrain, uniformPressureAxialStrain, 1e-12);
close(initialStation.inferredOuterRadius, outerRadius, 1e-12);
close(initialStation.curvatureChangeRatio, curvatureChangeRatio, 1e-12);

// Independent canonical decomposition. Uniform pressure strain integrates along
// the original centreline tangent; MEC-21 bend opening follows the separately
// integrated curvature change. Trans + Rot is their vector sum, with only the
// bend-opening term contributing rotation.
for (const subdivision of [1, 2, 4, 8, 32]) {
  const physicalStations = Array.from({ length: subdivision + 1 }, (_unused, index) => {
    const angle = quarterTurn * index / subdivision;
    const state = deriveMec21BendPressureFreeState({ ...mec21, bendAngle: angle });
    assert.equal(state.basis, 'BEND_INITIAL_ABC');
    close(state.uniformPressureAxialStrain, uniformPressureAxialStrain, 1e-12);
    close(state.inferredOuterRadius, outerRadius, 1e-12);

    const localOpeningExpected = [
      translationScale * (Math.sin(angle) - angle),
      0,
      translationScale * (Math.cos(angle) - 1),
    ];
    vectorClose(state.localFinalTranslationAbc, localOpeningExpected, 1e-12);
    vectorClose(state.localFinalRotationAbc, [0, curvatureChangeRatio * angle, 0], 1e-12);

    const integratedPressureTranslation = [
      uniformPressureAxialStrain * mec21.bendRadius * Math.sin(angle),
      0,
      uniformPressureAxialStrain * mec21.bendRadius * (1 - Math.cos(angle)),
    ];
    const integratedOpeningTranslation = [
      translationScale * (Math.sin(angle) - angle * Math.cos(angle)),
      0,
      translationScale * (1 - Math.cos(angle) - angle * Math.sin(angle)),
    ];
    const integratedCompositeTranslation = add3(
      integratedPressureTranslation,
      integratedOpeningTranslation,
    );
    vectorClose(state.uniformPressureTranslationAbc, integratedPressureTranslation, 1e-12);
    vectorClose(state.bendOpeningTranslationAbc, integratedOpeningTranslation, 1e-12);
    vectorClose(state.translationAbc, integratedCompositeTranslation, 1e-12);
    vectorClose(state.rotationAbc, [0, curvatureChangeRatio * angle, 0], 1e-12);

    // Independent coordinate check: rotate the literal final-local Eq. (2.25)
    // components into the bend-start basis and recover only the opening term.
    const axes = quarterBendStationAxes(angle);
    const transformedLocalOpening = abcToStartBasis(axes, state.localFinalTranslationAbc);
    vectorClose(transformedLocalOpening, state.bendOpeningTranslationAbc, 1e-12);
    return state;
  });
  const expectedQuarterTurnComposite = compositePressureField(
    mec21.bendRadius,
    uniformPressureAxialStrain,
    translationScale,
    curvatureChangeRatio,
    quarterTurn,
  );
  vectorClose(physicalStations.at(-1).translationAbc, expectedQuarterTurnComposite.translation, 1e-12);
  vectorClose(physicalStations.at(-1).rotationAbc, expectedQuarterTurnComposite.rotation, 1e-12);
}

const expectedQuarterTurnComposite = compositePressureField(
  mec21.bendRadius,
  uniformPressureAxialStrain,
  translationScale,
  curvatureChangeRatio,
  quarterTurn,
);
const expectedQuarterTurnOpening = integratedOpeningField(
  translationScale,
  curvatureChangeRatio,
  quarterTurn,
);
const expectedQuarterTurnPressureTranslation = [
  uniformPressureAxialStrain * mec21.bendRadius,
  0,
  uniformPressureAxialStrain * mec21.bendRadius,
];
vectorClose(
  expectedQuarterTurnComposite.translation,
  add3(expectedQuarterTurnPressureTranslation, expectedQuarterTurnOpening.translation),
  1e-12,
);

// Explicit falsification of the blocked I002 basis semantics: interpreting
// literal Eq. (2.25) final-local opening components in one fixed bend-start
// basis is not the physical bend-opening cumulative field.
const fixedStartBasisQuarterTurn = directQuarterTurn.translationAbc;
const fixedStartBasisQuarterTurnRelativeError = vectorNorm(subtract3(
  fixedStartBasisQuarterTurn,
  expectedQuarterTurnOpening.translation,
)) / vectorNorm(expectedQuarterTurnOpening.translation);
close(fixedStartBasisQuarterTurnRelativeError, Math.SQRT2, 1e-12);

// Historical BM4 adapter falsification: it treated every numerical chord as a
// new physical bend, restarted Eq. (2.25) at zero, and mapped the segment's
// local-final component numbers through the segment-start axes. This fixture
// intentionally reproduces that old opening construction; it is not the
// physical whole-bend endpoint defined by the integrated-curvature benchmark.
const oneChordRestart = composeHistoricalRestartedMec21QuarterBend(mec21, 1);
const fourChordRestart = composeHistoricalRestartedMec21QuarterBend(mec21, 4);
vectorClose(oneChordRestart.translation, expectedQuarterTurnLocalFinal.translationAbc, 1e-12);
vectorClose(oneChordRestart.rotation, expectedQuarterTurnLocalFinal.rotationAbc, 1e-12);
vectorClose(fourChordRestart.rotation, expectedQuarterTurnLocalFinal.rotationAbc, 1e-12);
const restartTranslationError = vectorNorm(subtract3(
  fourChordRestart.translation,
  oneChordRestart.translation,
)) / vectorNorm(oneChordRestart.translation);
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
  bourdonPressureExpansion: {
    benchmark: 'TRANSLATIONAL_PRESSURE_STRAIN_PLUS_MEC21_EQ_2_25_ROTATING_BEND_OPENING',
    cumulativeStateBasis: 'BEND_INITIAL_ABC',
    literalOpeningBasis: 'STATION_FINAL_ABC',
    inferredOuterRadius: outerRadius,
    uniformPressureAxialStrain,
    documentedBourdonForce,
    curvatureChangeRatio,
    subdivisionCounts: [1, 2, 4, 8, 32],
    translationalPlusRotationalDecomposition: true,
    quarterTurnUniformPressureTranslationM: expectedQuarterTurnPressureTranslation,
    quarterTurnBendOpeningTranslationM: expectedQuarterTurnOpening.translation,
    quarterTurnCompositeTranslationM: expectedQuarterTurnComposite.translation,
    fixedStartBasisHypothesis: 'FALSIFIED',
    fixedStartBasisQuarterTurnRelativeError,
    historicalRestartedChordHypothesis: 'FALSIFIED',
    historicalRestartedFourChordTranslationRelativeError: restartTranslationError,
  },
}, null, 2));
console.log('LFEA B-3.18 BM1 real BEND components and directional SIFs PASS');

function compositePressureField(bendRadius, axialStrain, openingScale, curvatureRatio, angle) {
  return {
    translation: add3(
      [
        axialStrain * bendRadius * Math.sin(angle),
        0,
        axialStrain * bendRadius * (1 - Math.cos(angle)),
      ],
      integratedOpeningField(openingScale, curvatureRatio, angle).translation,
    ),
    rotation: [0, curvatureRatio * angle, 0],
  };
}

function integratedOpeningField(scaleValue, curvatureRatio, angle) {
  return {
    translation: [
      scaleValue * (Math.sin(angle) - angle * Math.cos(angle)),
      0,
      scaleValue * (1 - Math.cos(angle) - angle * Math.sin(angle)),
    ],
    rotation: [0, curvatureRatio * angle, 0],
  };
}

function quarterBendStationAxes(angle) {
  return {
    aAxis: [Math.cos(angle), 0, Math.sin(angle)],
    bAxis: [0, 1, 0],
    cAxis: [-Math.sin(angle), 0, Math.cos(angle)],
  };
}

function abcToStartBasis(axes, vector) {
  return add3(
    add3(scale3(axes.aAxis, vector[0]), scale3(axes.bAxis, vector[1])),
    scale3(axes.cAxis, vector[2]),
  );
}

function composeHistoricalRestartedMec21QuarterBend(input, subdivision) {
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
