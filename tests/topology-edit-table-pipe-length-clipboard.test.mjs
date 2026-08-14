import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseTopologyEditTablePipeLengthClipboard,
  planTopologyEditTablePipeLengthPaste,
} from '../src/workspace/viewport-productivity/topology-edit-table-pipe-length-clipboard.js';

test('PIPE length clipboard parser accepts rectangular finite positive TSV', () => {
  assert.deepEqual(
    parseTopologyEditTablePipeLengthClipboard('1200\n1300\n1400\n'),
    [[1200], [1300], [1400]],
  );
  assert.throws(
    () => parseTopologyEditTablePipeLengthClipboard('1200\n0'),
    /finite positive length/,
  );
  assert.throws(
    () => parseTopologyEditTablePipeLengthClipboard('1200\t1300\n1400'),
    /rectangular TSV/,
  );
});

test('PIPE length clipboard planner maps a rendered length range without creating authority', () => {
  const grid = [
    [cell('edge:p1'), blocked('tag')],
    [cell('edge:p2'), blocked('tag')],
  ];
  const plan = planTopologyEditTablePipeLengthPaste({
    clipboardText: '1200\n1400',
    startRowIndex: 0,
    startColumnIndex: 0,
    grid,
  });
  assert.equal(plan.assignmentCount, 2);
  assert.deepEqual(plan.assignments.map((assignment) => ({
    canonicalId: assignment.canonicalId,
    lengthMm: assignment.lengthMm,
  })), [
    { canonicalId: 'edge:p1', lengthMm: 1200 },
    { canonicalId: 'edge:p2', lengthMm: 1400 },
  ]);
});

test('PIPE length clipboard planner rejects blocked, duplicate and overflowing targets before assignments escape', () => {
  assert.throws(() => planTopologyEditTablePipeLengthPaste({
    clipboardText: '1200\t1300',
    startRowIndex: 0,
    startColumnIndex: 0,
    grid: [[cell('edge:p1'), blocked('fromX')]],
  }), /not an editable PIPE length cell/);

  assert.throws(() => planTopologyEditTablePipeLengthPaste({
    clipboardText: '1200\n1300',
    startRowIndex: 0,
    startColumnIndex: 0,
    grid: [[cell('edge:p1')]],
  }), /exceeds rendered Table/);

  assert.throws(() => planTopologyEditTablePipeLengthPaste({
    clipboardText: '1200\n1300',
    startRowIndex: 0,
    startColumnIndex: 0,
    grid: [[cell('edge:p1')], [cell('edge:p1')]],
  }), /duplicate target edge:p1/);
});

function cell(canonicalId) {
  return {
    editKind: 'PIPE_LENGTH',
    editable: true,
    canonicalId,
    columnKey: 'lengthMm',
  };
}
function blocked(columnKey) {
  return {
    editKind: null,
    editable: false,
    canonicalId: 'edge:blocked',
    columnKey,
  };
}
