import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  LFEA_CASE_SELECTION_PREFERENCE_KEY,
  createLfeaCaseSelectionPreferences,
} from '../src/workspace/lfea-case-selection-preferences.js';
import { LfeaPipelineCaseSelectionPanelController } from '../src/workspace/lfea-pipeline-case-selection-panel.js';

const data = new Map();
const storage = {
  getItem(key) { return data.has(key) ? data.get(key) : null; },
  setItem(key, value) { data.set(key, String(value)); },
};
const preference = createLfeaCaseSelectionPreferences(storage);
const sourceA = 'fnv1a64:source-a';
const sourceB = 'fnv1a64:source-b';
const available = ['IXP-W', 'IXP-WP', 'IXP-WT'];
assert.equal(preference.load(sourceA, available), null);
assert.equal(preference.save(sourceA, ['IXP-WT', 'IXP-W']), true);
assert.deepEqual(preference.load(sourceA, available), ['IXP-W', 'IXP-WT']);
assert.equal(preference.load(sourceB, available), null);
assert.equal(preference.load(sourceA, ['IXP-W']), null);
assert.equal([...data.keys()].length, 1);
assert.equal([...data.keys()][0], LFEA_CASE_SELECTION_PREFERENCE_KEY);
const serialized = data.get(LFEA_CASE_SELECTION_PREFERENCE_KEY);
for (const forbidden of ['authorization', 'approval', 'reviewerIdentity', 'preFlight', 'modelBytes', 'solveAuthorized']) {
  assert.equal(serialized.includes(forbidden), false, 'browser preference must not serialize ' + forbidden);
}
console.log('LFEA-CASE-PREFERENCE-01 PASS source-bound UI choices without engineering authority');

data.set(LFEA_CASE_SELECTION_PREFERENCE_KEY, '{corrupt');
assert.equal(preference.load(sourceA, available), null);
data.set(LFEA_CASE_SELECTION_PREFERENCE_KEY, JSON.stringify({
  schema: 'lfea-case-selection-preference/v1', sourceSemanticHash: sourceA,
  selectedCaseIds: ['IXP-W'], solveAuthorized: true,
}));
assert.equal(preference.load(sourceA, available), null);
data.set(LFEA_CASE_SELECTION_PREFERENCE_KEY, JSON.stringify({
  schema: 'lfea-case-selection-preference/v1', sourceSemanticHash: sourceA,
  selectedCaseIds: ['IXP-W', 'IXP-W'],
}));
assert.equal(preference.load(sourceA, available), null);
console.log('LFEA-CASE-PREFERENCE-02 PASS corrupt, extra-authority and duplicate-ID records rejected');

const denied = createLfeaCaseSelectionPreferences({
  getItem() { throw new Error('denied'); },
  setItem() { throw new Error('quota'); },
});
assert.equal(denied.load(sourceA, available), null);
assert.equal(denied.save(sourceA, available), false);
assert.equal(createLfeaCaseSelectionPreferences(null).save(sourceA, available), false);
console.log('LFEA-CASE-PREFERENCE-03 PASS denied storage cannot block the live UI');

preference.save(sourceA, ['IXP-WP']);
const controller = Object.create(LfeaPipelineCaseSelectionPanelController.prototype);
controller.selected = new Set();
controller.selectionExplicit = false;
controller.sourceSemanticHash = null;
controller.preferences = preference;
controller.message = '';
controller.error = '';
let activeSource = sourceA;
controller.options = {
  getPreFlight() {
    return {
      sourceSummary: { sourceSemanticHash: activeSource },
      preparation: {
        requestedCaseIds: ['IXP-W'],
        physicalPreparation: {
          physicalCases: available.map((caseId) => ({ caseId, caseRole: 'OTHER' })),
        },
      },
    };
  },
};
controller.synchronizeSourceSelectionState();
assert.deepEqual(controller.getSelectedCaseIds(), ['IXP-WP']);
assert.equal(controller.selectionExplicit, true);
activeSource = sourceB;
controller.synchronizeSourceSelectionState();
assert.equal(controller.selectionExplicit, false);
assert.deepEqual(controller.getSelectedCaseIds(), []);
console.log('LFEA-CASE-PREFERENCE-04 PASS restored only to matching source, never applied as authorization');

const noop = Object.create(LfeaPipelineCaseSelectionPanelController.prototype);
noop.error = '';
let callbacks = 0;
let renderCount = 0;
noop.getSelectedCaseIds = () => ['IXP-W', 'IXP-WP'];
noop.getAppliedCaseIds = () => ['IXP-WP', 'IXP-W'];
noop.options = { onApplyCaseSelection() { callbacks += 1; } };
noop.refresh = () => { renderCount += 1; };
noop.applySelection();
assert.equal(callbacks, 0);
assert.equal(renderCount, 1);
assert.match(noop.message, /unchanged/iu);
noop.getSelectedCaseIds = () => ['IXP-W'];
noop.applySelection();
assert.equal(callbacks, 1);
assert.match(noop.message, /regenerated/iu);
console.log('LFEA-CASE-PREFERENCE-05 PASS repeated Apply is a no-op; actual change still re-prepares');

for (const path of [
  'src/workspace/lfea-pipeline-accdb-input-panel.js',
  'src/workspace/linear-piping-inputxml-source-workflow.js',
]) {
  const code = readFileSync(path, 'utf8');
  assert.match(code, /const applied = this\.preFlight\?\.preparation\?\.requestedCaseIds/u, path);
  assert.match(code, /return this\.getSnapshot\(\);/u);
}
console.log('LFEA-CASE-PREFERENCE-06 PASS both source owners avoid identical preparation updates');
console.log(JSON.stringify({ suite: 'lfea-case-selection-preferences', status: 'PASS', cases: 6 }));
