import assert from 'node:assert/strict';
import { buildSpringTriplets } from '../src/core/linear-fea-solver/spring-assembly.js';

const TOL = 1e-12;
const K = 2000;
const N = Object.freeze([0.6, 0.8, 0]);
const deliberateBreak = process.argv.includes('--deliberate-break');
const primaryNodeId = 'CNODE.N30';
const connectedNodeId = 'CNODE.N40';
const dofMap = Object.freeze({
  nodeOrder: Object.freeze([primaryNodeId, connectedNodeId]),
  dofCount: 12,
});

const constraint = Object.freeze({
  constraintId: 'CNODE-C-PIPINGELEMENT-0-RESTRAINT-0-CNODE',
  nodeId: primaryNodeId,
  ...(deliberateBreak ? {} : { connectedNodeId }),
  dof: null,
  behavior: 'LINEAR_SPRING',
  basis: 'GLOBAL',
  stiffness: K,
  direction: N,
});
const model = Object.freeze({ constraints: Object.freeze([constraint]) });
const { triplets, springs } = buildSpringTriplets(model, dofMap);
assert.equal(springs.length, 1, 'one CNODE spring must be selected for assembly');

const n = dofMap.dofCount;
const matrix = new Array(n * n).fill(0);
for (const triplet of triplets) matrix[triplet.row * n + triplet.col] += triplet.value;
const at = (row, column) => matrix[row * n + column];
const close = (actual, expected, label) => {
  assert.ok(Math.abs(actual - expected) <= TOL * Math.max(1, Math.abs(expected)),
    `${label}: expected ${expected}, got ${actual}`);
};

const primary = [0, 1, 2];
const connected = [6, 7, 8];
const B = [
  [720, 960, 0],
  [960, 1280, 0],
  [0, 0, 0],
];
for (let row = 0; row < 3; row += 1) {
  for (let column = 0; column < 3; column += 1) {
    close(at(primary[row], primary[column]), B[row][column], `Kii[${row},${column}]`);
    close(at(primary[row], connected[column]), -B[row][column], `Kij[${row},${column}]`);
    close(at(connected[row], primary[column]), -B[row][column], `Kji[${row},${column}]`);
    close(at(connected[row], connected[column]), B[row][column], `Kjj[${row},${column}]`);
  }
}

for (let row = 0; row < n; row += 1) {
  for (let column = 0; column < n; column += 1) {
    close(at(row, column), at(column, row), `symmetry[${row},${column}]`);
  }
}

const multiply = (vector) => {
  const result = new Array(n).fill(0);
  for (let row = 0; row < n; row += 1) {
    for (let column = 0; column < n; column += 1) {
      result[row] += at(row, column) * vector[column];
    }
  }
  return result;
};
const energy = (vector) => {
  const force = multiply(vector);
  return 0.5 * vector.reduce((sum, value, index) => sum + value * force[index], 0);
};

const ui = [0.01, -0.02, 0];
const uj = [-0.005, 0.005, 0];
const U = new Array(n).fill(0);
ui.forEach((value, index) => { U[primary[index]] = value; });
uj.forEach((value, index) => { U[connected[index]] = value; });
const F = multiply(U);
const q = N.reduce((sum, value, index) => sum + value * (ui[index] - uj[index]), 0);
close(q, -0.011, 'relative directional displacement');
const fi = N.map((value) => K * q * value);
const fj = fi.map((value) => -value);
for (let index = 0; index < 3; index += 1) {
  close(F[primary[index]], fi[index], `Fi[${index}]`);
  close(F[connected[index]], fj[index], `Fj[${index}]`);
  close(F[primary[index]] + F[connected[index]], 0, `equal/opposite[${index}]`);
}
close(energy(U), 0.121, 'spring strain energy');

const translation = [4.2, -7.1, 2.5];
const shifted = [...U];
translation.forEach((value, index) => {
  shifted[primary[index]] += value;
  shifted[connected[index]] += value;
});
const shiftedForce = multiply(shifted);
for (let index = 0; index < n; index += 1) {
  close(shiftedForce[index], F[index], `rigid-translation force invariance[${index}]`);
}
close(energy(shifted), energy(U), 'rigid-translation energy invariance');

const rigidTranslationOnly = new Array(n).fill(0);
translation.forEach((value, index) => {
  rigidTranslationOnly[primary[index]] = value;
  rigidTranslationOnly[connected[index]] = value;
});
const rigidForce = multiply(rigidTranslationOnly);
rigidForce.forEach((value, index) => close(value, 0, `rigid-translation null force[${index}]`));
close(energy(rigidTranslationOnly), 0, 'rigid-translation null energy');

console.log(JSON.stringify({
  check: 'lfea-cnode-spring-assembly',
  status: 'PASS',
  scope: 'FINITE_CNODE_SPRING_TRIPLET_ASSEMBLY',
  deliberateBreak,
  stiffness: K,
  direction: N,
  directionalBlock: B,
  tripletCount: triplets.length,
  relativeDirectionalDisplacement: q,
  endpointForceI: fi,
  endpointForceJ: fj,
  strainEnergy: energy(U),
  commonTranslationInvariant: true,
}, null, 2));
