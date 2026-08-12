import assert from 'node:assert/strict';
import fs from 'node:fs';

const p = JSON.parse(fs.readFileSync(
  new URL('../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-l13-friction-coulomb-fixed-point-proof.json', import.meta.url),
  'utf8',
));

assert.equal(p.schema, 'm047-bm4l-l13-friction-coulomb-fixed-point-proof/v1');
assert.equal(p.benchmarkId, 'BM4_L');
assert.equal(p.caseId, 'L13');
assert.equal(p.parent.governedRows, 1914);
assert.equal(p.parent.diagnosticAccuracyPercent, 89.81191222570533);
assert.equal(p.fixedMechanics.coefficientOfFriction, 0.3);
assert.equal(p.fixedMechanics.frictionStiffnessNPerM, 175126835.24647635);
assert.equal(p.fixedMechanics.responseFittingUsed, false);

const converged = p.convergenceRuns.filter((row) => row.converged);
assert.deepEqual(converged.map((row) => row.damping), [0.1, 0.15, 0.2]);
assert.ok(converged.every((row) => row.stickSites === 7 && row.slidingSites === 19));
const negative = p.convergenceRuns.filter((row) => !row.converged);
assert.deepEqual(negative.map((row) => row.damping), [0.25, 0.3]);
assert.ok(negative.every((row) => row.disposition === 'NUMERICAL_NEGATIVE_CONTROL_NOT_AUTHORITY'));

assert.equal(p.convergedSolutionAgreement.damping0_1.identicalStateMap, true);
assert.equal(p.convergedSolutionAgreement.damping0_15.identicalStateMap, true);
assert.ok(p.convergedSolutionAgreement.damping0_1.maximumAbsoluteDofDifference < 1e-12);
assert.ok(p.convergedSolutionAgreement.damping0_15.maximumAbsoluteDofDifference < 1e-12);
assert.ok(p.convergedSolutionAgreement.damping0_1.maximumFrictionForceVectorDifferenceN < 2e-5);
assert.ok(p.convergedSolutionAgreement.damping0_15.maximumFrictionForceVectorDifferenceN < 1e-5);

assert.ok(p.physicalResidualsAtConvergedFixedPoint.maximumAbsoluteGlobalEquilibriumResidual < 1e-5);
assert.ok(p.physicalResidualsAtConvergedFixedPoint.maximumSlidingCoulombLawVectorResidualN < 1e-5);
assert.ok(p.physicalResidualsAtConvergedFixedPoint.minimumStickReserveToCoulombLimitN > 0);
assert.ok(p.physicalResidualsAtConvergedFixedPoint.maximumSlidingCapMagnitudeResidualN < 1e-5);

assert.equal(p.state.stickCount, 7);
assert.equal(p.state.slidingCount, 19);
assert.deepEqual(p.state.stickNodes, ['20030','20250','20390','20550','21480','21930','22310']);
assert.equal(p.interpretation.physicalCoulombFixedPointNumericallyRobust, true);
assert.equal(p.interpretation.diagnosticAccuracyGapAttributedToDampingChoice, false);
assert.equal(p.interpretation.caesarEquivalentClaimPermitted, false);
assert.equal(p.decision.l13QualifiedAccuracyAuthorized, false);
assert.equal(p.decision.l7ExecutionAuthorized, false);
assert.ok(p.prohibitions.includes('DO_NOT_SELECT_DAMPING_FROM_BM4_L_REFERENCE_ACCURACY'));

console.log('PASS M047 BM4_L L13 physical Coulomb fixed-point numerical proof F2.3');
