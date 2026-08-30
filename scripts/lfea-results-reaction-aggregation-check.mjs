import assert from 'node:assert/strict';
import {
  nodeResultRows,
  summarizeCaseResults,
} from '../src/workspace/lfea-pipeline-results-view-model.js';

const deliberateBreak = process.argv.includes('--deliberate-break');
const reactionRows = [
  { nodeId: 'MODEL.N40', dof: 'UX', value: 120 },
  { nodeId: 'MODEL.N40', dof: 'UX', value: -35 },
  { nodeId: 'MODEL.N40', dof: 'UY', value: -60 },
  { nodeId: 'MODEL.N10', dof: 'UX', value: -85 },
  { nodeId: 'MODEL.N10', dof: 'UY', value: 60 },
];
if (deliberateBreak) reactionRows[1] = { ...reactionRows[1], value: -25 };

const visibleReactions = nodeResultRows(reactionRows, () => 1);
const node40 = visibleReactions.find((row) => row.nodeId === '40');
assert.ok(node40, 'node 40 must be present');
assert.equal(node40.values.UX, 85,
  'same-node/same-DOF support contributions must sum in the visible reaction row');
assert.equal(node40.values.UY, -60);
assert.equal(node40.translationResultant, Math.hypot(85, -60));

const displacementRows = nodeResultRows([
  { nodeId: 'MODEL.N40', dof: 'UX', value: 0.001 },
  { nodeId: 'MODEL.N40', dof: 'UY', value: -0.002 },
], () => 1000);
assert.equal(displacementRows[0].values.UX, 1,
  'ordinary unique displacement projection must remain unchanged');
assert.equal(displacementRows[0].values.UY, -2);

const summary = summarizeCaseResults(displacementRows, visibleReactions);
assert.equal(summary.restrainedNodeCount, 2);
assert.equal(summary.maxForce.nodeId, '10',
  'summary maxima must be computed from aggregated visible support rows');
assert.equal(summary.maxForce.magnitude, Math.hypot(85, 60));

console.log(JSON.stringify({
  check: 'lfea-results-reaction-aggregation',
  status: 'PASS',
  node40UxContributionCount: 2,
  node40UxVisibleTotal: node40.values.UX,
  node40ForceResultant: node40.translationResultant,
  summaryMaxForceNode: summary.maxForce.nodeId,
  authority: 'Presentation projection only; solver reaction evidence is not rewritten.',
}, null, 2));
