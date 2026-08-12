#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CAESAR_ACCDB_FRICTION_SOLVER_PROFILE,
  CAESAR_CONFIGURATION_PRECEDENCE,
  resolveCaesarEffectiveFriction,
} from '../src/core/fea-benchmarks/index.js';

const profile = JSON.parse(readFileSync(resolve(
  'benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json',
), 'utf8'));
const benchmarkPackage = {
  profile,
  cases: [
    { caseId: 'L1', lcaseNumber: 1, formula: 'WW+HP' },
    { caseId: 'L2', lcaseNumber: 2, formula: 'W' },
    { caseId: 'L3', lcaseNumber: 3, formula: 'T1' },
    { caseId: 'L4', lcaseNumber: 4, formula: 'P1' },
    { caseId: 'L5', lcaseNumber: 5, formula: 'W+T1+P1' },
    { caseId: 'L6', lcaseNumber: 6, formula: 'W+P1' },
    { caseId: 'L7', lcaseNumber: 7, formula: 'W+T1+P1' },
    { caseId: 'L13', lcaseNumber: 13, formula: 'W+P1' },
    { caseId: 'L14', lcaseNumber: 14, formula: 'L14=L5-L6' },
    { caseId: 'L15', lcaseNumber: 15, formula: 'L15=L7-L13' },
  ],
};

assert.deepEqual(CAESAR_CONFIGURATION_PRECEDENCE, [
  'OVERALL_GLOBAL_DEFAULT',
  'INDIVIDUAL_FILE_SETTING',
  'LOAD_CASE_SETTING',
  'MODEL_INPUT',
]);
assert.deepEqual(profile.configurationAuthority.precedence, CAESAR_CONFIGURATION_PRECEDENCE);
for (const caseId of ['L2', 'L3', 'L4', 'L5', 'L6']) {
  const friction = resolveCaesarEffectiveFriction(benchmarkPackage, caseId);
  assert.equal(friction.modelCoefficient.value, 0.3, `${caseId} model mu`);
  assert.equal(friction.frictionMultiplier.value, 0, `${caseId} multiplier`);
  assert.equal(friction.effectiveCoefficient, 0, `${caseId} effective mu`);
}
for (const caseId of ['L1', 'L7', 'L13']) {
  const friction = resolveCaesarEffectiveFriction(benchmarkPackage, caseId);
  assert.equal(friction.modelCoefficient.value, 0.3, `${caseId} model mu`);
  assert.equal(friction.frictionMultiplier.value, 1, `${caseId} multiplier`);
  assert.equal(friction.effectiveCoefficient, 0.3, `${caseId} effective mu`);
}
const l14 = resolveCaesarEffectiveFriction(benchmarkPackage, 'L14');
assert.equal(l14.kind, 'DERIVED');
assert.deepEqual(l14.dependencies.map((row) => [row.caseId, row.effectiveCoefficient]), [
  ['L5', 0], ['L6', 0],
]);
const l15 = resolveCaesarEffectiveFriction(benchmarkPackage, 'L15');
assert.equal(l15.kind, 'DERIVED');
assert.deepEqual(l15.dependencies.map((row) => [row.caseId, row.effectiveCoefficient]), [
  ['L7', 0.3], ['L13', 0.3],
]);
const displayedFrictionStiffness = profile.configurationAuthority.layers.overallGlobalDefault.settings.FRICT_STIF.value;
assert.equal(displayedFrictionStiffness, 1e6);
assert.equal(displayedFrictionStiffness * 100, 1e8);
assert.equal(CAESAR_ACCDB_FRICTION_SOLVER_PROFILE.initialization, 'ALL_STICK');
assert.equal(CAESAR_ACCDB_FRICTION_SOLVER_PROFILE.relaxationFactor, 1);
assert.equal(CAESAR_ACCDB_FRICTION_SOLVER_PROFILE.loadSteps, 1);
assert.deepEqual(CAESAR_ACCDB_FRICTION_SOLVER_PROFILE.sensitivityMultipliers, [0.5, 1, 2]);

const frictionSource = readFileSync(resolve(
  'src/core/fea-benchmarks/caesar-accdb-friction-solve.js',
), 'utf8');
assert.match(
  frictionSource,
  /isTranslation \? 'FORCE' : 'MOMENT', dof/u,
  'Nonlinear nodal reactions must retain the frozen/reference DOF component identity.',
);
assert.match(
  frictionSource,
  /isTranslation \? 'INCIDENT_GLOBAL_FORCE' : 'INCIDENT_GLOBAL_MOMENT',[\s\S]*?dof,/u,
  'Nonlinear incident nodal actions must retain the frozen/reference DOF component identity.',
);
assert.match(
  frictionSource,
  /TRANSLATION_DOFS\.forEach\(\(component\) => \{[\s\S]*?'INCIDENT_GLOBAL_FORCE', component/u,
  'L15 equilibrium must evaluate actual UX/UY/UZ nodal rows.',
);
assert.match(
  frictionSource,
  /combinedLimit = absoluteTolerance \+ relativeTolerance \* scale/u,
  'Iteration updates must enforce the declared combined absolute-relative tolerance.',
);
assert.match(
  frictionSource,
  /signedNormalReactionN = dot\(normalReactionGlobal, support\.normalDirection\)/u,
  'Signed normal reaction evidence must respect the declared restraint direction.',
);

const assessmentSource = readFileSync(resolve(
  'src/core/fea-benchmarks/qualification-engineering-assessment.js',
), 'utf8');
assert.match(
  assessmentSource,
  /FORCE: Object\.freeze\(\['UX', 'UY', 'UZ'\]\)/u,
  'Coordinate-invariant nodal force vectors must use UX/UY/UZ benchmark components.',
);
assert.match(
  assessmentSource,
  /MOMENT: Object\.freeze\(\['RX', 'RY', 'RZ'\]\)/u,
  'Coordinate-invariant nodal moment vectors must use RX/RY/RZ benchmark components.',
);
assert.match(
  assessmentSource,
  /GLOBAL_END_FORCE_FROM: Object\.freeze\(\['FX', 'FY', 'FZ'\]\)/u,
  'Element-end force vectors must retain FX/FY/FZ action components.',
);

process.stdout.write('M047 BM4_L friction contract: PASS\n');