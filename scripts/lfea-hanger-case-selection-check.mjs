import assert from 'node:assert/strict';
import {
  LfeaPipelineCaseSelectionPanelController,
  defaultLfeaPipelineCaseIds,
} from '../src/workspace/lfea-pipeline-case-selection-panel.js';
import { LfeaPipelineRunPanelController } from '../src/workspace/lfea-pipeline-run-panel.js';

const breakAll = process.argv.includes('--deliberate-break');
const breakDefault = breakAll || process.argv.includes('--deliberate-break-default');
const breakRunGate = breakAll || process.argv.includes('--deliberate-break-run');
const breakSourceReset = breakAll || process.argv.includes('--deliberate-break-source-reset');
const EMPTY_MESSAGE = 'Load a model and run Error check to see its analysis cases.';

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

function harness(physicalCases, requestedCaseIds = ['IXP-W'], sourceSemanticHash = 'SOURCE-A') {
  const preFlight = {
    solveAuthorized: true,
    authorization: {},
    sourceSummary: { sourceSemanticHash },
    preparation: {
      physicalPreparation: { physicalCases },
      requestedCaseIds: [...requestedCaseIds],
    },
  };
  const caseSelection = new LfeaPipelineCaseSelectionPanelController(null, null, {
    getPreFlight: () => preFlight,
  });
  const run = new LfeaPipelineRunPanelController(null, null, {
    getPreFlight: () => preFlight,
    getCaseSelectionCustody: () => breakRunGate
      ? { ready: true, reason: null }
      : caseSelection.getRunCaseCustody(),
  });
  return { preFlight, caseSelection, run };
}

const legacy = harness(LEGACY, ['IXP-W'], 'LEGACY-SOURCE');
assert.deepEqual([...legacy.caseSelection.getSelectedCaseIds()].sort(), LEGACY_IDS,
  'a model without H-bearing cases must preserve the four legacy selection defaults');
assert.equal(legacy.run.runAvailability().ready, true,
  'a no-H model already authorized for W must preserve legacy Run readiness');

const hanger = harness([...LEGACY, ...HANGER], ['IXP-W'], 'HANGER-SOURCE-A');
const available = hanger.caseSelection.availableCases();
assert.deepEqual(available.map((row) => row.caseId).sort(), [...LEGACY_IDS, ...HANGER_IDS].sort(),
  'base and H-bearing cases must both remain visible/selectable');
const hangerRows = available.filter((row) => row.category === 'STANDARD_HANGER');
assert.deepEqual(hangerRows.map((row) => row.caseId).sort(), HANGER_IDS,
  'all four H-bearing roles must have governed hanger-standard presentation custody');
assert.deepEqual(hangerRows.map((row) => row.label).sort(), ['W+H', 'W+P1+H', 'W+P1+T1+H', 'W+T1+H'].sort(),
  'H-bearing labels must remain explicit about H custody');

const defaultPolicy = breakDefault
  ? (rows) => rows.filter((row) => row.category === 'STANDARD').map((row) => row.caseId)
  : defaultLfeaPipelineCaseIds;
assert.deepEqual([...defaultPolicy(available)].sort(), HANGER_IDS,
  'when H-bearing standard cases exist, the default must include H and exclude the non-H comparison family');
assert.deepEqual([...hanger.caseSelection.getSelectedCaseIds()].sort(), HANGER_IDS,
  'the production controller must use the H-bearing default family');

const initialCustody = hanger.caseSelection.getRunCaseCustody();
assert.equal(initialCustody.ready, false,
  'initial native W custody must not bypass an available untouched H-aware Load-case default');
assert.equal(hanger.run.runAvailability().ready, false,
  'Run must stay blocked until the H-aware Load-case choice is sealed into pre-flight');

hanger.preFlight.preparation.requestedCaseIds = [...HANGER_IDS];
assert.equal(hanger.caseSelection.getRunCaseCustody().ready, true,
  'an applied H-bearing case family must satisfy Load-case custody');
assert.equal(hanger.run.runAvailability().ready, true,
  'Run must become ready after the H-bearing case family is sealed and authorized');

hanger.caseSelection.selectionExplicit = true;
hanger.caseSelection.selected = new Set(['IXP-W']);
hanger.preFlight.preparation.requestedCaseIds = ['IXP-W'];
assert.deepEqual(hanger.caseSelection.getSelectedCaseIds(), ['IXP-W'],
  'an explicit user selection must override the H-aware default without rewriting case mechanics');
assert.equal(hanger.caseSelection.getRunCaseCustody().ready, true,
  'an explicitly selected and applied non-H comparison case remains an allowed engineering choice');
assert.equal(hanger.run.runAvailability().ready, true,
  'Run must permit an explicit non-H comparison case once the same set is sealed into pre-flight');

hanger.caseSelection.selected = new Set(['IXP-WP']);
assert.equal(hanger.caseSelection.getRunCaseCustody().ready, false,
  'changed explicit selection must block until Apply selection regenerates pre-flight');
assert.equal(hanger.run.runAvailability().ready, false,
  'Run must not execute the stale applied W after the user changes selection to WP');

hanger.caseSelection.selected.clear();
assert.deepEqual(hanger.caseSelection.getSelectedCaseIds(), [],
  'an explicitly empty user selection must stay empty so Apply can fail closed instead of restoring defaults');

// Source replacement must invalidate explicit presentation custody even when
// both models reuse the same case IDs.
const switching = harness([...LEGACY, ...HANGER], ['IXP-W'], 'SOURCE-A');
switching.caseSelection.getSelectedCaseIds();
switching.caseSelection.selectionExplicit = true;
switching.caseSelection.selected = new Set(['IXP-W']);
assert.equal(switching.caseSelection.getRunCaseCustody().ready, true,
  'source A may explicitly select and apply a non-H comparison case');
switching.caseSelection.message = 'STALE SOURCE-A SUCCESS';
switching.caseSelection.error = 'STALE SOURCE-A ERROR';

switching.preFlight.sourceSummary.sourceSemanticHash = 'SOURCE-B';
switching.preFlight.preparation.requestedCaseIds = ['IXP-W'];
if (breakSourceReset) switching.caseSelection.sourceSemanticHash = 'SOURCE-B';
const afterSourceSwitch = switching.caseSelection.getRunCaseCustody();
assert.equal(afterSourceSwitch.ready, false,
  'a new hanger source must not inherit source A explicit W authority merely because case IDs match');
assert.equal(switching.caseSelection.selectionExplicit, false,
  'source replacement must clear explicit checkbox custody');
assert.deepEqual([...switching.caseSelection.getSelectedCaseIds()].sort(), HANGER_IDS,
  'source B must return to its governed H-aware default after stale state is cleared');
assert.equal(switching.caseSelection.message, EMPTY_MESSAGE,
  'source replacement must clear stale prior-model success/status prose');
assert.equal(switching.caseSelection.error, '',
  'source replacement must clear stale prior-model error prose');
assert.equal(switching.run.runAvailability().ready, false,
  'Run must block source B native W until a Load-case decision is made for source B');

switching.preFlight.preparation.requestedCaseIds = [...HANGER_IDS];
assert.equal(switching.caseSelection.getRunCaseCustody().ready, true,
  'same-source preflight regeneration after applying H-bearing cases must not spuriously reset custody');

switching.caseSelection.selectionExplicit = true;
switching.caseSelection.selected = new Set(['IXP-WP']);
switching.preFlight.preparation.requestedCaseIds = ['IXP-WP'];
assert.equal(switching.caseSelection.getRunCaseCustody().ready, true,
  'same-source explicit comparison custody must survive requested-case regeneration');
assert.equal(switching.caseSelection.selectionExplicit, true,
  'same source identity must preserve explicit selection state');

const unidentified = harness([...LEGACY, ...HANGER], ['IXP-W'], null);
assert.equal(unidentified.caseSelection.getRunCaseCustody().ready, false,
  'hanger Run custody must fail closed when no sealed source identity is available');

console.log(JSON.stringify({
  check: 'lfea-hanger-case-selection',
  status: 'PASS',
  legacyDefault: LEGACY_IDS,
  hangerDefault: HANGER_IDS,
  initialNativeWBlockedForHanger: true,
  appliedHangerFamilyReady: true,
  explicitNonHComparisonAllowed: true,
  changedUnappliedSelectionBlocked: true,
  sourceReplacementClearsExplicitCustody: true,
  sourceReplacementClearsStaleStatus: true,
  sameSourceRegenerationPreservesCustody: true,
  missingSourceIdentityFailsClosed: true,
  baseCasesRemainSelectable: true,
  explicitSelectionAuthoritative: true,
  explicitEmptyFailsClosed: true,
  deliberateBreakModes: [
    '--deliberate-break-default restores legacy-only default and must fail',
    '--deliberate-break-run bypasses Run custody and must fail',
    '--deliberate-break-source-reset carries stale explicit state into a new source and must fail',
  ],
}, null, 2));
