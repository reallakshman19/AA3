import test from 'node:test';
import assert from 'node:assert/strict';
import {
  selectBm4lAccdbFrictionRows,
} from '../src/core/fea-benchmarks/caesar-accdb-friction-restraint-selection.js';

const STORED_MU = Math.fround(0.3);
const SENTINEL = -1.01010000705719;

function row({ node, type = 3, mu = STORED_MU, direction = [0, 1, 0] }) {
  return {
    NODE_NUM: node,
    RES_TYPEID: type,
    FRIC_COEF: mu,
    XCOSINE: direction[0],
    YCOSINE: direction[1],
    ZCOSINE: direction[2],
  };
}

test('selects only positive-FRIC_COEF ACCDB Y rows and keeps model mu authoritative', () => {
  const selected = selectBm4lAccdbFrictionRows([
    row({ node: 20030 }),
    row({ node: 20300, mu: SENTINEL }),
    row({ node: 20030, type: 8, mu: SENTINEL, direction: [0, 0, -1] }),
    row({ node: 20030, type: 9, mu: SENTINEL, direction: [-1, 0, 0] }),
    row({ node: 22490, type: 1, mu: SENTINEL, direction: [0, 1, 0] }),
  ], 0.3);

  assert.equal(selected.length, 1);
  assert.equal(selected[0].nodeId, '20030');
  assert.equal(selected[0].sourceRestraintTypeId, 3);
  assert.equal(selected[0].sourceRestraintType, 'Y');
  assert.equal(selected[0].sourceFrictionCoefficient, STORED_MU);
  assert.equal(selected[0].governedModelCoefficient, 0.3);
  assert.deepEqual(selected[0].normalDirection, [0, 1, 0]);
});

test('rejects positive friction on a non-Y ACCDB restraint instead of broad non-anchor selection', () => {
  assert.throws(
    () => selectBm4lAccdbFrictionRows([
      row({ node: 20030, type: 8, mu: STORED_MU, direction: [0, 0, -1] }),
    ], 0.3),
    /authorizes friction only on ACCDB type Y/,
  );
});

test('rejects a source coefficient that does not corroborate float32 storage of model mu', () => {
  assert.throws(
    () => selectBm4lAccdbFrictionRows([
      row({ node: 20030, mu: Math.fround(0.25) }),
    ], 0.3),
    /does not corroborate float32\(model mu\)/,
  );
});

test('rejects a skewed or wrong-axis friction-bearing Y row for BM4_L', () => {
  assert.throws(
    () => selectBm4lAccdbFrictionRows([
      row({ node: 20030, direction: [0.1, 0.99, 0] }),
    ], 0.3),
    /authenticated friction rows must be global \+Y/,
  );
});

test('rejects duplicate friction-bearing Y surfaces at one node', () => {
  assert.throws(
    () => selectBm4lAccdbFrictionRows([
      row({ node: 20030 }),
      row({ node: 20030 }),
    ], 0.3),
    /one friction-bearing Y surface per node/,
  );
});
