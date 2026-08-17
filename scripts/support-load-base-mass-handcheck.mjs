#!/usr/bin/env node

import assert from 'node:assert/strict';

const fixture = Object.freeze({
  outsideDiameterMm: 168.3,
  wallThicknessMm: 7.11,
  materialDensityKgPerM3: 7850,
  lengthM: 4.75,
  insulationThicknessMm: 50,
  insulationDensityKgPerM3: 120,
  operatingFluidDensityKgPerM3: 850,
  hydroFluidDensityKgPerM3: 998.2,
});

function annulusAreaM2(outerMm, innerMm) {
  return Math.PI * (outerMm ** 2 - innerMm ** 2) / 4e6;
}

function fluidAreaM2(insideDiameterMm) {
  return Math.PI * insideDiameterMm ** 2 / 4e6;
}

const insideDiameterMm = fixture.outsideDiameterMm - (2 * fixture.wallThicknessMm);
const metalKg = annulusAreaM2(fixture.outsideDiameterMm, insideDiameterMm)
  * fixture.lengthM * fixture.materialDensityKgPerM3;
const insulationKg = annulusAreaM2(
  fixture.outsideDiameterMm + (2 * fixture.insulationThicknessMm),
  fixture.outsideDiameterMm,
) * fixture.lengthM * fixture.insulationDensityKgPerM3;
const invariantBaseKg = metalKg + insulationKg;

const expected = Object.freeze({
  insideDiameterMm: 154.08,
  metalKg: 134.25202189314257,
  insulationKg: 19.54557577394158,
  EMPTY: 153.79759766708415,
  OPE: 229.0802577418132,
  HYD: 242.20601094543065,
});

assert.equal(insideDiameterMm, expected.insideDiameterMm);
assert.ok(Math.abs(metalKg - expected.metalKg) <= 1e-12);
assert.ok(Math.abs(insulationKg - expected.insulationKg) <= 1e-12);

const cases = [
  ['EMPTY', 0],
  ['OPE', fixture.operatingFluidDensityKgPerM3],
  ['HYD', fixture.hydroFluidDensityKgPerM3],
];

for (const [caseId, densityKgPerM3] of cases) {
  const fluidKg = caseId === 'EMPTY'
    ? 0
    : fluidAreaM2(insideDiameterMm) * fixture.lengthM * densityKgPerM3;

  // Baseline production association before preprocessing.
  const baselineMassKg = metalKg + insulationKg + fluidKg;

  // New production association after preprocessing.
  const preprocessedMassKg = invariantBaseKg + fluidKg;

  assert.ok(Object.is(baselineMassKg, preprocessedMassKg),
    `${caseId}: preprocessing changed the IEEE-754 mass result.`);
  assert.ok(Math.abs(preprocessedMassKg - expected[caseId]) <= 1e-12,
    `${caseId}: hand-check expected mass changed.`);

  console.log(`${caseId}: metal=${metalKg.toFixed(12)} kg, insulation=${insulationKg.toFixed(12)} kg, fluid=${fluidKg.toFixed(12)} kg, total=${preprocessedMassKg.toFixed(12)} kg`);
}

assert.equal(3, cases.length);
console.log('PASS: (metal + insulation) + fluid is IEEE-754 identical to the prior left-associated expression for EMPTY/OPE/HYD fixture cases.');
