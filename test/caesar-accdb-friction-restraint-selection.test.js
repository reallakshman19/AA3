import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
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
  assert.equal(selected[0].sourceFrictionCoefficientFloat32, STORED_MU);
  assert.equal(selected[0].governedModelCoefficient, 0.3);
  assert.deepEqual(selected[0].normalDirection, [0, 1, 0]);
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

  assert.equal(authority.schema, 'm047-bm4l-friction-restraint-authority/v2');
  assert.equal(historical.qualificationAuthority, false);
  assert.notEqual(authority.pinnedSourceAuthority.accdbSha256, historical.accdbSha256);
  assert.equal(fixture.sourceAccdbSha256, historical.accdbSha256);
  assert.equal(fixture.inputRestraintsTableSha256, historical.inputRestraintsTableSha256);
  assert.equal(fixture.rowProjectionSha256, historical.rowProjectionSha256);
  assert.equal(fixture.rows.length, historical.rowCount);

  const selected = selectBm4lAccdbFrictionRows(fixture.rows, authority.frictionSurfaceRule.governedModelCoefficient);
  assert.equal(selected.length, historical.observedSelectedRowCount);
  assert.deepEqual(selected.map((entry) => entry.nodeId), historical.observedFrictionNodeIds);
  assert.ok(selected.every((entry) => entry.sourceRestraintTypeId === authority.frictionSurfaceRule.resTypeId));
  assert.ok(selected.every((entry) => entry.sourceFrictionCoefficientFloat32 === STORED_MU));
  assert.ok(selected.every((entry) => entry.normalDirection.join(',') === '0,1,0'));

  const selectedNodes = new Set(selected.map((entry) => entry.nodeId));
  for (const nodeId of historical.observedNonFrictionYNodeIds) {
    assert.equal(selectedNodes.has(nodeId), false, `${nodeId} must remain a non-friction Y support`);
  }
  for (const sourceTypeId of [1, 8, 9]) {
    assert.equal(
      selected.some((entry) => entry.sourceRestraintTypeId === sourceTypeId),
      false,
      `ACCDB restraint type ${sourceTypeId} must not create a friction surface`,
    );
  }
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

test('accepts numerical direction noise inside the governed +Y tolerance', () => {
  const selected = selectBm4lAccdbFrictionRows([
    row({ node: 20030, direction: [1e-12, 1, -1e-12] }),
  ], 0.3);
  assert.equal(selected.length, 1);
});

test('rejects a skewed or wrong-axis friction-bearing Y row for BM4_L', () => {
  assert.throws(
    () => selectBm4lAccdbFrictionRows([
      row({ node: 20030, direction: [0.1, 0.99, 0] }),
    ], 0.3),
    /friction rows must be global \+Y within/,
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
