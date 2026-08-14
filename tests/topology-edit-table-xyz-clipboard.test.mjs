import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseTopologyEditTableXyzClipboard,
  planTopologyEditTableXyzDraftPaste,
} from '../src/workspace/viewport-productivity/topology-edit-table-xyz-clipboard.js';

function nodeCell(canonicalId, endpoint, axis, draftKey = `${canonicalId}\u0000${endpoint}\u0000${axis}`) {
  return {
    editKind: 'NODE_POSITION', editable: true, draftKey, canonicalId, endpoint, axis,
    columnKey: `${endpoint === 'FROM' ? 'from' : 'to'}${axis}`,
  };
}

test('XYZ clipboard parser accepts rectangular finite TSV and normalizes terminal newline', () => {
  assert.deepEqual(parseTopologyEditTableXyzClipboard('1\t2\t3\r\n4.5\t-6\t7\r\n'), [
    [1, 2, 3],
    [4.5, -6, 7],
  ]);
});

test('XYZ clipboard planner maps one rectangle to direct NODE_POSITION cells without staging', () => {
  const grid = [
    [nodeCell('edge:a', 'FROM', 'X'), nodeCell('edge:a', 'FROM', 'Y'), nodeCell('edge:a', 'FROM', 'Z')],
    [nodeCell('edge:b', 'FROM', 'X'), nodeCell('edge:b', 'FROM', 'Y'), nodeCell('edge:b', 'FROM', 'Z')],
  ];
  const plan = planTopologyEditTableXyzDraftPaste({
    clipboardText: '10\t20\n30\t40',
    startRowIndex: 0,
    startColumnIndex: 1,
    grid,
  });
  assert.equal(plan.rowCount, 2);
  assert.equal(plan.columnCount, 2);
  assert.equal(plan.assignmentCount, 4);
  assert.deepEqual(plan.assignments.map((row) => [row.draftKey, row.value]), [
    ['edge:a\u0000FROM\u0000Y', 10],
    ['edge:a\u0000FROM\u0000Z', 20],
    ['edge:b\u0000FROM\u0000Y', 30],
    ['edge:b\u0000FROM\u0000Z', 40],
  ]);
});

test('XYZ clipboard planner rejects malformed, blocked, non-XYZ and overflowing targets before assignments exist', () => {
  const editable = nodeCell('edge:a', 'FROM', 'X');
  const blocked = { ...nodeCell('edge:a', 'FROM', 'Y'), editable: false };
  const pipeLength = {
    editKind: 'PIPE_LENGTH', editable: true, draftKey: 'edge:a', canonicalId: 'edge:a',
    endpoint: null, axis: null, columnKey: 'lengthMm',
  };
  assert.throws(() => parseTopologyEditTableXyzClipboard('1\t\n2\t3'), /blank/);
  assert.throws(() => parseTopologyEditTableXyzClipboard('1\tX'), /must be finite/);
  assert.throws(() => planTopologyEditTableXyzDraftPaste({
    clipboardText: '1\t2', startRowIndex: 0, startColumnIndex: 0,
    grid: [[editable, blocked]],
  }), /not an editable XYZ cell/);
  assert.throws(() => planTopologyEditTableXyzDraftPaste({
    clipboardText: '1\t2', startRowIndex: 0, startColumnIndex: 0,
    grid: [[editable, pipeLength]],
  }), /not an editable XYZ cell/);
  assert.throws(() => planTopologyEditTableXyzDraftPaste({
    clipboardText: '1\t2', startRowIndex: 0, startColumnIndex: 0,
    grid: [[editable]],
  }), /exceeds rendered Table/);
});

test('XYZ clipboard planner allows FROM and TO drafts on one edge because paste does not create a batch', () => {
  const grid = [[
    nodeCell('edge:a', 'FROM', 'X'),
    nodeCell('edge:a', 'FROM', 'Y'),
    nodeCell('edge:a', 'FROM', 'Z'),
    nodeCell('edge:a', 'TO', 'X'),
    nodeCell('edge:a', 'TO', 'Y'),
    nodeCell('edge:a', 'TO', 'Z'),
  ]];
  const plan = planTopologyEditTableXyzDraftPaste({
    clipboardText: '1\t2\t3\t4\t5\t6',
    startRowIndex: 0,
    startColumnIndex: 0,
    grid,
  });
  assert.equal(plan.assignmentCount, 6);
  assert.equal(plan.assignments[0].endpoint, 'FROM');
  assert.equal(plan.assignments[5].endpoint, 'TO');
});
