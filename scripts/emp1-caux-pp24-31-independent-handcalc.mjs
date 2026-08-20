#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const sourcePath = resolve(repoRoot, 'validation/emp1/caux2017-wrc01f/benchmark-source-pp24-31-v2.json');
const source = JSON.parse(await readFile(sourcePath, 'utf8'));

assert.equal(source.schema, 'emp1-caux-pp24-31-benchmark-source/v2');
assert.equal(source.status, 'PASS_SOURCE_EXPECTED_VALUES_FROZEN');
assert.equal(source.source.rawPdfSha256, 'c1e92798a7bc172d649007ad88f6be548651f07a01cb2fbf83343e2283e0e83e');
assert.equal(source.source.custodyState, 'VERIFIED');
assert.equal(source.source.qualificationState, 'PASS_SOURCE_CUSTODY');
assert.equal(hashCanonical(source.benchmark), source.benchmarkSemanticHash, 'CAUx benchmark semantic hash drift');

const b = source.benchmark;
const locations = b.expectedSustainedKPa.locations;
assert.deepEqual(locations, ['Au','Al','Bu','Bl','Cu','Cl','Du','Dl']);

// This checker is intentionally standalone. It imports no production EMP.1.C,
// local-stress, WRC evaluator, or UI module.
const productionImports = [];

const eLong = normalize(b.frame.vesselCenterlineGlobal);
const eP = normalize(b.frame.nozzleCenterlineGlobal);
const eVc = normalize(cross(eLong, eP));
assert(nearlyEqual(dot(eLong, eP), 0, 1e-12), 'vessel/nozzle axes must be orthogonal in this benchmark');
assert(nearlyEqual(dot(eVc, eLong), 0, 1e-12));
assert(nearlyEqual(dot(eVc, eP), 0, 1e-12));

const F = b.sustained.global.forceN;
const M = b.sustained.global.momentNm;
const transformed = {
  P_N: dot(F, eP),
  Vc_N: dot(F, eVc),
  Vl_N: dot(F, eLong),
  Mc_Nm: -dot(M, eLong),
  Ml_Nm: dot(M, eVc),
  Mt_Nm: -dot(M, eP),
};
for (const [key, expected] of Object.entries(b.sustained.wrc)) {
  assert(nearlyEqual(transformed[key], expected, 1e-12), `CAUx frame-transform mismatch ${key}`);
}

const vessel = b.geometry.vessel;
const nozzle = b.geometry.nozzle;
const Rm = (vessel.outerDiameterMm - vessel.nominalThicknessMm) / 2;
const T = vessel.nominalThicknessMm - vessel.corrosionAllowanceMm;
const r0ExactInput = nozzle.outerDiameterMm / 2;
const r0 = nozzle.sourceCalculationRadiusMm;
const gammaArithmetic = Rm / T;
const betaArithmeticUsingSourceRadius = 0.875 * r0 / Rm;
const betaArithmeticUsingExactInputRadius = 0.875 * r0ExactInput / Rm;
assert(nearlyEqual(Rm, vessel.meanRadiusMm, 1e-12));
assert(nearlyEqual(T, vessel.corrodedThicknessMm, 1e-12));

const geometryEvidence = {
  meanRadiusMm: Rm,
  corrodedThicknessMm: T,
  exactNozzleOuterRadiusFromInputMm: r0ExactInput,
  sourceCalculationRadiusMm: r0,
  gammaArithmetic,
  gammaSourceReported: b.geometry.dimensionless.gammaSourceReported,
  gammaSourceMinusArithmetic: b.geometry.dimensionless.gammaSourceReported - gammaArithmetic,
  betaArithmeticUsingSourceRadius,
  betaArithmeticUsingExactInputRadius,
  betaSourceReported: b.geometry.dimensionless.betaSourceReported,
  betaSourceMinusArithmeticUsingSourceRadius: b.geometry.dimensionless.betaSourceReported - betaArithmeticUsingSourceRadius,
  disposition: 'PRESERVE_SOURCE_REPORTED_GAMMA_AND_BETA_FOR_BENCHMARK_LOOKUP;DO_NOT_SILENTLY_RECONCILE_DISPLAYED_ARITHMETIC',
};

const beta = b.geometry.dimensionless.betaSourceReported;
const loads = {
  P_N: transformed.P_N,
  Vc_N: transformed.Vc_N,
  Vl_N: transformed.Vl_N,
  Mc_Nmm: transformed.Mc_Nm * 1000,
  Ml_Nmm: transformed.Ml_Nm * 1000,
  Mt_Nmm: transformed.Mt_Nm * 1000,
};
const q = b.curveOrdinates;

const scale = {
  pMem: Math.abs(loads.P_N) / (Rm * T) * 1000,
  pBend: 6 * Math.abs(loads.P_N) / (T ** 2) * 1000,
  mcMem: Math.abs(loads.Mc_Nmm) / (Rm ** 2 * beta * T) * 1000,
  mcBend: 6 * Math.abs(loads.Mc_Nmm) / (Rm * beta * T ** 2) * 1000,
  mlMem: Math.abs(loads.Ml_Nmm) / (Rm ** 2 * beta * T) * 1000,
  mlBend: 6 * Math.abs(loads.Ml_Nmm) / (Rm * beta * T ** 2) * 1000,
};

const formulaExamples = {
  circ: {
    Pmem_AB: q.circ.Pmem_AB.value * scale.pMem,
    Pbend_AB: q.circ.Pbend_AB.value * scale.pBend,
    Mcmem: q.circ.Mcmem.value * scale.mcMem,
    Mcbend: q.circ.Mcbend.value * scale.mcBend,
    Mlmem: q.circ.Mlmem.value * scale.mlMem,
    Mlbend: q.circ.Mlbend.value * scale.mlBend,
  },
  long: {
    Pmem_AB: q.long.Pmem_AB.value * scale.pMem,
    Pbend_AB: q.long.Pbend_AB.value * scale.pBend,
    Mcmem: q.long.Mcmem.value * scale.mcMem,
    Mcbend: q.long.Mcbend.value * scale.mcBend,
    Mlmem: q.long.Mlmem.value * scale.mlMem,
    Mlbend: q.long.Mlbend.value * scale.mlBend,
  },
  shear: {
    Vc: Math.abs(loads.Vc_N) / (Math.PI * r0 * T) * 1000,
    Vl: Math.abs(loads.Vl_N) / (Math.PI * r0 * T) * 1000,
    Mt: Math.abs(loads.Mt_Nmm) / (2 * Math.PI * r0 ** 2 * T) * 1000,
  },
};

const exampleComparisons = [];
for (const family of ['circ','long','shear']) {
  for (const [key, calculated] of Object.entries(formulaExamples[family])) {
    const expected = b.sourceFormulaExamplesKPa[family][key];
    const tolerance = displayedFormulaTolerance(expected);
    const error = calculated - expected;
    assert(Math.abs(error) <= tolerance, `source formula example mismatch ${family}.${key}: ${calculated} vs ${expected} tol=${tolerance}`);
    exampleComparisons.push({ family, key, calculated, expected, error, tolerance, status: 'PASS' });
  }
}

const sign = {
  pMem: [-1,-1,-1,-1,-1,-1,-1,-1],
  pBend: [-1,1,-1,1,-1,1,-1,1],
  mcMem: [0,0,0,0,-1,-1,1,1],
  mcBend: [0,0,0,0,-1,1,1,-1],
  mlMem: [-1,-1,1,1,0,0,0,0],
  mlBend: [-1,1,1,-1,0,0,0,0],
  vc: [1,1,-1,-1,0,0,0,0],
  vl: [0,0,0,0,-1,-1,1,1],
  mt: [1,1,1,1,1,1,1,1],
};

const circComponents = {
  Pmem: applySign(sign.pMem, loads.P_N, groupABCD(q.circ.Pmem_AB.value * scale.pMem, q.circ.Pmem_CD.value * scale.pMem)),
  Pbend: applySign(sign.pBend, loads.P_N, groupABCD(q.circ.Pbend_AB.value * scale.pBend, q.circ.Pbend_CD.value * scale.pBend)),
  Mcmem: applySign(sign.mcMem, loads.Mc_Nmm, q.circ.Mcmem.value * scale.mcMem),
  Mcbend: applySign(sign.mcBend, loads.Mc_Nmm, q.circ.Mcbend.value * scale.mcBend),
  Mlmem: applySign(sign.mlMem, loads.Ml_Nmm, q.circ.Mlmem.value * scale.mlMem),
  Mlbend: applySign(sign.mlBend, loads.Ml_Nmm, q.circ.Mlbend.value * scale.mlBend),
};
const longComponents = {
  Pmem: applySign(sign.pMem, loads.P_N, groupABCD(q.long.Pmem_AB.value * scale.pMem, q.long.Pmem_CD.value * scale.pMem)),
  Pbend: applySign(sign.pBend, loads.P_N, groupABCD(q.long.Pbend_AB.value * scale.pBend, q.long.Pbend_CD.value * scale.pBend)),
  Mcmem: applySign(sign.mcMem, loads.Mc_Nmm, q.long.Mcmem.value * scale.mcMem),
  Mcbend: applySign(sign.mcBend, loads.Mc_Nmm, q.long.Mcbend.value * scale.mcBend),
  Mlmem: applySign(sign.mlMem, loads.Ml_Nmm, q.long.Mlmem.value * scale.mlMem),
  Mlbend: applySign(sign.mlBend, loads.Ml_Nmm, q.long.Mlbend.value * scale.mlBend),
};
const shearComponents = {
  Vc: applySign(sign.vc, loads.Vc_N, formulaExamples.shear.Vc),
  Vl: applySign(sign.vl, loads.Vl_N, formulaExamples.shear.Vl),
  Mt: applySign(sign.mt, loads.Mt_Nmm, formulaExamples.shear.Mt),
};

const calculated = {
  circumferential: sumArrays(Object.values(circComponents)),
  longitudinal: sumArrays(Object.values(longComponents)),
  shear: sumArrays(Object.values(shearComponents)),
};
calculated.stressIntensity = locations.map((_, i) => stressIntensity(
  calculated.circumferential[i],
  calculated.longitudinal[i],
  calculated.shear[i],
));

// The source publishes curve ordinates to three decimals. Assuming ordinary
// nearest rounding, each printed ordinate represents ±0.0005. Since every WRC
// stress term here is linear in its ordinate, propagate the absolute worst-case
// contribution to each total. The final CAUx totals are printed to whole kPa,
// so comparison tolerances add ±0.5 kPa output rounding. No tolerance is fitted
// to a production result.
const ordinateHalfUnit = 0.0005;
const curveUncertaintyAB = ordinateHalfUnit * (scale.pMem + scale.pBend + scale.mlMem + scale.mlBend);
const curveUncertaintyCD = ordinateHalfUnit * (scale.pMem + scale.pBend + scale.mcMem + scale.mcBend);
const componentCurveUncertainty = [
  curveUncertaintyAB, curveUncertaintyAB, curveUncertaintyAB, curveUncertaintyAB,
  curveUncertaintyCD, curveUncertaintyCD, curveUncertaintyCD, curveUncertaintyCD,
];
const totalStressTolerance = componentCurveUncertainty.map((value) => value + 0.5);
const shearTolerance = Array(8).fill(0.51);
const stressIntensityTolerance = componentCurveUncertainty.map((value) =>
  2 * Math.sqrt(value ** 2 + value ** 2 + 2 * (0.5 ** 2)) + 0.5);

const comparisons = {};
for (const quantity of ['circumferential','longitudinal','shear','stressIntensity']) {
  const expected = b.expectedSustainedKPa[quantity];
  const tolerance = quantity === 'shear' ? shearTolerance
    : quantity === 'stressIntensity' ? stressIntensityTolerance
      : totalStressTolerance;
  comparisons[quantity] = locations.map((location, i) => {
    const error = calculated[quantity][i] - expected[i];
    assert(Math.abs(error) <= tolerance[i], `${quantity}/${location} handcalc mismatch: calc=${calculated[quantity][i]} source=${expected[i]} tol=${tolerance[i]}`);
    return { location, calculated: calculated[quantity][i], sourceExpected: expected[i], error, tolerance: tolerance[i], status: 'PASS' };
  });
}

const calculationEvidence = {
  schema: 'emp1-caux-pp24-31-independent-handcalc-evidence/v2',
  classification: 'INDEPENDENT_ARITHMETIC_FROM_SOURCE_REPORTED_ORDINATES',
  productionImports,
  sourceBenchmarkSemanticHash: source.benchmarkSemanticHash,
  frame: { eP, eLong, eVc, transformed, sourceExpectedWrcLoads: b.sustained.wrc },
  geometryEvidence,
  pressureThrustMode: b.pressure.includePressureThrust ? 'INCLUDED' : 'NO_PRESSURE_THRUST',
  scaleFactorsKPaPerCurveOrdinate: scale,
  formulaExamples,
  exampleComparisons,
  sourceSignConvention: {
    document: 'WRC537_2013.pdf',
    table: 'Table 5 Continued - Computation Sheet for Local Stresses in Cylindrical Shells',
    rule: 'Table signs apply for source positive loads; reverse all signs in an applicable column when the load/moment direction reverses.',
    sign,
  },
  components: { circumferential: circComponents, longitudinal: longComponents, shear: shearComponents },
  calculatedKPa: calculated,
  sourceResolutionModel: {
    printedCurveOrdinateDecimals: 3,
    ordinateHalfUnit,
    curveUncertaintyABKPa: curveUncertaintyAB,
    curveUncertaintyCDKPa: curveUncertaintyCD,
    finalTableRoundingHalfUnitKPa: 0.5,
    stressIntensityBound: '2*FrobeniusNorm(stressTensorPerturbation)+0.5 kPa',
  },
  comparisons,
};
const handCalculationSemanticHash = hashCanonical(calculationEvidence);

console.log(JSON.stringify({
  schema: 'emp1-caux-pp24-31-independent-handcalc/v2',
  status: 'PASS',
  engineeringAuthority: true,
  productionAuthority: false,
  productionObservationUsed: false,
  productionImports,
  sourceBenchmarkSemanticHash: source.benchmarkSemanticHash,
  handCalculationSemanticHash,
  calculationEvidence,
  authorization: {
    sourceExpectedValuesFrozen: true,
    independentHandCalculationPassed: true,
    productionComparisonMayProceedAfterHandcalcHashFreezeAndReobservation: true,
    productionRouteRegistrationAllowed: false,
  },
}, null, 2));

function applySign(signs, load, magnitude) {
  const values = Array.isArray(magnitude) ? magnitude : Array(signs.length).fill(magnitude);
  const direction = load < 0 ? -1 : 1;
  return signs.map((sourceSign, i) => sourceSign * direction * values[i]);
}
function groupABCD(ab, cd) { return [ab,ab,ab,ab,cd,cd,cd,cd]; }
function sumArrays(arrays) { return arrays[0].map((_, i) => arrays.reduce((sum, row) => sum + row[i], 0)); }
function stressIntensity(sigmaPhi, sigmaX, tau) {
  const d = Math.sqrt((sigmaPhi - sigmaX) ** 2 + 4 * tau ** 2);
  const p1 = 0.5 * (sigmaPhi + sigmaX + d);
  const p2 = 0.5 * (sigmaPhi + sigmaX - d);
  const p3 = 0;
  return Math.max(Math.abs(p1 - p2), Math.abs(p2 - p3), Math.abs(p3 - p1));
}
function displayedFormulaTolerance(expected) {
  if (Number.isInteger(expected)) return 0.5;
  const text = String(expected);
  const decimals = text.includes('.') ? text.split('.')[1].length : 0;
  if (decimals >= 3) return 0.002;
  if (decimals === 2) return 0.02;
  return 0.1;
}
function dot(a,b) { return a.reduce((sum, value, i) => sum + value * b[i], 0); }
function cross(a,b) { return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
function normalize(v) {
  const n = Math.sqrt(dot(v,v));
  if (!(n > 0)) throw new TypeError('EMP1_CAUX_ZERO_FRAME_VECTOR');
  return v.map((value) => value / n);
}
function nearlyEqual(a,b,tol) { return Math.abs(a-b) <= tol; }
function hashCanonical(value) { return createHash('sha256').update(canonicalJson(value)).digest('hex'); }
function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
