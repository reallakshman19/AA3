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
  for (const key of [
    'fromX', 'fromY', 'fromZ', 'toX', 'toY', 'toZ',
    'deltaX', 'deltaY', 'deltaZ', 'lengthMm', 'slopePercent', 'componentLengthMm',
  ]) assert.equal(geometry.columnKeys.includes(key), true, `missing geometry profile field ${key}`);
  assert.equal(geometry.columnKeys.includes('material'), false);

  const connectivity = topologyEditTableColumnProfile('CONNECTIVITY', ['PIPE', 'TEE']);
  for (const key of [
    'fromNodeId', 'fromPortKey', 'toNodeId', 'toPortKey',
    'branchPortKey', 'reducerCanonicalId',
  ]) assert.equal(connectivity.columnKeys.includes(key), true, `missing connectivity profile field ${key}`);

  const specification = topologyEditTableColumnProfile('SPECIFICATION', ['PIPE', 'TEE']);
  for (const key of [
    'dnInMm', 'dnOutMm', 'outsideDiameterMm', 'wallThicknessMm', 'insideDiameterMm',
    'schedule', 'material', 'pipingClass', 'pressureClass', 'catalogueRecordId',
    'runDnMm', 'branchDnMm', 'downstreamDnMm',
  ]) assert.equal(specification.columnKeys.includes(key), true, `missing specification profile field ${key}`);

  const support = topologyEditTableColumnProfile('SUPPORT', ['SUPPORT']);
  for (const key of ['stationMm', 'supportType', 'direction', 'gapMm', 'travelMm']) {
    assert.equal(support.columnKeys.includes(key), true, `missing support profile field ${key}`);
  }
});

test('profile gap register no longer reports resolved PIPE specification evidence as missing', () => {
  const all = topologyEditTableColumnProfile('ALL');
  for (const key of ['outsideDiameterMm', 'wallThicknessMm', 'insideDiameterMm', 'catalogueRecordId']) {
    assert.equal(all.targetFieldGaps.includes(key), false, `resolved specification field still reported as gap ${key}`);
  }
  assert.equal(all.targetFieldGaps.includes('hostEdgeId'), true);
  for (const key of ['fromX', 'toZ', 'branchPortKey', 'reducerCanonicalId', 'downstreamDnMm']) {
    assert.equal(all.targetFieldGaps.includes(key), false, `implemented field still reported as gap ${key}`);
  }
  assert.deepEqual(TOPOLOGY_EDIT_TABLE_TARGET_FIELD_GAPS.GEOMETRY, []);
  assert.deepEqual(TOPOLOGY_EDIT_TABLE_TARGET_FIELD_GAPS.SPECIFICATION, []);
  assert.deepEqual(TOPOLOGY_EDIT_TABLE_TARGET_FIELD_GAPS.CONNECTIVITY, []);
  assert.deepEqual(TOPOLOGY_EDIT_TABLE_TARGET_FIELD_GAPS.TEE, []);
});
