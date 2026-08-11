import assert from 'node:assert/strict';

/**
 * M047 / BM4_L — CAESAR rigid-element transverse-shear authority check.
 *
 * Primary rigid authority:
 *   Hexagon CAESAR II Users Guide, "Rigid Element Application": rigid stiffness
 *   is based on the pipe inside diameter with wall thickness set to ten times
 *   the entered wall thickness; long rigid elements may bend.
 *
 * Primary pipe-matrix authority:
 *   Intergraph, CAESAR II CAUx 2015, "F=KX — How CAESAR II formulates the
 *   global stiffness matrix": straight pipe uses shear := 2 and
 *   phi = 12 E I / [G (A / shear) L^2].
 *
 * A CAESAR rigid is therefore the same straight-pipe stiffness formulation
 * evaluated on the artificial rigid section (ID preserved, t_rigid=10*t).
 * Mapping that pipe matrix into the qualified LFEA Timoshenko frame requires
 * kappa = 1/shear = 0.5. This is an authority composition, not benchmark fit.
 */

const RIGID_WALL_MULTIPLIER = 10;
const CAESAR_SHEAR_DIVISOR = 2;
const KAPPA = 1 / CAESAR_SHEAR_DIVISOR;

assert.equal(KAPPA, 0.5);

function annulusFromEnteredPipe(enteredOuterDiameter, enteredWallThickness) {
  const insideDiameter = enteredOuterDiameter - 2 * enteredWallThickness;
  const rigidWallThickness = RIGID_WALL_MULTIPLIER * enteredWallThickness;
  const rigidOuterDiameter = insideDiameter + 2 * rigidWallThickness;
  const area = Math.PI * (rigidOuterDiameter ** 2 - insideDiameter ** 2) / 4;
  const inertia = Math.PI * (rigidOuterDiameter ** 4 - insideDiameter ** 4) / 64;
  return { insideDiameter, rigidWallThickness, rigidOuterDiameter, area, inertia };
}

function caesarPhi({ E, G, area, inertia, length }) {
  return (12 * E * inertia) / (G * (area / CAESAR_SHEAR_DIVISOR) * length ** 2);
}
function lfeaPhi({ E, G, area, inertia, length }) {
  return (12 * E * inertia) / (G * (KAPPA * area) * length ** 2);
}

const fixtures = [
  // BM4_L rigid carrier dimensions, plus independent geometry fixtures.
  { od: 0.1683000030517578, t: 0.010972800254821777, L: 0.14922499084472656, E: 203.395008e9, G: 78.713e9 },
  { od: 0.1683000030517578, t: 0.010972800254821777, L: 0.30097503662109375, E: 203.395008e9, G: 78.713e9 },
  { od: 0.27305, t: 0.018263, L: 1.2, E: 200e9, G: 76.92307692307692e9 },
];

const evidence = fixtures.map((fixture) => {
  const section = annulusFromEnteredPipe(fixture.od, fixture.t);
  assert.ok(section.insideDiameter > 0);
  assert.equal(section.rigidWallThickness, 10 * fixture.t);
  assert.ok(Math.abs((section.rigidOuterDiameter - 2 * section.rigidWallThickness) - section.insideDiameter) <= 1e-15);
  const input = { E: fixture.E, G: fixture.G, area: section.area, inertia: section.inertia, length: fixture.L };
  const expected = caesarPhi(input);
  const actual = lfeaPhi(input);
  const scale = Math.max(1, Math.abs(expected), Math.abs(actual));
  assert.ok(Math.abs(actual - expected) <= 2e-15 * scale, `${actual} != ${expected}`);
  return { enteredOuterDiameter: fixture.od, enteredWallThickness: fixture.t, length: fixture.L, ...section, caesarPhi: expected, lfeaPhi: actual };
});

console.log(JSON.stringify({
  schema: 'm047-caesar-rigid-shear-authority-check/v1',
  status: 'PASS',
  rigidAuthority: {
    publisher: 'Hexagon', product: 'CAESAR II', title: 'Rigid Element Application',
    rule: 'PRESERVE_PIPE_INSIDE_DIAMETER_AND_SET_RIGID_WALL_TO_10X_ENTERED_WALL',
  },
  pipeMatrixAuthority: {
    publisher: 'Intergraph', product: 'CAESAR II', event: 'CAUx 2015',
    title: 'F=KX — How CAESAR II formulates the global stiffness matrix',
    sourceEquation: 'phi = 12 E I / (G (A / shear) L^2)', sourceShearDivisor: CAESAR_SHEAR_DIVISOR,
  },
  mapping: { shearCorrectionFactor: KAPPA, benchmarkFitted: false },
  scope: { includedAnalysisKinds: ['RIGID'], excludedAnalysisKinds: ['REDUCER', 'BEND_ARC'] },
  fixtures: evidence,
}, null, 2));
