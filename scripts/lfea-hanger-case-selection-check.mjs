import assert from 'node:assert/strict';
import {
  LfeaPipelineCaseSelectionPanelController,
  defaultLfeaPipelineCaseIds,
} from '../src/workspace/lfea-pipeline-case-selection-panel.js';

const deliberateBreak = process.argv.includes('--deliberate-break');

const LEGACY = Object.freeze([
  Object.freeze({ caseId: 'IXP-W', caseRole: 'WEIGHT_BASE' }),
  Object.freeze({ caseId: 'IXP-WP', caseRole: 'WEIGHT_PRESSURE' }),
  Object.freeze({ caseId: 'IXP-WT', caseRole: 'WEIGHT_TEMPERATURE' }),
  Object.freeze({ caseId: 'IXP-WPT', caseRole: 'WEIGHT_PRESSURE_TEMPERATURE' }),
]);
const HANGER = Object.freeze([
  Object.freeze({ caseId: 'IXP-WH', caseRole: 'WEIGHT_HANGER_PRELOAD' }),
  Object.freeze({ caseId: 'IXP-WPH', caseRole: 'WEIGHT_PRESSURE_HANGER_PRELOAD' }),
  Object.freeze({ caseId: 'IXP-WTH', caseRole: 'WEIGHT_TEMPERATURE_HANGER_PRELOAD' }),
  Object.freeze({ caseId: 'IXP-WPTH', caseRole: 'WEIGHT_PRESSURE_TEMPERATURE_HANGER_PRELOAD' }),
]);
const LEGACY_IDS = LEGACY.map((row) => row.caseId).sort();
const HANGER_IDS = HANGER.map((row) => row.caseId).sort();

function controllerFor(physicalCases) {
  const preFlight = {
    preparation: {
      physicalPreparation: { physicalCases },
      requestedCaseIds: [],
    },
  };
  return new LfeaPipelineCaseSelectionPanelController(null, null, {
    getPreFlight: () => preFlight,
  });
}

const legacyController = controllerFor(LEGACY);
assert.deepEqual([...legacyController.getSelectedCaseIds()].sort(), LEGACY_IDS,
  'a model without H-bearing cases must preserve the four legacy defaults');

const hangerController = controllerFor([...LEGACY, ...HANGER]);
const available = hangerController.availableCases();
assert.deepEqual(available.map((row) => row.caseId).sort(), [...LEGACY_IDS, ...HANGER_IDS].sort(),
  'base and H-bearing cases must both remain visible/selectable');
const hangerRows = available.filter((row) => row.category === 'STANDARD_HANGER');
assert.deepEqual(hangerRows.map((row) => row.caseId).sort(), HANGER_IDS,
  'all four H-bearing roles must have governed hanger-standard presentation custody');
assert.deepEqual(hangerRows.map((row) => row.label).sort(), ['W+H', 'W+P1+H', 'W+P1+T1+H', 'W+T1+H'].sort(),
  'H-bearing labels must remain explicit about H custody');

const defaultPolicy = deliberateBreak
  ? (rows) => rows.filter((row) => row.category === 'STANDARD').map((row) => row.caseId)
  : defaultLfeaPipelineCaseIds;
assert.deepEqual([...defaultPolicy(available)].sort(), HANGER_IDS,
  'when H-bearing standard cases exist, the default must include H and exclude the non-H comparison family');
assert.deepEqual([...hangerController.getSelectedCaseIds()].sort(), HANGER_IDS,
  'the production controller must use the H-bearing default family');

hangerController.selectionExplicit = true;
hangerController.selected = new Set(['IXP-W']);
assert.deepEqual(hangerController.getSelectedCaseIds(), ['IXP-W'],
  'an explicit user selection must override the H-aware default without rewriting case mechanics');
hangerController.selected.clear();
assert.deepEqual(hangerController.getSelectedCaseIds(), [],
  'an explicitly empty user selection must stay empty so Apply can fail closed instead of restoring defaults');

console.log(JSON.stringify({
  check: 'lfea-hanger-case-selection',
  status: 'PASS',
  legacyDefault: LEGACY_IDS,
  hangerDefault: HANGER_IDS,
  baseCasesRemainSelectable: true,
  explicitSelectionAuthoritative: true,
  explicitEmptyFailsClosed: true,
  deliberateBreakMode: '--deliberate-break restores legacy-only default and must fail',
}, null, 2));
