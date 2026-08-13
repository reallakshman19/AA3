import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOPOLOGY_EDIT_TABLE_TARGET_FIELD_GAPS,
  topologyEditTableColumnProfile,
  topologyEditTableColumnProfileNames,
} from '../src/workspace/topology-edit/table/topology-edit-table-column-profiles.js';

test('engineering table column profiles expose focused existing columns', () => {
  assert.deepEqual(topologyEditTableColumnProfileNames(), [
    'GEOMETRY', 'SPECIFICATION', 'SUPPORT', 'CONNECTIVITY', 'AUTHORITY', 'ALL',
  ]);

  const geometry = topologyEditTableColumnProfile('GEOMETRY', ['PIPE', 'VALVE']);
  assert.equal(geometry.profile, 'GEOMETRY');
  assert.equal(geometry.columnKeys.includes('lengthMm'), true);
  assert.equal(geometry.columnKeys.includes('slopePercent'), true);
  assert.equal(geometry.columnKeys.includes('componentLengthMm'), true);
  assert.equal(geometry.columnKeys.includes('material'), false);

  const support = topologyEditTableColumnProfile('SUPPORT', ['SUPPORT']);
  for (const key of ['stationMm', 'supportType', 'direction', 'gapMm', 'travelMm']) {
    assert.equal(support.columnKeys.includes(key), true, `missing support profile field ${key}`);
  }
});

test('profiles explicitly disclose the next field coverage gaps', () => {
  const all = topologyEditTableColumnProfile('ALL');
  for (const key of ['fromX', 'toZ', 'outsideDiameterMm', 'wallThicknessMm', 'hostEdgeId']) {
    assert.equal(all.targetFieldGaps.includes(key), true, `missing target field gap ${key}`);
  }
  assert.deepEqual(TOPOLOGY_EDIT_TABLE_TARGET_FIELD_GAPS.TEE, ['downstreamDnMm']);
});
