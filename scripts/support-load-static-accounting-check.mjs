#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  allocateSupportPointLoad,
  allocateSupportUniformLoad,
  evaluateSupportLoadAccounting,
} from '../src/workspace/engineering-loads/support-load-static-accounting.js';

const supports = [
  { siteId: 'S-A', chainageMm: 0 },
  { siteId: 'S-B', chainageMm: 10000 },
];

const bracketed = allocateSupportPointLoad({
  chainageMm: 4000,
  forceN: 12000,
  supports,
});
assert.equal(bracketed.disposition, 'REACTION_RESOLVED_BRACKETED');
assert.equal(bracketed.allocations.length, 2);
assert.equal(bracketed.allocations[0].verticalForceN, 7200);
assert.equal(bracketed.allocations[1].verticalForceN, 4800);
assert.equal(bracketed.boundaryTransfers.length, 0);
assert.equal(bracketed.unallocated.length, 0);

const overhang = allocateSupportPointLoad({
  chainageMm: 12000,
  forceN: 3000,
  supports,
});
assert.equal(overhang.disposition, 'OVERHANG_CANTILEVER_TRANSFER');
assert.deepEqual(overhang.allocations, [{
  siteId: 'S-B',
  verticalForceN: 3000,
  chainageMm: 10000,
}]);
assert.equal(overhang.boundaryTransfers[0].eccentricityMm, 2000);
assert.equal(overhang.boundaryTransfers[0].momentDemandNmm, 6000000);
assert.equal(overhang.unallocated.length, 0);

const unsupportedBranch = allocateSupportPointLoad({
  chainageMm: 5000,
  forceN: 3000,
  supports: [],
});
assert.equal(unsupportedBranch.disposition, 'UNALLOCATED_NO_QUALIFIED_SUPPORT');
assert.equal(unsupportedBranch.allocations.length, 0);
assert.equal(unsupportedBranch.unallocated[0].verticalForceN, 3000);
assert.equal(unsupportedBranch.unallocated[0].firstMomentNmm, 15000000);

const reactionForceN = sum([
  ...bracketed.allocations,
  ...overhang.allocations,
].map((row) => row.verticalForceN));
const reactionMomentNmm = sum([
  ...bracketed.allocations,
  ...overhang.allocations,
].map((row) => row.verticalForceN * row.chainageMm));
const boundaryTransferMomentNmm = sum(overhang.boundaryTransfers.map((row) => row.momentDemandNmm));
const unallocatedForceN = sum(unsupportedBranch.unallocated.map((row) => row.verticalForceN));
const unallocatedMomentNmm = sum(unsupportedBranch.unallocated.map((row) => row.firstMomentNmm));
const closure = evaluateSupportLoadAccounting({
  evaluatedForceN: 18000,
  evaluatedMomentNmm: 12000 * 4000 + 3000 * 12000 + 3000 * 5000,
  reactionForceN,
  reactionMomentNmm,
  boundaryTransferMomentNmm,
  unallocatedForceN,
  unallocatedMomentNmm,
  forceToleranceN: 1e-9,
  momentToleranceNmm: 1e-6,
});
assert.equal(closure.status, 'PASSED');
assert.equal(reactionForceN, 15000);
assert.equal(unallocatedForceN, 3000);
assert.equal(closure.forceResidualN, 0);
assert.equal(closure.momentResidualNmm, 0);

const oneSupport = allocateSupportUniformLoad({
  startMm: 1000,
  endMm: 3000,
  forceN: 4000,
  supports: [{ siteId: 'S-0', chainageMm: 0 }],
});
assert.equal(oneSupport.disposition, 'OVERHANG_CANTILEVER_TRANSFER');
assert.equal(oneSupport.allocations[0].verticalForceN, 4000);
assert.equal(sum(oneSupport.boundaryTransfers.map((row) => row.momentDemandNmm)), 8000000);

const negativeSide = allocateSupportPointLoad({
  chainageMm: -1000,
  forceN: 2000,
  supports,
});
assert.equal(negativeSide.boundaryTransfers[0].momentDemandNmm, -2000000,
  'signed transfer moment must retain side of support');

const deliberatelyLostLoad = evaluateSupportLoadAccounting({
  evaluatedForceN: 18000,
  evaluatedMomentNmm: 99000000,
  reactionForceN: 15000,
  reactionMomentNmm: 78000000,
  boundaryTransferMomentNmm: 6000000,
  unallocatedForceN: 0,
  unallocatedMomentNmm: 0,
  forceToleranceN: 1e-9,
  momentToleranceNmm: 1e-6,
});
assert.equal(deliberatelyLostLoad.status, 'FAILED', 'a dropped 3 kN branch must fail custody');
assert.equal(deliberatelyLostLoad.forceResidualN, -3000);
assert.equal(deliberatelyLostLoad.momentResidualNmm, -15000000);

console.log(JSON.stringify({
  status: 'PASS',
  benchmark: 'ISSUE1321_18KN_FORCE_FIRST_MOMENT_CUSTODY',
  sourceForceN: 18000,
  reactionResolvedForceN: reactionForceN,
  unallocatedForceN,
  overhangBoundaryTransferMomentNmm: boundaryTransferMomentNmm,
  forceResidualN: closure.forceResidualN,
  momentResidualNmm: closure.momentResidualNmm,
}, null, 2));

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}
