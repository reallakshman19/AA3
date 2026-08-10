#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  cowperHollowCircleShearCorrection,
} from '../src/core/fea-benchmarks/caesar-accdb-straight-pipe-profile.js';

const nu = 0.2919999957084656;
const cases = [
  {
    label: 'BM4L-OD273-T18.2626',
    outerDiameter: 0.273,
    wallThickness: 0.01826259994506836,
    expected: 0.5343101180123878,
  },
  {
    label: 'BM4L-OD168.3-T10.9728',
    outerDiameter: 0.1683,
    wallThickness: 0.01097279977798462,
    expected: 0.5340765972455022,
  },
];

for (const entry of cases) {
  const actual = cowperHollowCircleShearCorrection({
    outerDiameter: entry.outerDiameter,
    innerDiameter: entry.outerDiameter - 2 * entry.wallThickness,
    poissonRatio: nu,
  });
  assert.ok(
    Math.abs(actual - entry.expected) <= 1e-14,
    `${entry.label}: ${actual} != ${entry.expected}`,
  );
}

assert.throws(
  () => cowperHollowCircleShearCorrection({ outerDiameter: 1, innerDiameter: 1, poissonRatio: 0.3 }),
  /innerDiameter must be smaller/u,
);
assert.throws(
  () => cowperHollowCircleShearCorrection({ outerDiameter: 1, innerDiameter: 0.8, poissonRatio: 0.5 }),
  /isotropic elastic range/u,
);

console.log(JSON.stringify({
  check: 'lfea-m047-cowper-straight-pipe-profile',
  status: 'PASS',
  poissonRatio: nu,
  cases: cases.map((entry) => ({
    label: entry.label,
    kappa: cowperHollowCircleShearCorrection({
      outerDiameter: entry.outerDiameter,
      innerDiameter: entry.outerDiameter - 2 * entry.wallThickness,
      poissonRatio: nu,
    }),
  })),
}, null, 2));
