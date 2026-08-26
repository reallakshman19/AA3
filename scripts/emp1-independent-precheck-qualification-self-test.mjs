import assert from 'node:assert/strict';
import { qualifyHexagonIndependentPrecheck } from './emp1-independent-precheck-qualification-lib.mjs';

const ready = {
  schema: 'emp1-independent-precheck/v1',
  classification: 'SUPPLEMENTAL_REFERENCE_NOT_CAUX_BENCHMARK',
  qualificationUse: 'SANITY_CHECK_ONLY',
  maySatisfyCauxA4: false,
  mayAuthorizeEmp1CProduction: false,
  expectedValuesLockedBeforeProductionWrcObservation: true,
  sourceReported: {
    geometry: {
      vesselOutsideDiameter_in: 120,
      vesselThickness_in: 0.625,
      nozzleOutsideDiameter_in: 12.75,
      nozzleThickness_in: 0.375
    },
    geometryChecks: { d_over_D: 0.10625, Dm_over_T: 191 },
    pressure_psi: 275,
    restraintAxialForce_lbf: -26,
    reportedTotalWrcRadialLoad_lbf: -31128,
    reportedLargestExpansionStressIntensity_psi: 117485,
    reportedLargestExpansionStressLocation: 'Bu',
    reportedLargestExpansionStressSurface: 'outer',
    reportedLargestExpansionStressPoint: 'B'
  },
  independentDerived: {
    nozzleInsideDiameter_in: 12,
    pressureThrustArea_in2: 113.09733552923255,
    pressureThrust_lbf: 31101.767270538952,
    totalWrcRadialLoadUnrounded_lbf: -31127.767270538952,
    totalWrcRadialLoadRounded_lbf: -31128
  },
  comparison: {
    reportedVsIndependentRoundedRadialLoad: 'PASS',
    difference_lbf: 0,
    unroundedToDisplayedDifference_lbf: 0.232729461048
  }
};

assert.equal(qualifyHexagonIndependentPrecheck(ready).status, 'PASS_BOUNDED_PRECHECK_QUALIFICATION');

const wrongSourceLoad = structuredClone(ready);
wrongSourceLoad.sourceReported.reportedTotalWrcRadialLoad_lbf = -31127;
assert.equal(qualifyHexagonIndependentPrecheck(wrongSourceLoad).status, 'FAIL');

const rewrittenExpected = structuredClone(ready);
rewrittenExpected.independentDerived.pressureThrust_lbf = 30000;
assert.equal(qualifyHexagonIndependentPrecheck(rewrittenExpected).status, 'FAIL');

const leakedStressAuthority = structuredClone(ready);
leakedStressAuthority.independentDerived.largestExpansionStressIntensity_psi = 117485;
assert.equal(qualifyHexagonIndependentPrecheck(leakedStressAuthority).status, 'FAIL');

const cauxAuthorityLeak = structuredClone(ready);
cauxAuthorityLeak.maySatisfyCauxA4 = true;
assert.equal(qualifyHexagonIndependentPrecheck(cauxAuthorityLeak).status, 'FAIL');

console.log(JSON.stringify({
  status: 'PASS',
  cases: [
    'bounded valid precheck passes',
    'wrong source-reported radial load fails',
    'rewritten derived pressure thrust fails',
    'source-reported stress promoted to independent derivation fails',
    'CAUx authority escalation fails'
  ]
}, null, 2));
