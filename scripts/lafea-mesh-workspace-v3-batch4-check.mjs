#!/usr/bin/env node
import assert from 'node:assert/strict';
import { LAFEA_ANALYSIS_MESH_SCHEMA } from '../src/workspace/lafea-analysis-mesh-contract.js';
import { qualifyLafeaHighOrderJacobiansV3 } from '../src/workspace/lafea-high-order-jacobian-qualification-v3.js';

const regularT6 = mesh('T6', [
  [0, 0], [1, 0], [0, 1], [0.5, 0], [0.5, 0.5], [0, 0.5],
]);
const regularQ8 = mesh('Q8', [
  [-1, -1], [1, -1], [1, 1], [-1, 1], [0, -1], [1, 0], [0, 1], [-1, 0],
]);
assert.equal(qualifyLafeaHighOrderJacobiansV3(regularT6).qualification, 'PASS');
assert.equal(qualifyLafeaHighOrderJacobiansV3(regularQ8).qualification, 'PASS');

// Both adversarial mappings have positive Jacobian at the corner natural
// points used by the current sampled gate, but become inverted between them.
const badT6 = mesh('T6', [
  [0, 0], [1, 0], [0, 1],
  [0.9597100281552158, 0.11447407896647754],
  [1.048237816737893, -0.49052303804227027],
  [0.16666849328112132, 0.367940312321962],
]);
const badQ8 = mesh('Q8', [
  [-1, -1], [1, -1], [1, 1], [-1, 1],
  [-0.2624326038009026, -1.982530780164058],
  [1.3490952145833468, 1.4647513458239478],
  [1.2022718748571624, 0.3713497486481825],
  [-0.22335692536477225, -1.2397985798189817],
]);
const t6Evidence = qualifyLafeaHighOrderJacobiansV3(badT6);
const q8Evidence = qualifyLafeaHighOrderJacobiansV3(badQ8);
assert.equal(t6Evidence.qualification, 'BLOCK');
assert.equal(q8Evidence.qualification, 'BLOCK');
for (const evidence of [t6Evidence, q8Evidence]) {
  assert.ok([
    'NONPOSITIVE_COUNTEREXAMPLE',
    'NONPOSITIVE_INTERVAL_BOUND',
    'UNPROVEN_POSITIVITY',
  ].includes(evidence.elementResults[0].reason));
}

console.log(JSON.stringify({
  check: 'lafea-mesh-workspace-v3-batch4',
  status: 'PASS',
  regularT6Certified: true,
  regularQ8Certified: true,
  betweenSampleT6InversionBlocked: true,
  betweenSampleQ8InversionBlocked: true,
  ambiguousCertificationFailsClosed: true,
}));

function mesh(elementType, points) {
  return {
    schema: LAFEA_ANALYSIS_MESH_SCHEMA,
    meshIdentity: `V3-${elementType}`,
    nodes: points.map(([x, y], index) => ({ nodeId: `N${index + 1}`, x, y, z: 0 })),
    elements: [{
      elementId: 'E1',
      elementType,
      nodeIds: points.map((_, index) => `N${index + 1}`),
    }],
  };
}
