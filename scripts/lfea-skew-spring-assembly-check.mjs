import assert from 'node:assert/strict';
import { buildSpringTriplets } from '../src/core/linear-fea-solver/spring-assembly.js';

const TOL = 1e-12;
const K = 2000;
const N = Object.freeze([0.6, 0.8, 0]);
const deliberateBreak = process.argv.includes('--deliberate-break');
const nodeId = 'SKEW.N30';
const dofMap = Object.freeze({
  nodeOrder: Object.freeze([nodeId]),
  dofCount: 6,
});

const constraint = Object.freeze(deliberateBreak
  ? {
      constraintId: 'SKEW-C-PIPINGELEMENT-0-RESTRAINT-0-DIR',
      nodeId,
      dof: 'UX',
      behavior: 'LINEAR_SPRING',
      basis: 'GLOBAL',
      stiffness: K,
    }
  : {
      constraintId: 'SKEW-C-PIPINGELEMENT-0-RESTRAINT-0-DIR',
      nodeId,
      dof: null,
      behavior: 'LINEAR_SPRING',
      basis: 'GLOBAL',
      stiffness: K,
      direction: N,
    });
const model = Object.freeze({ constraints: Object.freeze([constraint]) });
const { triplets, springs } = buildSpringTriplets(model, dofMap);
assert.equal(springs.length, 1, 'one finite skew spring must be selected for assembly');

const n = dofMap.dofCount;
const matrix = new Array(n * n).fill(0);
for (const triplet of triplets) matrix[triplet.row * n + triplet.col] += triplet.value;
const at = (row, column) => matrix[row * n + column];
const close = (actual, expected, label) => {
  assert.ok(Math.abs(actual - expected) <= TOL * Math.max(1, Math.abs(expected)),
    `${label}: expected ${expected}, got ${actual}`);
};

const B = [
  [720, 960, 0],
  [960, 1280, 0],
  [0, 0, 0],
];
for (let row = 0; row < 3; row += 1) {
  for (let column = 0; column < 3; column += 1) {
    close(at(row, column), B[row][column], `B[${row},${column}]`);
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
    for (let column = 0; column < n; column += 1) result[row] += at(row, column) * vector[column];
  }
  return result;
};
const energy = (vector) => {
  const force = multiply(vector);
  return 0.5 * vector.reduce((sum, value, index) => sum + value * force[index], 0);
};

const u = [0.01, -0.02, 0, 0, 0, 0];
const q = N.reduce((sum, value, index) => sum + value * u[index], 0);
close(q, -0.01, 'directional displacement');
const expectedForce = N.map((value) => K * q * value);
const force = multiply(u);
for (let index = 0; index < 3; index += 1) close(force[index], expectedForce[index], `force[${index}]`);
close(energy(u), 0.1, 'spring strain energy');

const orthogonal = [0.008, -0.006, 0, 0, 0, 0];
close(N[0] * orthogonal[0] + N[1] * orthogonal[1], 0, 'orthogonal projection');
const orthogonalForce = multiply(orthogonal);
orthogonalForce.forEach((value, index) => close(value, 0, `orthogonal null force[${index}]`));
close(energy(orthogonal), 0, 'orthogonal null energy');

const along = [0.006, 0.008, 0, 0, 0, 0];
close(N[0] * along[0] + N[1] * along[1], 0.01, 'along-direction projection');
const alongForce = multiply(along);
close(alongForce[0], 12, 'along-direction Fx');
close(alongForce[1], 16, 'along-direction Fy');
close(energy(along), 0.1, 'along-direction energy');

console.log(JSON.stringify({
  check: 'lfea-skew-spring-assembly',
  status: 'PASS',
  scope: 'FINITE_SKEW_SPRING_TRIPLET_ASSEMBLY',
  deliberateBreak,
  stiffness: K,
  direction: N,
  directionalBlock: B,
  tripletCount: triplets.length,
  directionalDisplacement: q,
  force: expectedForce,
  strainEnergy: energy(u),
  orthogonalNullResponse: true,
}, null, 2));
