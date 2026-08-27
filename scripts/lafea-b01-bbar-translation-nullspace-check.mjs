#!/usr/bin/env node
import assert from 'node:assert/strict';

import {
  FORMULATIONS,
  QUALIFICATION_PROFILE,
  q8ElementEvidence,
  t6ElementEvidence,
} from '../src/core/local-continuum/index.js';
import {
  PLANAR_TRANSLATION_NULLSPACE_METHOD,
  PLANAR_TRANSLATION_NULLSPACE_SCHEMA,
  preservePlanarTranslationNullspace,
} from '../src/core/local-continuum/planar-translation-nullspace.js';

const NU_LADDER = Object.freeze([0.30, 0.45, 0.49, 0.499, 0.4999]);
const E = 200000;
const THICKNESS = 7;
const families = [
  Object.freeze({ elementType: 'T6', nodes: t6Nodes(), build: t6ElementEvidence }),
  Object.freeze({ elementType: 'Q8', nodes: q8Nodes(), build: q8ElementEvidence }),
];

const observations = [];
for (const family of families) {
  for (const poissonRatio of NU_LADDER) {
    observations.push(checkBbarFamily(family, poissonRatio));
  }
}
checkNonBbarIsolation();
checkNonRoundoffMutationFailsClosed();

console.log(JSON.stringify({
  schema: 'lafea-b01-bbar-translation-nullspace-check/v1',
  status: 'PASS',
  authorityBoundary: 'BBAR_ELEMENT_STIFFNESS_BINARY64_TRANSLATION_REPRESENTATION_ONLY',
  poissonRatioLadder: NU_LADDER,
  elementFamilies: families.map((row) => row.elementType),
  observationCount: observations.length,
  observations,
  independentTranslationActionRecomputed: true,
  nonBbarIsolationPassed: true,
  nonRoundoffMutationRejected: true,
  solverMechanicsChangedByCheck: false,
  engineeringToleranceUsedAsRepairEnvelope: false,
  engineeringAuthorityCreated: false,
  releaseAuthorityGranted: false,
}, null, 2));

function checkBbarFamily(family, poissonRatio) {
  const material = Object.freeze({
    materialId: 'M1',
    elasticModulus: E,
    poissonRatio,
    sourceReference: `B01-NULLSPACE#M1/NU-${poissonRatio}`,
  });
  const evidence = family.build(
    `E-${family.elementType}-${poissonRatio}`,
    family.nodes,
    material,
    FORMULATIONS.PLANE_STRAIN_BBAR,
    THICKNESS,
    QUALIFICATION_PROFILE,
  );

  const nullspace = evidence.bbarEvidence?.translationNullspace;
  assert.ok(nullspace, `${family.elementType}/${poissonRatio}: nullspace evidence missing`);
  assert.equal(nullspace.schema, PLANAR_TRANSLATION_NULLSPACE_SCHEMA);
  assert.equal(nullspace.method, PLANAR_TRANSLATION_NULLSPACE_METHOD);
  assert.equal(nullspace.translationNullspaceQualified, true);
  assert.equal(nullspace.physicalFormulationChanged, false);
  assert.equal(nullspace.rotationProjected, false);
  assert.ok(nullspace.relativeCorrection <= nullspace.correctionLimit);
  assert.ok(nullspace.relativeAfterTranslationResidual <= nullspace.translationResidualLimit);

  const tx = translationVector(family.nodes.length, 0);
  const ty = translationVector(family.nodes.length, 1);
  const independentTx = maxAbs(matrixVectorCompensated(evidence.localStiffnessMatrix, tx));
  const independentTy = maxAbs(matrixVectorCompensated(evidence.localStiffnessMatrix, ty));
  const independentRelative = Math.max(independentTx, independentTy) / nullspace.stiffnessScale;
  assert.ok(
    independentRelative <= nullspace.translationResidualLimit,
    `${family.elementType}/${poissonRatio}: independent translation action ${independentRelative} exceeds ${nullspace.translationResidualLimit}`,
  );
  assertClose(
    independentTx,
    nullspace.afterTranslationResidualInfinity.UX,
    nullspace.stiffnessScale * Number.EPSILON * 8,
    `${family.elementType}/${poissonRatio}: UX evidence differs from independent action`,
  );
  assertClose(
    independentTy,
    nullspace.afterTranslationResidualInfinity.UY,
    nullspace.stiffnessScale * Number.EPSILON * 8,
    `${family.elementType}/${poissonRatio}: UY evidence differs from independent action`,
  );

  return Object.freeze({
    elementType: family.elementType,
    poissonRatio,
    stiffnessScale: nullspace.stiffnessScale,
    relativeCorrection: nullspace.relativeCorrection,
    correctionLimit: nullspace.correctionLimit,
    beforeTranslationResidualInfinity: nullspace.beforeTranslationResidualInfinity,
    afterTranslationResidualInfinity: nullspace.afterTranslationResidualInfinity,
    independentAfterTranslationResidualInfinity: Object.freeze({ UX: independentTx, UY: independentTy }),
    independentRelativeAfterTranslationResidual: independentRelative,
    rotationProjected: false,
  });
}

function checkNonBbarIsolation() {
  const material = Object.freeze({
    materialId: 'M-PS',
    elasticModulus: E,
    poissonRatio: 0.3,
    sourceReference: 'B01-NULLSPACE#PLANE-STRESS-CONTROL',
  });
  for (const family of families) {
    const evidence = family.build(
      `E-${family.elementType}-PLANE-STRESS`,
      family.nodes,
      material,
      FORMULATIONS.PLANE_STRESS,
      THICKNESS,
      QUALIFICATION_PROFILE,
    );
    assert.equal(
      Object.hasOwn(evidence, 'bbarEvidence'),
      false,
      `${family.elementType}: non-B-bar formulation must not acquire B-bar repair evidence`,
    );
  }
}

function checkNonRoundoffMutationFailsClosed() {
  const material = Object.freeze({
    materialId: 'M-NEG',
    elasticModulus: E,
    poissonRatio: 0.4999,
    sourceReference: 'B01-NULLSPACE#NEGATIVE',
  });
  const evidence = t6ElementEvidence(
    'E-T6-NEGATIVE-SOURCE',
    t6Nodes(),
    material,
    FORMULATIONS.PLANE_STRAIN_BBAR,
    THICKNESS,
    QUALIFICATION_PROFILE,
  );
  const corrupted = evidence.localStiffnessMatrix.map((row) => [...row]);
  const scale = evidence.bbarEvidence.translationNullspace.stiffnessScale;
  corrupted[0][0] += scale * 1e-6;
  assert.throws(
    () => preservePlanarTranslationNullspace(corrupted),
    (error) => error?.code
      === 'LAFEA_BBAR_TRANSLATION_NULLSPACE_CORRECTION_EXCEEDS_ROUNDOFF_ENVELOPE',
    'a non-roundoff dependent-block defect must fail closed',
  );
}

function t6Nodes() {
  return Object.freeze([
    Object.freeze({ x: 0, y: 0 }),
    Object.freeze({ x: 4, y: 0.5 }),
    Object.freeze({ x: 0.5, y: 3 }),
    Object.freeze({ x: 2, y: 0.25 }),
    Object.freeze({ x: 2.25, y: 1.75 }),
    Object.freeze({ x: 0.25, y: 1.5 }),
  ]);
}

function q8Nodes() {
  return Object.freeze([
    Object.freeze({ x: 0, y: 0 }),
    Object.freeze({ x: 4, y: 0 }),
    Object.freeze({ x: 4.5, y: 3 }),
    Object.freeze({ x: -0.5, y: 3 }),
    Object.freeze({ x: 2, y: 0 }),
    Object.freeze({ x: 4.25, y: 1.5 }),
    Object.freeze({ x: 2, y: 3 }),
    Object.freeze({ x: -0.25, y: 1.5 }),
  ]);
}

function translationVector(nodeCount, axis) {
  return Array.from({ length: nodeCount * 2 }, (_, index) => index % 2 === axis ? 1 : 0);
}

function matrixVectorCompensated(matrix, vector) {
  return matrix.map((row) => compensatedSum(row.map((value, index) => value * vector[index])));
}

function compensatedSum(values) {
  let sum = 0;
  let compensation = 0;
  for (const value of values) {
    const next = sum + value;
    compensation += Math.abs(sum) >= Math.abs(value)
      ? (sum - next) + value
      : (value - next) + sum;
    sum = next;
  }
  return sum + compensation;
}

function maxAbs(values) {
  return values.reduce((maximum, value) => Math.max(maximum, Math.abs(value)), 0);
}

function assertClose(actual, expected, absoluteTolerance, label) {
  assert.ok(
    Number.isFinite(actual)
      && Number.isFinite(expected)
      && Math.abs(actual - expected) <= absoluteTolerance,
    `${label}: ${actual} != ${expected} within ${absoluteTolerance}`,
  );
}
