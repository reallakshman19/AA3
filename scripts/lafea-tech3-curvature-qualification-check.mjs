#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  calculateLocalShell,
  createCanonicalLocalShellModel,
} from '../src/core/local-shell/index.js';
import { cylindricalSource } from './lafea.4-fixtures.mjs';

const definition = JSON.parse(fs.readFileSync(
  new URL('../validation/lafea4-curvature/cylindrical-membrane-angle-v1.json', import.meta.url),
  'utf8',
));

assert.equal(definition.stageId, 'LAFEA.4');
assert.equal(definition.formulation, 'CST_DKT_TRI3_THIN_SHELL_V1');
assert.equal(definition.scope, 'SMOOTH_CYLINDRICAL_MEMBRANE_GEOMETRIC_DISCRETIZATION_ONLY');
assert.equal(definition.benchmarkQualified, false);
assert.equal(definition.releaseQualified, false);

const oracle = definition.oracle;
const expectedStress = oracle.elasticModulusMpa
  / (1 - oracle.poissonRatio ** 2)
  * oracle.prescribedHoopStrain;
close(expectedStress, oracle.expectedHoopStressMpa, 1e-14);

const rows = definition.ladder.map((level) => evaluate(level, oracle, expectedStress));
for (let index = 1; index < rows.length; index += 1) {
  const coarse = rows[index - 1];
  const fine = rows[index];
  assert.ok(
    fine.absoluteStrainError < coarse.absoluteStrainError / definition.acceptance.minimumErrorReductionPerHalving,
    `strain convergence ${coarse.facetAngleDegrees} -> ${fine.facetAngleDegrees} deg is insufficient`,
  );
  assert.ok(
    fine.absoluteStressError < coarse.absoluteStressError / definition.acceptance.minimumErrorReductionPerHalving,
    `stress convergence ${coarse.facetAngleDegrees} -> ${fine.facetAngleDegrees} deg is insufficient`,
  );
}

for (const acceptance of definition.acceptance.levels) {
  const row = rows.find((candidate) => candidate.facetAngleDegrees === acceptance.facetAngleDegrees);
  assert.ok(row, `missing frozen angle level ${acceptance.facetAngleDegrees}`);
  assert.ok(
    row.relativeStrainError <= acceptance.maximumRelativeHoopStrainError,
    `${row.facetAngleDegrees} deg hoop-strain error ${row.relativeStrainError} exceeds ${acceptance.maximumRelativeHoopStrainError}`,
  );
  assert.ok(
    row.relativeStressError <= acceptance.maximumRelativeHoopStressError,
    `${row.facetAngleDegrees} deg hoop-stress error ${row.relativeStressError} exceeds ${acceptance.maximumRelativeHoopStressError}`,
  );
}

assert.ok(definition.prohibitions.includes('NO_CURVED_BENDING_ACCURACY_CLAIM'));
assert.ok(definition.prohibitions.includes('NO_LOCAL_ATTACHMENT_STRESS_AUTHORITY'));
assert.ok(definition.prohibitions.includes('NO_SAGITTA_TO_THICKNESS_RELEASE_THRESHOLD'));

console.log(JSON.stringify({
  check: 'lafea-tech3-curvature-qualification',
  status: 'PASS',
  qualificationId: definition.qualificationId,
  scope: definition.scope,
  analyticalOracle: {
    prescribedHoopStrain: oracle.prescribedHoopStrain,
    expectedHoopStressMpa: expectedStress,
    thicknessMm: oracle.thicknessMm,
  },
  rows,
  releaseQualified: false,
}, null, 2));

function evaluate(level, oracleValue, expectedStressValue) {
  const source = cylindricalSource(level.segments, {
    radius: oracleValue.radiusMm,
    length: oracleValue.lengthMm,
    span: oracleValue.spanDegrees * Math.PI / 180,
  });
  assert.ok(source.elements.every((element) => element.thickness === oracleValue.thicknessMm));
  const strain = oracleValue.prescribedHoopStrain;
  const radius = oracleValue.radiusMm;
  source.constraints = source.nodes.flatMap((node) => {
    const angle = Math.atan2(node.position[1], node.position[2]);
    const displacement = node.rotationBasis2.map((value) => value * strain * radius * angle);
    return constraints(node.nodeId, [...displacement, 0, 0]);
  });
  source.loadCases = [{
    loadCaseId: 'HOOP-STRAIN',
    nodalLoads: [],
    pressureLoads: [],
    sourceReference: 'TECH3-ANALYTICAL-PRESCRIBED-HOOP-STRAIN',
  }];

  const result = calculateLocalShell(createCanonicalLocalShellModel(source));
  assert.equal(result.qualification.accepted, true, result.qualification.summary);

  let absoluteStrainError = 0;
  let absoluteStressError = 0;
  for (const elementResult of result.loadCaseResults[0].elementResults) {
    const element = result.meshEvidence.elements.find((item) => item.elementId === elementResult.elementId);
    assert.ok(element);
    const tangent = circumferentialTangent(source, element.nodeIds);
    const [a, b] = localDirection(tangent, element.localFrame);
    const hoopStrain = projectStrain(elementResult.membraneStrain, a, b);
    const hoopStress = projectStress(elementResult.membraneStress, a, b);
    absoluteStrainError = Math.max(absoluteStrainError, Math.abs(hoopStrain - strain));
    absoluteStressError = Math.max(absoluteStressError, Math.abs(hoopStress - expectedStressValue));
  }

  const halfFacetAngle = level.facetAngleDegrees * Math.PI / 360;
  const sagitta = radius * (1 - Math.cos(halfFacetAngle));
  const sagittaToThickness = sagitta / oracleValue.thicknessMm;
  return Object.freeze({
    segments: level.segments,
    facetAngleDegrees: level.facetAngleDegrees,
    sagittaMm: sagitta,
    sagittaToThickness,
    absoluteStrainError,
    relativeStrainError: absoluteStrainError / Math.abs(strain),
    absoluteStressErrorMpa: absoluteStressError,
    absoluteStressError,
    relativeStressError: absoluteStressError / Math.abs(expectedStressValue),
  });
}

function constraints(nodeId, values) {
  return ['UX', 'UY', 'UZ', 'R1', 'R2'].map((dof, index) => ({
    constraintId: `TECH3-${nodeId}-${dof}`,
    nodeId,
    dof,
    value: values[index],
    sourceReference: `TECH3-${nodeId}-${dof}-SRC`,
  }));
}

function circumferentialTangent(source, nodeIds) {
  const centroid = nodeIds
    .map((nodeId) => source.nodes.find((node) => node.nodeId === nodeId).position)
    .reduce((total, position) => total.map((value, index) => value + position[index]), [0, 0, 0])
    .map((value) => value / 3);
  const angle = Math.atan2(centroid[1], centroid[2]);
  return [0, Math.cos(angle), -Math.sin(angle)];
}

function localDirection(global, frame) {
  let a = dot(global, frame.ex);
  let b = dot(global, frame.ey);
  const length = Math.hypot(a, b);
  assert.ok(length > 0);
  a /= length;
  b /= length;
  return [a, b];
}

function projectStrain(strain, a, b) {
  return a ** 2 * strain.epsilonX + b ** 2 * strain.epsilonY + a * b * strain.gammaXY;
}

function projectStress(stress, a, b) {
  return a ** 2 * stress.sigmaX + b ** 2 * stress.sigmaY + 2 * a * b * stress.tauXY;
}

function dot(a, b) {
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

function close(actual, expected, relativeTolerance) {
  assert.ok(
    Math.abs(actual - expected) <= relativeTolerance * Math.max(1, Math.abs(expected)),
    `${actual} != ${expected}`,
  );
}
