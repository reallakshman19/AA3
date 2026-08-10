#!/usr/bin/env node
import assert from 'node:assert/strict';
import { frameLocalStiffness } from '../src/core/linear-fea-frame-element/index.js';

/*
 * Independent formulation authority; no BM4 result is consumed here.
 *
 * Intergraph CAESAR II CAUx 2015, "F=KX — How CAESAR II formulates the
 * global stiffness matrix", develops a single thin-wall straight-pipe element
 * in Mathcad and compares it with CAESAR II. The derivation declares:
 *
 *   shear = 2
 *   phi = 12 E I / [ G (A / shear) L^2 ]
 *
 * LFEA's qualified Timoshenko kernel uses:
 *
 *   phi = 12 E I / [ G (kappa A) L^2 ]
 *
 * Therefore exact algebraic parity requires kappa = 1 / shear = 0.5.
 */

const SOURCE = Object.freeze({
  sourceId: 'INTERGRAPH-CAESAR-II-CAUX-2015-FKX',
  title: 'F=KX — How CAESAR II formulates the global stiffness matrix',
  publisher: 'Intergraph',
  year: 2015,
  modelScope: 'THIN_WALL_STRAIGHT_PIPE_ELEMENT',
  benchmarkReferenceValuesUsed: false,
  caesarDerivationShearCoefficient: 2,
});

const kappa = 1 / SOURCE.caesarDerivationShearCoefficient;
assert.equal(kappa, 0.5);

const fixtures = [
  {
    caseId: 'SHORT-PIPE-SHEAR-DOMINATED',
    elasticModulus: 203_395_328_000,
    shearModulus: 78_228_972_307.6923,
    area: 0.005420247731,
    secondMoment: 0.000017082141,
    polarMoment: 0.000034164282,
    length: 0.143,
  },
  {
    caseId: 'SLENDER-PIPE-CONTROL',
    elasticModulus: 200_000_000_000,
    shearModulus: 76_923_076_923.07692,
    area: 0.004,
    secondMoment: 0.00001,
    polarMoment: 0.00002,
    length: 8,
  },
];

const results = fixtures.map((entry) => {
  const expectedPhi = 12 * entry.elasticModulus * entry.secondMoment
    / (entry.shearModulus * (entry.area / SOURCE.caesarDerivationShearCoefficient) * entry.length ** 2);
  const actual = frameLocalStiffness({
    elasticModulus: entry.elasticModulus,
    shearModulus: entry.shearModulus,
    area: entry.area,
    secondMomentY: entry.secondMoment,
    secondMomentZ: entry.secondMoment,
    polarMoment: entry.polarMoment,
    length: entry.length,
    shearDeformation: true,
    shearCorrectionFactorY: kappa,
    shearCorrectionFactorZ: kappa,
  });
  close(actual.phiXY, expectedPhi, `${entry.caseId}:phiXY`);
  close(actual.phiXZ, expectedPhi, `${entry.caseId}:phiXZ`);
  return Object.freeze({
    caseId: entry.caseId,
    expectedPhi,
    actualPhiXY: actual.phiXY,
    actualPhiXZ: actual.phiXZ,
  });
});

console.log(JSON.stringify({
  check: 'lfea-m047-caesar-pipe-shear-authority',
  status: 'PASS',
  source: SOURCE,
  mapping: {
    caesarShearCoefficient: SOURCE.caesarDerivationShearCoefficient,
    caesarShearAreaRelation: 'A_s = A / shear',
    lfeaShearAreaRelation: 'A_s = kappa * A',
    kappa,
  },
  scopeBoundary: {
    authorized: 'thin-wall physically straight pipe spans',
    notAuthorizedByThisSource: ['bend arc interpolation', 'rigid elements', 'reducers'],
  },
  results,
}, null, 2));
console.log('M047 CAESAR pipe shear authority check PASS');

function close(actual, expected, label) {
  const scale = Math.max(1, Math.abs(actual), Math.abs(expected));
  assert.ok(
    Math.abs(actual - expected) <= 1e-12 * scale,
    `${label}: expected ${expected}, received ${actual}`,
  );
}
