#!/usr/bin/env node
import assert from 'node:assert/strict';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import {
  distributedLoadLocalVector,
  frameLocalStiffness,
  thermalInitialStrainVector,
} from '../src/core/linear-fea-frame-element/index.js';
import {
  REDUCER_CONDENSATION_REQUEST_SCHEMA,
  REDUCER_SAMPLING_RULE,
  REDUCER_SEGMENT_COUNT,
  compileTenCylinderReducerAuthority,
  sealReducerCondensationRequest,
} from '../src/core/linear-fea-reducer-condensation/index.js';

const request = sealReducerCondensationRequest({
  schema: REDUCER_CONDENSATION_REQUEST_SCHEMA,
  reducerId: 'ISSUE947-LEGACY-REDUCER-BACKCOMPAT',
  length: 1.5,
  fromSection: { outerDiameter: 0.32385, wallThickness: 0.0127 },
  toSection: { outerDiameter: 0.2191, wallThickness: 0.00818 },
  segmentCount: REDUCER_SEGMENT_COUNT,
  samplingRule: REDUCER_SAMPLING_RULE,
  material: {
    elasticModulus: 200e9,
    shearModulus: 77e9,
    massDensity: 7850,
    thermalExpansionCoefficient: 12e-6,
  },
  frame: {
    shearDeformation: false,
    shearCorrectionFactorY: 1,
    shearCorrectionFactorZ: 1,
    source: 'ISSUE947-LEGACY-EULER-BERNOULLI-COMPATIBILITY',
  },
  pressure: {
    enabled: false,
    pressure: 0,
    poissonRatio: 0.3,
    ruleId: 'CLOSED_END_PIPE_AXIAL_STRAIN_V1',
    source: 'ISSUE947-LEGACY-PRESSURE-DISABLED-COMPATIBILITY',
  },
  gravity: {
    enabled: true,
    acceleration: 9.80665,
    directionLocal: [0, -1, 0],
    fluidDensity: 850,
    insulationThickness: 0.05,
    insulationDensity: 120,
  },
  thermal: { installationTemperature: 20, operatingTemperature: 220 },
  sourceEvidence: {
    sourceId: 'ISSUE947-LEGACY-REDUCER-BACKCOMPAT',
    sourceRevision: '01',
    sourceSemanticHash: semanticHash({ check: 'issue947-legacy-reducer-backcompat', revision: 1 }),
  },
  semanticHash: '',
});

const candidate = compileTenCylinderReducerAuthority(request);
const legacy = compileLegacyReducerShadow(request);

compare(candidate.condensed.localStiffness, legacy.localStiffness, 'legacy local stiffness', 3e-8, 1e-3);
compare(candidate.condensed.gravityLocalVector, legacy.gravityLocalVector, 'legacy gravity vector', 3e-8, 1e-6);
compare(candidate.condensed.thermalInitialStrainLocalVector, legacy.thermalInitialStrainLocalVector, 'legacy thermal vector', 3e-8, 1e-5);
assert.deepEqual(candidate.condensed.pressureInitialStrainLocalVector, new Array(12).fill(0));
assert.equal(candidate.frame.shearDeformation, false);
assert.equal(candidate.frame.rule, 'TEN_CYLINDER_EULER_BERNOULLI_FRAME');
assert.equal(candidate.pressure.enabled, false);
assert.equal(candidate.pressure.freeGrowth, 0);
assert.equal(candidate.pressure.meanAxialStrain, 0);

console.log(JSON.stringify({
  check: 'lfea-issue947-reducer-backcompat',
  status: 'PASS',
  purpose: 'prove the extended reducer authority exactly reproduces the pre-change ten-cylinder EB/gravity/thermal behavior when frame shear and pressure are disabled',
  benchmarkReferenceValuesUsed: false,
  candidateParityStatus: candidate.parityStatus,
  segmentCount: candidate.geometry.segmentCount,
  pressureVectorZero: true,
  frameRule: candidate.frame.rule,
}, null, 2));
console.log('Issue 947 reducer backward-compatibility guard PASS');

function compileLegacyReducerShadow(input) {
  const n = REDUCER_SEGMENT_COUNT;
  const segmentLength = input.length / n;
  const size = (n + 1) * 6;
  const K = matrix(size);
  const gravityFull = new Array(size).fill(0);
  const thermalFull = new Array(size).fill(0);
  const directionNorm = Math.hypot(...input.gravity.directionLocal);
  const direction = input.gravity.directionLocal.map((value) => value / directionNorm);
  const deltaT = input.thermal.operatingTemperature - input.thermal.installationTemperature;
  const thermalStrain = input.material.thermalExpansionCoefficient * deltaT;

  for (let index = 0; index < n; index += 1) {
    const fraction = (index + 0.5) / n;
    const section = annulus(
      lerp(input.fromSection.outerDiameter, input.toSection.outerDiameter, fraction),
      lerp(input.fromSection.wallThickness, input.toSection.wallThickness, fraction),
    );
    const stiffness = frameLocalStiffness({
      elasticModulus: input.material.elasticModulus,
      shearModulus: input.material.shearModulus,
      area: section.area,
      secondMomentY: section.secondMoment,
      secondMomentZ: section.secondMoment,
      polarMoment: 2 * section.secondMoment,
      length: segmentLength,
      shearDeformation: false,
    }).matrix;
    addElementMatrix(K, stiffness, index, index + 1);

    addElementVector(thermalFull, thermalInitialStrainVector({
      elasticModulus: input.material.elasticModulus,
      area: section.area,
      axialStrain: thermalStrain,
    }), index, index + 1);

    const metal = input.material.massDensity * section.area * input.gravity.acceleration;
    const fluidArea = Math.PI * section.innerDiameter ** 2 / 4;
    const fluid = input.gravity.fluidDensity * fluidArea * input.gravity.acceleration;
    const insulatedOd = section.outerDiameter + 2 * input.gravity.insulationThickness;
    const insulationArea = Math.PI * (insulatedOd ** 2 - section.outerDiameter ** 2) / 4;
    const insulation = input.gravity.insulationDensity * insulationArea * input.gravity.acceleration;
    const lineWeight = input.gravity.enabled ? metal + fluid + insulation : 0;
    const intensity = {
      fx: direction[0] * lineWeight,
      fy: direction[1] * lineWeight,
      fz: direction[2] * lineWeight,
    };
    addElementVector(gravityFull, distributedLoadLocalVector({
      primitive: {
        kind: 'DISTRIBUTED_LOAD',
        basis: 'ELEMENT_LOCAL',
        startIntensity: intensity,
        endIntensity: intensity,
      },
      axes: null,
      length: segmentLength,
      phiXY: 0,
      phiXZ: 0,
    }), index, index + 1);
  }

  const condensed = condense(K, { gravity: gravityFull, thermal: thermalFull });
  return {
    localStiffness: condensed.stiffness,
    gravityLocalVector: condensed.loads.gravity,
    thermalInitialStrainLocalVector: condensed.loads.thermal,
  };
}

function annulus(outerDiameter, wallThickness) {
  const innerDiameter = outerDiameter - 2 * wallThickness;
  const area = Math.PI * (outerDiameter ** 2 - innerDiameter ** 2) / 4;
  const secondMoment = Math.PI * (outerDiameter ** 4 - innerDiameter ** 4) / 64;
  return { outerDiameter, wallThickness, innerDiameter, area, secondMoment };
}
function lerp(a, b, f) { return a + f * (b - a); }
function matrix(size) { return Array.from({ length: size }, () => new Array(size).fill(0)); }
function addElementMatrix(global, local, nodeI, nodeJ) {
  const map = [...Array.from({ length: 6 }, (_, i) => nodeI * 6 + i), ...Array.from({ length: 6 }, (_, i) => nodeJ * 6 + i)];
  for (let i = 0; i < 12; i += 1) for (let j = 0; j < 12; j += 1) global[map[i]][map[j]] += local[i * 12 + j];
}
function addElementVector(global, local, nodeI, nodeJ) {
  const map = [...Array.from({ length: 6 }, (_, i) => nodeI * 6 + i), ...Array.from({ length: 6 }, (_, i) => nodeJ * 6 + i)];
  for (let i = 0; i < 12; i += 1) global[map[i]] += local[i];
}
function condense(K, loads) {
  const boundary = [...Array.from({ length: 6 }, (_, i) => i), ...Array.from({ length: 6 }, (_, i) => 60 + i)];
  const internal = Array.from({ length: 54 }, (_, i) => 6 + i);
  const Kbb = submatrix(K, boundary, boundary);
  const Kbi = submatrix(K, boundary, internal);
  const Kib = submatrix(K, internal, boundary);
  const Kii = submatrix(K, internal, internal);
  const X = solveColumns(Kii, Kib);
  const condensedK = subtractMatrix(Kbb, multiply(Kbi, X));
  const condensedLoads = {};
  for (const [name, full] of Object.entries(loads)) {
    const fb = subvector(full, boundary);
    const fi = subvector(full, internal);
    const yi = solveDense(Kii, fi);
    const correction = multiplyVector(Kbi, yi);
    condensedLoads[name] = fb.map((value, index) => value - correction[index]);
  }
  return { stiffness: flattenSymmetric(condensedK), loads: condensedLoads };
}
function submatrix(A, rows, cols) { return rows.map((i) => cols.map((j) => A[i][j])); }
function subvector(v, rows) { return rows.map((i) => v[i]); }
function solveDense(A, rhs) {
  const n = A.length;
  const M = A.map((row, i) => [...row, rhs[i]]);
  for (let p = 0; p < n; p += 1) {
    let best = p;
    for (let r = p + 1; r < n; r += 1) if (Math.abs(M[r][p]) > Math.abs(M[best][p])) best = r;
    if (!(Math.abs(M[best][p]) > 1e-18)) throw new Error('legacy shadow reducer matrix singular');
    [M[p], M[best]] = [M[best], M[p]];
    const d = M[p][p];
    for (let c = p; c <= n; c += 1) M[p][c] /= d;
    for (let r = 0; r < n; r += 1) {
      if (r === p) continue;
      const f = M[r][p];
      if (f === 0) continue;
      for (let c = p; c <= n; c += 1) M[r][c] -= f * M[p][c];
    }
  }
  return M.map((row) => row[n]);
}
function solveColumns(A, B) {
  const out = Array.from({ length: A.length }, () => new Array(B[0].length).fill(0));
  for (let c = 0; c < B[0].length; c += 1) {
    const x = solveDense(A, B.map((row) => row[c]));
    for (let r = 0; r < A.length; r += 1) out[r][c] = x[r];
  }
  return out;
}
function multiply(A, B) { return A.map((row) => B[0].map((_x, j) => row.reduce((sum, value, k) => sum + value * B[k][j], 0))); }
function multiplyVector(A, x) { return A.map((row) => row.reduce((sum, value, i) => sum + value * x[i], 0)); }
function subtractMatrix(A, B) { return A.map((row, i) => row.map((value, j) => value - B[i][j])); }
function flattenSymmetric(A) {
  const out = [];
  for (let i = 0; i < A.length; i += 1) for (let j = 0; j < A.length; j += 1) out.push((A[i][j] + A[j][i]) / 2);
  return out;
}
function compare(actual, expected, label, relativeTolerance, absoluteTolerance) {
  assert.equal(actual.length, expected.length, `${label} length`);
  for (let i = 0; i < actual.length; i += 1) {
    const tolerance = Math.max(absoluteTolerance, relativeTolerance * Math.max(1, Math.abs(expected[i])));
    assert.ok(Math.abs(actual[i] - expected[i]) <= tolerance, `${label}[${i}]: ${actual[i]} != ${expected[i]} within ${tolerance}`);
  }
}
