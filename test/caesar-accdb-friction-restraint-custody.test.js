import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  selectBm4lAccdbFrictionRows,
} from '../src/core/fea-benchmarks/caesar-accdb-friction-restraint-selection.js';

const custody = JSON.parse(fs.readFileSync(
  new URL('../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-friction-restraint-custody.json', import.meta.url),
  'utf8',
));
const STORED_MU = Math.fround(0.3);
const SENTINEL = -1.01010000705719;

function yRow(nodeId, frictionCoefficient) {
  return {
    NODE_NUM: Number(nodeId),
    RES_TYPEID: 3,
    FRIC_COEF: frictionCoefficient,
    XCOSINE: 0,
    YCOSINE: 1,
    ZCOSINE: 0,
  };
}
function otherRow(nodeId, typeId) {
  return {
    NODE_NUM: Number(nodeId),
    RES_TYPEID: typeId,
    FRIC_COEF: SENTINEL,
    XCOSINE: typeId === 8 ? 1 : 0,
    YCOSINE: 0,
    ZCOSINE: typeId === 9 ? 1 : 0,
  };
}

test('authenticated BM4_L custody locks the 46-row/26-friction-row source contract', () => {
  assert.equal(custody.schema, 'm047-bm4l-friction-restraint-custody/v1');
  assert.equal(custody.source.rowCount, 46);
  assert.equal(custody.frictionNodeIds.length, 26);
  assert.deepEqual(custody.nonFrictionYNodeIds, ['20300', '20640', '21640']);
  assert.equal(custody.restraintTypeAuthority.frictionSurfaceResTypeId, 3);
  assert.deepEqual(custody.restraintTypeAuthority.direction, [0, 1, 0]);
  assert.equal(custody.restraintTypeAuthority.positiveFrictionCoefficientStored, STORED_MU);
});

test('runtime selector reproduces custody without using node exceptions', () => {
  const rows = [
    ...custody.frictionNodeIds.map((nodeId) => yRow(nodeId, STORED_MU)),
    ...custody.nonFrictionYNodeIds.map((nodeId) => yRow(nodeId, SENTINEL)),
    ...custody.coLocatedConstraintEvidence.flatMap(({ nodeId, coLocatedTypeIds }) =>
      coLocatedTypeIds.map((typeId) => otherRow(nodeId, typeId))),
  ];
  const selected = selectBm4lAccdbFrictionRows(rows, 0.3);
  assert.deepEqual(selected.map((entry) => entry.nodeId), custody.frictionNodeIds);
  for (const entry of selected) {
    assert.equal(entry.sourceRestraintTypeId, 3);
    assert.deepEqual(entry.normalDirection, [0, 1, 0]);
  }
});

test('co-located GUI/LIM rows never become Coulomb normal surfaces', () => {
  const rows = [
    yRow('20030', STORED_MU),
    otherRow('20030', 8),
    otherRow('20030', 9),
  ];
  const selected = selectBm4lAccdbFrictionRows(rows, 0.3);
  assert.equal(selected.length, 1);
  assert.equal(selected[0].nodeId, '20030');
  assert.equal(selected[0].sourceRestraintTypeId, 3);
});
