import assert from 'node:assert/strict';
import fs from 'node:fs';

const baseline = JSON.parse(fs.readFileSync(
  new URL('../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-l13-friction-diagnostic-baseline.json', import.meta.url),
  'utf8',
));

assert.equal(baseline.schema, 'm047-bm4l-l13-friction-diagnostic-baseline/v1');
assert.equal(baseline.benchmarkId, 'BM4_L');
assert.equal(baseline.stackBase.pr, 1064);
assert.equal(baseline.caesarAuthority.version, '14.00.00.0910');
assert.equal(baseline.caesarAuthority.build, 231113);
assert.equal(baseline.caesarAuthority.l13.definition, 'W+P1');
assert.equal(baseline.caesarAuthority.l13.frictionMultiplier, 1);
assert.equal(baseline.caesarAuthority.frictionCoefficient, 0.3);

const stiffness = baseline.caesarAuthority.staticFrictionStiffness;
assert.equal(stiffness.documentedSourceValue, 1_000_000);
assert.equal(stiffness.documentedSourceUnit, 'lb/in');
assert.equal(stiffness.siValueNPerM, 175126835.24647635);
assert.equal(stiffness.status, 'RESOLVED_AND_PRODUCT_VALIDATED');
assert.equal(stiffness.independentWitness.nodes.length, 2);
assert.ok(stiffness.independentWitness.maximumAbsoluteRelativeDifferenceFromDocumented < 0.0001);
assert.equal(stiffness.supersedesDiagnosticInterpretation, '100000000_N_PER_M_FROM_BM4_INPUTXML_DISPLAY_UNIT');

const reconstruction = baseline.l6SystemReconstruction;
assert.equal(reconstruction.analysisNodeCount, 323);
assert.equal(reconstruction.dofCount, reconstruction.analysisNodeCount * 6);
assert.equal(reconstruction.analysisElementCount, 322);
assert.equal(reconstruction.groundedSpringCount, 51);
assert.ok(reconstruction.maximumAbsoluteAssembledResidual < 2e-6);
assert.ok(reconstruction.maximumAbsoluteSolvedDisplacementDifference < 2e-12);
assert.equal(reconstruction.status, 'PASS_ZERO_FRICTION_SYSTEM_RECONSTRUCTION');

const candidate = baseline.l13DiagnosticCandidate;
assert.equal(candidate.status, 'DIAGNOSTIC_ONLY_NOT_CAESAR_PARITY_AUTHORIZED');
assert.equal(candidate.frictionStiffnessNPerM, stiffness.siValueNPerM);
assert.equal(candidate.coefficientOfFriction, 0.3);
assert.equal(candidate.finalFrictionStates.stickCount + candidate.finalFrictionStates.slidingCount, 26);
assert.equal(new Set([
  ...candidate.finalFrictionStates.stickNodes,
  ...candidate.finalFrictionStates.slidingNodes,
]).size, 26);

const canonical = candidate.canonicalComparison;
const quantityTotals = Object.values(canonical.byQuantity).reduce((acc, row) => ({
  passed: acc.passed + row.passed,
  failed: acc.failed + row.failed,
  total: acc.total + row.total,
}), { passed: 0, failed: 0, total: 0 });
assert.deepEqual(quantityTotals, {
  passed: canonical.passed,
  failed: canonical.failed,
  total: canonical.total,
});
assert.equal(canonical.total, 1914);
assert.equal(canonical.passed + canonical.failed, canonical.total);
assert.ok(Math.abs(canonical.passRatePercent - 100 * canonical.passed / canonical.total) < 1e-12);
assert.equal(canonical.passRatePercent, 89.81191222570533);

const gap = baseline.gapStateFalsification;
assert.equal(gap.passed + gap.failed, gap.total);
assert.equal(gap.total, 1914);
assert.ok(Math.abs(gap.passRatePercent - 100 * gap.passed / gap.total) < 1e-12);
assert.ok(gap.passRatePercent < canonical.passRatePercent);

assert.deepEqual([...baseline.remainingAuthorityBlockers].sort(), [
  'FRICTION_SLIDE_MULTIPLIER_AUTHORITY_REQUIRED',
  'FRICTION_STATE_HISTORY_SEMANTICS_AUTHORITY_REQUIRED',
  'GAP_CONTACT_STATE_SEMANTICS_AUTHORITY_REQUIRED',
].sort());
assert.equal(baseline.policy.responseFittingUsed, false);
assert.equal(baseline.policy.referenceValuesUsedToSelectParameters, false);
assert.equal(baseline.policy.diagnosticPassRateMayBeCalledQualifiedAccuracy, false);
assert.equal(baseline.policy.productionFrictionAuthorized, false);
assert.equal(baseline.policy.l13ProductionSolveAuthorized, false);
assert.equal(baseline.policy.newMechanicsAuthorized, false);

console.log(JSON.stringify({
  check: 'm047-bm4l-l13-friction-diagnostic-baseline',
  status: 'PASS',
  frictionStiffnessNPerM: stiffness.siValueNPerM,
  zeroFrictionReconstruction: reconstruction.status,
  l13DiagnosticPassRatePercent: canonical.passRatePercent,
  l13DiagnosticFailures: canonical.failed,
  gapOpeningFalsificationPassRatePercent: gap.passRatePercent,
  qualifiedAccuracyClaimed: false,
  productionFrictionAuthorized: false,
}, null, 2));
