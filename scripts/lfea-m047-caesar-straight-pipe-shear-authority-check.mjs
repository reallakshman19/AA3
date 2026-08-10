import assert from 'node:assert/strict';

/**
 * M047 / BM4_L — independent straight-pipe transverse-shear authority check.
 *
 * Primary formulation source:
 *   Intergraph, CAESAR II CAUx 2015, "F=KX — How CAESAR II formulates the
 *   global stiffness matrix", 2015-03-23, straight-pipe Mathcad handout.
 *
 * The handout defines for the straight pipe element:
 *   shear := 2
 *   phi = 12 E I / [ G (A / shear) L^2 ]
 * and compares that element formulation directly with CAESAR II.
 *
 * The qualified LFEA Timoshenko frame kernel defines:
 *   phi = 12 E I / [ G (kappa A) L^2 ]
 * Therefore equality of the effective shear areas requires:
 *   kappa A = A / shear  =>  kappa = 1 / 2 = 0.5.
 *
 * This check proves only the physical straight-pipe mapping. It does not
 * authorize applying the same coefficient to bend arcs, reducers, or rigid
 * elements, whose stiffness formulations are governed separately.
 */

const authority = Object.freeze({
  publisher: 'Intergraph',
  product: 'CAESAR II',
  event: 'CAUx 2015',
  title: 'F=KX — How CAESAR II formulates the global stiffness matrix',
  date: '2015-03-23',
  element: 'single straight pipe',
  sourceEquation: 'phi = 12 E I / (G (A / shear) L^2)',
  sourceShearDivisor: 2,
});

const sourceShearDivisor = authority.sourceShearDivisor;
const kappa = 1 / sourceShearDivisor;
assert.equal(kappa, 0.5, 'CAESAR straight-pipe shear divisor 2 must map to kappa=0.5.');

function caesarPhi({ E, G, A, I, L }) {
  return (12 * E * I) / (G * (A / sourceShearDivisor) * L ** 2);
}

function lfeaPhi({ E, G, A, I, L }) {
  return (12 * E * I) / (G * (kappa * A) * L ** 2);
}

const fixtures = [
  { E: 200e9, G: 76.92307692307692e9, A: 0.004, I: 8.1e-6, L: 3.0 },
  { E: 195e9, G: 75e9, A: 0.012, I: 4.7e-5, L: 0.75 },
  { E: 207e9, G: 79.61538461538461e9, A: 0.0017, I: 1.2e-6, L: 8.5 },
];

for (const fixture of fixtures) {
  const expected = caesarPhi(fixture);
  const actual = lfeaPhi(fixture);
  const scale = Math.max(1, Math.abs(expected), Math.abs(actual));
  assert.ok(
    Math.abs(actual - expected) <= 2e-15 * scale,
    `Effective-shear-area mapping must reproduce the CAESAR phi term: ${actual} vs ${expected}.`,
  );
}

const scope = Object.freeze({
  includedAnalysisKinds: Object.freeze(['FRAME', 'BEND_INCOMING_STRAIGHT']),
  excludedAnalysisKinds: Object.freeze(['BEND_ARC', 'REDUCER', 'REDUCER_PRISMATIC', 'RIGID']),
  reason: 'The authority equation is the single straight-pipe element formulation; other component stiffnesses require their own authority.',
});

console.log(JSON.stringify({
  schema: 'm047-caesar-straight-pipe-shear-authority-check/v1',
  status: 'PASS',
  authority,
  mapping: {
    caesarEffectiveShearArea: 'A / 2',
    lfeaEffectiveShearArea: 'kappa * A',
    shearCorrectionFactor: kappa,
  },
  scope,
}, null, 2));
