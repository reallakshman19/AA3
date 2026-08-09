#!/usr/bin/env node
import assert from 'node:assert/strict';
import { frameLocalStiffness } from '../src/core/linear-fea-frame-element/index.js';

/*
 * CAESAR II CAUx 2015, "F=KX — How CAESAR II formulates the global stiffness
 * matrix", © Intergraph 2015, single straight-pipe Mathcad derivation.
 *
 * The training derivation declares `shear := 2` for thin-walled pipe and uses
 *
 *   phi = 12 E I / [ G (A / shear) L^2 ].
 *
 * LFEA's frozen Timoshenko kernel uses
 *
 *   phi = 12 E I / [ G kappa A L^2 ].
 *
 * Therefore the CAESAR parity mapping is kappa = 1 / shear = 0.5. This check
 * proves only that algebraic authority mapping. It contains no BM4 result,
 * reaction, displacement, or fitted parameter.
 */

const SOURCE = Object.freeze({
  sourceId: 'INTERGRAPH-CAESAR-II-CAUX-2015-FKX',
  title: 'F=KX — How CAESAR II formulates the global stiffness matrix',
  copyright: 'Intergraph 2015',
  thinWallPipeShearCoefficient: 2,
});
const kappa = 1 / SOURCE.thinWallPipeShearCoefficient;
assert.equal(kappa, 0.5);

const cases = [
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

const results = cases.map((entry) => {
  const expectedPhi = 12 * entry.elasticModulus * entry.secondMoment
    / (entry.shearModulus * (entry.area / SOURCE.thinWallPipeShearCoefficient) * entry.length ** 2);
  const stiffness = frameLocalStiffness({
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
  close(stiffness.phiXY, expectedPhi, `${entry.caseId} phiXY`);
  close(stiffness.phiXZ, expectedPhi, `${entry.caseId} phiXZ`);
  return {
    caseId: entry.caseId,
    expectedPhi,
    actualPhiXY: stiffness.phiXY,
    actualPhiXZ: stiffness.phiXZ,
  };
});

console.log(JSON.stringify({
  check: 'lfea-issue947-caesar-pipe-shear-authority',
  status: 'PASS',
  source: SOURCE,
  mapping: {
    caesarShearCoefficient: SOURCE.thinWallPipeShearCoefficient,
    lfeaShearAreaRelation: 'A_s = kappa * A',
    caesarShearAreaRelation: 'A_s = A / shear',
    kappa,
  },
  benchmarkReferenceValuesUsed: false,
  results,
}, null, 2));
console.log('Issue 947 CAESAR pipe shear authority check PASS');

function close(actual, expected, label) {
  const scale = Math.max(1, Math.abs(actual), Math.abs(expected));
  assert.ok(
    Math.abs(actual - expected) <= 1e-12 * scale,
    `${label}: expected ${expected}, received ${actual}`,
  );
}
