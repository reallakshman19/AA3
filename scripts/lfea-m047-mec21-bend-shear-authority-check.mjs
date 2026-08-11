import assert from 'node:assert/strict';

/**
 * M047 — independent MEC-21 / CAESAR bend transverse-shear authority check.
 *
 * Intergraph CAESAR II CAUx 2015, F=KX, reproduces the MEC-21 (1964,
 * revised 1977) local bend flexibility terms. For a circular annulus it
 * defines
 *
 *   alpha = (4/3) (Ro^3 - Ri^3) / ((Ro^2 + Ri^2)(Ro - Ri))
 *
 * and the transverse-shear contributions to the local in-plane bend
 * flexibility include alpha*R/(A*G) multiplied by the curved-arc direction
 * integrals B3, theta-B3 and B2(1-B2/2).
 *
 * A Timoshenko member uses effective shear area kappa*A. Along a circular
 * arc, its differential shear flexibility is ds/(kappa*A*G). Therefore
 * matching the MEC-21 coefficient requires 1/kappa = alpha, or
 *
 *   kappa = 1/alpha.
 *
 * This proves the annular transverse-shear term only. B31J ovalization/
 * flexibility, pressure stiffening, axial-shape and Bourdon terms remain
 * separately governed.
 */

const authority = Object.freeze({
  publisher: 'Intergraph',
  product: 'CAESAR II',
  event: 'CAUx 2015',
  title: 'F=KX — How CAESAR II formulates the global stiffness matrix',
  bendBasis: 'MEC-21 (1964, revised 1977)',
});

function alphaAnnulus(ro, ri) {
  assert.ok(Number.isFinite(ro) && Number.isFinite(ri) && ro > ri && ri > 0);
  return (4 / 3) * ((ro ** 3) - (ri ** 3)) / (((ro ** 2) + (ri ** 2)) * (ro - ri));
}

function mec21ShearFlexibility({ ro, ri, radius, theta, shearModulus }) {
  const area = Math.PI * (ro ** 2 - ri ** 2);
  const alpha = alphaAnnulus(ro, ri);
  const b2 = 1 - Math.cos(theta);
  const b3 = (2 * theta - Math.sin(2 * theta)) / 4;
  const cross = b2 * (1 - b2 / 2);
  const scale = alpha * radius / (area * shearModulus);
  return {
    alpha,
    kappa: 1 / alpha,
    matrix: [
      [scale * b3, scale * cross],
      [scale * cross, scale * (theta - b3)],
    ],
  };
}

function integratedTimoshenkoShear({ ro, ri, radius, theta, shearModulus }) {
  const area = Math.PI * (ro ** 2 - ri ** 2);
  const alpha = alphaAnnulus(ro, ri);
  const kappa = 1 / alpha;
  // Exact integrals of n*n^T over the circular arc using the MEC local
  // orientation n(phi)=[sin(phi), cos(phi)].
  const i11 = (2 * theta - Math.sin(2 * theta)) / 4;
  const i22 = theta - i11;
  const i12 = Math.sin(theta) ** 2 / 2;
  const scale = radius / (kappa * area * shearModulus);
  return {
    alpha,
    kappa,
    matrix: [
      [scale * i11, scale * i12],
      [scale * i12, scale * i22],
    ],
  };
}

function assertMatrixClose(actual, expected, label) {
  for (let i = 0; i < 2; i += 1) {
    for (let j = 0; j < 2; j += 1) {
      const scale = Math.max(1e-30, Math.abs(actual[i][j]), Math.abs(expected[i][j]));
      assert.ok(
        Math.abs(actual[i][j] - expected[i][j]) <= 5e-14 * scale,
        `${label}[${i},${j}] mismatch: ${actual[i][j]} vs ${expected[i][j]}`,
      );
    }
  }
}

const fixtures = [
  { ro: 0.136525, ri: 0.118262, radius: 0.381, theta: Math.PI / 2, shearModulus: 76.9e9 },
  { ro: 0.08415, ri: 0.073177, radius: 0.2286, theta: Math.PI / 2, shearModulus: 75e9 },
  { ro: 0.05715, ri: 0.0511302, radius: 0.1524, theta: Math.PI / 4, shearModulus: 76.923076923e9 },
  { ro: 0.04445, ri: 0.03683, radius: 0.1143, theta: 2.2, shearModulus: 79.6e9 },
];

const evidence = [];
for (const fixture of fixtures) {
  const mec = mec21ShearFlexibility(fixture);
  const tim = integratedTimoshenkoShear(fixture);
  assert.equal(mec.kappa, tim.kappa);
  assertMatrixClose(tim.matrix, mec.matrix, 'MEC21/Timoshenko shear flexibility');
  evidence.push({
    ...fixture,
    alpha: mec.alpha,
    kappa: mec.kappa,
    mec21Matrix: mec.matrix,
    timoshenkoArcMatrix: tim.matrix,
  });
}

// Thin-wall circular tube limit: alpha -> 2, hence kappa -> 0.5.
const thin = alphaAnnulus(1, 0.999999);
assert.ok(Math.abs(thin - 2) < 2e-6, `thin-wall alpha limit should approach 2, got ${thin}`);
assert.ok(Math.abs(1 / thin - 0.5) < 5e-7, `thin-wall kappa limit should approach 0.5, got ${1 / thin}`);

console.log(JSON.stringify({
  schema: 'm047-mec21-bend-shear-authority-check/v1',
  status: 'PASS',
  authority,
  sourceTerms: {
    alpha: '(4/3)*(Ro^3-Ri^3)/((Ro^2+Ri^2)*(Ro-Ri))',
    mec21ShearCoefficient: 'alpha*R/(A*G)',
    mapping: 'R/(kappa*A*G) = alpha*R/(A*G) => kappa=1/alpha',
  },
  scope: {
    included: ['BEND_ARC transverse shear'],
    excluded: ['straight-pipe shear', 'B31J ovalization factor', 'pressure stiffening', 'bend axial shape', 'Bourdon free field'],
  },
  fixtures: evidence,
}, null, 2));
