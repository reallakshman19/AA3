import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  CAESAR_ACCDB_ANCHOR_RESTRAINT_TYPE_ID,
  selectBm4lAccdbFrictionRows,
} from '../src/core/fea-benchmarks/caesar-accdb-friction-restraint-selection.js';

const STORED_MU = Math.fround(0.3);
const SENTINEL = -1.01010000705719;
const AUTHENTICATED_FIXTURE = new URL('./fixtures/bm4l-authenticated-restraint-rows.json', import.meta.url);
const AUTHORITY = new URL('../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-friction-restraint-authority.json', import.meta.url);

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

test('selects positive-FRIC_COEF directional rows and keeps model mu authoritative', () => {
  const selected = selectBm4lAccdbFrictionRows([
    row({ node: 20030 }),
    row({ node: 20300, mu: SENTINEL }),
    row({ node: 20030, type: 8, mu: SENTINEL, direction: [0, 0, -1] }),
    row({ node: 20030, type: 9, mu: SENTINEL, direction: [-1, 0, 0] }),
    row({ node: 22490, type: 1, mu: SENTINEL, direction: [0, 0, 0] }),
  ], 0.3);

  assert.equal(selected.length, 1);
  assert.equal(selected[0].nodeId, '20030');
  assert.equal(selected[0].sourceRestraintTypeId, 3);
  assert.equal(selected[0].sourceRestraintType, 'RES_TYPEID_3');
  assert.equal(selected[0].sourceFrictionCoefficient, STORED_MU);
  assert.equal(selected[0].sourceFrictionCoefficientFloat32, STORED_MU);
  assert.equal(selected[0].governedModelCoefficient, 0.3);
  assert.deepEqual(selected[0].normalDirection, [0, 1, 0]);
});

test('production selection does not hard-code the historical type-3/+Y pattern', () => {
  const selected = selectBm4lAccdbFrictionRows([
    row({ node: 10, type: 8, direction: [0, 0, -1] }),
    row({ node: 20, type: 9, direction: [-1, 0, 0] }),
  ], 0.3);
  assert.deepEqual(selected.map((entry) => entry.sourceRestraintTypeId), [8, 9]);
  assert.deepEqual(selected[0].normalDirection, [0, 0, -1]);
  assert.deepEqual(selected[1].normalDirection, [-1, 0, 0]);
});

test('accepts parser-normalized 0.3 and expanded float32 0.30000001192092896 as the same ACCDB coefficient', () => {
  const normalized = selectBm4lAccdbFrictionRows([row({ node: 10, mu: 0.3 })], 0.3)[0];
  const expanded = selectBm4lAccdbFrictionRows([row({ node: 20, mu: STORED_MU })], 0.3)[0];
  assert.equal(normalized.sourceFrictionCoefficient, 0.3);
  assert.equal(expanded.sourceFrictionCoefficient, STORED_MU);
  assert.equal(normalized.sourceFrictionCoefficientFloat32, STORED_MU);
  assert.equal(expanded.sourceFrictionCoefficientFloat32, STORED_MU);
});

test('historical 46-row extraction remains diagnostic-only and exercises co-located GUI/LIM negative controls', () => {
  const fixture = JSON.parse(fs.readFileSync(AUTHENTICATED_FIXTURE, 'utf8'));
  const authority = JSON.parse(fs.readFileSync(AUTHORITY, 'utf8'));
  const historical = authority.historicalDiagnosticCorroboration;

  assert.equal(authority.schema, 'm047-bm4l-friction-restraint-authority/v3');
  assert.equal(historical.qualificationAuthority, false);
  assert.notEqual(authority.pinnedSourceAuthority.accdbSha256, historical.accdbSha256);
  assert.equal(fixture.sourceAccdbSha256, historical.accdbSha256);
  assert.equal(fixture.inputRestraintsTableSha256, historical.inputRestraintsTableSha256);
  assert.equal(fixture.rowProjectionSha256, historical.rowProjectionSha256);
  assert.equal(fixture.rows.length, historical.rowCount);

  const selected = selectBm4lAccdbFrictionRows(fixture.rows, authority.frictionSurfaceRule.governedModelCoefficient);
  assert.equal(selected.length, historical.observedSelectedRowCount);
  assert.deepEqual(selected.map((entry) => entry.nodeId), historical.observedFrictionNodeIds);
  assert.ok(selected.every((entry) => entry.sourceRestraintTypeId === historical.observedFrictionRestraintTypeId));
  assert.ok(selected.every((entry) => entry.sourceFrictionCoefficientFloat32 === STORED_MU));
  assert.ok(selected.every((entry) => entry.normalDirection.join(',') === historical.observedFrictionDirection.join(',')));

  const selectedNodes = new Set(selected.map((entry) => entry.nodeId));
  for (const nodeId of historical.observedNonFrictionYNodeIds) {
    assert.equal(selectedNodes.has(nodeId), false, `${nodeId} must remain a non-friction row in the historical diagnostic`);
  }
  assert.equal(selected.some((entry) => entry.sourceRestraintTypeId === 1), false);
  assert.equal(selected.some((entry) => entry.sourceRestraintTypeId === 8), false);
  assert.equal(selected.some((entry) => entry.sourceRestraintTypeId === 9), false);
});

test('rejects positive friction on an anchor', () => {
  assert.equal(CAESAR_ACCDB_ANCHOR_RESTRAINT_TYPE_ID, 1);
  assert.throws(
    () => selectBm4lAccdbFrictionRows([
      row({ node: 22490, type: CAESAR_ACCDB_ANCHOR_RESTRAINT_TYPE_ID, direction: [1, 0, 0] }),
    ], 0.3),
    /anchor node 22490 carries positive FRIC_COEF/,
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

test('accepts numerical direction noise inside the axis-alignment tolerance', () => {
  const selected = selectBm4lAccdbFrictionRows([
    row({ node: 20030, direction: [1e-12, 1, -1e-12] }),
  ], 0.3);
  assert.equal(selected.length, 1);
});

test('rejects a skew friction-bearing restraint because the qualified base normal spring is axis projected', () => {
  assert.throws(
    () => selectBm4lAccdbFrictionRows([
      row({ node: 20030, direction: [0.1, 0.99, 0] }),
    ], 0.3),
    /requires an axis-aligned friction normal/,
  );
});

test('rejects multiple positive-friction surfaces at one node', () => {
  assert.throws(
    () => selectBm4lAccdbFrictionRows([
      row({ node: 20030, type: 3, direction: [0, 1, 0] }),
      row({ node: 20030, type: 8, direction: [0, 0, 1] }),
    ], 0.3),
    /multi-plane friction is not implemented/,
  );
});
