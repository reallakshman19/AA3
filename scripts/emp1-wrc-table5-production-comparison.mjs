#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateEmp1Wrc537CylindricalTable5 } from '../src/core/emp1/emp1-wrc537-cylindrical-table5.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const readJson = async (relativePath) => JSON.parse(await readFile(resolve(root, relativePath), 'utf8'));
const source = await readJson('validation/emp1/caux2017-wrc01f/benchmark-source-pp24-31-v2.json');
const qualification = await readJson('validation/emp1/caux2017-wrc01f/benchmark-qualification-v2.json');

assert.equal(source.status, 'PASS_SOURCE_EXPECTED_VALUES_FROZEN');
assert.equal(qualification.status, 'PASS_INDEPENDENT_BENCHMARK_QUALIFICATION');
assert.equal(qualification.productionObservationUsed, false);
assert.equal(qualification.independentHandCalculation?.reobservation?.status, 'PASS');
assert.deepEqual(qualification.independentHandCalculation?.reobservation?.productionImports, []);
assert.equal(qualification.authorization?.productionComparisonAllowed, true);
assert.equal(qualification.authorization?.emp1CRouteRegistrationAllowed, false);
assert.equal(source.benchmarkSemanticHash, qualification.sourceBenchmark.semanticHash);

const b = source.benchmark;
const Rm = b.geometry.vessel.meanRadiusMm;
const T = b.geometry.vessel.corrodedThicknessMm;
const r0 = b.geometry.nozzle.sourceCalculationRadiusMm;
const beta = b.geometry.dimensionless.betaSourceReported;
const q = b.curveOrdinates;
const input = {
  geometry: { meanRadius: Rm, shellThickness: T, attachmentRadius: r0, beta },
  stressConcentration: { Kn: 1, Kb: 1 },
  loads: {
    P: b.sustained.wrc.P_N,
    Vc: b.sustained.wrc.Vc_N,
    Vl: b.sustained.wrc.Vl_N,
    Mc: b.sustained.wrc.Mc_Nm * 1000,
    Ml: b.sustained.wrc.Ml_Nm * 1000,
    Mt: b.sustained.wrc.Mt_Nm * 1000,
  },
  curveOrdinates: {
    circ: Object.fromEntries(Object.entries(q.circ).map(([key,row]) => [key,row.value])),
    long: Object.fromEntries(Object.entries(q.long).map(([key,row]) => [key,row.value])),
  },
};
const result = evaluateEmp1Wrc537CylindricalTable5(input);
assert.equal(result.state, 'EVALUATED_TABLE5');
assert.equal(result.engineeringUseAuthorized, true);
assert.equal(result.curveSelectionAuthority, false);
assert.equal(result.fullDomainAuthority, false);
assert.equal(result.globalRouteAuthority, false);
assert.deepEqual(result.locations, b.expectedSustainedKPa.locations);

const actualKPa = Object.fromEntries(Object.entries(result.stresses).map(([key,values]) => [key, values.map((value) => value * 1000)]));

// Source-derived acceptance only. The CAUx source prints curve ordinates to
// 3 decimals (±0.0005 ordinary rounding) and final stresses to whole kPa
// (±0.5 kPa). This is the same declared resolution model frozen before this
// production kernel existed; no tolerance is tuned to the production output.
const halfOrdinate = qualification.toleranceAuthority.sourceCurveOrdinatePrintedDecimals === 3 ? 0.0005 : NaN;
assert(Number.isFinite(halfOrdinate));
assert.equal(qualification.toleranceAuthority.sourceFinalTableRoundingHalfUnitKPa, 0.5);
const loads = input.loads;
const scaleKPa = {
  pMem: Math.abs(loads.P) / (Rm * T) * 1000,
  pBend: 6 * Math.abs(loads.P) / (T ** 2) * 1000,
  mcMem: Math.abs(loads.Mc) / (Rm ** 2 * beta * T) * 1000,
  mcBend: 6 * Math.abs(loads.Mc) / (Rm * beta * T ** 2) * 1000,
  mlMem: Math.abs(loads.Ml) / (Rm ** 2 * beta * T) * 1000,
  mlBend: 6 * Math.abs(loads.Ml) / (Rm * beta * T ** 2) * 1000,
};
const uncertaintyAB = halfOrdinate * (scaleKPa.pMem + scaleKPa.pBend + scaleKPa.mlMem + scaleKPa.mlBend);
const uncertaintyCD = halfOrdinate * (scaleKPa.pMem + scaleKPa.pBend + scaleKPa.mcMem + scaleKPa.mcBend);
const componentTolerance = [uncertaintyAB,uncertaintyAB,uncertaintyAB,uncertaintyAB,uncertaintyCD,uncertaintyCD,uncertaintyCD,uncertaintyCD]
  .map((value) => value + 0.5);
const shearTolerance = Array(8).fill(0.51);
const intensityTolerance = [uncertaintyAB,uncertaintyAB,uncertaintyAB,uncertaintyAB,uncertaintyCD,uncertaintyCD,uncertaintyCD,uncertaintyCD]
  .map((value) => 2 * Math.sqrt(value ** 2 + value ** 2 + 2 * 0.5 ** 2) + 0.5);

const comparisons = {};
for (const quantity of ['circumferential','longitudinal','shear','stressIntensity']) {
  const expected = b.expectedSustainedKPa[quantity];
  const tolerance = quantity === 'shear' ? shearTolerance : quantity === 'stressIntensity' ? intensityTolerance : componentTolerance;
  comparisons[quantity] = result.locations.map((location,index) => {
    const actual = actualKPa[quantity][index];
    const error = actual - expected[index];
    assert(Math.abs(error) <= tolerance[index], `${quantity}/${location}: actual=${actual} expected=${expected[index]} tol=${tolerance[index]}`);
    return {location,actual,expected:expected[index],error,tolerance:tolerance[index],status:'PASS'};
  });
}

// Sign reversal metamorphic check: reverse all six external loads while keeping
// ordinates/geometry fixed. Linear Table 5 stresses must reverse sign while
// Tresca intensity remains unchanged.
const reversed = evaluateEmp1Wrc537CylindricalTable5({
  ...input,
  loads: Object.fromEntries(Object.entries(input.loads).map(([key,value]) => [key,-value])),
});
for (const quantity of ['circumferential','longitudinal','shear']) {
  result.stresses[quantity].forEach((value,index) => {
    assert(Math.abs(reversed.stresses[quantity][index] + value) <= 1e-12 * Math.max(1,Math.abs(value)));
  });
}
result.stresses.stressIntensity.forEach((value,index) => {
  assert(Math.abs(reversed.stresses.stressIntensity[index] - value) <= 1e-12 * Math.max(1,Math.abs(value)));
});

assert.throws(
  () => evaluateEmp1Wrc537CylindricalTable5({...input, geometry:{...input.geometry,beta:0}}),
  (error) => error?.code === 'EMP1_WRC537_TABLE5_BETA_NONPOSITIVE',
);
assert.throws(
  () => evaluateEmp1Wrc537CylindricalTable5({...input, curveOrdinates:{...input.curveOrdinates,circ:{...input.curveOrdinates.circ,Mcbend:-0.08}}}),
  (error) => error?.code === 'EMP1_WRC537_TABLE5_CIRC_MCBEND_NEGATIVE_ORDINATE',
);

console.log(JSON.stringify({
  schema:'emp1-wrc537-table5-production-comparison/v1',
  status:'PASS',
  engineeringAuthority:true,
  curveSelectionAuthority:false,
  fullDomainAuthority:false,
  globalRouteAuthority:false,
  benchmarkSemanticHash:source.benchmarkSemanticHash,
  independentHandcalcSemanticHash:qualification.independentHandCalculation.semanticHash,
  productionModule:'src/core/emp1/emp1-wrc537-cylindrical-table5.js',
  actualKPa,
  comparisons,
  metamorphicProof:'ALL_SIX_LOADS_REVERSED_STRESS_SIGN_REVERSES_INTENSITY_INVARIANT',
  negativeProofs:['ZERO_BETA_BLOCKED','NEGATIVE_CURVE_ORDINATE_BLOCKED'],
},null,2));
