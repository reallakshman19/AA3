#!/usr/bin/env node

/**
 * Real-code check for the Output step's summary, sorting and filtering.
 *
 * Guards the property that matters most here: none of this may invent a
 * number. Everything reported is picked from the rows the solver produced,
 * in the units the table already displays.
 */
import assert from 'node:assert/strict';
import {
  extremeNodeIds,
  filterResultRows,
  nodeResultRows,
  sortResultRows,
  summarizeCaseResults,
} from '../src/workspace/lfea-pipeline-results-view-model.js';

const displacementScale = (dof) => (dof.startsWith('R') ? 180 / Math.PI : 1000);
const solved = [
  { nodeId: 'M.N10', dof: 'UX', value: 0.001 },
  { nodeId: 'M.N10', dof: 'UY', value: -0.002 },
  { nodeId: 'M.N20', dof: 'UY', value: 0.010 },
  { nodeId: 'M.N20', dof: 'RZ', value: 0.01 },
  { nodeId: 'M.N5', dof: 'UZ', value: 0.003 },
];
const rows = nodeResultRows(solved, displacementScale);

// Node ids are numeric-ordered, not string-ordered: 5 before 10 before 20.
assert.deepEqual(rows.map((row) => row.nodeId), ['5', '10', '20']);
// Display units: metres to millimetres, radians to degrees.
assert.ok(Math.abs(rows[1].values.UX - 1) < 1e-9, '0.001 m must read as 1 mm.');
assert.ok(Math.abs(rows[2].values.RZ - (0.01 * 180 / Math.PI)) < 1e-9, 'radians must read as degrees.');
// A missing DOF is zero, not absent.
assert.equal(rows[0].values.UX, 0);
// The resultant is the magnitude of the components already shown.
assert.ok(Math.abs(rows[1].translationResultant - Math.hypot(1, 2)) < 1e-9);

const summary = summarizeCaseResults(rows, []);
assert.equal(summary.nodeCount, 3);
assert.equal(summary.restrainedNodeCount, 0);
assert.equal(summary.maxTranslation.nodeId, '20');
assert.ok(Math.abs(summary.maxTranslation.magnitude - 10) < 1e-9);
assert.equal(summary.maxRotation.nodeId, '20');
// An empty table reports no maximum rather than a zero that reads like one.
assert.equal(summary.maxForce, null);
assert.equal(summary.maxMoment, null);

const marked = extremeNodeIds(summary);
assert.ok(marked.has('20'));
assert.equal(marked.has('5'), false);

// Sorting: largest first on a value column, and stable on ties. Node 20
// resolves to 10 mm, node 5 to 3 mm, node 10 to hypot(1, 2) = 2.24 mm -- the
// ranking is by magnitude, not by node number.
assert.deepEqual(
  sortResultRows(rows, 'translationResultant', 'DESC').map((row) => row.nodeId),
  ['20', '5', '10'],
);
assert.deepEqual(
  sortResultRows(rows, 'translationResultant', 'ASC').map((row) => row.nodeId),
  ['10', '5', '20'],
);
assert.deepEqual(sortResultRows(rows, 'nodeId', 'DESC').map((row) => row.nodeId), ['20', '10', '5']);
const tied = nodeResultRows([
  { nodeId: 'M.N30', dof: 'UX', value: 0.001 },
  { nodeId: 'M.N20', dof: 'UX', value: 0.001 },
  { nodeId: 'M.N10', dof: 'UX', value: 0.001 },
], displacementScale);
assert.deepEqual(
  sortResultRows(tied, 'UX', 'DESC').map((row) => row.nodeId),
  ['10', '20', '30'],
  'Rows the sort cannot distinguish must keep node order rather than reshuffling.',
);
// Sorting never adds or drops a row.
assert.equal(sortResultRows(rows, 'UY', 'DESC').length, rows.length);

// Filtering is a substring match on the node id, and an empty filter is a
// no-op rather than an empty table.
assert.deepEqual(filterResultRows(rows, '2').map((row) => row.nodeId), ['20']);
assert.deepEqual(filterResultRows(rows, '').map((row) => row.nodeId), ['5', '10', '20']);
assert.deepEqual(filterResultRows(rows, '   ').map((row) => row.nodeId), ['5', '10', '20']);
assert.deepEqual(filterResultRows(rows, 'nope').map((row) => row.nodeId), []);

// Reactions are already in N and N*m: no scaling is applied to them.
const reactions = nodeResultRows([
  { nodeId: 'M.N10', dof: 'UY', value: 1234.5 },
  { nodeId: 'M.N10', dof: 'RX', value: 67.8 },
], () => 1);
assert.equal(reactions[0].values.UY, 1234.5);
assert.equal(reactions[0].values.RX, 67.8);
const reactionSummary = summarizeCaseResults(rows, reactions);
assert.equal(reactionSummary.maxForce.nodeId, '10');
assert.ok(Math.abs(reactionSummary.maxForce.magnitude - 1234.5) < 1e-9);
assert.equal(reactionSummary.restrainedNodeCount, 1);

console.log(JSON.stringify({ check: 'lfea-pipeline-results-view-model', status: 'PASS', nodeRows: rows.length }));
