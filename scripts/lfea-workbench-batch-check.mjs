#!/usr/bin/env node
// Transaction-boundary harness: real controller prototype; preparation and UI
// notifications are instrumented. This does not exercise an ACCDB byte import.
import assert from 'node:assert/strict';
import { buildAccdbFixtureTables } from './accdb-to-canonical-geometry-fixture.mjs';
import { LFEA_PIPELINE_ACCDB_PROFILE_IDS as profiles } from '../src/workspace/lfea-pipeline-accdb-view-model.js';
import { LfeaPipelineAccdbInputPanelController as Controller } from '../src/workspace/lfea-pipeline-accdb-input-panel.js';
import { lfeaBendFactorAuthoritySelection as getBasis } from '../src/workspace/lfea-bend-factor-authority-control.js';

function owner() {
  const c = Object.create(Controller.prototype);
  Object.assign(c, {
    tables: { INPUT_BASIC_ELEMENT_DATA: { rows: [
      { ELEMENTID: 1, DIAMETER: 100, WALL_THICK: 5 },
      { ELEMENTID: 2, DIAMETER: 250, WALL_THICK: 8 },
    ] } }, sourceBaseIdentity: 'synthetic-source', originalAccdbByteSha256: 'original-bytes',
    coordinateRevision: 3, coordinateEdits: [{ nodeId: '10', axis: 'X', value: 7, unit: 'mm' }],
    coordinateCursor: 1, coordinateApprover: 'prior', coordinateReason: 'prior correction',
    overrideSet: { approver: 'prior', reason: 'prior correction', overrides: [
      { accdbElementId: '1', field: 'DIAMETER', rawValue: 110, approver: 'prior', reason: 'prior correction' },
    ] },
    overrideDisclosures: [
      Object.freeze({ data: Object.freeze({
        accdbElementId: '1', field: 'DIAMETER', originalRawValue: 100, overrideRawValue: 110,
        approver: 'prior', reason: 'prior correction',
      }) }),
    ],
    overrideDrafts: new Map([['2:DIAMETER', '999']]),
    requestedProfileId: profiles[0], requestedCaseIds: ['W'],
    preFlight: { semanticHash: 'initial', status: 'BLOCK', authorization: null },
    sourceBundle: { unitSystem: { declared: { length: 'MM' } } },
    prepares: 0, notifications: 0, render() {},
  });
  c.withCoordinateEdits = tables => ({ tables: { ...tables, coordinateOverlay: 7 }, disclosures: [] });
  c.prepareCandidate = (tables, settings = {}) => {
    c.prepares++;
    return { effectiveTables: tables, ...settings,
      preFlight: { semanticHash: 'prepared-' + c.prepares, status: 'BLOCK', authorization: null } };
  };
  c.notifyStateChanged = () => { c.notifications++; };
  c.effectiveTables = structuredClone(c.tables);
  c.effectiveTables.INPUT_BASIC_ELEMENT_DATA.rows[0].DIAMETER = 110;
  c.effectiveTables.coordinateOverlay = 7;
  return c;
}
function request(c, patches = []) {
  return { ...c.getWorkbenchSnapshot(), propertyPatches: patches, approver: 'engineer', reason: 'verified correction' };
}
const patches = [
  { accdbElementId: '1', field: 'DIAMETER', rawValue: 120 },
  { accdbElementId: '1', field: 'WALL_THICK', rawValue: 6 },
  { accdbElementId: '2', field: 'DIAMETER', rawValue: 275 },
  { accdbElementId: '2', field: 'WALL_THICK', rawValue: 9 },
];
const c = owner();
const before = JSON.stringify(c.tables);
const preview = c.previewWorkbenchBatch(request(c, patches));
assert.equal(c.prepares, 1);
assert.equal(c.notifications, 0);
assert.equal(c.effectiveTables.INPUT_BASIC_ELEMENT_DATA.rows[0].DIAMETER, 110);
assert.ok(Object.isFrozen(preview));
assert.equal(preview.statusAfter, 'BLOCK');
c.applyWorkbenchBatch(preview.token);
assert.equal(c.prepares, 1, 'Apply adopts the exact preview preparation');
assert.equal(c.notifications, 1);
assert.deepEqual(c.effectiveTables.INPUT_BASIC_ELEMENT_DATA.rows.map(r => [r.DIAMETER, r.WALL_THICK]), [[120, 6], [275, 9]]);
assert.equal(c.effectiveTables.coordinateOverlay, 7);
assert.equal(JSON.stringify(c.tables), before);
assert.throws(() => c.applyWorkbenchBatch(preview.token), /stale|used|token/i);
c.undoWorkbenchBatch();
assert.equal(c.prepares, 2);
assert.deepEqual(c.effectiveTables.INPUT_BASIC_ELEMENT_DATA.rows.map(r => [r.DIAMETER, r.WALL_THICK]), [[110, 5], [250, 8]]);
assert.equal(c.preFlight.authorization, null);

// Test preservation of per-override approver and reason metadata
const perEditOwner = owner();
const p2 = perEditOwner.previewWorkbenchBatch({
  ...request(perEditOwner, [{ accdbElementId: '2', field: 'DIAMETER', rawValue: 280 }]),
  approver: 'alice-engineer',
  reason: 'alice correction',
});
perEditOwner.applyWorkbenchBatch(p2.token);
const d1 = perEditOwner.overrideDisclosures.find(d => d.data.accdbElementId === '1');
const d2 = perEditOwner.overrideDisclosures.find(d => d.data.accdbElementId === '2');
assert.equal(d1.data.approver, 'prior', 'Element 1 retains prior approver');
assert.equal(d1.data.reason, 'prior correction', 'Element 1 retains prior reason');
assert.equal(d2.data.approver, 'alice-engineer', 'Element 2 records alice approver');
assert.equal(d2.data.reason, 'alice correction', 'Element 2 records alice reason');
perEditOwner.undoWorkbenchBatch();
const d1Restored = perEditOwner.overrideDisclosures.find(d => d.data.accdbElementId === '1');
assert.equal(d1Restored.data.approver, 'prior');
assert.equal(d1Restored.data.reason, 'prior correction');
assert.equal(perEditOwner.overrideDisclosures.length, 1);

for (const invalid of [
  [...patches, { accdbElementId: 'missing', field: 'DIAMETER', rawValue: 1 }],
  [patches[0], patches[0]],
  [{ accdbElementId: '1', field: 'DELTA_X', rawValue: 1 }],
  [{ accdbElementId: '1', field: 'DIAMETER', rawValue: 'invalid' }],
]) {
  const x = owner();
  assert.throws(() => x.previewWorkbenchBatch(request(x, invalid)));
  assert.equal(x.prepares, 0);
  assert.equal(x.notifications, 0);
}
const noop = owner();
const unchanged = noop.previewWorkbenchBatch(request(noop, [{ accdbElementId: '1', field: 'DIAMETER', rawValue: '110.0' }]));
assert.equal(unchanged.changed, false);
assert.equal(noop.prepares, 0);
assert.equal(noop.notifications, 0);
const canceled = owner();
const abandoned = canceled.previewWorkbenchBatch(request(canceled, patches));
canceled.cancelWorkbenchBatch(abandoned.token);
assert.throws(() => canceled.applyWorkbenchBatch(abandoned.token));
assert.equal(canceled.notifications, 0);
assert.equal(canceled.effectiveTables.INPUT_BASIC_ELEMENT_DATA.rows[0].DIAMETER, 110);
const stale = owner();
const old = stale.previewWorkbenchBatch(request(stale, patches));
stale.preFlight = { ...stale.preFlight, authorization: { approver: 'someone' } };
assert.throws(() => stale.applyWorkbenchBatch(old.token), /stale|token/i);
assert.equal(stale.notifications, 0);
assert.equal(c.notifications, 2, 'Undo publishes once');

// Empty and whitespace approver/reason rejection (Claim 1)
for (const extra of [
  { approver: '' }, { reason: '' }, { approver: '   ' }, { reason: '\t\n ' },
  { expectedScope: 'other' }, { expectedSourceUnit: 'IN' },
]) {
  const x = owner();
  assert.throws(() => x.previewWorkbenchBatch({ ...request(x, patches), ...extra }), /approver and reason|stale|scope|unit/i);
  assert.equal(x.prepares, 0);
}

const cycle = owner();
const pending = cycle.previewWorkbenchBatch(request(cycle, patches));
cycle.setOverrideDraft('1', 'DIAMETER', '121');
cycle.setOverrideDraft('1', 'DIAMETER', '');
assert.throws(() => cycle.applyWorkbenchBatch(pending.token), /stale|token/i);
const staged = owner();
const settingPreview = staged.previewWorkbenchBatch({ ...request(staged, []),
  requestedProfileId: profiles[1], requestedCaseIds: ['W', 'T'] });
assert.equal(staged.requestedProfileId, profiles[0]);
assert.deepEqual(staged.requestedCaseIds, ['W']);
staged.applyWorkbenchBatch(settingPreview.token);
assert.equal(staged.requestedProfileId, profiles[1]);
assert.deepEqual(staged.requestedCaseIds, ['T', 'W']);
assert.equal(staged.prepares, 1);
assert.equal(staged.notifications, 1);

// Test component-basis integration in batch
const basisOwner = owner();
const basisBefore = getBasis();
const targetBasis = { editionProfileId: 'B31_3_2024_B31J_2023', smooth90FlexibilityCorrection: false };
const basisPreview = basisOwner.previewWorkbenchBatch({
  ...request(basisOwner, [{ accdbElementId: '1', field: 'DIAMETER', rawValue: 125 }]),
  componentBasis: targetBasis,
});
assert.equal(basisPreview.changed, true);
assert.deepEqual(getBasis(), basisBefore, 'Preview does not change live basis');
basisOwner.applyWorkbenchBatch(basisPreview.token);
assert.deepEqual(getBasis(), { ...targetBasis, complete: true }, 'Apply updates basis atomically');
assert.equal(basisOwner.effectiveTables.INPUT_BASIC_ELEMENT_DATA.rows[0].DIAMETER, 125);
basisOwner.undoWorkbenchBatch();
assert.deepEqual(getBasis(), basisBefore, 'Undo restores prior basis atomically');
assert.equal(basisOwner.effectiveTables.INPUT_BASIC_ELEMENT_DATA.rows[0].DIAMETER, 110);

console.log('PASS: workbench batch transaction boundary harness');

// Production table import + sealed preparation: repository synthetic 11-table
// fixture, not authentic ACCDB bytes. Its deliberate unsupported inputs BLOCK.
let realNotifications = 0;
const real = new Controller(null, null, { onStateChanged() { realNotifications++; } });
const fixture = buildAccdbFixtureTables();
const fixtureBefore = JSON.stringify(fixture);
real.readTables = async () => fixture;
assert.equal(await real.loadFile({ name: 'synthetic.ACCDB', arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }), true);
assert.equal(real.preFlight.status, 'BLOCK');
realNotifications = 0;
const realBefore = real.preFlight;
const realPreview = real.previewWorkbenchBatch(request(real, [{ accdbElementId: '1', field: 'DIAMETER', rawValue: 120 }]));
assert.equal(real.preFlight, realBefore);
assert.equal(realPreview.statusAfter, 'BLOCK');
real.applyWorkbenchBatch(realPreview.token);
assert.equal(realNotifications, 1);
assert.notEqual(real.preFlight.semanticHash, realBefore.semanticHash);
assert.equal(real.effectiveTables.INPUT_BASIC_ELEMENT_DATA.rows[0].DIAMETER, 120);
assert.equal(JSON.stringify(fixture), fixtureBefore);
assert.ok(real.preFlight.preparation.findings.some(f => f.disposition === 'BLOCK'));

// Isolated candidate negative scenarios (Claim 3)
const liveBasisPre = getBasis();
const unsetCandidate = real.prepareCandidate(real.effectiveTables, {
  componentBasis: { editionProfileId: null, smooth90FlexibilityCorrection: null },
});
assert.equal(unsetCandidate.preFlight.status, 'BLOCK', 'Unset basis produces hard BLOCK');
assert.deepEqual(getBasis(), liveBasisPre, 'Live shared basis is never mutated by isolated candidate');
assert.equal(JSON.stringify(fixture), fixtureBefore, 'Fixture tables immutable');

console.log('PASS: real synthetic table import/preparation retains governed BLOCK');
