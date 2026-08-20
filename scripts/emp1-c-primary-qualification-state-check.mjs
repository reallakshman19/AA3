#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const readJson = async (path) => JSON.parse(await readFile(resolve(repoRoot, path), 'utf8'));

const wrcLedger = await readJson('validation/emp1/wrc537-2013/source-ledger.json');
const cauxLedger = await readJson('validation/emp1/caux2017-wrc01f/source-ledger.json');
const method = await readJson('validation/emp1/wrc537-2013/primary-source-arbitration-v2.json');
const inventory = await readJson('validation/emp1/wrc537-2013/section8-inventory-v1.json');
const anomaly = await readJson('validation/emp1/wrc537-2013/source-anomalies-v1.json');
const interpolation = await readJson('validation/emp1/wrc537-2013/interpolation-authority-v1.json');
const curveProbe = await readJson('validation/emp1/wrc537-2013/cylindrical-curve-selection-probe-v1.json');
const runtime = await readJson('validation/emp1/wrc537-2013/runtime-components-v1.json');
const benchmark = await readJson('validation/emp1/caux2017-wrc01f/benchmark-qualification-v2.json');

assert.equal(wrcLedger.custodyState, 'VERIFIED');
assert.equal(wrcLedger.qualificationState, 'PASS_SOURCE_CUSTODY');
assert.match(wrcLedger.rawPdfSha256, /^[a-f0-9]{64}$/u);
assert.equal(cauxLedger.custodyState, 'VERIFIED');
assert.equal(cauxLedger.qualificationState, 'PASS_SOURCE_CUSTODY');
assert.match(cauxLedger.rawPdfSha256, /^[a-f0-9]{64}$/u);
assert.equal(method.status, 'PASS_METHOD_FORMULA_AND_SIGN_AUTHORITY');
assert.equal(method.curveFit.model, 'RATIONAL_5_OVER_6');
assert.equal(method.stressIntensity.status, 'PASS');
assert.equal(inventory.status, 'PASS_WITH_ONE_BOUNDED_SOURCE_ANOMALY');
assert.equal(inventory.totals.responseCurves, 451);
assert.equal(inventory.totals.scalarCoefficients, 4510);
assert.equal(inventory.totals.parameterQualifiedCurves, 450);
assert.equal(inventory.totals.sourceQualifiedScalars, 4500);
assert.equal(anomaly.anomalies?.length, 1);
assert.equal(anomaly.anomalies[0].id, 'WRC537-FIG1B-ORIGINAL-GAMMA-BLANK');
assert.equal(anomaly.authority?.affectedCurveProductionAuthority, false);
assert.equal(runtime.status, 'PASS_COMPONENTS_METHOD_STILL_BLOCKED_BY_INTERPOLATION');
assert.equal(runtime.cylindricalFrame.status, 'PASS');
assert.equal(runtime.stressIntensity.status, 'PASS');
assert.equal(runtime.pressureThrust.status, 'PASS_POLICY_CAPABILITY');
assert.equal(benchmark.status, 'PASS_INDEPENDENT_BENCHMARK_QUALIFICATION');
assert.equal(benchmark.productionObservationUsed, false);
assert.equal(benchmark.authorization?.handCalculationReobserved, true);
assert.equal(benchmark.authorization?.productionComparisonAllowed, true);
assert.equal(benchmark.authorization?.emp1CRouteRegistrationAllowed, false);
assert.equal(interpolation.status, 'BLOCKED_SOURCE_RULE_UNRESOLVED');
assert.equal(curveProbe.status, 'BLOCKED_NO_POLICY_QUALIFIED_BY_CAUX_ORDINATES');

const blockers = [];
if (interpolation.status !== 'PASS') blockers.push({
  code: 'WRC537_NON_TABULATED_GAMMA_SELECTION_UNQUALIFIED',
  scope: 'CYLINDRICAL_NON_TABULATED_GAMMA',
  requiredAuthority: interpolation.requiredToClose,
});

const restrictions = anomaly.anomalies.map((row) => ({
  code: row.id,
  scope: 'AFFECTED_CURVE_ONLY',
  figure: row.figure,
  productionSelectable: false,
  rule: row.productionPolicy,
}));

const status = blockers.length ? 'BLOCKED' : 'PASS';
const state = {
  schema: 'emp1-c-primary-qualification-state/v2',
  status,
  engineeringAuthority: status === 'PASS',
  productionAuthority: false,
  routeRegistrationAllowed: false,
  productionComparisonAllowed: status === 'PASS' && benchmark.authorization.productionComparisonAllowed === true,
  gates: {
    wrcSourceCustody: 'PASS',
    cauxSourceCustody: 'PASS',
    methodFormulaSignStressIntensity: 'PASS',
    curveFitFunctionalForm: 'PASS_RATIONAL_5_OVER_6',
    section8Inventory: 'PASS_WITH_BOUNDED_ROW_RESTRICTION',
    runtimeFrame: 'PASS',
    runtimeStressIntensity: 'PASS',
    runtimePressureThrustPolicy: 'PASS_POLICY_CAPABILITY',
    cauxBenchmark: 'PASS_INDEPENDENT_BENCHMARK_QUALIFICATION',
    cylindricalGammaSelection: status === 'PASS' ? 'PASS' : 'BLOCKED_SOURCE_RULE_UNRESOLVED',
  },
  inventory: inventory.totals,
  blockers,
  restrictions,
  supersededLegacyAssumptions: [
    'NINTH_ORDER_POLYNOMIAL_CURVE_FIT',
    'SPHERICAL_HOLLOW_120_CURVES_1200_SCALARS',
    'GENERIC_LEDGER_QUALIFICATION_STATE_PASS',
    'CAUX_PP24_31_NOT_RUN',
  ],
  exactNextAuthority: blockers.length ? interpolation.requiredToClose : 'RUN_PRODUCTION_COMPARISON_WITHOUT_REGISTERING_ROUTE',
};

console.log(JSON.stringify(state, null, 2));
process.exitCode = status === 'PASS' ? 0 : 2;
