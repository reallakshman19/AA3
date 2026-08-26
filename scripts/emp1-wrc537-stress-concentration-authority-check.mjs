#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  EMP1_WRC537_GENERAL_SCF_AUTHORITY_STATE,
  EMP1_WRC537_UNITY_SCF_AUTHORITY,
  createEmp1Wrc537UnityStressConcentrationAuthority,
  requireEmp1Wrc537GeneralScfAuthorityState,
  requireEmp1Wrc537UnityStressConcentrationAuthority,
} from '../src/core/emp1/emp1-wrc537-stress-concentration-authority.js';
import {
  EMP1_C_BOUNDED_PRODUCTION_ROUTES,
  EMP1_C_WRC537_APPENDIX_B_SCF_LIMITATION,
  EMP1_C_WRC537_UNITY_SCF_LIMITATION,
} from '../src/core/emp1/emp1-c-bounded-route-registry.js';
import { evaluateEmp1Wrc537CylindricalTable5 } from '../src/core/emp1/emp1-wrc537-cylindrical-table5.js';

const methodDefinition = await readFile('docs/01_WRC537_METHOD_DEFINITION.md', 'utf8');
assert.match(methodDefinition, /EXTRACTION STATUS:\s*NOT_READY_FOR_IMPLEMENTATION/u);
assert.match(methodDefinition, /Stress Concentration Factors \(Appendix B\)/u);
assert.match(methodDefinition, /Eq\. B\.3/u);
assert.match(methodDefinition, /Eq\. B\.4/u);
assert.match(methodDefinition, /Eq\. B\.5/u);
assert.match(methodDefinition, /licensed WRC 537 PDF was \*\*not\*\* available/iu);

const unity = createEmp1Wrc537UnityStressConcentrationAuthority();
assert.deepEqual(unity, {
  Kn: 1,
  Kb: 1,
  authority: 'PINNED_BOUNDED_ROUTE_UNITY_ONLY',
});
assert.deepEqual(requireEmp1Wrc537UnityStressConcentrationAuthority(unity), unity);
assert.deepEqual(EMP1_WRC537_UNITY_SCF_AUTHORITY, unity);

expectCode(
  () => requireEmp1Wrc537UnityStressConcentrationAuthority({ ...unity, Kn: 1.01 }),
  'EMP1_WRC537_UNITY_STRESS_CONCENTRATION_REQUIRED',
);
expectCode(
  () => requireEmp1Wrc537UnityStressConcentrationAuthority({
    ...unity,
    authority: 'GENERAL_APPENDIX_B_AUTHORITY',
  }),
  'EMP1_WRC537_UNITY_STRESS_CONCENTRATION_AUTHORITY_MISMATCH',
);
expectCode(
  () => requireEmp1Wrc537UnityStressConcentrationAuthority({
    ...unity,
    generalAppendixBAuthority: true,
  }),
  'EMP1_WRC537_UNITY_STRESS_CONCENTRATION_CUSTODY_SHAPE_MISMATCH',
);

const generalState = requireEmp1Wrc537GeneralScfAuthorityState(
  EMP1_WRC537_GENERAL_SCF_AUTHORITY_STATE,
);
assert.equal(generalState.mode, 'UNITY_ONLY');
assert.equal(generalState.routeAuthority, 'BOUNDED_ROUTE_UNITY_MULTIPLIER_ONLY');
assert.equal(generalState.generalAppendixBAuthority, false);
assert.equal(generalState.nonUnityAuthorized, false);
assert.equal(generalState.sourceQualification.retainedExtractionState, 'NOT_READY_FOR_IMPLEMENTATION');
assert.equal(generalState.sourceQualification.licensedPrimarySourceVerifiedForImplementation, false);
assert.equal(generalState.sourceQualification.equationSelectionPolicyQualified, false);
assert.deepEqual(generalState.sourceQualification.candidateEquationIds, ['B.3', 'B.4', 'B.5']);
expectCode(
  () => requireEmp1Wrc537GeneralScfAuthorityState({
    ...structuredClone(generalState),
    generalAppendixBAuthority: true,
  }),
  'EMP1_WRC537_GENERAL_STRESS_CONCENTRATION_AUTHORITY_NOT_ALLOWED',
);
expectCode(
  () => requireEmp1Wrc537GeneralScfAuthorityState({
    ...structuredClone(generalState),
    sourceQualification: {
      ...structuredClone(generalState.sourceQualification),
      equationSelectionPolicyQualified: true,
    },
  }),
  'EMP1_WRC537_APPENDIX_B_SOURCE_QUALIFICATION_STATE_INVALID',
);

const route = EMP1_C_BOUNDED_PRODUCTION_ROUTES[0];
assert.equal(route.scope.Kn, 1);
assert.equal(route.scope.Kb, 1);
assert.equal(route.scope.stressConcentrationMode, 'UNITY_ONLY');
assert.equal(route.scope.stressConcentrationAuthority, 'BOUNDED_ROUTE_UNITY_MULTIPLIER_ONLY');
assert.equal(route.scope.stressConcentrationCustodyAuthority, 'PINNED_BOUNDED_ROUTE_UNITY_ONLY');
assert.equal(route.scope.appendixBStressConcentrationQualified, false);
assert.equal(route.scope.nonUnityStressConcentrationAuthorized, false);
assert.equal(route.scope.stressConcentrationSourceQualification, 'NOT_READY_FOR_IMPLEMENTATION');
assert.ok(route.limitations.includes(EMP1_C_WRC537_UNITY_SCF_LIMITATION));
assert.ok(route.limitations.includes(EMP1_C_WRC537_APPENDIX_B_SCF_LIMITATION));
assert.ok(route.remainingBlocked.includes('NONUNITY_STRESS_CONCENTRATION'));

// Numerical-kernel falsifier: Kn/Kb are active multipliers in Table 5. The
// bounded product route blocks non-unity because authority is absent, not
// because the numerical kernel silently ignores the factors.
const base = table5({ Kn: 1, Kb: 1 });
const amplified = table5({ Kn: 1.2, Kb: 1.3 });
close(amplified.scale.pMem / base.scale.pMem, 1.2, 'Kn membrane scale ratio');
close(amplified.scale.pBend / base.scale.pBend, 1.3, 'Kb bending scale ratio');
assert.notDeepEqual(amplified.stresses.circumferential, base.stresses.circumferential);
assert.equal(route.scope.nonUnityStressConcentrationAuthorized, false);

console.log(JSON.stringify({
  schema: 'emp1-wrc537-stress-concentration-authority-check/v1',
  status: 'PASS_UNITY_ONLY_SCF_AUTHORITY_FAILS_CLOSED',
  historicalCustodyShapePreserved: true,
  sourceExtractionState: generalState.sourceQualification.retainedExtractionState,
  primarySourceQualifiedForGeneralScf: false,
  appendixBEquationSelectionQualified: false,
  candidateEquationIds: generalState.sourceQualification.candidateEquationIds,
  route: {
    Kn: route.scope.Kn,
    Kb: route.scope.Kb,
    mode: route.scope.stressConcentrationMode,
    generalAppendixBAuthority: route.scope.appendixBStressConcentrationQualified,
    nonUnityAuthorized: route.scope.nonUnityStressConcentrationAuthorized,
  },
  numericalFalsifier: {
    KnMultiplierObserved: amplified.scale.pMem / base.scale.pMem,
    KbMultiplierObserved: amplified.scale.pBend / base.scale.pBend,
  },
  productionAuthorityGranted: false,
}, null, 2));

function table5(stressConcentration) {
  const one = {
    Pmem_AB: 1,
    Pmem_CD: 1,
    Pbend_AB: 1,
    Pbend_CD: 1,
    Mcmem: 1,
    Mcbend: 1,
    Mlmem: 1,
    Mlbend: 1,
  };
  return evaluateEmp1Wrc537CylindricalTable5({
    geometry: {
      meanRadius: 100,
      shellThickness: 20,
      attachmentRadius: 17.714285714285715,
      beta: 0.155,
    },
    stressConcentration,
    loads: { P: 1000, Vc: 0, Vl: 0, Mc: 0, Ml: 0, Mt: 0 },
    curveOrdinates: { circ: one, long: one },
  });
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => error?.code === code && error.message === code);
}

function close(actual, expected, label) {
  const tolerance = Math.max(1e-12, Math.abs(expected) * 1e-12);
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `${label}: actual=${actual} expected=${expected} tolerance=${tolerance}`);
}
